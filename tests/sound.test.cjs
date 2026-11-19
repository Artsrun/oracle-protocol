// v7 WP5: sound signature mapping (core/sound.js) — from link data only, deterministic, capped, randomness 0.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const A = require('../art/oracle-art.js');
const S = require('../core/sound.js');
const P = { s: 'ORACLE-7K3F-Q9ZD', o: 21, f: 77, d: 80, c: 40, p: 70, y: 60, x: 65, i: 55, e: 75, r: 60, t: 50, k: 60, a: 70, n: 4 };
const PAT = { mode: 'pattern', dg: '1a2b3c4d', db: 'N2M' };
// Snapshots recorded at v7 WP5 (SOUND_V 1). Changing them changes every shared sound: bump SOUND_V instead.
const SNAP = {
  choices: [0.4, 0, 246.9417, 0.025, 0.216, 0.3, 2, 1.2057, 0.18, 0, 0, 0, 0.1, 0.1375, 0, 0, 0.024, 0.8, 0.08, 0.15, 0],
  pattern: [0.4, 0, 246.9417, 0.025, 0.216, 0.3, 2, 1.2543, 0.18, 0, 82.6859, 0.12, 0.1, 0.1375, 0, 0, 0.024, 0.8, 0.08, 0.15, 0]
};
// SHA-256 (first 16 hex) of the Float32 PCM ZzFX 1.4.0 builds from the snapshot lists, in V8 (Node and Chromium).
const PCM = { choices: '913c8577072bf4ef', pattern: '40a7f299d33b30a9' };
const zzfx = async () => { globalThis.AudioContext = globalThis.AudioContext || class {}; return (await import(pathToFileURL(path.join(__dirname, '../vendor/zzfx-1.4.0/ZzFX.js')).href)).ZZFX; };
const pcmHash = (Z, L) => crypto.createHash('sha256').update(Buffer.from(new Float32Array(Z.buildSamples(...L)).buffer)).digest('hex').slice(0, 16);

test('sound: parameter snapshots for the reference link (choices only, and with a device pattern)', () => {
  assert.equal(S.SOUND_V, 1); assert.equal(S.NAMES.length, 21);
  assert.deepEqual(S.params(P), SNAP.choices);
  assert.deepEqual(S.params(P, PAT), SNAP.pattern);
  assert.deepEqual(S.params(P, { mode: 'pattern', dg: '1a2b3c4d', db: { gpu: 3, cores: 2, tzh: 4 } }).length, 21);
});
test('sound: withheld / no ring / malformed pattern = choices only; live readings are never an input', () => {
  for (const d of [undefined, null, { mode: 'none' }, { mode: 'withheld' }, { mode: 'full', dg: '1a2b3c4d', db: 'N2M', b: { tz: 'Asia/Yerevan' } }, { mode: 'pattern', dg: 'zz' }])
    assert.deepEqual(S.params(P, d), SNAP.choices, JSON.stringify(d));
});
test('sound: identical across runs and independent of key order / extra fields', () => {
  assert.deepEqual(S.params(P), S.params(P));
  assert.deepEqual(S.params({ ...P, junk: 'x', lat: 40.1 }), SNAP.choices);
  assert.deepEqual(S.params(Object.fromEntries(Object.entries(P).reverse())), SNAP.choices);
});
test('sound: randomness 0, volume ≤ 0.5 and length ≤ 1.2 s for 2000 random links', () => {
  const r = A._rng('sound-fuzz');
  for (let k = 0; k < 2000; k++) {
    const p = {};
    for (const [key, [lo, hi]] of Object.entries(A.RANGES)) p[key] = lo + Math.floor(r() * (hi - lo + 1));
    p.s = 'ORACLE-' + ['7K3F', 'ABCD', 'Z9Z9'][k % 3] + '-' + ['Q9ZD', '0000', 'MN12'][(k >> 2) % 3];
    const L = S.params(p, k % 2 ? PAT : undefined);
    assert.equal(L[1], 0); assert.ok(L[0] > 0 && L[0] <= S.MAX_VOLUME); assert.ok(S.seconds(L) <= S.MAX_SECONDS, S.seconds(L));
    assert.ok(L.every(Number.isFinite));
  }
});
test('sound: choices change the sound; the sound does not change the link or composition id', () => {
  assert.notDeepEqual(S.params({ ...P, n: 0 }), SNAP.choices);
  assert.notDeepEqual(S.params({ ...P, s: 'ORACLE-ABCD-EFGH' }), SNAP.choices);
  const enc = A.encode(P), id = A.compositionId(P); S.params(P, PAT);
  assert.equal(A.encode(P), enc); assert.equal(A.compositionId(P), id);
});
test('sound: vendored ZzFX 1.4.0 builds byte-identical PCM from the snapshot (V8), and twice the same', async () => {
  const Z = await zzfx();
  for (const k of ['choices', 'pattern']) {
    const h = pcmHash(Z, SNAP[k]);
    assert.equal(h, pcmHash(Z, SNAP[k]));
    assert.equal(h, PCM[k], k);
    const n = Z.buildSamples(...SNAP[k]).length; assert.ok(n / 44100 <= S.MAX_SECONDS + 0.01, n);
  }
});
