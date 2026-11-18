/* ORACLE PROTOCOL v4 — the screen list. Order, names and progress come from SCREENS; nothing else hard-codes them.
 * Classic script + CommonJS (unit-tested). Browser-only helpers (go/back) attach in the browser.
 *   step: position in the 6-step progress (v5) (0 = not counted). parent: the step a side screen belongs to. */
(function (root) {
  'use strict';
  const SCREENS = [
    { id: 'approach', route: '', step: 0, label: 'Start' },
    { id: 'offer', route: 'offer', step: 1, label: 'Trade' },
    { id: 'extraction', route: 'extraction', step: 2, label: 'Footprint' },
    { id: 'device', route: 'device', step: 3, label: 'Device' },   // v5: optional, skippable in one tap
    { id: 'machine', route: 'machine', step: 4, label: 'Loop' },
    { id: 'loop', route: 'loop', step: 5, label: 'Feed' },
    { id: 'reveal', route: 'reveal', step: 6, label: 'Artwork', parent: 'revelation' },
    { id: 'revelation', route: 'revelation', step: 6, label: 'Artwork' },
    { id: 'art', route: 'art', step: 0, label: 'Artwork', parent: 'revelation' },
    { id: 'extras', route: 'extras', step: 0, label: 'Extras' }
  ];
  // v5 WP9: the sensor demo is retired; its old routes open the Device step (PLAN-v5 §18.8).
  const ALIASES = { sensors: 'device', protocol: 'device', portrait: 'device' };
  const TOTAL = 6;
  const byId = (id) => SCREENS.find(s => s.id === id);
  const byRoute = (route) => SCREENS.find(s => s.route === (ALIASES[route] || route));
  const FLOW = ['approach', 'offer', 'extraction', 'device', 'machine', 'loop', 'reveal', 'revelation'];
  const next = (id) => FLOW[FLOW.indexOf(id) + 1] || null;
  const prev = (id) => { const i = FLOW.indexOf(id); return i > 0 ? FLOW[i - 1] : null; };
  const progress = (id) => { const s = byId(id); return { step: s ? s.step : 0, total: TOTAL, label: s ? s.label : '' }; };
  const api = { SCREENS, ALIASES, TOTAL, FLOW, byId, byRoute, next, prev, progress };
  root.OracleRouter = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
