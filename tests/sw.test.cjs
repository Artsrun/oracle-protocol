// v6 WP11: the offline service worker caches exactly the site's own files, and its VERSION is current.
'use strict';
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const { read, compute, ROOT } = require('../tools/sw-version.cjs');
const { list, version, src } = read();
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

test('sw: every file index.html loads is in ASSETS', () => {
  const refs = [...html.matchAll(/<(?:script[^>]*\ssrc|link[^>]*\shref)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(data:|https?:|#)/.test(u));
  const missing = refs.filter((r) => !list.includes(r));
  assert.deepStrictEqual(missing, [], 'missing from sw.js ASSETS: ' + missing.join(', '));
});
test('sw: every font in fonts/fonts.css and every manifest icon is in ASSETS', () => {
  const css = fs.readFileSync(path.join(ROOT, 'fonts/fonts.css'), 'utf8');
  const fonts = [...css.matchAll(/url\(\.\/([^)]+)\)/g)].map((m) => 'fonts/' + m[1]);
  const icons = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8')).icons.map((i) => i.src);
  const missing = fonts.concat(icons).filter((r) => !list.includes(r));
  assert.deepStrictEqual(missing, []);
});
test('sw: every vendored file core/vendor.js can import is in ASSETS (offline)', () => {
  const v = fs.readFileSync(path.join(ROOT, 'core/vendor.js'), 'utf8');
  const files = [...v.matchAll(/'(vendor\/[^']+\.js)'/g)].map((m) => m[1]);
  assert.ok(files.length >= 2, 'vendor paths found');
  assert.deepStrictEqual(files.filter((f) => !list.includes(f)), []);
});
test('sw: every ASSETS entry exists and is same-origin (relative)', () => {
  for (const a of list) { assert.ok(!/^[a-z]+:|^\/\//i.test(a), a + ' must be relative'); if (a !== './') assert.ok(fs.existsSync(path.join(ROOT, a)), a + ' missing'); }
});
test('sw: VERSION matches the current asset contents (run node tools/sw-version.cjs)', () => {
  assert.strictEqual(version, compute(list));
});
test('sw: no request to another origin, no prompt or banner code', () => {
  assert.doesNotMatch(src, /https?:\/\//, 'no absolute URLs in sw.js');
  assert.doesNotMatch(src, /showNotification|beforeinstallprompt|postMessage/);
});
