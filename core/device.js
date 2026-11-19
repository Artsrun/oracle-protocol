/* ORACLE PROTOCOL v5 — device readers for step 3 "Device" (docs/PLAN-v5.md §4, §7, §9).
 * Classic script + CommonJS (unit-tested in Node with a fake environment).
 *
 * Consent gate: nothing here runs on its own. readPassive() refuses to read until the visitor taps Show me
 * (allowPassive()); requestTilt / readLocation / readMic are called only from the Allow tap of their card.
 * Memory only: readings live in this module's `mem` object and nowhere else. They are never written to storage, links,
 * history or files; core/privacy.js turns them into coarse buckets, and only buckets reach the artwork.
 * Every reading has a state: ok · unavailable (the browser does not share it) · denied (the visitor said no) ·
 * randomised (the browser deliberately changes it, e.g. Brave) — never a made-up value.
 *   OracleDevice.allowPassive(); await OracleDevice.readPassive()  → { browser, langs, … } (one entry per signal)
 *   await OracleDevice.requestTilt(onPose) / stopTilt()              → { state }
 *   await OracleDevice.readLocation()                                → { state, band, hemi, shown }  (shown: once, not kept)
 *   await OracleDevice.readMic(2000)                                 → { state, dbfs, level }        (dbfs: once, not kept)
 *   OracleDevice.snapshot() · OracleDevice.forget() · OracleDevice.stopAll() */
