/* ORACLE PROTOCOL v7 — "Save the build": which frames the GIF has (docs/PLAN-v7.md F1, D2/D3).
 * Pure and deterministic: the frame list depends only on the engine of the link and whether the title is on.
 * Layered engines (v=2, v=3): one cumulative frame per reveal card, in the reveal order (shards → lattice → network →
 * flow → core → device ring for v=3), each 600 ms; the last frame holds 2.5 s. With "Title on the image" a final frame
 * with the overlay is added. Legacy links (v1, no layers): eight draw-in frames (render progress k/8).
 * Classic script + CommonJS (unit-tested in Node). */
(function (root) {
  'use strict';
  const ORDER = ['shards', 'lattice', 'network', 'flow', 'core', 'device'];
  const STEP_MS = 600, HOLD_MS = 2500, LEGACY_FRAMES = 8;
  /** frames(engineV, title) → [{ groups: [..] | null, progress: 0..1, overlay: bool, delay: ms }] */
  function frames(engineV, title) {
    const out = [];
    if (engineV >= 2) {
      const order = ORDER.filter(g => g !== 'device' || engineV === 3);
      order.forEach((g, i) => out.push({ groups: order.slice(0, i + 1), progress: 1, overlay: false, delay: STEP_MS }));
      if (title) out.push({ groups: null, progress: 1, overlay: true, delay: STEP_MS });
    } else {
      for (let k = 1; k <= LEGACY_FRAMES; k++) out.push({ groups: null, progress: k / LEGACY_FRAMES, overlay: !!title && k === LEGACY_FRAMES, delay: STEP_MS });
    }
    out[out.length - 1].delay = HOLD_MS;
    return out;
  }
  const api = { ORDER, STEP_MS, HOLD_MS, LEGACY_FRAMES, frames };
  root.OracleBuild = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
