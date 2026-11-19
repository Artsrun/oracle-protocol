/* ORACLE PROTOCOL v4 — the screen list. Order, names and progress come from SCREENS; nothing else hard-codes them.
 * Classic script + CommonJS (unit-tested). Browser-only helpers (go/back) attach in the browser.
 *   step: position in the 5-step progress (v8; 6 in v5–v7) (0 = not counted). parent: the step a side screen belongs to. */
(function (root) {
  'use strict';
  // v8 WP3: five steps, five taps from Start to the artwork (Begin, Next, Next, Next, Skip). The "How the loop works"
  // cards (machine) and the Reveal cards stay routable off the main path: machine opens from the Feed's sources sheet,
  // Reveal from the artwork's "What made this" chips. `back` names where Back goes from an off-path screen.
  const SCREENS = [
    { id: 'approach', route: '', step: 0, label: 'Start' },
    { id: 'offer', route: 'offer', step: 1, label: 'Apps' },
    { id: 'extraction', route: 'extraction', step: 2, label: 'Data' },
    { id: 'loop', route: 'loop', step: 3, label: 'Feed' },
    { id: 'machine', route: 'machine', step: 3, label: 'Feed', parent: 'loop', back: 'loop' },
    { id: 'device', route: 'device', step: 4, label: 'Device' },   // optional, skippable in one tap
    { id: 'reveal', route: 'reveal', step: 5, label: 'Artwork', parent: 'revelation', back: 'revelation' },
    { id: 'revelation', route: 'revelation', step: 5, label: 'Artwork' },
    { id: 'art', route: 'art', step: 0, label: 'Artwork', parent: 'revelation' },
    { id: 'extras', route: 'extras', step: 0, label: 'Extras' }
  ];
  // v5 WP9: the sensor demo is retired; its old routes open the Device step (PLAN-v5 §18.8).
  const ALIASES = { sensors: 'device', protocol: 'device', portrait: 'device' };
  const TOTAL = 5;
  const byId = (id) => SCREENS.find(s => s.id === id);
  const byRoute = (route) => SCREENS.find(s => s.route === (ALIASES[route] || route));
  const FLOW = ['approach', 'offer', 'extraction', 'loop', 'device', 'revelation'];
  const next = (id) => { const i = FLOW.indexOf(id); return i >= 0 ? FLOW[i + 1] || null : (byId(id) && byId(id).back) || null; };
  const prev = (id) => { const i = FLOW.indexOf(id); return i > 0 ? FLOW[i - 1] : i === 0 ? null : (byId(id) && byId(id).back) || null; };
  const progress = (id) => { const s = byId(id); return { step: s ? s.step : 0, total: TOTAL, label: s ? s.label : '' }; };
  const api = { SCREENS, ALIASES, TOTAL, FLOW, byId, byRoute, next, prev, progress };
  root.OracleRouter = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
