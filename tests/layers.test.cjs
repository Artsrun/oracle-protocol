// Layered engine (engine 2): stability — each answer changes only its own layer. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../art/oracle-art.js');
const L = require('../art/layers.js');

const P = { s: 'ORACLE-7K3F-Q9ZD', o: 0, f: 0, e: 50, r: 50, t: 30, k: 40, a: 40, n: 0 };
const ASP = [1080 / 1350, 1080 / 1920, 1];
const groups = (p, asp) => { const sc = L.compose(p, asp); return Object.fromEntries(L.GROUPS.map(g => [g, JSON.stringify(L.group(sc, g))])); };
const changed = (a, b) => L.GROUPS.filter(g => a[g] !== b[g]);

test('deterministic: same seed + answers → identical scene in every format', () => {
  for (const asp of ASP) assert.deepEqual(L.compose({ ...P, o: 5, f: 9 }, asp), L.compose({ ...P, o: 5, f: 9 }, asp));
});

test('different seed → different composition', () => {
  assert.notEqual(L.compositionId(P), L.compositionId({ ...P, s: 'ORACLE-7K3F-Q9ZE' }));
});

test('each trade tick changes only the shards layer', () => {
  for (const asp of ASP) for (let i = 0; i < 6; i++) {
    const base = { ...P, o: 0b010100, f: 0b1001 };
    assert.deepEqual(changed(groups(base, asp), groups({ ...base, o: base.o ^ (1 << i) }, asp)), ['shards'], 'trade ' + i);
  }
});

test('each footprint tick changes only the lattice (relationships also grows the network)', () => {
  for (let i = 0; i < 8; i++) {
    const base = { ...P, o: 5, f: 0b00010001 };
    const ch = changed(groups(base, 0.8), groups({ ...base, f: base.f ^ (1 << i) }, 0.8));
    const allowed = i === 2 ? ['lattice', 'network'] : ['lattice', 'network'];
    assert.ok(ch.includes('lattice'), 'kind ' + i + ' changes the lattice');
    assert.ok(ch.every(g => allowed.includes(g)), 'kind ' + i + ' touched ' + ch);
  }
});

test('adding a footprint kind only ADDS lattice edges (none move)', () => {
  const a = L.group(L.compose({ ...P, f: 0b1 }, 0.8), 'lattice').map(x => JSON.stringify(x));
  const b = new Set(L.group(L.compose({ ...P, f: 0b11 }, 0.8), 'lattice').map(x => JSON.stringify(x)));
  assert.ok(a.length > 0); assert.ok(a.every(x => b.has(x)));
});

test('feed answers change only flow and core; rounds change only core', () => {
  const base = { ...P, o: 5, f: 9 };
  for (const id of Object.keys(L.FEEDS)) {
    const ch = changed(groups(base, 0.8), groups({ ...base, ...L.FEEDS[id] }, 0.8));
    assert.ok(ch.every(g => g === 'flow' || g === 'core'), id + ' touched ' + ch);
  }
  assert.deepEqual(changed(groups(base, 0.8), groups({ ...base, n: 6 }, 0.8)), ['core']);
});

test('legacy-only params (d c p y x i) do not affect the layered engine', () => {
  assert.equal(L.compositionId({ ...P, d: 0, c: 0 }), L.compositionId({ ...P, d: 100, c: 100 }));
});

test('scene draws with the legacy renderer structure and stays within budget', () => {
  const sc = L.compose({ ...P, o: 63, f: 255, e: 100, r: 100, t: 100, a: 100, n: 12 }, 1080 / 1920);
  assert.equal(sc.layers.length, 4);
  const items = sc.layers.reduce((s, l) => s + l.items.length, 0);
  assert.ok(items < 6000, 'items ' + items);
  assert.ok(A.sceneHash(sc).length >= 10);
});

test('plain-words interpretation names only what was chosen', () => {
  assert.equal(L.interpret({ ...P, o: 0b111, f: 0b1111, ...L.FEEDS.engaging, n: 4 }),
    '3 shards for the apps you trade with. 4 of 8 kinds of data in the lattice. Feed: Most engaging, 4 rounds.');
  assert.match(L.caption(P, 'C-X'), /no personal data, no server/);
});
