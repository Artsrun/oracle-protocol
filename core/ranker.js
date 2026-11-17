/* ORACLE PROTOCOL v4 — the toy feed ranker (SIMULATED: ten fictional posts; not any real algorithm).
 * Pure functions, unit-tested. Moved out of chapters/loop.js unchanged; `after(L)` replays L.n rounds from the
 * start with the current weights, so a result depends only on the visible settings.
 * Handover values (top-3 share, round 0 → 4): Newest first 46% → 46%, For you 42% → 48%, Most engaging 69% → 92%. */
(function (root) {
  'use strict';
  const content = () => root.OracleContent || require('../data/content.js'); // read late: content.js loads after this file
  const fresh = () => content().LAB_ITEMS.map(it => ({ ...it, soc: 0.1, rep: 0, rec0: it.rec }));
  const weights = (L) => ({ we: L.e / 100, wr: L.r / 100, wc: L.w / 100, wt: L.t / 100, wk: L.k / 100, g: 1 + 4 * L.a / 100 });
  function rank(items, L) {
    const W = weights(L);
    const scored = items.map(it => ({ it, score: 0.01 + W.we * it.emo + W.wr * it.rel + W.wc * it.rec + W.wt * it.rep + W.wk * it.soc }));
    const pow = scored.map(s => Math.pow(s.score, W.g));
    const sum = pow.reduce((a, b) => a + b, 0);
    scored.forEach((s, i) => { s.share = pow[i] / sum; });
    return scored.sort((a, b) => b.share - a.share);
  }
  function step(items, L) {
    const r = rank(items, L), n = items.length;
    for (const s of r) {
      s.it.soc = Math.min(1, 0.5 * s.it.soc + 0.5 * Math.min(1, s.share * n / 3));
      s.it.rep = Math.min(1, s.it.rep + s.share * 2);
      s.it.rec = s.it.rec * 0.85;
    }
  }
  function metrics(r) {
    const shares = r.map(s => s.share).sort((a, b) => a - b), n = shares.length;
    let g = 0; shares.forEach((x, i) => { g += (2 * (i + 1) - n - 1) * x; });
    return { top3: r.slice(0, 3).reduce((a, s) => a + s.share, 0), gini: g / (n * shares.reduce((a, b) => a + b, 0)), emo: r.reduce((a, s) => a + s.share * s.it.emo, 0) };
  }
  /** The feed after L.n rounds with weights L: { ranked, top3, gini, emo }. */
  function after(L) {
    const items = fresh();
    for (let i = 0; i < (L.n || 0); i++) step(items, L);
    const r = rank(items, L);
    return { ranked: r, ...metrics(r) };
  }
  const api = { fresh, weights, rank, step, metrics, after };
  root.OracleRanker = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
