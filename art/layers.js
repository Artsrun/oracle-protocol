/* ORACLE // DIGITAL REMAINS — layered engine (engine 2), used for every artwork made from v4 on.
 *
 * Why a second engine: the legacy engine (art/oracle-art.js) seeds one random stream from ALL parameters, so a
 * single tick re-rolls the whole picture (43–56% of preview pixels changed per input, docs/PLAN-v4.md §2).
 * Here every layer has its own random stream seeded by the seed alone, and each answer drives only its layer:
 *   Trade      → shards   (one red shard per app you trade with)
 *   Footprint  → lattice  (each kind of data adds edges; none move) + network (relationships)
 *   Feed       → flow     (emotion/relevance/amplification) + core echoes (repetition, rounds)
 * Candidates are generated in a fixed order and revealed by threshold, so adding an answer only ADDS marks.
 *
 * Contract (same as the legacy engine): inputs are the seed and abstract parameters only (unknown keys dropped by
 * OracleArt.normalize); compose() is pure and quantized to 1e-4; the scene uses the legacy layer structure so
 * OracleArt.render() draws it unchanged. Links made with this engine carry `v=2`; links without it stay on the
 * legacy engine, so every pre-v4 link and the fixed reference ORACLE-7K3F-Q9ZD render byte-identically. */
