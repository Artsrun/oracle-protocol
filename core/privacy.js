/* ORACLE PROTOCOL v5 — what device data may become, and what may leave the tab (docs/PLAN-v5.md §7).
 * Classic script + CommonJS (unit-tested in Node with WebCrypto).
 *
 * Rule (v5): Your choices, and if you allow it your device's readings, shape the artwork in this tab. Readings never
 * leave the tab. A shared image or link carries your choices only, unless you choose to add your device pattern: a
 * salted one-way digest and three coarse buckets that cannot be turned back into readings.
 *
 *   buckets(snapshot)      → coarse buckets for the art (null where a reading is missing, denied or randomised)
 *   canonical(snapshot)    → the stable text that is hashed (randomised readings are left out)
 *   await digest(salt, s)  → 8 hex chars = first 32 bits of SHA-256(salt ‖ s)
 *   dbCode(b) / parseDb    → the 3-char bucket code (GPU family · core band · time-zone hour) and back
 *   await pattern(seed)    → { dg, db } for the current device and artwork, or null; computed in memory only
 *   linkPart()             → '' (Choices only, the default) or '&dg=…&db=…' (Choices + device pattern)
 *   forgetEverything()     → stops sensors, clears readings, salt, share mode and every oracle.* key
 *   rawStrings(snapshot) / findRaw(text, snapshot) → privacy guard: which raw readings appear in a text */
