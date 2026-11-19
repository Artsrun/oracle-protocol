#!/usr/bin/env node
/* v6 WP11: recompute the service worker's VERSION from its ASSETS (SHA-256, first 12 hex) and write it into sw.js.
 * Run after changing any site file:  node tools/sw-version.cjs   (tests/sw.test.cjs fails until you do). */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
function read() {
  const src = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const list = JSON.parse(src.match(/const ASSETS = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));
  const version = src.match(/const VERSION = '([^']+)'/)[1];
  return { src, list, version };
}
function compute(list) {
  const h = crypto.createHash('sha256');
  for (const a of list.filter((a) => a !== './').sort()) { h.update(a + '\0'); h.update(fs.readFileSync(path.join(ROOT, a))); h.update('\0'); }
  return 'v8-' + h.digest('hex').slice(0, 12);
}
module.exports = { read, compute, ROOT };
if (require.main === module) {
  const { src, list, version } = read(), next = compute(list);
  if (next === version) { console.log('sw.js VERSION up to date:', version); process.exit(0); }
  fs.writeFileSync(path.join(ROOT, 'sw.js'), src.replace(`const VERSION = '${version}'`, `const VERSION = '${next}'`));
  console.log('sw.js VERSION', version, '→', next);
}