(function (root) {
  'use strict';
  const FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Helvetica', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
    'Trebuchet MS', 'Impact', 'Lucida Console', 'Tahoma', 'Geneva', 'Optima', 'Futura', 'Gill Sans', 'Baskerville', 'Didot'];
  const GPU_CLASSES = ['generic', 'apple', 'intel', 'nvidia', 'amd', 'qualcomm', 'arm'];
  const OK = 'ok', NA = 'unavailable', DENIED = 'denied', RAND = 'randomised';
  const mem = { consent: { passive: false }, passive: null, masking: null, brave: null, tilt: null, location: null, mic: null };
  const live = { tiltHandler: null, tiltWin: null, streams: [], ctx: [], timers: [] };

  function envOf(env) {
    if (env) return env;
    const g = root;
    return { navigator: g.navigator, screen: g.screen, window: g, document: g.document, Intl: g.Intl, Date: g.Date,
      matchMedia: g.matchMedia ? (q) => g.matchMedia(q) : null, canvas: () => g.document.createElement('canvas') };
  }
  const timeout = (p, ms, fallback) => new Promise(res => { let done = false; const t = setTimeout(() => { if (!done) { done = true; res(fallback); } }, ms);
    Promise.resolve(p).then(v => { if (!done) { done = true; clearTimeout(t); res(v); } }, () => { if (!done) { done = true; clearTimeout(t); res(fallback); } }); });
  const entry = (id, state, value, raw, api, note) => ({ id, state, value: value == null ? '' : String(value), raw: raw == null ? null : raw, api, note: note || '' });
  const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };

  // ── pure helpers (unit-tested) ─────────────────────────────────────────
  function parseUA(ua) {
    ua = String(ua || '');
    let browser = 'A browser', version = '';
    const m = (re) => { const x = re.exec(ua); return x ? x[1].split('.')[0] : null; };
    if (m(/Edg(?:A|iOS)?\/([\d.]+)/)) { browser = 'Edge'; version = m(/Edg(?:A|iOS)?\/([\d.]+)/); }
    else if (m(/OPR\/([\d.]+)/)) { browser = 'Opera'; version = m(/OPR\/([\d.]+)/); }
    else if (m(/(?:Firefox|FxiOS)\/([\d.]+)/)) { browser = 'Firefox'; version = m(/(?:Firefox|FxiOS)\/([\d.]+)/); }
    else if (m(/(?:Chrome|CriOS)\/([\d.]+)/)) { browser = 'Chrome'; version = m(/(?:Chrome|CriOS)\/([\d.]+)/); }
    else if (m(/Version\/([\d.]+).*Safari/)) { browser = 'Safari'; version = m(/Version\/([\d.]+).*Safari/); }
    let os = 'an unknown system';
    if (/Android/.test(ua)) os = 'Android'; else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS'; else if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS'; else if (/CrOS/.test(ua)) os = 'ChromeOS'; else if (/Linux/.test(ua)) os = 'Linux';
    const mobile = /Mobile|iPhone|Android/.test(ua);
    return { browser, version, os, mobile };
  }
  function gpuClass(...strs) {
    const s = strs.filter(Boolean).join(' ').toLowerCase();
    if (/apple|\bm[1-9]\b/.test(s)) return 'apple';
    if (/nvidia|geforce|quadro|\brtx\b|\bgtx\b/.test(s)) return 'nvidia';
    if (/\bamd\b|radeon|\bati\b/.test(s)) return 'amd';
    if (/qualcomm|adreno/.test(s)) return 'qualcomm';
    if (/\bmali\b|\barm\b|immortalis/.test(s)) return 'arm';
    if (/intel|iris|uhd graphics|hd graphics/.test(s)) return 'intel';
    return 'generic';
  }
  const latBand = (lat) => Math.min(2, Math.floor(Math.abs(lat) / 30));
  const levelOf = (dbfs) => dbfs < -50 ? 'quiet' : dbfs > -25 ? 'loud' : 'room';
  const BAND_LABEL = ['0–30°', '30–60°', '60–90°'];

  // ── passive readers (after Show me) ───────────────────────────────────
  function webgl(E) {
    try {
      const c = E.canvas(), gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return null;
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      return { renderer: String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)), vendor: String(dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)), unmasked: !!dbg };
    } catch (e) { return null; }
  }
  function fonts(E) {
    try {
      const x = E.canvas().getContext('2d'); if (!x) return null;
      x.font = '72px monospace'; const base = x.measureText('mmmmmmmmmmlli').width;
      return FONTS.filter(f => { x.font = `72px ${f}, monospace`; return x.measureText('mmmmmmmmmmlli').width !== base; });
    } catch (e) { return null; }
  }
  function canvasSig(E) {
    const once = () => {
      const c = E.canvas(); c.width = 240; c.height = 60; const x = c.getContext('2d'); if (!x) return null;
      x.fillStyle = '#0a1825'; x.fillRect(0, 0, 240, 60); x.fillStyle = '#00e5ff'; x.font = '14px Arial'; x.fillText('Oracle v5 \u2318 \u00e9', 8, 30);
      x.strokeStyle = '#ffab00'; x.beginPath(); x.arc(210, 30, 15, 0, Math.PI * 2); x.stroke();
      return fnv(c.toDataURL());
    };
    try { const a = once(), b = once(); return a ? { sig: a, stable: a === b } : null; } catch (e) { return null; }
  }
  async function battery(E) {
    const n = E.navigator; if (!n || typeof n.getBattery !== 'function') return null;
    return timeout(n.getBattery().then(b => ({ level: Math.round(b.level * 100), charging: !!b.charging })), 1500, null);
  }
  async function webgpu(E) {
    const g = E.navigator && E.navigator.gpu; if (!g || typeof g.requestAdapter !== 'function') return null;
    return timeout(g.requestAdapter().then(a => {
      if (!a) return { none: true };
      const i = a.info || {}; return { vendor: i.vendor || '', architecture: i.architecture || '', description: i.description || i.device || '' };
    }), 1500, null);
  }
  async function isBrave(env) {
    const E = envOf(env), b = E.navigator && E.navigator.brave;
    if (!b || typeof b.isBrave !== 'function') return false;
    return !!(await timeout(b.isBrave(), 500, false));
  }

  // ── v7 F3: masking checks (docs/PLAN-v7.md F3, D10–D11). Run only inside readPassive(), i.e. after Show me.
  // They keep booleans and reason codes only — no new raw value. A flagged reading becomes "randomised", so
  // core/privacy.js already leaves it out of the art buckets and the digest.
  //   M1 known answer: a fixed 16×16 opaque image put and read back, and a solid integer fillRect read back. Any change
  //      means the browser adds readback noise (Brave farbling, Firefox canvas randomisation; Safari ATFP noises painted
  //      pixels only — INFERRED until tested on a device).
  //   M2 repeat read: two canvas signatures differ (the v5 check).
  //   M3 native integrity: each getter or method we read must stringify as native code, have no `prototype`, and not
  //      be shadowed on the instance (an extension that rewrites a value usually fails one of these).
  //   M4 consistency: the time-zone name's offset must equal Date's offset (a real UTC user passes); the screen size must
  //      match CSS device-width AND device-height (±1 px, either orientation) — two mismatches needed, so zoom or a
  //      second monitor alone does not flag.
  const MASK_NOTE = {
    m1: 'Your browser changes canvas reads (known-answer check).',
    m2: 'Your browser adds noise to canvas reads.',
    m3: 'An extension or setting changes this value.',
    m4tz: 'Time-zone name and clock offset disagree.',
    m4screen: 'Screen size and CSS device size disagree.'
  };
  const M3_LIST = [
    ['Navigator', 'hardwareConcurrency', 'get', 'cores'], ['Navigator', 'deviceMemory', 'get', 'memory'],
    ['Navigator', 'userAgent', 'get', 'browser'], ['Navigator', 'languages', 'get', 'langs'],
    ['Screen', 'width', 'get', 'screen'], ['Screen', 'height', 'get', 'screen'],
    ['HTMLCanvasElement', 'toDataURL', 'value', 'canvas'], ['CanvasRenderingContext2D', 'getImageData', 'value', 'canvas'],
    ['CanvasRenderingContext2D', 'measureText', 'value', 'fonts'], ['WebGLRenderingContext', 'getParameter', 'value', 'gpu'],
    ['Date', 'getTimezoneOffset', 'value', 'tz'], ['Intl.DateTimeFormat', 'resolvedOptions', 'value', 'tz']
  ];
  const fnToString = Function.prototype.toString;
  function isNative(fn) {
    if (typeof fn !== 'function') return true; // absent: nothing to judge
    let s = ''; try { s = fnToString.call(fn); } catch (e) { return false; }
    return /\{\s*\[native code\]\s*\}\s*$/.test(s) && !Object.prototype.hasOwnProperty.call(fn, 'prototype');
  }
  function m1(E) {
    try {
      const c = E.canvas(); c.width = 16; c.height = 16;
      const x = c.getContext('2d', { willReadFrequently: true });
      if (!x || typeof x.putImageData !== 'function' || typeof x.getImageData !== 'function' || typeof x.createImageData !== 'function') return null;
      const img = x.createImageData(16, 16), d = img.data; let r = 0x9e3779b9;
      for (let i = 0; i < d.length; i += 4) { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; d[i] = r >>> 24; d[i + 1] = (r >>> 16) & 255; d[i + 2] = (r >>> 8) & 255; d[i + 3] = 255; }
      x.putImageData(img, 0, 0);
      const a = x.getImageData(0, 0, 16, 16).data; let put = false;
      for (let i = 0; i < d.length; i++) if (a[i] !== d[i]) { put = true; break; }
      x.fillStyle = '#3c6e91'; x.fillRect(0, 0, 16, 16);
      const b = x.getImageData(0, 0, 16, 16).data; let paint = false;
      for (let i = 0; i < b.length; i += 4) if (b[i] !== 0x3c || b[i + 1] !== 0x6e || b[i + 2] !== 0x91 || b[i + 3] !== 255) { paint = true; break; }
      c.width = c.height = 0;
      return { put, paint };
    } catch (e) { return null; }
  }
  function m3(E) {
    const W = E.window || {}, out = [];
    const protoOf = (name) => { const parts = name.split('.'); let o = W; for (const k of parts) o = o && o[k]; return o && o.prototype; };
    const inst = { Navigator: E.navigator, Screen: E.screen };
    let ran = false;
    for (const [owner, prop, kind, id] of M3_LIST) {
      const proto = protoOf(owner); if (!proto) continue;
      const d = Object.getOwnPropertyDescriptor(proto, prop); if (!d) continue;
      ran = true;
      const shadow = inst[owner] && Object.prototype.hasOwnProperty.call(inst[owner], prop);
      if (shadow || !isNative(kind === 'get' ? d.get : d.value)) out.push(id);
    }
    return ran ? [...new Set(out)] : null;
  }
  function tzOffsetMin(E, name, date) {
    try {
      const p = E.Intl.DateTimeFormat('en-US', { timeZone: name, timeZoneName: 'longOffset' }).formatToParts(date).find(x => x.type === 'timeZoneName');
      const m = /^GMT(?:([+-\u2212])(\d{1,2})(?::?(\d{2}))?)?$/.exec(p && p.value || ''); if (!m) return null;
      return m[1] ? (m[1] === '+' ? 1 : -1) * (+m[2] * 60 + +(m[3] || 0)) : 0;
    } catch (e) { return null; }
  }
  function m4(E, tzName) {
    const res = { tz: null, screen: null };
    try {
      const now = new E.Date(); const off = typeof now.getTimezoneOffset === 'function' ? -now.getTimezoneOffset() : null;
      const want = tzName && off != null ? tzOffsetMin(E, tzName, now) : null;
      if (want != null) res.tz = want !== off;
    } catch (e) { res.tz = null; }
    const sc = E.screen || {}, mm = E.matchMedia, w = +sc.width || 0, h = +sc.height || 0;
    let known = false; try { known = !!(mm && mm('(min-device-width: 0px)').matches && mm('(min-device-height: 0px)').matches); } catch (e) { known = false; }
    if (known && w && h) { // the browser must understand device-width/height (deprecated in CSS, still supported)
      const fits = (k, v) => { try { return mm(`(min-device-${k}: ${v - 1}px) and (max-device-${k}: ${v + 1}px)`).matches; } catch (e) { return null; } };
      const a = [fits('width', w), fits('height', h)], b = [fits('width', h), fits('height', w)];
      if (!a.includes(null) && !b.includes(null)) res.screen = !(a[0] || b[0]) && !(a[1] || b[1]);
    }
    return res;
  }
  /** masking(E, cs) → { ran: {m1,m2,m3,m4}, flags: { readingId: [reason codes] } }. cs = the v5 canvas signature result. */
  function masking(env, cs, tzName) {
    const E = envOf(env), flags = {}, add = (id, code) => { (flags[id] = flags[id] || []).includes(code) || flags[id].push(code); };
    const k1 = m1(E), k3 = m3(E), k4 = m4(E, tzName);
    if (k1 && (k1.put || k1.paint)) { add('canvas', 'm1'); add('fonts', 'm1'); }
    if (cs && !cs.stable) add('canvas', 'm2');
    if (k3) k3.forEach(id => add(id, 'm3'));
    if (k4.tz) add('tz', 'm4tz');
    if (k4.screen) add('screen', 'm4screen');
    return { ran: { m1: !!k1, m2: !!cs, m3: !!k3, m4: k4.tz != null || k4.screen != null }, flags };
  }

  async function readPassive(env) {
    if (!mem.consent.passive) throw new Error('OracleDevice: passive readings need the visitor\u2019s Show me tap first');
    const E = envOf(env), n = E.navigator || {}, sc = E.screen || {}, W = E.window || {};
    const brave = await isBrave(E); mem.brave = brave;
    const R = {};
    const ua = parseUA(n.userAgent);
    R.browser = entry('browser', OK, `${brave ? 'Brave' : ua.browser}${ua.version && !brave ? ' ' + ua.version : ''} on ${ua.os}`, { browser: brave ? 'Brave' : ua.browser, version: ua.version, os: ua.os, mobile: ua.mobile }, 'navigator.userAgent');
    const langs = Array.from(n.languages || (n.language ? [n.language] : []));
    R.langs = langs.length ? entry('langs', OK, langs.join(', '), { count: langs.length, list: langs }, 'navigator.languages') : entry('langs', NA, 'Not shared', null, 'navigator.languages');
    let tz = '', off = null;
    try { tz = E.Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { tz = ''; }
    try { off = -new E.Date().getTimezoneOffset() / 60; } catch (e) { off = null; }
    const offLabel = off == null ? '' : 'UTC' + (off >= 0 ? '+' : '\u2212') + (Math.abs(off) % 1 ? Math.abs(off).toFixed(2).replace(/0$/, '') : Math.abs(off));
    R.tz = off == null ? entry('tz', NA, 'Not shared', null, 'Intl.DateTimeFormat') : entry('tz', OK, [tz.replace(/_/g, ' '), offLabel].filter(Boolean).join(', '), { name: tz, offsetH: off }, 'Intl.DateTimeFormat + Date.getTimezoneOffset');
    const dpr = +W.devicePixelRatio || 1, sw = +sc.width || 0, sh = +sc.height || 0;
    R.screen = sw && sh ? entry('screen', OK, `${sw} \u00d7 ${sh} at ${+dpr.toFixed(2)}\u00d7`, { w: sw, h: sh, dpr, depth: +sc.colorDepth || null }, 'screen.width/height + devicePixelRatio') : entry('screen', NA, 'Not shared', null, 'screen');
    const tp = +n.maxTouchPoints || 0;
    R.touch = entry('touch', OK, tp ? `${tp} touch point${tp === 1 ? '' : 's'}` : 'No touch screen', { points: tp }, 'navigator.maxTouchPoints');
    const cores = +n.hardwareConcurrency || 0;
    R.cores = cores ? entry('cores', brave ? RAND : OK, `${cores} cores`, { n: cores }, 'navigator.hardwareConcurrency', brave ? 'Brave reports a different number each session.' : '') : entry('cores', NA, 'Not shared', null, 'navigator.hardwareConcurrency');
    const dm = n.deviceMemory;
    R.memory = typeof dm === 'number' && dm > 0 ? entry('memory', brave ? RAND : OK, `about ${dm} GB memory`, { gb: dm }, 'navigator.deviceMemory', brave ? 'Brave reports a different number each session.' : '') : entry('memory', NA, 'Not shared by this browser', null, 'navigator.deviceMemory');
    const gl = webgl(E), gp = await webgpu(E);
    const cls = gpuClass(gl && gl.renderer, gl && gl.vendor, gp && gp.vendor, gp && gp.description);
    const glState = !gl ? NA : brave ? RAND : OK;
    R.gpu = entry('gpu', glState, gl ? gl.renderer : 'Not shared', gl ? { renderer: gl.renderer, vendor: gl.vendor, cls } : { cls }, 'WebGL (WEBGL_debug_renderer_info)', brave ? 'Brave shows every site a generic graphics name.' : '');
    const gpEmpty = gp && !gp.none && !gp.vendor && !gp.description;
    R.webgpu = !gp ? entry('webgpu', NA, 'Not shared by this browser', null, 'navigator.gpu.requestAdapter') :
      gp.none ? entry('webgpu', NA, 'No WebGPU adapter', null, 'navigator.gpu.requestAdapter') :
      entry('webgpu', brave && gpEmpty ? RAND : gpEmpty ? NA : OK, gpEmpty ? 'Details hidden' : [gp.vendor, gp.description || gp.architecture].filter(Boolean).join(' \u00b7 '), gp, 'navigator.gpu.requestAdapter', brave && gpEmpty ? 'Brave empties the adapter details.' : '');
    const cs = canvasSig(E);
    R.canvas = !cs ? entry('canvas', NA, 'Not shared', null, 'canvas.toDataURL') :
      entry('canvas', brave || !cs.stable ? RAND : OK, (brave || !cs.stable) ? 'Changes on every read' : 'signature ' + cs.sig, { sig: cs.sig, stable: cs.stable }, 'canvas.toDataURL', brave ? 'Brave adds noise to canvas reads.' : !cs.stable ? 'Your browser adds noise to canvas reads.' : '');
    const fl = fonts(E);
    R.fonts = !fl ? entry('fonts', NA, 'Not shared', null, 'measureText') : entry('fonts', brave ? RAND : OK, `${fl.length} of ${FONTS.length} test fonts`, { found: fl, count: fl.length }, 'CanvasRenderingContext2D.measureText', brave ? 'Brave adds noise to text measurements.' : '');
    let voices = null; try { const ss = W.speechSynthesis; voices = ss && typeof ss.getVoices === 'function' ? ss.getVoices().length : null; } catch (e) { voices = null; }
    R.voices = voices == null ? entry('voices', NA, 'Not shared', null, 'speechSynthesis.getVoices') : entry('voices', OK, `${voices} speech voice${voices === 1 ? '' : 's'}`, { n: voices }, 'speechSynthesis.getVoices');
    const bat = brave ? null : await battery(E);
    R.battery = brave ? entry('battery', NA, 'Brave gives every site the same value', null, 'navigator.getBattery', 'Brave turns the Battery API off.') :
      !bat ? entry('battery', NA, 'Not shared by this browser', null, 'navigator.getBattery') : entry('battery', OK, `${bat.level}%${bat.charging ? ', charging' : ''}`, bat, 'navigator.getBattery');
    const con = n.connection;
    R.network = con && con.effectiveType ? entry('network', OK, `${con.effectiveType} connection`, { type: con.effectiveType }, 'navigator.connection') : entry('network', NA, brave ? 'Brave turns this off' : 'Not shared by this browser', null, 'navigator.connection');
    let dark = null, rm = null; try { if (E.matchMedia) { dark = E.matchMedia('(prefers-color-scheme: dark)').matches; rm = E.matchMedia('(prefers-reduced-motion: reduce)').matches; } } catch (e) { /* none */ }
    R.scheme = dark == null ? entry('scheme', NA, 'Not shared', null, 'matchMedia') : entry('scheme', OK, `${dark ? 'Dark' : 'Light'} mode${rm ? ', reduced motion' : ''}`, { dark, reducedMotion: !!rm }, 'matchMedia(prefers-color-scheme)');
    const PKC = W.PublicKeyCredential;
    const pk = PKC && typeof PKC.isUserVerifyingPlatformAuthenticatorAvailable === 'function' ? await timeout(PKC.isUserVerifyingPlatformAuthenticatorAvailable(), 1500, null) : null;
    R.passkey = pk == null ? entry('passkey', NA, 'Not shared', null, 'PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable') : entry('passkey', OK, pk ? 'Can use passkeys' : 'No built-in passkeys', { available: !!pk }, 'PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable', 'A yes/no check. No passkey is created and no prompt is shown.');
    // v7 F3: masking checks; a flagged reading that was "ok" becomes "randomised" with the reason as its note.
    const mk = masking(E, cs, tz); mem.masking = mk;
    for (const [id, codes] of Object.entries(mk.flags)) {
      const e = R[id]; if (!e || e.state !== OK) continue;
      e.state = RAND; e.note = MASK_NOTE[codes[0]]; e.checks = codes.slice();
    }
    mem.passive = R;
    return R;
  }

  // ── permissioned readers (each only from its Allow tap) ────────────────
  async function requestTilt(onPose, env, waitMs) {
    const E = envOf(env), W = E.window || {};
    const DOE = W.DeviceOrientationEvent;
    if (!DOE) { mem.tilt = { state: NA }; return mem.tilt; }
    let perm = 'granted';
    try {
      if (typeof DOE.requestPermission === 'function') perm = await DOE.requestPermission();
      const DME = W.DeviceMotionEvent; if (perm === 'granted' && DME && typeof DME.requestPermission === 'function') await DME.requestPermission().catch(() => 'denied');
    } catch (e) { perm = 'denied'; }
    if (perm !== 'granted') { mem.tilt = { state: DENIED }; return mem.tilt; }
    stopTilt();
    let seen = false;
    const h = (e) => { if (e.beta == null && e.gamma == null) return; seen = true; if (onPose) onPose({ beta: +e.beta || 0, gamma: +e.gamma || 0 }); };
    W.addEventListener('deviceorientation', h, { passive: true }); live.tiltHandler = h; live.tiltWin = W;
    const t0 = Date.now(); while (!seen && Date.now() - t0 < (waitMs || 1200)) await new Promise(r => setTimeout(r, 60));
    if (!seen) { stopTilt(); mem.tilt = { state: NA }; return mem.tilt; }
    mem.tilt = { state: OK }; // live only: no pose is ever kept
    return mem.tilt;
  }
  function stopTilt() { if (live.tiltHandler && live.tiltWin) live.tiltWin.removeEventListener('deviceorientation', live.tiltHandler); live.tiltHandler = null; live.tiltWin = null; }

  function readLocation(env) {
    const E = envOf(env), g = E.navigator && E.navigator.geolocation;
    if (!g || typeof g.getCurrentPosition !== 'function') { mem.location = { state: NA }; return Promise.resolve({ state: NA }); }
    return new Promise(res => {
      let done = false; const fin = (v) => { if (done) return; done = true; res(v); };
      const t = setTimeout(() => { mem.location = { state: NA }; fin({ state: NA, note: 'No answer in 12 s' }); }, 12000);
      g.getCurrentPosition(p => {
        clearTimeout(t);
        const lat = +p.coords.latitude, lng = +p.coords.longitude;
        const keep = { state: OK, band: latBand(lat), hemi: lat >= 0 ? 'N' : 'S' };
        mem.location = keep; // only the band and hemisphere stay; the coordinates below are returned once and dropped
        fin({ ...keep, shown: `${Math.abs(lat).toFixed(1)}\u00b0 ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(1)}\u00b0 ${lng >= 0 ? 'E' : 'W'}` });
      }, err => {
        clearTimeout(t);
        const st = err && err.code === 1 ? DENIED : NA; mem.location = { state: st }; fin({ state: st });
      }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
    });
  }

  async function readMic(ms, env) {
    const E = envOf(env), md = E.navigator && E.navigator.mediaDevices, AC = E.window && (E.window.AudioContext || E.window.webkitAudioContext);
    if (!md || typeof md.getUserMedia !== 'function' || !AC) { mem.mic = { state: NA }; return mem.mic; }
    let stream;
    try { stream = await md.getUserMedia({ audio: true, video: false }); } catch (e) {
      mem.mic = { state: e && /NotAllowed|Security|Permission/i.test(e.name + e.message) ? DENIED : NA }; return mem.mic;
    }
    live.streams.push(stream);
    const ctx = new AC(); live.ctx.push(ctx);
    try {
      const an = ctx.createAnalyser(); an.fftSize = 2048; ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Float32Array(an.fftSize), vals = [];
      const end = Date.now() + (ms || 2000);
      while (Date.now() < end) {
        await new Promise(r => setTimeout(r, 100));
        an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
        vals.push(Math.sqrt(s / buf.length));
      }
      const rms = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      const dbfs = rms > 0 ? Math.max(-100, Math.round(20 * Math.log10(rms))) : -100;
      mem.mic = { state: OK, level: levelOf(dbfs) }; // the dB value is shown once and dropped
      return { ...mem.mic, dbfs };
    } catch (e) { mem.mic = { state: NA }; return mem.mic; }
    finally { stopStreams(); }
  }
  function stopStreams() {
    live.streams.forEach(s => { try { s.getTracks().forEach(t => t.stop()); } catch (e) { /* gone */ } }); live.streams = [];
    live.ctx.forEach(c => { try { c.close(); } catch (e) { /* closed */ } }); live.ctx = [];
  }
  function stopAll() { stopTilt(); stopStreams(); }
  function forget() { stopAll(); mem.consent.passive = false; mem.passive = null; mem.masking = null; mem.brave = null; mem.tilt = null; mem.location = null; mem.mic = null; }
  const snapshot = () => JSON.parse(JSON.stringify({ passive: mem.passive, brave: mem.brave, tilt: mem.tilt, location: mem.location, mic: mem.mic }));
  const hasAny = () => !!(mem.passive || (mem.location && mem.location.state === OK) || (mem.mic && mem.mic.state === OK));

  const api = { FONTS, GPU_CLASSES, BAND_LABEL, STATES: { OK, NA, DENIED, RAND }, parseUA, gpuClass, latBand, levelOf,
    allowPassive: () => { mem.consent.passive = true; }, passiveAllowed: () => mem.consent.passive,
    masking, isNative, MASK_NOTE, maskingResult: () => mem.masking && JSON.parse(JSON.stringify(mem.masking)),
    readPassive, requestTilt, stopTilt, readLocation, readMic, isBrave, stopAll, forget, snapshot, hasAny,
    get: () => mem };
  root.OracleDevice = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
