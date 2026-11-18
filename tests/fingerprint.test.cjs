// art/fingerprint.js — engine 3 (layered + fingerprint ring). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../art/oracle-art.js');
const L = require('../art/layers.js');
const F = require('../art/fingerprint.js');
const P = require('../core/privacy.js');

const FIXED = { s: 'ORACLE-7K3F-Q9ZD', o: 21, f: 77, d: 80, c: 40, p: 70, y: 60, x: 65, i: 55, e: 75, r: 60, t: 50, k: 60, a: 70, n: 4 };
const PAT = { mode: 'pattern', dg: '1a2b3c4d', db: { gpu: 3, cores: 2, tzh: 4 } };
const FULL_B = { aspect: 2, dpr: 3, cores: 2, mem: 2, gpu: 3, tzh: 4, langs: 3, fonts: 2, touch: 2, net: 1, bat: 2, charging: true, dark: true, loc: { band: 1, hemi: 'N' }, mic: 2 };
const FULL = { ...PAT, mode: 'full', b: FULL_B };
const strip = (scene) => scene.layers.map(Ly => Ly.items.filter(it => it.g !== 'device'));
const dev = (scene) => scene.layers.flatMap(Ly => Ly.items.filter(it => it.g === 'device'));
const PARAMS = [FIXED, { ...FIXED, o: 0, f: 0, n: 0 }, { ...FIXED, s: 'ORACLE-AB12-CD34', o: 63, f: 255, e: 0, r: 0, t: 0, k: 0, a: 0 }];

test('the five v4 layers are byte-identical to engine 2 whatever the device (own stream; ring only appended)', () => {
  for (const p of PARAMS) for (const aspect of [0.8, 1, 9 / 16, 16 / 9]) {
    const ref = JSON.stringify(L.compose(p, aspect).layers.map(Ly => Ly.items));
    for (const d of [undefined, PAT, FULL, { ...PAT, dg: 'ffffffff' }, { ...PAT, db: { gpu: null, cores: null, tzh: null } }])
      assert.equal(JSON.stringify(strip(F.compose(p, aspect, d))), ref);
  }
});

test('deterministic and quantised: same input → same scene and id; a different digest → a different ring', () => {
  assert.equal(JSON.stringify(F.compose(FIXED, 0.8, PAT)), JSON.stringify(F.compose(FIXED, 0.8, PAT)));
  assert.equal(F.compositionId(FIXED, PAT), F.compositionId(FIXED, { ...PAT }));
  assert.notEqual(JSON.stringify(dev(F.compose(FIXED, 1, PAT))), JSON.stringify(dev(F.compose(FIXED, 1, { ...PAT, dg: '1a2b3c4e' }))));
  for (const it of dev(F.compose(FIXED, 1, FULL))) for (const v of it.pts) assert.equal(v, Math.round(v * 10000) / 10000);
});

test('loops 3–7 from the core band; 15° per time-zone hour; colour role from the GPU class, never red', () => {
  for (let c = 0; c <= 4; c++) assert.equal(F.compose(FIXED, 1, { ...PAT, db: { ...PAT.db, cores: c } }).ring.loops, 3 + c);
  assert.equal(F.compose(FIXED, 1, PAT).ring.turn, 60);
  assert.equal(F.compose(FIXED, 1, { ...PAT, db: { ...PAT.db, tzh: -5 } }).ring.turn, -75);
  for (let g = 0; g < 7; g++) assert.notEqual(F.compose(FIXED, 1, { ...PAT, db: { ...PAT.db, gpu: g } }).ring.role, 3);
});

test('withheld style: no pattern (or a malformed one) → three dashed neutral circles', () => {
  for (const d of [undefined, null, { mode: 'none' }, { mode: 'pattern', dg: 'XYZ', db: PAT.db }, { mode: 'full', dg: '1a2b3c4d' }]) {
    const items = dev(F.compose(FIXED, 1, d));
    assert.equal(items.length, 144); assert.ok(items.every(it => it.c === 1 && it.a === 0.16 && it.pts.length === 4));
  }
});

test('pattern = shareable part of full: the in-tab details add marks but keep loops, turn and colour; full with no extra buckets equals pattern', () => {
  const p = F.compose(FIXED, 1, PAT), f = F.compose(FIXED, 1, FULL);
  assert.deepEqual([f.ring.loops, f.ring.turn, f.ring.role], [p.ring.loops, p.ring.turn, p.ring.role]);
  assert.ok(f.ring.details.length >= 6, f.ring.details.join());
  assert.equal(JSON.stringify(F.compose(FIXED, 1, { ...PAT, mode: 'full', b: {} }).layers), JSON.stringify(p.layers));
  assert.deepEqual(F.toPattern(FULL), PAT);
});

test('links: parseDevice reads only a valid dg + db; round trip with OraclePrivacy.dbCode', () => {
  const db = P.dbCode({ gpu: 3, cores: 2, tzh: 4 });
  assert.deepEqual(F.parseDevice(`s=ORACLE-7K3F-Q9ZD&v=3&dg=1a2b3c4d&db=${db}`), PAT);
  for (const bad of ['v=3', 'dg=1a2b3c4d', 'db=N2G', 'dg=1A2B3C4D&db=N2G', 'dg=1a2b3c4d&db=N9G', 'dg=1a2b3c4d5&db=N2G', 'dg=<script>&db=N2G'])
    assert.deepEqual(F.parseDevice(bad), F.WITHHELD, bad);
});

test('captions follow the share mode and never describe in-tab details', () => {
  assert.match(F.caption(FIXED, 'C-1', '', undefined), /answers only/);
  const c = F.caption(FIXED, 'C-1', '', FULL);
  assert.match(c, /salted device pattern/); assert.match(c, /5 ridge loops, turned 60\u00b0/);
  assert.doesNotMatch(c, /horizon|vibration|glow|breaks/);
  assert.match(F.describe(FULL), /horizon arc/);
});

test('legacy engine untouched: v1 compose ignores everything new', () => {
  const before = A.sceneHash(A.compose(FIXED, 1));
  F.setContext(FULL); assert.equal(A.sceneHash(A.compose(FIXED, 1)), before); F.setContext(null);
  assert.deepEqual(F.context(), F.WITHHELD);
});
