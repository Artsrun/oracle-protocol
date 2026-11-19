/* ORACLE PROTOCOL v7 — sound signature (docs/PLAN-v7.md F2, D7–D9). Pure mapping, SOUND_V = 1.
 * Inputs: ONLY what a shared link carries — the seed and choices (OracleArt.normalize) and, if the link has one, the
 * device pattern (dg + the 3-character db code). Never a live reading. The sound is not part of the link, the
 * composition id or any engine, so old links and ORACLE-7K3F-Q9ZD are unchanged.
 * Output: the 21-number parameter list of ZzFX 1.4.0 buildSamples(volume, randomness, frequency, attack, sustain,
 * release, shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush,
 * delay, sustainVolume, decay, tremolo, filter). Randomness is always 0 (ZzFX defaults to 0.05 — never used), volume
 * ≤ 0.5, length ≤ 1.2 s. Values are rounded to 1e-4 so the list is identical in every engine.
 * Classic script + CommonJS (unit-tested in Node). Playback lives in screens/artwork.js (tap only). */
(function (root) {
  'use strict';
  const A = root.OracleArt || (typeof require === 'function' ? require('../art/oracle-art.js') : null);
  const SOUND_V = 1, MAX_VOLUME = 0.5, MAX_SECONDS = 1.2;
  const PENTA = [0, 2, 4, 7, 9, 12, 14]; // major pentatonic over two octaves, semitones above A3 (220 Hz)
  const NAMES = ['volume', 'randomness', 'frequency', 'attack', 'sustain', 'release', 'shape', 'shapeCurve', 'slide', 'deltaSlide',
    'pitchJump', 'pitchJumpTime', 'repeatTime', 'noise', 'modulation', 'bitCrush', 'delay', 'sustainVolume', 'decay', 'tremolo', 'filter'];
  const q = (v) => Math.round(v * 10000) / 10000;
  const pop = (n) => { let c = 0; while (n) { c += n & 1; n >>>= 1; } return c; };
  const note = (semi, rootHz) => rootHz * Math.pow(2, semi / 12); // same formula as ZZFX.getNote
  /** devKey(dev): the pattern as it appears in a link (dg + db code), or '' (no pattern / withheld / no ring). */
  function devKey(dev) {
    if (!dev || dev.mode !== 'pattern' || !/^[0-9a-f]{8}$/.test(dev.dg || '')) return '';
    const db = typeof dev.db === 'string' ? dev.db : (root.OraclePrivacy ? root.OraclePrivacy.dbCode(dev.db) : '');
    return dev.dg + '.' + db;
  }
  /** params(p, dev) → 21 numbers for ZZFX.buildSamples. */
  function params(p, dev) {
    const n = A.normalize(p), dk = devKey(dev);
    const rnd = A._rng(A.canonical(n) + '|sound|v' + SOUND_V + (dk ? '|' + dk : ''));
    const trades = pop(n.o) / 6, footprint = pop(n.f) / 8;
    const pull = (n.e + n.k + n.a) / 300;                 // how "engaging" the chosen feed is
    const semi = PENTA[Math.floor(rnd() * PENTA.length)];
    const P = {
      volume: 0.4, randomness: 0,
      frequency: note(semi, 220),
      attack: 0.01 + 0.03 * (1 - trades),                 // more trades → a harder start
      sustain: 0.08 + 0.17 * n.d / 100,                   // disclosure holds the note
      release: 0.2 + 0.25 * n.c / 100,                    // convenience lets it ring
      shape: pull < 0.35 ? 0 : pull < 0.65 ? 1 : 2,       // sine · triangle · saw as the feed gets more engaging
      shapeCurve: q(0.8 + 0.6 * rnd()),
      slide: (n.x - 50) / 50 * 0.6,                       // exposure bends the pitch
      deltaSlide: 0,
      pitchJump: dk ? note(semi + 5, 220) - note(semi, 220) : 0, // a device pattern adds a fourth up
      pitchJumpTime: dk ? 0.12 : 0,
      repeatTime: n.n ? 0.06 + 0.06 * (12 - n.n) / 12 : 0, // feedback rounds repeat the figure, faster with more rounds
      noise: 0.25 * n.i / 100,                            // influence adds grit
      modulation: 0, bitCrush: 0,
      delay: 0.04 * n.y / 100,                            // dependency adds an echo
      sustainVolume: 0.8,
      decay: 0.04 + 0.08 * trades,
      tremolo: 0.3 * footprint,                           // footprint kinds add a tremble
      filter: 0
    };
    return NAMES.map(k => q(P[k]));
  }
  /** seconds(list): the length ZzFX will make (attack + decay + sustain + release + delay). */
  const seconds = (L) => L[3] + L[18] + L[4] + L[5] + L[16];
  const api = { SOUND_V, MAX_VOLUME, MAX_SECONDS, NAMES, params, seconds, devKey };
  root.OracleSound = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
