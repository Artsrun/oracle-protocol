// v3: art dials derived from ticked trades when the Exchange simulator is hidden.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../data/content.js');
const A = require('../art/oracle-art.js');

test('deriveEx is pure and deterministic for every offers bitmask', () => {
  for (let o = 0; o < 64; o++) assert.deepEqual(C.deriveEx(o), C.deriveEx(o));
});
test('deriveEx stays within the art ranges (0..100 integers) for all 64 combinations', () => {
  for (let o = 0; o < 64; o++) for (const [k, v] of Object.entries(C.deriveEx(o))) {
    assert.ok(Number.isInteger(v) && v >= A.RANGES[k][0] && v <= A.RANGES[k][1], `o=${o} ${k}=${v}`);
  }
});
test('ticking more trades never lowers a dial; no trades = base 30', () => {
  assert.deepEqual(Object.values(C.deriveEx(0)), [30, 30, 30, 30, 30, 30]);
  for (let o = 0; o < 64; o++) for (let i = 0; i < 6; i++) if (!((o >> i) & 1)) {
    const a = C.deriveEx(o), b = C.deriveEx(o | (1 << i));
    for (const k of Object.keys(a)) assert.ok(b[k] >= a[k]);
  }
});
test('different trade sets give different compositions (same seed)', () => {
  const base = { s: 'ORACLE-7K3F-Q9ZD', f: 0, e: 50, r: 50, t: 30, k: 40, a: 40, n: 0 };
  const h = (o) => A.sceneHash(A.compose({ ...base, o, ...C.deriveEx(o) }, 1080 / 1350));
  assert.equal(h(37), h(37));
  assert.notEqual(h(37), h(38));
});