(function (root) {
  'use strict';
  const D = root.OracleDevice || (typeof require === 'function' ? require('./device.js') : null);
  const GPU_CODE = 'XAINDQR';                               // generic, apple, intel, nvidia, amd, qualcomm, arm
  const CORE_CODE = '01234';                               // 1–2, 3–4, 5–8, 9–16, 17+
  const TZ_CODE = '0123456789ABCDEFGHJKMNPQRST';           // UTC−12 … UTC+14, whole hours
  const SALT_KEY = 'oracle.v5.salt';
  const mem = { share: 'choices', remember: false, salt: null, saltSeed: null, cache: null };

  const okRaw = (S, id) => S && S.passive && S.passive[id] && S.passive[id].state === 'ok' ? S.passive[id].raw : null;
  const band = (v, edges) => { let i = 0; while (i < edges.length && v > edges[i]) i++; return i; };

  // ── buckets: the only device-derived values the artwork ever sees ─────
  function buckets(S) {
    const b = { aspect: null, dpr: null, cores: null, mem: null, gpu: null, tzh: null, langs: null, fonts: null, touch: null,
      net: null, bat: null, charging: null, dark: null, loc: null, mic: null };
    if (!S) return b;
    const sc = okRaw(S, 'screen');
    if (sc) { const r = Math.max(sc.w, sc.h) / Math.min(sc.w, sc.h); b.aspect = r < 1.4 ? 0 : r < 1.8 ? 1 : r < 2.1 ? 2 : 3; b.dpr = sc.dpr < 1.5 ? 1 : sc.dpr < 2.5 ? 2 : 3; }
    const c = okRaw(S, 'cores'); if (c) b.cores = band(c.n, [2, 4, 8, 16]);
    const m = okRaw(S, 'memory'); if (m) b.mem = m.gb <= 2 ? 0 : m.gb <= 4 ? 1 : 2;
    const g = S.passive && S.passive.gpu; if (g && g.state === 'ok' && g.raw) b.gpu = Math.max(0, D.GPU_CLASSES.indexOf(g.raw.cls));
    const tz = okRaw(S, 'tz'); if (tz) b.tzh = Math.max(-12, Math.min(14, Math.round(tz.offsetH)));
    const l = okRaw(S, 'langs'); if (l) b.langs = Math.min(3, l.count);
    const f = okRaw(S, 'fonts'); if (f) b.fonts = f.count <= 5 ? 0 : f.count <= 12 ? 1 : 2;
    const t = okRaw(S, 'touch'); if (t) b.touch = t.points === 0 ? 0 : t.points <= 5 ? 1 : 2;
    const n = okRaw(S, 'network'); if (n) b.net = /slow|2g/.test(n.type) ? 0 : n.type === '3g' ? 1 : n.type === '4g' ? 2 : null;
    const bt = okRaw(S, 'battery'); if (bt) { b.bat = bt.level < 20 ? 0 : bt.level <= 80 ? 1 : 2; b.charging = !!bt.charging; }
    const sch = okRaw(S, 'scheme'); if (sch) b.dark = !!sch.dark;
    if (S.location && S.location.state === 'ok') b.loc = { band: S.location.band, hemi: S.location.hemi };
    if (S.mic && S.mic.state === 'ok') b.mic = ['quiet', 'room', 'loud'].indexOf(S.mic.level);
    return b;
  }
  const count = (b) => Object.values(b).filter(v => v !== null && v !== undefined).length;

  // ── canonical text for the digest: buckets + canvas signature + font set; randomised readings left out ──
  function canonical(S) {
    const b = buckets(S), keys = ['aspect', 'dpr', 'cores', 'mem', 'gpu', 'tzh', 'langs', 'fonts', 'touch', 'net', 'dark'];
    const cv = okRaw(S, 'canvas'), fl = okRaw(S, 'fonts');
    return 'oracle-v5|' + keys.map(k => k + '=' + (b[k] == null ? '-' : b[k])).join('|') +
      '|canvas=' + (cv ? cv.sig : '-') + '|fontset=' + (fl ? fl.found.join(',') : '-');
  }
  const hex = (u8) => Array.from(u8, x => x.toString(16).padStart(2, '0')).join('');
  const unhex = (s) => new Uint8Array((String(s).match(/../g) || []).map(h => parseInt(h, 16)));
  const subtle = () => (root.crypto && root.crypto.subtle) || (typeof require === 'function' ? require('node:crypto').webcrypto.subtle : null);
  async function digest(salt, text) {
    const enc = new TextEncoder().encode(text), buf = new Uint8Array(salt.length + enc.length);
    buf.set(salt, 0); buf.set(enc, salt.length);
    const h = new Uint8Array(await subtle().digest('SHA-256', buf));
    return hex(h.subarray(0, 4));
  }
  const newSalt = () => { const s = new Uint8Array(16); (root.crypto || require('node:crypto').webcrypto).getRandomValues(s); return s; };

  // ── the 3-char bucket code carried by a link (only with the visitor's opt-in) ──
  function dbCode(b) {
    return (b.gpu == null ? 'X' : GPU_CODE[b.gpu]) + (b.cores == null ? 'X' : CORE_CODE[b.cores]) + (b.tzh == null ? 'X' : TZ_CODE[b.tzh + 12]);
  }
  function parseDb(s) {
    if (!/^[XAINDQR][X0-4][X0-9A-HJKMNP-T]$/.test(String(s || ''))) return null;
    const g = GPU_CODE.indexOf(s[0]), c = CORE_CODE.indexOf(s[1]), t = TZ_CODE.indexOf(s[2]);
    return { gpu: s[0] === 'X' ? null : g, cores: s[1] === 'X' ? null : c, tzh: s[2] === 'X' ? null : t - 12 };
  }
  const parseDg = (s) => /^[0-9a-f]{8}$/.test(String(s || '')) ? String(s) : null;

  // ── storage (only for "Remember this device", off by default: the salt, never a reading or a digest) ──
  const ls = () => { try { return root.localStorage || null; } catch (e) { return null; } };
  function setRemember(on) {
    mem.remember = !!on; const L = ls();
    try { if (on) { if (!mem.salt) mem.salt = newSalt(); L && L.setItem(SALT_KEY, hex(mem.salt)); } else if (L) L.removeItem(SALT_KEY); } catch (e) { /* storage blocked */ }
    mem.cache = null;
  }
  function loadRemembered() {
    const L = ls(); let v = null; try { v = L && L.getItem(SALT_KEY); } catch (e) { v = null; }
    if (v && /^[0-9a-f]{32}$/.test(v)) { mem.remember = true; mem.salt = unhex(v); } return mem.remember;
  }
  function saltFor(seed) {
    if (mem.remember && mem.salt) return mem.salt;            // same device → same pattern on the next visit
    if (!mem.salt || mem.saltSeed !== seed) { mem.salt = newSalt(); mem.saltSeed = seed; mem.cache = null; } // per artwork
    return mem.salt;
  }
  async function pattern(seed, snap) {
    const S = snap || (D && D.snapshot()); if (!S || !S.passive) return null;
    const salt = saltFor(seed), text = canonical(S), key = seed + '|' + text + '|' + hex(salt);
    if (mem.cache && mem.cache.key === key) return mem.cache.value;
    const b = buckets(S), value = { dg: await digest(salt, text), db: dbCode(b), b };
    mem.cache = { key, value }; return value;
  }
  const setShare = (m) => { mem.share = m === 'pattern' ? 'pattern' : 'choices'; };
  const linkPart = (pat) => mem.share === 'pattern' && pat ? `&dg=${pat.dg}&db=${pat.db}` : '';

  function forgetEverything() {
    if (D) D.forget();
    mem.share = 'choices'; mem.remember = false; mem.salt = null; mem.saltSeed = null; mem.cache = null;
    const L = ls();
    try { if (L) Object.keys(L).filter(k => /^oracle\./.test(k)).forEach(k => L.removeItem(k)); } catch (e) { /* storage blocked */ }
    try { const SS = root.sessionStorage; if (SS) Object.keys(SS).filter(k => /^oracle\./.test(k)).forEach(k => SS.removeItem(k)); } catch (e) { /* none */ }
  }

  // ── privacy guard: raw reading strings that must never appear in a link, file, caption or storage ──
  function rawStrings(S) {
    const out = new Set();
    const add = (v) => { if (typeof v === 'string' && v.length >= 5 && !/^[\d\s.,%×x]+$/.test(v) && !/^(Not shared|Changes on every read|Details hidden)/.test(v)) out.add(v); };
    if (S && S.passive) for (const e of Object.values(S.passive)) {
      if (e.state === 'ok' || e.state === 'randomised') { add(e.value); if (e.raw) Object.values(e.raw).forEach(v => Array.isArray(v) ? v.forEach(add) : add(v)); }
    }
    return [...out];
  }
  const findRaw = (text, S) => rawStrings(S).filter(r => String(text).includes(r));

  const api = { SALT_KEY, buckets, count, canonical, digest, newSalt, dbCode, parseDb, parseDg, pattern, saltFor, setShare, linkPart,
    share: () => mem.share, remember: () => mem.remember, setRemember, loadRemembered, forgetEverything, rawStrings, findRaw, _hex: hex };
  root.OraclePrivacy = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