(function (root) {
  'use strict';
  const A = root.OracleArt || (typeof require === 'function' ? require('./oracle-art.js') : null);
  const VERSION = 2;
  const TAU = Math.PI * 2;
  const q = (v) => Math.round(v * 10000) / 10000;
  const popcount = (n) => { let c = 0; while (n) { c += n & 1; n >>>= 1; } return c; };
  const lerp = (a, b, t) => a + (b - a) * t;
  function psin(x) { x = x - TAU * Math.floor(x / TAU); let s = 1; if (x > Math.PI) { x -= Math.PI; s = -1; } return s * 16 * x * (Math.PI - x) / (5 * Math.PI * Math.PI - 4 * x * (Math.PI - x)); }
  const pcos = (x) => psin(x + Math.PI / 2);
  const pexp = (x) => { const t = 1 + x / 64; let r = t; for (let i = 0; i < 6; i++) r *= r; return r; }; // (1+x/64)^64 ≈ e^x, engine-independent
  const GROUPS = ['lattice', 'network', 'flow', 'core', 'shards'];
  const FEEDS = { newest: { e: 0, r: 0, t: 0, k: 0, a: 0 }, foryou: { e: 20, r: 90, t: 20, k: 30, a: 30 }, engaging: { e: 90, r: 30, t: 60, k: 80, a: 80 } };
  const FEED_NAME = { newest: 'Newest first', foryou: 'For you', engaging: 'Most engaging' };

  // What each answer contributes (0..1). Each factor reads ONE screen's answers only.
  function factors(n) {
    const offers = popcount(n.o), cats = popcount(n.f), rel = (n.f >> 2) & 1;
    return {
      offers, cats, rel,
      lattice: cats / 8,                                              // Footprint
      network: rel ? 0.45 + 0.55 * cats / 8 : 0.12 * cats / 8,       // Footprint (relationships)
      attention: 0.6 * n.e / 100 + 0.4 * n.r / 100,                  // Feed
      influence: n.a / 100,                                          // Feed
      feedback: 0.55 * n.t / 100 + 0.45 * n.n / 12                   // Feed + rounds
    };
  }
  const feedOf = (n) => Object.keys(FEEDS).find(id => ['e', 'r', 't', 'k', 'a'].every(k => FEEDS[id][k] === n[k])) || null;

  function compose(p, aspect) {
    const n = A.normalize(p);
    aspect = Math.round((aspect || 1) * 10000) / 10000;
    const F = factors(n);
    const R = (name) => A._rng(n.s + '|v2|' + name + '|' + aspect);
    const W = aspect >= 1 ? aspect : 1, H = aspect >= 1 ? 1 : 1 / aspect, cx = W / 2, cy = H / 2;
    const lines = [], flows = [], marks = [], polys = [];

    // base geometry: seed only (never moves when an answer changes)
    const b = R('base');
    const ax = cx + (b() - 0.5) * 0.45, ay = cy + (b() - 0.5) * 0.45;
    const sign = b() < 0.5 ? -1 : 1, sigma2 = 0.09 + 0.12 * b();
    const rot = -Math.PI / 2 + Math.round(b() * 12) * (TAU / 72), RC = 0.25 + 0.05 * b();
    const waves = [0, 1, 2].map(() => ({ fx: 2 + b() * 6, fy: 2 + b() * 6, ph: b() * TAU, amp: 0.5 + b() }));
    const warp = (x, y) => { // a fixed, gentle bend from the seed
      const dx = x - ax, dy = y - ay, fall = pexp(-(dx * dx + dy * dy) / sigma2), ang = 0.55 * sign * fall;
      const cs = pcos(ang), sn = psin(ang); return [ax + dx * cs - dy * sn, ay + dx * sn + dy * cs];
    };

    // 1. lattice — Footprint. Fixed grid; every edge has a stable draw value; more kinds → more edges.
    const lr = R('lattice'), sp = 0.05, rowH = sp * 0.8660254;
    const cols = Math.ceil(W / sp) + 2, rows = Math.ceil(H / rowH) + 2, grid = [];
    for (let r = 0; r < rows; r++) { const row = []; for (let c = 0; c < cols; c++) row.push(warp((c - 0.5 + (r & 1) * 0.5) * sp + (lr() - 0.5) * sp * 0.3, (r - 0.5) * rowH + (lr() - 0.5) * rowH * 0.3)); grid.push(row); }
    const pEdge = 0.06 + 0.74 * F.lattice;
    const edge = (a, c) => {
      const u = lr(), red = lr() < 0.05, al = 0.12 + 0.16 * lr();
      if (!a || !c || u > pEdge) return;
      lines.push({ g: 'lattice', c: red ? 3 : 1, a: red ? 0.5 : al, w: red ? 0.0015 : 0.0009, pts: [a[0], a[1], c[0], c[1]] });
    };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const pt = grid[r][c], off = r & 1;
      edge(pt, grid[r][c + 1]);
      edge(pt, grid[r + 1] ? grid[r + 1][c - 1 + off] : null);
      edge(pt, grid[r + 1] ? grid[r + 1][c + off] : null);
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const u = lr(), al = 0.35 + 0.4 * lr();
      if (u > 0.12 + 0.5 * F.lattice) continue;
      const [x, y] = grid[r][c], s = 0.0035;
      marks.push({ g: 'lattice', c: 0, a: al, pts: [x, y - s, x + s * 0.866, y + s * 0.5, x - s * 0.866, y + s * 0.5] });
    }

    // 2. network — Footprint (relationships). 12 fixed hubs, 60 fixed candidate links; density reveals a prefix.
    const nr = R('network'), hubs = [];
    for (let h = 0; h < 12; h++) hubs.push(grid[1 + Math.floor(nr() * (rows - 2))][1 + Math.floor(nr() * (cols - 2))]);
    const cand = []; for (let l = 0; l < 60; l++) cand.push([Math.floor(nr() * 12), nr() < 0.3 ? -1 : Math.floor(nr() * 12), 0.22 + 0.35 * nr()]);
    const nHubs = Math.round(2 + 10 * F.network), nLinks = Math.round(60 * F.network);
    cand.slice(0, nLinks).forEach(([i, j, al]) => {
      if (i >= nHubs || j >= nHubs || i === j) return;
      const a = hubs[i], c = j < 0 ? [cx, cy] : hubs[j];
      lines.push({ g: 'network', c: 2, a: al, w: 0.0011, pts: [a[0], a[1], c[0], c[1]] });
    });
    hubs.slice(0, nHubs).forEach(h => { const s = 0.009; polys.push({ g: 'network', c: 2, a: 0.9, stroke: true, w: 0.0014, pts: [h[0], h[1] - s, h[0] + s * 0.866, h[1] + s * 0.5, h[0] - s * 0.866, h[1] + s * 0.5] }); });

    // 3. flow — Feed. 200 fixed starting points; attention reveals more and longer lines; amplification swirls them.
    const fr = R('flow'), pullK = 0.4 + 2.2 * (n.r / 100), swirl = 1.8 * F.influence * sign;
    const field = (x, y) => {
      let vx = 0, vy = 0;
      for (const w of waves) { vx += w.amp * psin(w.fy * y + w.ph); vy += w.amp * pcos(w.fx * x + w.ph * 0.7); }
      const dx = ax - x, dy = ay - y, d = Math.sqrt(dx * dx + dy * dy) + 1e-3, fall = pexp(-(dx * dx + dy * dy) / sigma2);
      vx += pullK * dx / d - swirl * fall * dy / d * 2; vy += pullK * dy / d + swirl * fall * dx / d * 2;
      const m = Math.sqrt(vx * vx + vy * vy) + 1e-6; return [vx / m, vy / m];
    };
    const nFlow = Math.round(24 + 176 * F.attention), steps = Math.round(40 + 90 * F.attention), stepLen = 0.0062;
    for (let fl = 0; fl < 200; fl++) {
      let x = fr() * W, y = fr() * H; const u = fr(), w = 0.0008 + 0.0008 * fr();
      if (fl >= nFlow) continue;
      const pts = [x, y];
      for (let s = 0; s < steps; s++) {
        const v = field(x, y); x += v[0] * stepLen; y += v[1] * stepLen;
        if (x < -0.05 || y < -0.05 || x > W + 0.05 || y > H + 0.05) break;
        if ((x - ax) * (x - ax) + (y - ay) * (y - ay) < 0.0004) break;
        pts.push(x, y);
      }
      if (pts.length >= 8) flows.push({ g: 'flow', c: 0, a: 0.1 + 0.4 * (n.e / 100) * u + 0.08, w, pts, flow: 1 });
    }

    // 4. core — the identity triangle; Feed repetition + rounds deepen it and add echoes.
    const cr = R('core'), tri = (x0, y0, rad, a0) => [0, 1, 2].map(k => warp(x0 + rad * pcos(a0 + k * TAU / 3), y0 + rad * psin(a0 + k * TAU / 3)));
    const depth = 1 + Math.round(F.feedback * 4), fills = []; for (let i = 0; i < 400; i++) fills.push(cr());
    let fi = 0;
    const sub = (P, Q, S, d) => {
      if (d === 0) { polys.push({ g: 'core', c: 0, a: 0.85, stroke: true, w: 0.0012, pts: [P[0], P[1], Q[0], Q[1], S[0], S[1]] }); return; }
      const pq = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2], qs = [(Q[0] + S[0]) / 2, (Q[1] + S[1]) / 2], sp2 = [(S[0] + P[0]) / 2, (S[1] + P[1]) / 2];
      sub(P, pq, sp2, d - 1); sub(pq, Q, qs, d - 1); sub(sp2, qs, S, d - 1);
      if (fills[fi++ % 400] < 0.14) polys.push({ g: 'core', c: 1, a: 0.16, fill: true, pts: [pq[0], pq[1], qs[0], qs[1], sp2[0], sp2[1]] });
    };
    const [TA, TB, TC] = tri(cx, cy, RC, rot); sub(TA, TB, TC, depth);
    const echoes = 1 + Math.round(F.feedback * 5 + n.n / 4), twist = (0.04 + 0.12 * F.influence) * sign;
    for (let j = 1; j <= echoes; j++) { const t = tri(cx, cy, RC * (1 + j * 0.11), rot + twist * j); polys.push({ g: 'core', c: 1, a: Math.max(0.08, 0.6 - j * 0.07), stroke: true, w: 0.001, pts: [t[0][0], t[0][1], t[1][0], t[1][1], t[2][0], t[2][1]] }); }

    // 5. shards — Trade. One large red shard per app, at a fixed angle each; nothing else depends on trades.
    for (let k = 0; k < 6; k++) {
      if (!((n.o >> k) & 1)) continue;
      const ang = rot + k * TAU / 6 + TAU / 12, rr = RC * 1.85, s = 0.042;
      const px = cx + rr * pcos(ang), py = cy + rr * psin(ang);
      const tip = warp(px - s * 1.7 * pcos(ang), py - s * 1.7 * psin(ang));
      const l = warp(px + s * pcos(ang + TAU / 4), py + s * psin(ang + TAU / 4)), r2 = warp(px + s * pcos(ang - TAU / 4), py + s * psin(ang - TAU / 4));
      polys.push({ g: 'shards', c: 3, a: 0.85, fill: true, pts: [tip[0], tip[1], l[0], l[1], r2[0], r2[1]] });
      const core = warp(cx + RC * 0.35 * pcos(ang), cy + RC * 0.35 * psin(ang));
      lines.push({ g: 'shards', c: 3, a: 0.5, w: 0.0012, pts: [tip[0], tip[1], core[0], core[1]] });
    }

    const qz = (o) => { o.pts = o.pts.map(q); if (o.a != null) o.a = q(o.a); if (o.w != null) o.w = q(o.w); return o; };
    const scene = { v: VERSION, engine: 2, aspect, W, H, bg: '#020408', layers: [
      { kind: 'lines', items: lines.map(qz) },
      { kind: 'lines', items: flows.map(qz), flow: true },
      { kind: 'polys', items: marks.map(qz) },
      { kind: 'polys', items: polys.map(qz) }
    ] };
    scene.attractor = [q(ax), q(ay)];
    scene.stats = { lattice: lines.filter(l => l.g === 'lattice').length, hubs: nHubs, links: lines.filter(l => l.g === 'network').length, flows: flows.length, depth, echoes, shards: F.offers };
    return scene;
  }

  const compositionId = (p) => 'C-' + A.sceneHash(compose(p, 1)).slice(0, 10);
  // Items of one group, for tests and for highlighting a layer on the reveal cards.
  const group = (scene, g) => scene.layers.flatMap(L => L.items.filter(it => it.g === g));
  /** A copy of the scene with every other group faded, so one layer stands out (reveal cards). */
  function focus(scene, gs) {
    gs = [].concat(gs);
    return { ...scene, layers: scene.layers.map(L => ({ ...L, items: L.items.map(it => gs.includes(it.g) ? it : { ...it, a: q((it.a || 0.5) * 0.22) }) })) };
  }
  /** v7: a copy of the scene with only the given groups (a filter after compose: no random draws, the scene is
   *  not changed). Used for the frames of "Save the build"; compose() and compositionId() are untouched. */
  function stage(scene, gs) {
    gs = [].concat(gs);
    return { ...scene, layers: scene.layers.map(L => ({ ...L, items: L.items.filter(it => gs.includes(it.g)) })) };
  }
  function interpret(p) {
    const n = A.normalize(p), F = factors(n), fd = feedOf(n);
    const pl = (k, one, many) => `${k} ${k === 1 ? one : many}`;
    return `${pl(F.offers, 'shard', 'shards')} for the apps you trade with. ${F.cats} of 8 kinds of data in the lattice. ` +
      `Feed: ${fd ? FEED_NAME[fd] : 'your own mix'}${n.n ? ', ' + pl(n.n, 'round', 'rounds') : ''}.`;
  }
  function caption(p, id, link) {
    const n = A.normalize(p);
    return `ORACLE // DIGITAL REMAINS \u2014 ${n.s} \u00b7 ${id}\n${interpret(n)}\n` +
      `Made in my browser from my answers only \u2014 no personal data, no server.` + (link ? `\n${link}` : '') + `\n#OracleProtocol`;
  }

  const api = { VERSION, GROUPS, FEEDS, FEED_NAME, factors, feedOf, compose, compositionId, group, focus, stage, interpret, caption };
  root.OracleLayers = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
