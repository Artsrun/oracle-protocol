// Run: node --test tests/   (no dependencies)
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../art/oracle-art.js');

const P = { s: 'ORACLE-7K3F-Q9ZD', o: 21, f: 77, d: 80, c: 40, p: 70, y: 60, x: 65, i: 55, e: 75, r: 60, t: 50, k: 60, a: 70, n: 4 };
const aspects = { portrait: 1080 / 1350, story: 1080 / 1920, square: 1 };

test('same seed + params → identical scene (all formats)', () => {
  for (const [name, asp] of Object.entries(aspects)) {
    const a = A.compose(P, asp), b = A.compose({ ...P }, asp);
    assert.deepEqual(a, b, name);
    assert.equal(A.sceneHash(a), A.sceneHash(b), name);
  }
});

test('different seed → different composition', () => {
  const h1 = A.sceneHash(A.compose(P, 1));
  const h2 = A.sceneHash(A.compose({ ...P, s: 'ORACLE-7K3F-Q9ZE' }, 1));
  assert.notEqual(h1, h2);
});

test('every parameter changes the composition', () => {
  const base = A.sceneHash(A.compose(P, 1));
  for (const k of A.KEY_ORDER.slice(1)) {
    const [lo, hi] = A.RANGES[k];
    const v = P[k] === hi ? hi - 1 : P[k] + 1;
    assert.notEqual(A.sceneHash(A.compose({ ...P, [k]: Math.max(lo, v) }, 1)), base, 'param ' + k);
  }
});

test('normalize whitelists keys and clamps ranges', () => {
  const n = A.normalize({ ...P, lat: 40.18, lng: 44.51, ua: 'Mozilla', d: 999, n: -5, s: 'not a seed' });
  assert.deepEqual(Object.keys(n).sort(), [...A.KEY_ORDER].sort());
  assert.equal(n.d, 100); assert.equal(n.n, 0); assert.equal(n.s, A.DEFAULTS.s);
  assert.ok(!('lat' in n) && !('ua' in n));
});

test('encode/decode round-trip; decode drops unknown keys', () => {
  const str = A.encode(P);
  assert.deepEqual(A.decode('#art?' + str), A.normalize(P));
  assert.deepEqual(A.decode('#art?' + str + '&geo=40.1,44.5&gpu=ANGLE'), A.normalize(P));
  assert.doesNotMatch(str, /lat|lng|geo|ua|gpu|device/);
});

test('newSeed is well-formed and uses supplied randomness only', () => {
  const s = A.newSeed(n => new Uint8Array(n).fill(7));
  assert.match(s, /^ORACLE-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.equal(s, A.newSeed(n => new Uint8Array(n).fill(7)));
});

test('compose is fast enough for mobile (< 150 ms in Node, story format, max density)', () => {
  const max = { ...P, d: 100, f: 255, o: 63, e: 100, r: 100, t: 100, k: 100, a: 100, n: 12 };
  const t0 = performance.now();
  const s = A.compose(max, aspects.story);
  const dt = performance.now() - t0;
  const prims = s.layers.reduce((a, L) => a + L.items.length, 0);
  console.log(`  story/max: ${prims} primitives in ${dt.toFixed(1)} ms`);
  assert.ok(dt < 150, dt);
});

test('interpretation uses only abstract parameters', () => {
  const t = A.interpret(P);
  assert.match(t, /lattice of disclosure/);
  assert.doesNotMatch(t, /\d+\.\d{3,}/); // no raw readings
});
