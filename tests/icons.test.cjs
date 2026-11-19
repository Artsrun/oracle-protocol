// v8 WP1: the icon sprite is generated from the vendored Lucide files, stays small, has no network or script in it,
// and every icon is decorative (aria-hidden) so the visible caption is the accessible name.
'use strict';
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const I = require('../core/icons.js'), M = require('../tools/make-sprite.cjs');

test('icons: core/icons.js is exactly what tools/make-sprite.cjs builds from the vendored files', () => {
  assert.strictEqual(fs.readFileSync(path.join(ROOT, 'core/icons.js'), 'utf8'), M.build());
});
test('icons: one symbol per vendored SVG, ≤60 icons, sprite ≤12 KB', () => {
  const svgs = fs.readdirSync(M.DIR).filter((f) => f.endsWith('.svg')).map((f) => f.replace(/\.svg$/, '')).sort();
  assert.deepStrictEqual(I.NAMES.slice().sort(), svgs);
  assert.ok(I.NAMES.length <= 60, I.NAMES.length + ' icons');
  assert.ok(I.SPRITE.length <= 12 * 1024, I.SPRITE.length + ' bytes');
  for (const n of I.NAMES) assert.ok(I.SPRITE.includes(`<symbol id='i-${n}' viewBox='0 0 24 24'>`), n);
});
test('icons: every vendored SVG is the Lucide 1.76.0 ISC release file', () => {
  for (const f of fs.readdirSync(M.DIR).filter((f) => f.endsWith('.svg'))) assert.ok(fs.readFileSync(path.join(M.DIR, f), 'utf8').startsWith('<!-- @license lucide-static v1.76.0 - ISC -->'), f);
});
test('icons: the sprite has no script, link, style, image or external reference', () => {
  assert.ok(!/<script|<a[\s>]|<image|<foreignObject|href=|url\(|on[a-z]+=/i.test(I.SPRITE), 'nothing active in the sprite');
  assert.ok(!/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(I.SPRITE), 'only the SVG namespace URI');
});
test('icons: svg() is aria-hidden and unfocusable; unknown names draw nothing', () => {
  const s = I.svg('compass');
  assert.match(s, /^<svg class="i" aria-hidden="true" focusable="false" width="24" height="24"><use href="#i-compass"><\/use><\/svg>$/);
  assert.strictEqual(I.svg('nope'), '');
  assert.match(I.svg('x', 'i-sm'), /class="i i-sm"/);
});
test('icons: mount() inserts the sprite once', () => {
  let html = ''; const doc = { body: { insertAdjacentHTML: (w, h) => { html += h; } }, getElementById: () => (html ? {} : null) };
  assert.strictEqual(I.mount(doc), true); assert.strictEqual(I.mount(doc), false); assert.strictEqual(html, I.SPRITE);
});
