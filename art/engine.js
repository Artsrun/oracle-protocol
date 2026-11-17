/* ORACLE // DIGITAL REMAINS — engine switch. Engine 2 (art/layers.js) draws every artwork made from v4 on;
 * engine 1 (art/oracle-art.js, unchanged) draws links made before v4 — they carry no `v=2` — byte-identically.
 * Both share the renderer, palettes, formats and link encoding of art/oracle-art.js. */
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
  const get = (engine) => engine === 2 ? LAYERED : LEGACY;
  const of = (query) => /(?:^|&)v=2(?:&|$)/.test(String(query || '')) ? 2 : 1;
  root.OracleEngine = { get, of, LEGACY, LAYERED };
})(typeof window !== 'undefined' ? window : globalThis);
