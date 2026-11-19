// v7 WP2: "Save the build" frame plan and the stage() filter — pure, deterministic, and compose() untouched.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../art/oracle-art.js');
const L = require('../art/layers.js');
const F = require('../art/fingerprint.js');
const B = require('../art/build.js');
const P = { s: 'ORACLE-7K3F-Q9ZD', o: 21, f: 77, e: 75, r: 60, t: 50, k: 60, a: 70, n: 4 };
const PAT = { mode: 'pattern', dg: '1a2b3c4d', db: { gpu: 3, cores: 2, tzh: 4 } };

test('build: frame counts per engine (reveal cards + optional title frame; legacy 8 draw-in frames)', () => {
  assert.equal(B.frames(2, false).length, 5);
  assert.equal(B.frames(2, true).length, 6);
  assert.equal(B.frames(3, false).length, 6);
  assert.equal(B.frames(3, true).length, 7);
  assert.equal(B.frames(1, true).length, 8);
  assert.deepEqual(B.frames(3, true).map(f => f.delay), [600, 600, 600, 600, 600, 600, 2500]);
  assert.deepEqual(B.frames(1, false).map(f => f.progress), [1, 2, 3, 4, 5, 6, 7, 8].map(k => k / 8));
  assert.equal(B.frames(1, true).filter(f => f.overlay).length, 1);
});
test('build: stages are cumulative in reveal order', () => {
  const fr = B.frames(3, false);
  assert.deepEqual(fr.map(f => f.groups.at(-1)), ['shards', 'lattice', 'network', 'flow', 'core', 'device']);
  fr.forEach((f, i) => assert.equal(f.groups.length, i + 1));
  assert.ok(!B.frames(2, false).some(f => f.groups.includes('device')));
});
test('build: frames() is pure (same input, same plan)', () => {
  assert.deepEqual(B.frames(3, true), B.frames(3, true));
});
test('stage(): keeps only the listed groups, all groups = the full scene, and never changes the scene', () => {
  const sc = F.compose(P, 1080 / 1350, PAT), before = JSON.stringify(sc);
  const count = (s) => s.layers.reduce((n, l) => n + l.items.length, 0);
  const full = L.stage(sc, B.ORDER);
  assert.equal(count(full), count(sc));
  for (const g of B.ORDER) {
    const one = L.stage(sc, [g]);
    assert.ok(one.layers.every(l => l.items.every(it => it.g === g)));
  }
  let prev = 0;
  for (const f of B.frames(3, false)) { const n = count(L.stage(sc, f.groups)); assert.ok(n >= prev); prev = n; }
  assert.equal(JSON.stringify(sc), before);
});
test('stage(): compose and compositionId are unchanged by building frames', () => {
  const id = F.compositionId(P, PAT), id2 = L.compositionId(P), id1 = A.compositionId(P);
  for (const f of B.frames(3, true)) if (f.groups) L.stage(F.compose(P, 1, PAT), f.groups);
  assert.equal(F.compositionId(P, PAT), id); assert.equal(L.compositionId(P), id2); assert.equal(A.compositionId(P), id1);
});
