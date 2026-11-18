/* ORACLE // DIGITAL REMAINS — engine switch. Engine 2 (art/layers.js) draws every artwork made from v4 on;
 * engine 1 (art/oracle-art.js, unchanged) draws links made before v4 — they carry no `v=2` — byte-identically.
 * v5: engine 3 (v=3) adds the fingerprint ring. All share the renderer, palettes, formats and link encoding of art/oracle-art.js. */
(function (root) {
  'use strict';
  const A = root.OracleArt, L = root.OracleLayers;
  const LEGACY = {
    v: 1, q: '', compose: A.compose, compositionId: A.compositionId, interpret: A.interpret, caption: A.caption,
    software: 'Oracle Protocol v2 / ORACLE // DIGITAL REMAINS v' + A.VERSION
  };
  const LAYERED = {
    v: 2, q: '&v=2', compose: L.compose, compositionId: L.compositionId, interpret: L.interpret, caption: L.caption,
    software: 'Oracle Protocol v4 / ORACLE // DIGITAL REMAINS layered engine v' + L.VERSION
  };
  // v5: engine 3 = the layered scene, unchanged, plus the fingerprint ring (art/fingerprint.js). Its device input is
  // data only (buckets + salted digest); by default the ring the screens draw comes from OracleFingerprint.context().
  const FP = root.OracleFingerprint;
  const dv = (dev) => dev === undefined ? FP.context() : dev;
  const DEVICE = FP && {
    v: 3, q: '&v=3', compose: (p, a, dev) => FP.compose(p, a, dv(dev)), compositionId: (p, dev) => FP.compositionId(p, dv(dev)),
    interpret: (p, dev) => FP.interpret(p, dv(dev)), caption: (p, id, link, dev) => FP.caption(p, id, link, dv(dev)),
    software: 'Oracle Protocol v5 / ORACLE // DIGITAL REMAINS layered engine v' + L.VERSION + ' + fingerprint ring v' + FP.VERSION
  };
  const get = (engine) => engine === 3 && DEVICE ? DEVICE : engine === 2 ? LAYERED : LEGACY;
  const of = (query) => { const s = String(query || ''); return /(?:^|&)v=3(?:&|$)/.test(s) ? 3 : /(?:^|&)v=2(?:&|$)/.test(s) ? 2 : 1; };
  root.OracleEngine = { get, of, LEGACY, LAYERED, DEVICE };
})(typeof window !== 'undefined' ? window : globalThis);
