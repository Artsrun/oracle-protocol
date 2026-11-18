/* ORACLE // DIGITAL REMAINS — fingerprint ring (engine 3 = layered engine + ring), v5.
 *
 * The ring is a set of concentric ridges around the core, drawn from COARSE BUCKETS and a salted digest only — never
 * from a raw reading (core/privacy.js makes both). It has its own random stream (seed|v3|device|<digest>), so no device
 * value can move the shards, lattice, network, flow or core: the five v4 layers are drawn by OracleLayers.compose()
 * exactly as for a v=2 link, and the ring's items are appended after them (group 'device').
 *
 * Device input `dev` (pure data, no readings):
 *   { mode: 'none' }                                      → withheld style: three dashed neutral circles
 *   { mode: 'pattern', dg: '8 hex', db: {gpu,cores,tzh} } → what a shared link/PNG carries (&v=3&dg=…&db=…)
 *   { mode: 'full', dg, db, b }                           → in this tab only: b = all buckets (OraclePrivacy.buckets)
 * The pattern part (ridge shape, loops, turn, colour) is identical in 'pattern' and 'full'; 'full' adds the in-tab
 * details (spacing, weight, breaks, texture, dots, dashes, glow, fill, horizon arc, vibration). */
(function (root) {
  'use strict';
  const A = root.OracleArt || (typeof require === 'function' ? require('./oracle-art.js') : null);
  const L = root.OracleLayers || (typeof require === 'function' ? require('./layers.js') : null);
  const VERSION = 1;
  const TAU = Math.PI * 2;
  const q = (v) => Math.round(v * 10000) / 10000;
  function psin(x) { x = x - TAU * Math.floor(x / TAU); let s = 1; if (x > Math.PI) { x -= Math.PI; s = -1; } return s * 16 * x * (Math.PI - x) / (5 * Math.PI * Math.PI - 4 * x * (Math.PI - x)); }
  const pcos = (x) => psin(x + Math.PI / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const GPU_ROLE = [1, 2, 0, 2, 1, 0, 2];                     // palette role per GPU class (never 3: red is the shards')
  const GPU_NAME = ['generic', 'Apple', 'Intel', 'NVIDIA', 'AMD', 'Qualcomm', 'Arm'];
  const DG = /^[0-9a-f]{8}$/, DB = /^[XAINDQR][X0-4][X0-9A-HJKMNP-T]$/;
  const GPU_CODE = 'XAINDQR', CORE_CODE = '01234', TZ_CODE = '0123456789ABCDEFGHJKMNPQRST';
  const WITHHELD = Object.freeze({ mode: 'none' });

  // A link's device part. Anything malformed → withheld (never throws, never guesses).
  function parseDevice(query) {
    const s = String(query || ''), dg = (s.match(/(?:^|&)dg=([^&]*)/) || [])[1], db = (s.match(/(?:^|&)db=([^&]*)/) || [])[1];
    if (!dg || !db || !DG.test(dg) || !DB.test(db)) return WITHHELD;
    return { mode: 'pattern', dg, db: { gpu: db[0] === 'X' ? null : GPU_CODE.indexOf(db[0]), cores: db[1] === 'X' ? null : CORE_CODE.indexOf(db[1]), tzh: db[2] === 'X' ? null : TZ_CODE.indexOf(db[2]) - 12 } };
  }
  function norm(dev) {
    if (!dev || (dev.mode !== 'pattern' && dev.mode !== 'full') || !DG.test(String(dev.dg)) || !dev.db) return WITHHELD;
    const db = { gpu: dev.db.gpu == null ? null : dev.db.gpu | 0, cores: dev.db.cores == null ? null : dev.db.cores | 0, tzh: dev.db.tzh == null ? null : dev.db.tzh | 0 };
    return dev.mode === 'full' && dev.b ? { mode: 'full', dg: dev.dg, db, b: dev.b } : { mode: 'pattern', dg: dev.dg, db };
  }
  // The shareable subset of an in-tab device (what 'pattern' mode would export).
  const toPattern = (dev) => { const d = norm(dev); return d.mode === 'none' ? WITHHELD : { mode: 'pattern', dg: d.dg, db: d.db }; };

  // Geometry shared with the layered engine's base stream (center and core radius), without touching that stream.
  function frame(n, aspect) {
    const W = aspect >= 1 ? aspect : 1, H = aspect >= 1 ? 1 : 1 / aspect, b = A._rng(n.s + '|v2|base|' + aspect);
    for (let i = 0; i < 5; i++) b();
    return { W, H, cx: W / 2, cy: H / 2, RC: 0.25 + 0.05 * b() };
  }

  function ring(n, aspect, dev) {
    const { cx, cy, RC } = frame(n, aspect), lines = [], marks = [];
    const R0 = RC * 1.3, R1 = Math.min(RC * 2.05, 0.47);
    const push = (o) => lines.push(Object.assign({ g: 'device' }, o));
    const info = { mode: dev.mode, loops: 0, turn: 0, role: 1, details: [] };
    if (dev.mode === 'none') {
      [0.2, 0.5, 0.8].forEach(t => { const r = lerp(R0, R1, t);
        for (let k = 0; k < 48; k++) { const a0 = k * TAU / 48, a1 = a0 + TAU / 96; push({ c: 1, a: 0.16, w: 0.0008, pts: [cx + r * pcos(a0), cy + r * psin(a0), cx + r * pcos(a1), cy + r * psin(a1)] }); } });
      return { lines, marks, info };
    }
    const rr = A._rng(n.s + '|v3|device|' + dev.dg), db = dev.db, b = dev.mode === 'full' ? dev.b : {};
    const K = 3 + (db.cores == null ? 0 : db.cores), turn = (db.tzh == null ? 0 : db.tzh) * 15, role = db.gpu == null ? 1 : GPU_ROLE[db.gpu] || 1;
    Object.assign(info, { loops: K, turn, role, gpu: db.gpu });
    const harm = []; for (let h = 0; h < 4; h++) harm.push({ k: 2 + h + Math.floor(rr() * 3), amp: 0.004 + 0.012 * rr() / (1 + h * 0.5), ph: rr() * TAU });
    const jit = []; for (let j = 0; j < 7; j++) jit.push(rr() * TAU);
    const N = 144, rot = turn * Math.PI / 180;
    // in-tab details (bucket → parameter); absent buckets → neutral defaults
    const spread = b.aspect == null ? 1 : 0.9 + 0.05 * b.aspect, wt = (b.mem == null ? 0.0010 : 0.0008 + 0.0003 * b.mem) * (b.dpr === 3 ? 1.1 : 1);
    const gaps = b.langs == null ? 0 : b.langs - 1, dots = b.fonts == null ? 0 : b.fonts, endDots = !!b.touch;
    const dash = b.net == null ? 0 : [3, 5, 8][b.net], glow = b.bat == null ? 0 : 0.06 * b.bat + (b.charging ? 0.06 : 0);
    const vib = b.mic == null || b.mic < 0 ? 0 : 0.0015 * (b.mic + 1), fillDark = b.dark === true;
    if (dev.mode === 'full') info.details = [gaps && 'breaks', dots && 'dotted texture', endDots && 'dot endings', dash && 'dashed rhythm', glow && 'glow', fillDark && 'filled ridge', b.loc && 'horizon arc', vib && 'vibration'].filter(Boolean);
    for (let j = 0; j < K; j++) {
      const r0 = lerp(R0, R0 + (R1 - R0) * spread, (j + 0.5) / K), pts = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N * TAU + rot; let r = r0;
        for (const h of harm) r += h.amp * psin(h.k * t + h.ph + j * 0.35);
        r += 0.0012 * psin(31 * t + jit[j]) + vib * psin(57 * t + j);
        pts.push(cx + r * pcos(t), cy + r * psin(t));
      }
      const a = 0.42 + glow - j * 0.025;
      // outer ridge: breaks (languages); odd ridges: dash rhythm (network); others: one closed line
      const segs = [];
      if (j === K - 1 && gaps) { const per = Math.floor(N / gaps); for (let g = 0; g < gaps; g++) segs.push([g * per, g * per + per - 8]); }
      else if (dash && j % 2 === 1) { for (let s = 0; s + dash <= N; s += dash * 2) segs.push([s, s + dash]); }
      else segs.push([0, N]);
      for (const [s0, s1] of segs) {
        push({ c: role, a, w: wt, pts: pts.slice(s0 * 2, s1 * 2 + 2) });
        if (endDots && segs.length > 1) for (const e of [s0, s1]) marks.push(dot(pts[e * 2], pts[e * 2 + 1], 0.003, role, 0.8));
      }
      if (fillDark && j === 0) marks.push({ g: 'device', c: role, a: 0.06, fill: true, pts: pts.slice(0, N * 2) });
      if (dots && j === K - 1) for (let i = 0; i < N; i += [0, 12, 6][dots]) marks.push(dot(pts[i * 2], pts[i * 2 + 1], 0.002, role, 0.7));
    }
    if (b.loc) { // horizon arc: north → above, south → below; latitude band → height
      const up = b.loc.hemi === 'N' ? -1 : 1, rA = R1 + 0.02 + 0.012 * b.loc.band, pts = [];
      for (let i = 0; i <= 24; i++) { const t = (up < 0 ? Math.PI : 0) + (i / 24) * Math.PI; pts.push(cx + rA * pcos(t), cy + rA * psin(t)); }
      push({ c: role, a: 0.3, w: 0.0009, pts });
    }
    return { lines, marks, info };
  }
  const dot = (x, y, s, c, a) => ({ g: 'device', c, a, pts: [x, y - s, x + s * 0.866, y + s * 0.5, x - s * 0.866, y + s * 0.5] });

  /** Engine 3: the layered scene, unchanged, plus the ring. */
  function compose(p, aspect, dev) {
    const n = A.normalize(p); aspect = Math.round((aspect || 1) * 10000) / 10000;
    const d = norm(dev), scene = L.compose(n, aspect), R = ring(n, aspect, d);
    const qz = (o) => { o.pts = o.pts.map(q); o.a = q(o.a); if (o.w != null) o.w = q(o.w); return o; };
    scene.layers[0].items.push(...R.lines.map(qz));
    scene.layers[3].items.push(...R.marks.map(qz));
    scene.engine = 3; scene.ring = R.info;
    return scene;
  }
  const compositionId = (p, dev) => 'C-' + A.sceneHash(compose(p, 1, dev)).slice(0, 10);
  /** Text alternative for the ring (used in the canvas label, Reveal card and caption). */
  function describe(dev) {
    const d = norm(dev);
    if (d.mode === 'none') return 'Device ring withheld: dashed circles stand in for it.';
    const K = 3 + (d.db.cores == null ? 0 : d.db.cores), turn = (d.db.tzh == null ? 0 : d.db.tzh) * 15;
    const extra = d.mode === 'full' ? ring(A.normalize({ s: 'ORACLE-0000-0000' }), 1, d).info.details : [];
    return `Device ring: ${K} ridge loops, turned ${turn}\u00b0` + (d.db.gpu != null && d.db.gpu > 0 ? `, ${GPU_NAME[d.db.gpu]} colour` : '') + (extra.length ? `, ${extra.join(', ')}` : '') + '.';
  }
  const interpret = (p, dev) => L.interpret(p) + ' ' + describe(dev);
  function caption(p, id, link, dev) {
    const n = A.normalize(p), d = toPattern(dev);
    return `ORACLE // DIGITAL REMAINS \u2014 ${n.s} \u00b7 ${id}\n${L.interpret(n)} ${describe(d)}\n` +
      (d.mode === 'none' ? 'Made in my browser from my answers only \u2014 no personal data, no server.'
        : 'Made in my browser from my answers and a salted device pattern \u2014 no readings, no server.') + (link ? `\n${link}` : '') + '\n#OracleProtocol';
  }

  // The device the screens draw with right now (set by the app from the Device step or a v=3 link). Data only.
  let ctx = WITHHELD;
  const setContext = (dev) => { ctx = norm(dev); return ctx; };
  const context = () => ctx;

  const api = { VERSION, setContext, context, GPU_ROLE, WITHHELD, parseDevice, norm, toPattern, compose, compositionId, describe, interpret, caption, _ring: ring };
  root.OracleFingerprint = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
