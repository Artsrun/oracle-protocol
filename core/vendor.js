/* ORACLE PROTOCOL v7 — the only place that loads a vendored file (vendor/README.md). Same origin only: the path is
 * resolved against the page, never another host, so the existing CSP (script-src 'self', connect-src 'none') covers it.
 * Nothing is loaded until a feature asks for it (a tap); the service worker precaches the files for offline use.
 *   await OracleVendor.load('gifenc') → the gifenc module    await OracleVendor.load('zzfx') → the ZzFX module */
(function (root) {
  'use strict';
  const FILES = { gifenc: 'vendor/gifenc-1.0.3/gifenc.esm.js', zzfx: 'vendor/zzfx-1.4.0/ZzFX.js' };
  const cache = {};
  function url(name) {
    const f = FILES[name]; if (!f) throw new Error('OracleVendor: unknown file ' + name);
    const u = new URL(f, root.document.baseURI);
    if (u.origin !== root.location.origin) throw new Error('OracleVendor: same origin only');
    return u.href;
  }
  function load(name) { return cache[name] || (cache[name] = import(url(name)).catch((e) => { delete cache[name]; throw e; })); }
  const loaded = (name) => !!cache[name];
  root.OracleVendor = { FILES, load, loaded };
})(typeof window !== 'undefined' ? window : globalThis);
