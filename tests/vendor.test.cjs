// v7 WP1: vendored files stay byte-identical to their pinned npm releases (vendor/README.md), contain no network,
// eval or worker APIs, and are only reachable through core/vendor.js.
'use strict';
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const PINS = {
  'vendor/gifenc-1.0.3/gifenc.esm.js': [9098, '217761244379253ba5815510d3048a4fb1f4c4dbe9fb51a5cfbfe26f34eec093'],
  'vendor/gifenc-1.0.3/LICENSE.md': [1083, '47bc590c39d8ccccfc544875a9faebf44bafa828ef20315b396b5d0629f0cfd6'],
  'vendor/zzfx-1.4.0/ZzFX.js': [10301, '43f321101a935892c112a291e2e943b4da33159b43fcd4a21f3eae710f4a27ff'],
  'vendor/zzfx-1.4.0/LICENSE': [1089, '8917d3dfd55d69fb08e7786d4ac5bf01a4f7eb89c6008713bb4e48c3016ce537'],
};
const FORBIDDEN = [/\bfetch\s*\(/, /XMLHttpRequest/, /\beval\s*\(/, /new\s+Function\b/, /\bWorker\s*\(/, /\bimport\s*\(/, /WebSocket/, /sendBeacon/, /EventSource/, /https?:\/\/(?!github\.com\/KilledByAPixel)/];

test('vendor: every pinned file has the recorded size and SHA-256', () => {
  for (const [f, [size, sha]] of Object.entries(PINS)) {
    const b = fs.readFileSync(path.join(ROOT, f));
    assert.strictEqual(b.length, size, f + ' size');
    assert.strictEqual(crypto.createHash('sha256').update(b).digest('hex'), sha, f + ' sha256');
  }
});
test('vendor: the folder holds only the pinned files and the README', () => {
  const all = [];
  for (const d of fs.readdirSync(path.join(ROOT, 'vendor'))) {
    const p = path.join(ROOT, 'vendor', d);
    if (fs.statSync(p).isDirectory()) for (const f of fs.readdirSync(p)) all.push('vendor/' + d + '/' + f); else all.push('vendor/' + d);
  }
  assert.deepStrictEqual(all.sort(), Object.keys(PINS).concat('vendor/README.md').sort());
});
test('vendor: README and THIRD_PARTY_NOTICES record every hash and licence', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'vendor/README.md'), 'utf8');
  const notices = fs.readFileSync(path.join(ROOT, 'THIRD_PARTY_NOTICES.md'), 'utf8');
  for (const [, sha] of Object.values(PINS)) assert.ok(readme.includes(sha), 'README lacks ' + sha);
  for (const f of ['vendor/gifenc-1.0.3/LICENSE.md', 'vendor/zzfx-1.4.0/LICENSE']) assert.ok(notices.includes(fs.readFileSync(path.join(ROOT, f), 'utf8').trim()), 'notices lack ' + f);
});
test('vendor: no network, eval, worker or dynamic-import API in a vendored script', () => {
  for (const f of Object.keys(PINS).filter((f) => f.endsWith('.js'))) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const re of FORBIDDEN) assert.ok(!re.test(s), f + ' matches ' + re);
  }
});
test('vendor: only core/vendor.js names a vendored path, and it resolves same-origin', () => {
  const site = [];
  const walk = (d) => { for (const f of fs.readdirSync(path.join(ROOT, d))) { const r = d ? d + '/' + f : f; if (/^(qa|tests|tools|vendor|node_modules|docs|\.git)/.test(r)) continue; const p = path.join(ROOT, r); if (fs.statSync(p).isDirectory()) walk(r); else if (r.endsWith('.js')) site.push(r); } };
  walk('');
  const users = site.filter((f) => /vendor\/[a-z0-9.-]+\//.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
  assert.deepStrictEqual(users.filter((f) => f !== 'sw.js'), ['core/vendor.js']); // sw.js only precaches them
  const src = fs.readFileSync(path.join(ROOT, 'core/vendor.js'), 'utf8');
  assert.ok(/u\.origin !== root\.location\.origin/.test(src), 'same-origin guard');
});
