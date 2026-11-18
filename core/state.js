/* ORACLE PROTOCOL v4 — one store for the visitor's answers.
 * Classic script and CommonJS module (unit-tested in Node). Holds abstract choices only: never sensor readings,
 * never device data. The shape keeps the v2/v3 field names (offers, footprint, ex, lab) so links and the legacy
 * art engine read the same values.
 *   OracleState.create()              → store { get, dispatch(action), subscribe(fn) }
 *   OracleState.reduce(state, action) → new state (pure)
 *   OracleState.toParams(state)       → artwork parameters { s, o, f, d…i, e, r, t, k, a, n }
 *   OracleState.parseHash(hash)       → { route, params?, engine, fmt?, look? } */
(function (root) {
  'use strict';
  const SCHEMA = 4;
  const ENGINE_NEW = 2;     // layered engine (art/layers.js) for every artwork made in v4
  const ENGINE_V3 = 3;      // v5: layered engine + fingerprint ring (art/fingerprint.js); links carry v=3
  const ENGINE_LEGACY = 1;  // art/oracle-art.js for links made before v4 (no v=2 in the link)
  // Feed presets (toy ranker weights). Values measured in the handover (top-3 share round 0 → 4).
  const PRESETS = {
    newest: { e: 0, r: 0, w: 100, t: 0, k: 0, a: 0 },
    foryou: { e: 20, r: 90, w: 30, t: 20, k: 30, a: 30 },
    engaging: { e: 90, r: 30, w: 30, t: 60, k: 80, a: 80 }
  };
  const LAB_KEYS = ['e', 'r', 'w', 't', 'k', 'a'];
  // Which kinds of data each trade usually involves — OUR ASSUMPTION (a design default, labelled as such on screen),
  // read from each offer's "you give" text in data/content.js. Used only to pre-fill Footprint; the visitor corrects it.
  const OFFER_IDS = ['social', 'free', 'ai', 'devices', 'identity', 'entertainment'];
  const FOOTPRINT_IDS = ['identity', 'location', 'relationships', 'interests', 'purchases', 'conversations', 'surroundings', 'attention'];
  const TRADE_FOOTPRINT = {
    social: ['identity', 'relationships', 'interests'],
    free: ['interests', 'purchases', 'attention'],
    ai: ['conversations'],
    devices: ['conversations', 'location', 'surroundings'],
    identity: ['identity'],
    entertainment: ['attention', 'interests']
  };
  function prefillFootprint(offers) {
    let m = 0;
    OFFER_IDS.forEach((id, i) => { if ((offers >> i) & 1) TRADE_FOOTPRINT[id].forEach(f => { m |= 1 << FOOTPRINT_IDS.indexOf(f); }); });
    return m;
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || 0)));
  const bit = (mask, i, on) => (on == null ? !((mask >> i) & 1) : on) ? (mask | (1 << i)) : (mask & ~(1 << i)); // on omitted → toggle

  const presetOf = (lab) => Object.keys(PRESETS).find(id => LAB_KEYS.every(k => PRESETS[id][k] === lab[k])) || null;
  function initial() {
    return {
      schema: SCHEMA, engine: ENGINE_NEW, seed: null,
      offers: 0, footprint: 0, footprintEdited: false,
      ex: { d: 50, c: 50, p: 50, y: 50, x: 50, i: 50 },
      lab: { e: 50, r: 50, t: 30, k: 40, a: 40, n: 0, w: 30 },
      feed: null, format: 'portrait', title: true, look: null, fromUrl: false
    };
  }

  // deps: { deriveEx(offers) → ex, prefill(offers) → footprint mask } (from data/content.js); optional in tests.
  function reduce(s, a, deps) {
    deps = deps || {};
    const n = { ...s, ex: { ...s.ex }, lab: { ...s.lab } };
    switch (a.type) {
      case 'seed/set': n.seed = a.seed; break;
      case 'trade/toggle':
        n.offers = bit(s.offers, a.i, a.on);
        if (deps.deriveEx) n.ex = deps.deriveEx(n.offers);
        break;
      case 'footprint/prefill': // only while the visitor has not corrected the list themselves
        if (!s.footprintEdited && deps.prefill) n.footprint = deps.prefill(s.offers);
        break;
      case 'footprint/toggle': n.footprint = bit(s.footprint, a.i, a.on); n.footprintEdited = true; break;
      case 'feed/pick': {
        const p = PRESETS[a.id]; if (!p) return s;
        n.feed = a.id; Object.assign(n.lab, p); break;
      }
      case 'tune/set':
        if (!LAB_KEYS.includes(a.key)) return s;
        n.lab[a.key] = clamp(a.value, 0, 100);
        n.feed = Object.keys(PRESETS).find(id => LAB_KEYS.every(k => PRESETS[id][k] === n.lab[k])) || null;
        break;
      case 'rounds/run': n.lab.n = clamp(s.lab.n + (a.k || 1), 0, 12); break;
      case 'rounds/reset': n.lab.n = 0; break;
      case 'format/set': n.format = a.format; break;
      case 'title/set': n.title = !!a.on; break;
      case 'look/set': n.look = a.look || null; break;
      case 'restore': { // from a link or a saved artwork; keeps the engine the link was made with
        const p = a.params;
        n.seed = p.s; n.offers = p.o; n.footprint = p.f; n.footprintEdited = true;
        n.ex = { d: p.d, c: p.c, p: p.p, y: p.y, x: p.x, i: p.i };
        n.lab = { ...n.lab, e: p.e, r: p.r, t: p.t, k: p.k, a: p.a, n: p.n };
        n.feed = Object.keys(PRESETS).find(id => ['e', 'r', 't', 'k', 'a'].every(k => PRESETS[id][k] === n.lab[k])) || null;
        n.engine = a.engine === ENGINE_NEW || a.engine === ENGINE_V3 ? a.engine : ENGINE_LEGACY;
        n.fromUrl = !!a.fromUrl;
        if (a.format) n.format = a.format;
        if ('look' in a) n.look = a.look;
        break;
      }
      case 'reset': return { ...initial(), seed: a.seed || null };
      default: return s;
    }
    return n;
  }

  function toParams(s) {
    return { s: s.seed, o: s.offers, f: s.footprint, ...s.ex, e: s.lab.e, r: s.lab.r, t: s.lab.t, k: s.lab.k, a: s.lab.a, n: s.lab.n };
  }

  // Hash routes: '#offer', '#revelation?…', '#art?…'. Links with v=2 were made on the layered engine.
  function parseHash(hash, decode, lists) {
    const h = String(hash || '').replace(/^#/, '');
    const [route, query] = h.split('?');
    const out = { route: route || '' };
    if ((route === 'art' || route === 'revelation') && query && decode) {
      out.params = decode(query);
      out.engine = /(?:^|&)v=3(?:&|$)/.test(query) ? ENGINE_V3 : /(?:^|&)v=2(?:&|$)/.test(query) ? ENGINE_NEW : ENGINE_LEGACY;
      if (out.engine === ENGINE_V3) { // the device pattern part, validated; anything malformed → withheld
        const dg = /(?:^|&)dg=([0-9a-f]{8})(?:&|$)/.exec(query), db = /(?:^|&)db=([XAINDQR][X0-4][X0-9A-HJKMNP-T])(?:&|$)/.exec(query);
        out.device = dg && db ? { dg: dg[1], db: db[1] } : null;
      }
      const fm = /(?:^|&)fmt=(portrait|story|square|hires)/.exec(query); if (fm) out.fmt = fm[1];
      const L = lists || { PALETTES: ['observatory'], TYPES: ['signal'] };
      const g = (k, list) => { const m = new RegExp('(?:^|&)' + k + '=([a-z]+)').exec(query); return m && list.includes(m[1]) ? m[1] : null; };
      const pal = g('pal', L.PALETTES), th = g('th', ['dark', 'light']), ty = g('ty', L.TYPES);
      // A link that carries a look keeps it. #art links without one predate theming: legacy look.
      // A plain #revelation?… link follows the site theme.
      if (pal || th || ty) out.look = { pal: pal || 'observatory', th: th || 'dark', ty: ty || 'signal' };
      else out.look = route === 'art' ? { pal: 'observatory', th: 'dark', ty: 'signal' } : null;
    }
    return out;
  }

  function create(init, deps) {
    let s = init || initial();
    const subs = new Set();
    return {
      get: () => s,
      dispatch(a) { const prev = s; const nx = reduce(s, a, deps); if (JSON.stringify(nx) === JSON.stringify(prev)) return s; s = nx; if (s !== prev) subs.forEach(fn => fn(s, prev, a)); return s; },
      subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
    };
  }

  const api = { presetOf, OFFER_IDS, FOOTPRINT_IDS, TRADE_FOOTPRINT, prefillFootprint, SCHEMA, ENGINE_NEW, ENGINE_V3, ENGINE_LEGACY, PRESETS, LAB_KEYS, initial, reduce, toParams, parseHash, create };
  root.OracleState = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
