/* ORACLE // DIGITAL REMAINS — isolated, deterministic generative-art module.
 *
 * Contract
 *   - Inputs are ONLY the seed and abstract composition parameters chosen by the visitor (see KEYS).
 *     No sensor readings, location, device identifiers or personal data are accepted: unknown keys are dropped.
 *   - compose(params, aspect) is pure: same (params, aspect) → identical scene (quantized to 1e-4), on any platform.
 *   - render(ctx, scene, w, h, opts) only touches the 2D context it is given.
 *   - No network, no storage, no DOM lookups. Works in Node for tests (compose/hash/encode only).
 *
 * Techniques: cyrb128 → sfc32 PRNG; triangular lattice (barycentric lattice idea from ascii-principal-motion,
 * re-implemented); Sierpiński recursion; seeded sinusoidal vector field with attractor; radial-swirl warp.
 */
(function (root) {
  'use strict';
  const VERSION = 1;

  // ── parameters ───────────────────────────────────────────────────────────
  // s seed · o offers bitmask (6) · f footprint bitmask (8)
  // exchange: d disclosure c convenience p personalization y dependency x exposure i influence (0–100)
  // attention lab: e emotion r relevance t repetition k social a amplification (0–100) · n feedback rounds (0–12)
  const RANGES = { o: [0, 63], f: [0, 255], d: [0, 100], c: [0, 100], p: [0, 100], y: [0, 100], x: [0, 100], i: [0, 100],
    e: [0, 100], r: [0, 100], t: [0, 100], k: [0, 100], a: [0, 100], n: [0, 12] };
  const DEFAULTS = { s: 'ORACLE-0000-0000', o: 0, f: 0, d: 50, c: 50, p: 50, y: 50, x: 50, i: 50, e: 50, r: 50, t: 30, k: 40, a: 40, n: 0 };
  const KEY_ORDER = ['s', 'o', 'f', 'd', 'c', 'p', 'y', 'x', 'i', 'e', 'r', 't', 'k', 'a', 'n'];
  const SEED_RE = /^ORACLE-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;
  const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford

  const clampInt = (v, lo, hi, dflt) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
  };
  function normalize(p) {
    p = p || {};
    const out = {};
    const seed = String(p.s || '').toUpperCase().trim();
    out.s = SEED_RE.test(seed) ? seed : DEFAULTS.s;
    for (const k of KEY_ORDER.slice(1)) out[k] = clampInt(p[k], RANGES[k][0], RANGES[k][1], DEFAULTS[k]);
    return out;
  }
  const canonical = (p) => { const n = normalize(p); return 'v' + VERSION + '|' + KEY_ORDER.map(k => n[k]).join('|'); };
  const encode = (p) => { const n = normalize(p); return KEY_ORDER.map(k => k + '=' + encodeURIComponent(n[k])).join('&'); };
  function decode(str) {
    const q = String(str || '').replace(/^[#?]*(art|revelation)?\??/, '');
    const raw = {};
    for (const part of q.split('&')) {
      const [k, v] = part.split('=');
      if (k && Object.prototype.hasOwnProperty.call(DEFAULTS, k)) raw[k] = decodeURIComponent(v || '');
    }
    return normalize(raw);
  }
  function newSeed(randomBytes) {
    const bytes = randomBytes ? randomBytes(8) : (root.crypto && root.crypto.getRandomValues(new Uint8Array(8)));
    let s = '';
    for (let i = 0; i < 8; i++) s += B32[bytes[i] & 31];
    return 'ORACLE-' + s.slice(0, 4) + '-' + s.slice(4);
  }

  // ── PRNG ─────────────────────────────────────────────────────────────────
  function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
  }
  function sfc32(a, b, c, d) {
    return function () {
      a |= 0; b |= 0; c |= 0; d |= 0;
      const t = (((a + b) | 0) + d) | 0;
      d = (d + 1) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  const rngFor = (str) => { const h = cyrb128(str); const r = sfc32(h[0], h[1], h[2], h[3]); for (let i = 0; i < 12; i++) r(); return r; };

  // ── helpers ──────────────────────────────────────────────────────────────
  const popcount = (n) => { let c = 0; while (n) { c += n & 1; n >>>= 1; } return c; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  const q = (v) => Math.round(v * 10000) / 10000; // quantize → platform independent scene
  // Math.sin/cos/exp are not guaranteed bit-identical across engines; quantizing their results at 1e-4 keeps the
  // scene stable in practice. Polynomial sine below avoids engine differences in the hot field function entirely.
  const TAU = Math.PI * 2;
  function psin(x) { // deterministic sine approximation (Bhaskara-style refined), |err| < 2e-3
    x = x - TAU * Math.floor(x / TAU);
    let sign = 1;
    if (x > Math.PI) { x -= Math.PI; sign = -1; }
    const y = 16 * x * (Math.PI - x) / (5 * Math.PI * Math.PI - 4 * x * (Math.PI - x));
    return sign * y;
  }
  const pcos = (x) => psin(x + Math.PI / 2);

  // Scene items carry a colour *role* index; the palette is applied only at render time, so the
  // composition (and its Composition ID) is identical across themes. Roles: 0 ink · 1 signal · 2 trace · 3 alert · 4 slate.
  // Values mirror theme.css (QA asserts equality). 'observatory-dark' is the legacy v2.0 palette, so older links render identically.
  const PALETTES = {
    'observatory-dark': { bg: '#020408', roles: ['#e8f6ff', '#00e5ff', '#ffab00', '#ff1744', '#7f8ea3'] },
    'observatory-light': { bg: '#eef1f0', roles: ['#0b1a22', '#005c6b', '#7d4900', '#b01030', '#56636e'] },
    'sodium-dark': { bg: '#0b0a09', roles: ['#f1e9dc', '#ffb54a', '#9cc3d3', '#ff6a55', '#8d8578'] },
    'sodium-light': { bg: '#f3eee4', roles: ['#1e1a14', '#7a4600', '#1d4f63', '#a8261b', '#6b6456'] },
    'spectral-dark': { bg: '#07060d', roles: ['#ebe8f7', '#b0a4ff', '#74e3c4', '#ff7a95', '#8a86a3'] },
    'spectral-light': { bg: '#f2f1f7', roles: ['#15122a', '#4231b8', '#00634f', '#ad1748', '#5c5873'] }
  };
  const DEFAULT_PALETTE = 'observatory-dark';
  const paletteOf = (key) => PALETTES[key] || PALETTES[DEFAULT_PALETTE];
  const COLORS = PALETTES[DEFAULT_PALETTE].roles;

  const BANDS = {
    disclosure: ['A sparse', 'A measured', 'A dense'],
    relations: ['isolated', 'linked', 'entangled'],
    attention: ['scattered', 'directed', 'captured'],
    feedback: ['a single pass', 'echoing', 'recursive'],
    influence: ['undistorted', 'bent', 'warped']
  };
  const band = (v) => v < 0.34 ? 0 : v < 0.67 ? 1 : 2;

  function factors(n) {
    const offers = popcount(n.o), cats = popcount(n.f);
    return {
      offers, cats,
      disclosure: clamp01((n.d + cats * 8 + offers * 4) / 172),
      relations: clamp01(0.45 * n.p / 100 + 0.35 * n.k / 100 + ((n.f >> 2) & 1) * 0.2),
      attention: clamp01(0.5 * n.e / 100 + 0.3 * n.r / 100 + 0.2 * n.i / 100),
      feedback: clamp01(0.55 * n.t / 100 + 0.45 * n.n / 12),
      influence: clamp01(0.6 * n.a / 100 + 0.4 * n.i / 100),
      exposure: clamp01(n.x / 100 * (0.4 + 0.6 * n.d / 100))
    };
  }

  function interpret(p) {
    const n = normalize(p), F = factors(n);
    return `${BANDS.disclosure[band(F.disclosure)]} lattice of disclosure, ${BANDS.relations[band(F.relations)]} relations. ` +
      `Attention ${BANDS.attention[band(F.attention)]}, feedback ${BANDS.feedback[band(F.feedback)]}, geometry ${BANDS.influence[band(F.influence)]} by influence. ` +
      `${F.offers} of 6 exchanges surrendered.`;
  }

  // ── composition ──────────────────────────────────────────────────────────
  /** aspect = width / height. Units: the short side of the frame = 1. */
  function compose(p, aspect) {
    const n = normalize(p);
    aspect = Math.round((aspect || 1) * 10000) / 10000;
    const F = factors(n);
    const rnd = rngFor(canonical(n) + '|' + aspect);
    const W = aspect >= 1 ? aspect : 1, H = aspect >= 1 ? 1 : 1 / aspect;
    const cx = W / 2, cy = H / 2;
    const scene = { v: VERSION, aspect, W, H, bg: '#020408', layers: [] };
    const lines = [], polys = [], marks = [];

    // attractor (where attention is pulled) and warp (influence)
    const ax = cx + (rnd() - 0.5) * 0.5, ay = cy + (rnd() - 0.5) * 0.5;
    const swirl = F.influence * 1.6 * (rnd() < 0.5 ? -1 : 1);
    const sigma2 = 0.09 + 0.12 * rnd();
    const warp = (x, y) => {
      const dx = x - ax, dy = y - ay, r2 = dx * dx + dy * dy;
      const fall = Math.exp(-r2 / sigma2);
      const ang = swirl * fall, pull = 1 - 0.18 * F.influence * fall;
      const cs = pcos(ang), sn = psin(ang);
      return [ax + (dx * cs - dy * sn) * pull, ay + (dx * sn + dy * cs) * pull];
    };

    // 1. triangular lattice — disclosure → density
    const sp = lerp(0.12, 0.034, F.disclosure);
    const rowH = sp * 0.8660254;
    const cols = Math.ceil(W / sp) + 2, rows = Math.ceil(H / rowH) + 2;
    const grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const x = (c - 0.5 + (r & 1) * 0.5) * sp + (rnd() - 0.5) * sp * 0.32;
        const y = (r - 0.5) * rowH + (rnd() - 0.5) * rowH * 0.32;
        row.push(warp(x, y));
      }
      grid.push(row);
    }
    const pEdge = 0.3 + 0.6 * F.disclosure;
    const pExposed = 0.03 + 0.18 * F.exposure;
    const latticeEdges = [];
    const edge = (a, b) => {
      if (!a || !b || rnd() > pEdge) return;
      const exposed = rnd() < pExposed;
      latticeEdges.push({ c: exposed ? 3 : 1, a: exposed ? 0.55 : 0.12 + 0.16 * rnd(), w: exposed ? 0.0016 : 0.0009, pts: [a[0], a[1], b[0], b[1]] });
    };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const pt = grid[r][c];
      edge(pt, grid[r][c + 1]);
      const off = r & 1;
      if (grid[r + 1]) { edge(pt, grid[r + 1][c - 1 + off]); edge(pt, grid[r + 1][c + off]); }
    }
    for (const e of latticeEdges) lines.push(e);
    // nodes as tiny triangles (no circles)
    const nodeEvery = Math.max(1, Math.round(4 - 3 * F.disclosure));
    for (let r = 0; r < rows; r += 1) for (let c = (r % nodeEvery); c < cols; c += nodeEvery) {
      const [x, y] = grid[r][c], s = 0.0035;
      marks.push({ c: 0, a: 0.35 + 0.4 * rnd(), pts: [x, y - s, x + s * 0.866, y + s * 0.5, x - s * 0.866, y + s * 0.5] });
    }

    // 2. network topology — relationships → long-range links between hubs
    const nHubs = 3 + F.offers + Math.round(F.relations * 6);
    const hubs = [];
    for (let h = 0; h < nHubs; h++) {
      const r = 1 + Math.floor(rnd() * (rows - 2)), c = 1 + Math.floor(rnd() * (cols - 2));
      hubs.push(grid[r][c]);
    }
    const nLinks = Math.round(4 + 46 * F.relations);
    for (let l = 0; l < nLinks; l++) {
      const a = hubs[Math.floor(rnd() * hubs.length)];
      // dependency → share of links that converge on the centre (the platform you cannot leave)
      const b = rnd() < 0.5 * (n.y / 100) ? [cx, cy] : rnd() < 0.6 ? hubs[Math.floor(rnd() * hubs.length)] : grid[Math.floor(rnd() * rows)][Math.floor(rnd() * cols)];
      if (a === b) continue;
      lines.push({ c: 2, a: 0.22 + 0.35 * rnd(), w: 0.0011, pts: [a[0], a[1], b[0], b[1]] });
    }
    for (const h of hubs) {
      const s = 0.009;
      polys.push({ c: 2, a: 0.9, stroke: true, w: 0.0014, pts: [h[0], h[1] - s, h[0] + s * 0.866, h[1] + s * 0.5, h[0] - s * 0.866, h[1] + s * 0.5] });
    }

    // 3. attention vector field — flow lines advected toward the attractor
    const waves = [];
    for (let j = 0; j < 3; j++) waves.push({ fx: 2 + rnd() * 6, fy: 2 + rnd() * 6, ph: rnd() * TAU, amp: 0.5 + rnd() });
    const pullK = 0.4 + 2.2 * (n.r / 100);
    const field = (x, y) => {
      let vx = 0, vy = 0;
      for (const w of waves) { vx += w.amp * psin(w.fy * y + w.ph); vy += w.amp * pcos(w.fx * x + w.ph * 0.7); }
      const dx = ax - x, dy = ay - y, d = Math.sqrt(dx * dx + dy * dy) + 1e-3;
      vx += pullK * dx / d; vy += pullK * dy / d;
      const m = Math.sqrt(vx * vx + vy * vy) + 1e-6;
      return [vx / m, vy / m];
    };
    const nFlow = Math.round(30 + 170 * F.attention);
    const steps = Math.round(40 + 90 * F.attention);
    const stepLen = 0.0045 + 0.004 * (n.c / 100); // convenience → longer, smoother strokes
    for (let fl = 0; fl < nFlow; fl++) {
      let x = rnd() * W, y = rnd() * H;
      const pts = [x, y];
      for (let s = 0; s < steps; s++) {
        const v = field(x, y);
        x += v[0] * stepLen; y += v[1] * stepLen;
        if (x < -0.05 || y < -0.05 || x > W + 0.05 || y > H + 0.05) break;
        const ddx = x - ax, ddy = y - ay;
        if (ddx * ddx + ddy * ddy < 0.0004) break;
        pts.push(x, y);
      }
      if (pts.length >= 8) lines.push({ c: 0, a: 0.1 + 0.4 * (n.e / 100) * rnd() + 0.08, w: 0.0008 + 0.0008 * rnd(), pts, flow: 1 });
    }

    // 4. identity core — recursive triangle, feedback → depth + echoes
    const R = 0.27 + 0.05 * rnd();
    const rot = -Math.PI / 2 + Math.round(rnd() * 12) * (TAU / 72);
    const tri = (cx0, cy0, rad, a0) => [0, 1, 2].map(k => warp(cx0 + rad * pcos(a0 + k * TAU / 3), cy0 + rad * psin(a0 + k * TAU / 3)));
    const depth = 1 + Math.round(F.feedback * 4); // 1..5
    const keepMiddle = 0.1 + 0.08 * F.offers;
    const subdivide = (A, B, C, d) => {
      if (d === 0) { polys.push({ c: 0, a: 0.85, stroke: true, w: 0.0012, pts: [A[0], A[1], B[0], B[1], C[0], C[1]] }); return; }
      const ab = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], bc = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2], ca = [(C[0] + A[0]) / 2, (C[1] + A[1]) / 2];
      subdivide(A, ab, ca, d - 1); subdivide(ab, B, bc, d - 1); subdivide(ca, bc, C, d - 1);
      if (rnd() < keepMiddle) polys.push({ c: 1, a: 0.16, fill: true, pts: [ab[0], ab[1], bc[0], bc[1], ca[0], ca[1]] });
    };
    const [A, B, C] = tri(cx, cy, R, rot);
    subdivide(A, B, C, depth);
    const echoes = 1 + Math.round(F.feedback * 5 + n.n / 4);
    const twist = (0.04 + 0.12 * F.influence) * (swirl < 0 ? -1 : 1);
    for (let j = 1; j <= echoes; j++) {
      const t = tri(cx, cy, R * (1 + j * 0.11), rot + twist * j);
      polys.push({ c: 1, a: Math.max(0.08, 0.6 - j * 0.07), stroke: true, w: 0.001, pts: [t[0][0], t[0][1], t[1][0], t[1][1], t[2][0], t[2][1]] });
    }

    // 5. surrendered fragments — one inward-pointing shard per selected exchange
    for (let k = 0; k < 6; k++) {
      if (!((n.o >> k) & 1)) continue;
      const ang = rot + k * TAU / 6 + TAU / 12;
      const rr = R * 1.9;
      const px = cx + rr * pcos(ang), py = cy + rr * psin(ang), s = 0.028;
      const tip = warp(px - s * 1.6 * pcos(ang), py - s * 1.6 * psin(ang));
      const l = warp(px + s * pcos(ang + TAU / 4), py + s * psin(ang + TAU / 4));
      const r2 = warp(px + s * pcos(ang - TAU / 4), py + s * psin(ang - TAU / 4));
      polys.push({ c: 3, a: 0.75, fill: true, pts: [tip[0], tip[1], l[0], l[1], r2[0], r2[1]] });
      const core = warp(cx + R * 0.35 * pcos(ang), cy + R * 0.35 * psin(ang));
      lines.push({ c: 3, a: 0.45, w: 0.0009, pts: [tip[0], tip[1], core[0], core[1]] });
    }

    const qz = (o) => { o.pts = o.pts.map(q); if (o.a != null) o.a = q(o.a); if (o.w != null) o.w = q(o.w); return o; };
    scene.layers = [
      { kind: 'lines', items: lines.filter(l => !l.flow).map(qz) },
      { kind: 'lines', items: lines.filter(l => l.flow).map(qz), flow: true },
      { kind: 'polys', items: marks.map(qz) },
      { kind: 'polys', items: polys.map(qz) }
    ];
    scene.attractor = [q(ax), q(ay)];
    scene.stats = { lattice: latticeEdges.length, nodes: marks.length, hubs: hubs.length, links: nLinks, flows: scene.layers[1].items.length, depth, echoes, shards: F.offers };
    return scene;
  }

  function sceneHash(scene) {
    // Two independent FNV-1a 32 streams over the quantized scene → 64-bit id.
    let h1 = 0x811c9dc5, h2 = 0x01000193 ^ 0x9e3779b9;
    const feed = (num) => {
      const v = Math.round(num * 10000) | 0;
      for (let b = 0; b < 4; b++) {
        const byte = (v >>> (b * 8)) & 255;
        h1 = Math.imul(h1 ^ byte, 16777619);
        h2 = Math.imul(h2 ^ byte, 16777619) ^ (h2 >>> 13);
      }
    };
    feed(scene.aspect);
    for (const L of scene.layers) for (const it of L.items) { feed(it.c); feed(it.a || 0); feed(it.w || 0); for (const v of it.pts) feed(v); }
    const hex = (h) => (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
    return hex(h1) + hex(h2);
  }
  const compositionId = (p) => 'C-' + sceneHash(compose(p, 1)).slice(0, 10);

  // ── rendering ────────────────────────────────────────────────────────────
  const FORMATS = {
    portrait: { w: 1080, h: 1350, label: 'Portrait 1080\u00d71350' },
    story: { w: 1080, h: 1920, label: 'Story 1080\u00d71920' },
    square: { w: 1080, h: 1080, label: 'Square 1080\u00d71080' },
    hires: { w: 2160, h: 2700, label: 'High-res PNG 2160\u00d72700' }
  };

  function hexA(hex, a) {
    const v = parseInt(hex.slice(1), 16);
    return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
  }

  /** opts: { progress 0..1 (draw-in), overlay: {title, subtitle, seed, id, text, signature}, fonts: {display, mono} } */
  function render(ctx, scene, w, h, opts) {
    opts = opts || {};
    const k = w / scene.W; // px per unit (scene.W/H match w/h aspect)
    const unit = Math.min(w, h); // line widths scale with the short side
    const prog = opts.progress == null ? 1 : clamp01(opts.progress);
    const pal = paletteOf(opts.palette), ROLE = pal.roles;
    // Light palettes draw dark ink on paper: low-alpha hairlines need a little more weight to read.
    const light = /-light$/.test(opts.palette || ''), aBoost = light ? 1.35 : 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    scene.layers.forEach((L, li) => {
      const total = L.items.length;
      const limit = li === 1 ? Math.floor(total * prog) : li === 0 ? Math.floor(total * Math.min(1, prog * 1.5)) : (prog >= 0.6 ? total : Math.floor(total * prog / 0.6));
      for (let i = 0; i < limit; i++) {
        const it = L.items[i];
        const col = ROLE[it.c] || ROLE[0], al = Math.min(1, it.a * aBoost);
        const pts = it.pts;
        ctx.beginPath();
        ctx.moveTo(pts[0] * k, pts[1] * k);
        for (let j = 2; j < pts.length; j += 2) ctx.lineTo(pts[j] * k, pts[j + 1] * k);
        if (L.kind === 'polys') {
          ctx.closePath();
          if (it.fill || !it.stroke) { ctx.fillStyle = hexA(col, al); ctx.fill(); }
          if (it.stroke) { ctx.strokeStyle = hexA(col, al); ctx.lineWidth = Math.max(1, it.w * unit); ctx.stroke(); }
        } else {
          ctx.strokeStyle = hexA(col, al); ctx.lineWidth = Math.max(0.6, it.w * unit); ctx.stroke();
        }
      }
    });
    if (opts.overlay) drawOverlay(ctx, w, h, opts.overlay, opts.fonts || {}, pal);
    ctx.restore();
  }

  function wrap(ctx, text, maxW) {
    const words = text.split(' '), out = [];
    let line = '';
    for (const wd of words) {
      const t = line ? line + ' ' + wd : wd;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = wd; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }

  function drawOverlay(ctx, w, h, o, fonts, pal) {
    pal = pal || paletteOf();
    const [ink, signal, trace] = pal.roles, plate = hexA(pal.bg, 0.72);
    const dw = fonts.weight || 800;
    const u = Math.min(w, h) / 1080; // design at 1080
    const pad = 64 * u;
    const display = fonts.display || 'Syne, sans-serif', mono = fonts.mono || '"IBM Plex Mono", monospace';
    ctx.textBaseline = 'alphabetic';
    if (o.title) {
      // quiet backing plate for legibility (solid, no gradient)
      ctx.fillStyle = plate;
      ctx.fillRect(0, 0, w, pad + 118 * u);
      let size = 58 * u;
      ctx.font = `${dw} ${Math.round(size)}px ${display}`;
      const maxW = w - pad * 2, tw = ctx.measureText(o.title).width;
      if (tw > maxW) { size = size * maxW / tw; ctx.font = `${dw} ${Math.floor(size)}px ${display}`; }
      ctx.fillStyle = hexA(ink, 0.96);
      ctx.fillText(o.title, pad, pad + 52 * u);
      if (o.subtitle) {
        ctx.fillStyle = hexA(signal, 0.9);
        ctx.font = `500 ${Math.round(20 * u)}px ${mono}`;
        ctx.fillText(o.subtitle, pad, pad + 92 * u);
      }
    }
    // bottom block
    ctx.font = `400 ${Math.round(22 * u)}px ${mono}`;
    const lines = o.text ? wrap(ctx, o.text, w - pad * 2) : [];
    let y = h - pad - 36 * u - lines.length * 32 * u;
    ctx.fillStyle = plate;
    ctx.fillRect(0, y - 44 * u, w, h - y + 44 * u);
    ctx.fillStyle = hexA(ink, 0.86);
    for (const ln of lines) { ctx.fillText(ln, pad, y); y += 32 * u; }
    ctx.fillStyle = hexA(trace, 0.95);
    ctx.font = `500 ${Math.round(18 * u)}px ${mono}`;
    ctx.fillText(`${o.seed || ''}  \u00b7  ${o.id || ''}`, pad, h - pad);
    ctx.textAlign = 'right';
    ctx.fillStyle = hexA(signal, 0.9);
    ctx.fillText(o.signature || 'ORACLE PROTOCOL', w - pad, h - pad);
    ctx.textAlign = 'left';
  }

  function caption(p, id, link) {
    const n = normalize(p);
    return `ORACLE // DIGITAL REMAINS \u2014 ${n.s} \u00b7 ${id}\n${interpret(n)}\n` +
      `Generated in my browser from abstract choices only \u2014 no personal data, no server.` + (link ? `\n${link}` : '') + `\n#OracleProtocol`;
  }

  const api = { VERSION, DEFAULTS, RANGES, KEY_ORDER, FORMATS, normalize, canonical, encode, decode, newSeed, compose, sceneHash,
    compositionId, render, interpret, caption, factors, PALETTES, DEFAULT_PALETTE, _rng: rngFor };
  root.OracleArt = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
