/* ORACLE PROTOCOL v4 — the screen list. Order, names and progress come from SCREENS; nothing else hard-codes them.
 * Classic script + CommonJS (unit-tested). Browser-only helpers (go/back) attach in the browser.
 *   step: position in the 5-step progress (0 = not counted). parent: the step a side screen belongs to. */
(function (root) {
  'use strict';
  const SCREENS = [
    { id: 'approach', route: '', step: 0, label: 'Start' },
    { id: 'offer', route: 'offer', step: 1, label: 'Trade' },
    { id: 'extraction', route: 'extraction', step: 2, label: 'Footprint' },
    { id: 'machine', route: 'machine', step: 3, label: 'Loop' },
    { id: 'loop', route: 'loop', step: 4, label: 'Feed' },
    { id: 'reveal', route: 'reveal', step: 5, label: 'Artwork', parent: 'revelation' },
    { id: 'revelation', route: 'revelation', step: 5, label: 'Artwork' },
    { id: 'art', route: 'art', step: 0, label: 'Artwork', parent: 'revelation' },
    { id: 'extras', route: 'extras', step: 0, label: 'Extras' },
    { id: 'permissions', route: 'sensors', step: 0, label: 'Sensor demo', parent: 'extras' },
    { id: 'handshake', route: 'protocol', step: 0, label: 'Sensor demo', parent: 'extras' },
    { id: 'portrait', route: 'portrait', step: 0, label: 'Sensor demo', parent: 'extras' }
  ];
  const TOTAL = 5;
  const byId = (id) => SCREENS.find(s => s.id === id);
  const byRoute = (route) => SCREENS.find(s => s.route === route);
  const FLOW = ['approach', 'offer', 'extraction', 'machine', 'loop', 'reveal', 'revelation'];
  const next = (id) => FLOW[FLOW.indexOf(id) + 1] || null;
  const prev = (id) => { const i = FLOW.indexOf(id); return i > 0 ? FLOW[i - 1] : null; };
  const progress = (id) => { const s = byId(id); return { step: s ? s.step : 0, total: TOTAL, label: s ? s.label : '' }; };
  const api = { SCREENS, TOTAL, FLOW, byId, byRoute, next, prev, progress };
  root.OracleRouter = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
