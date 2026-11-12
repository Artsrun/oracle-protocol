/* ORACLE PROTOCOL — theme boot (loaded synchronously in <head>, before first paint).
 * Mode: 'auto' follows prefers-color-scheme; 'dark' (Night) / 'light' (Day) are manual overrides persisted
 * in localStorage 'oracle.theme'. Palette and type pairing are comparison switches: ?palette= and ?type=
 * (not persisted). ?theme=dark|light forces a mode for one page view without persisting (screenshots/QA).
 * No network, no fingerprinting: the only stored value is the visitor's own mode choice. */
(function () {
  var d = document.documentElement;
  var PALETTES = ['observatory', 'sodium', 'spectral'];
  var TYPES = ['instrument', 'signal', 'almanac'];
  var MODES = ['auto', 'dark', 'light'];
  var DEFAULT = { palette: 'observatory', type: 'instrument' };
  var KEY = 'oracle.theme';
  var q; try { q = new URLSearchParams(location.search); } catch (e) { q = { get: function () { return null; } }; }
  var pick = function (v, list, def) { return list.indexOf(v) >= 0 ? v : def; };
  var palette = pick(q.get('palette'), PALETTES, DEFAULT.palette);
  var type = pick(q.get('type'), TYPES, DEFAULT.type);
  var forced = pick(q.get('theme'), ['dark', 'light'], null);
  var pref = 'auto';
  try { pref = pick(localStorage.getItem(KEY), MODES, 'auto'); } catch (e) { /* storage blocked: stay on auto */ }
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : { matches: false };
  var listeners = [];

  function resolved() { return forced || (pref === 'auto' ? (mq.matches ? 'light' : 'dark') : pref); }
  function apply() {
    var t = resolved();
    d.setAttribute('data-palette', palette);
    d.setAttribute('data-type', type);
    d.setAttribute('data-theme', t);
    d.setAttribute('data-theme-pref', forced ? 'forced' : pref);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(d).getPropertyValue('--bg').trim() || (t === 'light' ? '#eef1f0' : '#020408'));
    for (var i = 0; i < listeners.length; i++) { try { listeners[i](api.current()); } catch (e) { /* listener errors must not break theming */ } }
  }
  var api = {
    PALETTES: PALETTES, TYPES: TYPES, MODES: MODES, DEFAULT: DEFAULT, KEY: KEY,
    current: function () { return { palette: palette, type: type, mode: resolved(), pref: forced ? 'forced' : pref }; },
    pref: function () { return pref; },
    setPref: function (p) {
      pref = pick(p, MODES, 'auto'); forced = null;
      try { if (pref === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, pref); } catch (e) { /* not persisted */ }
      apply();
    },
    onChange: function (fn) { listeners.push(fn); }
  };
  if (mq.addEventListener) mq.addEventListener('change', function () { if (!forced && pref === 'auto') apply(); });
  else if (mq.addListener) mq.addListener(function () { if (!forced && pref === 'auto') apply(); });
  window.OracleTheme = api;
  apply();
})();
