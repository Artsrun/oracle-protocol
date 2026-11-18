// core/privacy.js — buckets, digest, link part, Remember, Forget everything, raw-value guard. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const nodeCrypto = require('node:crypto');
const store = {}; Object.defineProperties(store, {
  getItem: { value: (k) => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null }, setItem: { value: (k, v) => { store[k] = String(v); } },
  removeItem: { value: (k) => { delete store[k]; } } });
Object.defineProperty(globalThis, 'localStorage', { value: store, configurable: true, writable: true });
const D = require('../core/device.js');
const P = require('../core/privacy.js');
const { fakeEnv } = require('./fake-env.cjs');
const read = async (o) => { D.forget(); D.allowPassive(); await D.readPassive(fakeEnv(o)); return D.snapshot(); };

test('buckets are coarse; missing or randomised readings give null (neutral)', async () => {
  const b = P.buckets(await read());
  assert.deepEqual({ aspect: b.aspect, dpr: b.dpr, cores: b.cores, mem: b.mem, gpu: b.gpu, tzh: b.tzh, langs: b.langs, fonts: b.fonts, touch: b.touch, net: b.net, bat: b.bat },
    { aspect: 1, dpr: 2, cores: 3, mem: 2, gpu: 3, tzh: 6, langs: 2, fonts: 0, touch: 0, net: 2, bat: 1 });
  const br = P.buckets(await read({ brave: true, connection: null }));
  assert.equal(br.cores, null); assert.equal(br.mem, null); assert.equal(br.gpu, null); assert.equal(br.fonts, null); assert.equal(br.bat, null); assert.equal(br.net, null);
  assert.equal(br.tzh, 6, 'time zone is not randomised by Brave');
});

test('canonical form leaves randomised readings out, so Brave\u2019s per-session noise cannot change the digest', async () => {
  const a = P.canonical(await read({ brave: true })), b = P.canonical(await read({ brave: true, cores: 3, memory: 2 }));
  assert.equal(a, b);
  assert.match(a, /canvas=-\|fontset=-$/);
  assert.notEqual(P.canonical(await read()), P.canonical(await read({ cores: 4 })));
});

test('digest = first 32 bits of SHA-256(salt ‖ canonical), matches node:crypto', async () => {
  const salt = new Uint8Array(16).fill(7), text = P.canonical(await read());
  const expect = nodeCrypto.createHash('sha256').update(Buffer.concat([Buffer.from(salt), Buffer.from(text)])).digest('hex').slice(0, 8);
  assert.equal(await P.digest(salt, text), expect);
  assert.notEqual(await P.digest(new Uint8Array(16).fill(8), text), expect, 'another salt → another digest');
});

test('bucket code: 3 chars from fixed alphabets, round trip, bad codes rejected', () => {
  const code = P.dbCode({ gpu: 3, cores: 3, tzh: 4 });
  assert.equal(code, 'N3G'); assert.deepEqual(P.parseDb(code), { gpu: 3, cores: 3, tzh: 4 });
  assert.equal(P.dbCode({ gpu: null, cores: null, tzh: null }), 'XXX'); assert.deepEqual(P.parseDb('XXX'), { gpu: null, cores: null, tzh: null });
  for (const bad of ['', 'N3', 'N3GG', 'Z3G', 'N9G', 'N3U', 'n3g', '<sc']) assert.equal(P.parseDb(bad), null, bad);
  assert.equal(P.parseDg('0a1b2c3d'), '0a1b2c3d'); assert.equal(P.parseDg('0A1B2C3D'), null); assert.equal(P.parseDg('0a1b2c3'), null);
});

test('share mode: Choices only by default — the link part is empty; the opt-in adds only dg + db', async () => {
  P.forgetEverything(); const S = await read();
  assert.equal(P.share(), 'choices');
  const pat = await P.pattern('ORACLE-7K3F-Q9ZD', S);
  assert.equal(P.linkPart(pat), '');
  P.setShare('pattern');
  assert.match(P.linkPart(pat), /^&dg=[0-9a-f]{8}&db=[XAINDQR][X0-4][X0-9A-HJKMNP-T]$/);
  P.setShare('choices');
});

test('per-artwork salt: a new seed gives a new pattern; Remember keeps it (stores the salt only)', async () => {
  P.forgetEverything(); const S = await read();
  const a = await P.pattern('ORACLE-AAAA-AAAA', S), a2 = await P.pattern('ORACLE-AAAA-AAAA', S), b = await P.pattern('ORACLE-BBBB-BBBB', S);
  assert.equal(a.dg, a2.dg); assert.notEqual(a.dg, b.dg);
  P.setRemember(true);
  const r1 = await P.pattern('ORACLE-CCCC-CCCC', S), r2 = await P.pattern('ORACLE-DDDD-DDDD', S);
  assert.equal(r1.dg, r2.dg);
  assert.deepEqual(Object.keys(store), [P.SALT_KEY]); assert.match(store[P.SALT_KEY], /^[0-9a-f]{32}$/);
  P.setRemember(false); assert.equal(store[P.SALT_KEY], undefined);
});

test('privacy property: across random devices no raw reading reaches the link part, the bucket code or storage', async () => {
  const sentinels = ['SENTINEL-UA-3K', 'SENTINEL-GPU-7Q', 'SENTINEL-WGPU-5M', 'Kathmandu'];
  for (let i = 0; i < 40; i++) {
    P.forgetEverything(); P.setShare('pattern');
    const S = await read({ cores: 1 + (i % 24), memory: [0.5, 2, 4, 8][i % 4], offset: -60 * ((i % 27) - 12), languages: ['en', 'x-sntl', 'hy'].slice(0, 1 + (i % 3)) });
    if (i % 5 === 0) P.setRemember(true);
    const pat = await P.pattern('ORACLE-7K3F-Q9ZD', S), out = P.linkPart(pat) + JSON.stringify(store);
    for (const s of sentinels) assert.ok(!out.includes(s), s);
    assert.deepEqual(P.findRaw(out, S), []);
    assert.ok(P.rawStrings(S).length >= 5, 'the guard knows the raw strings');
  }
  P.forgetEverything();
});

test('Forget everything: readings, salt, share mode and every oracle.* key gone; other keys untouched', async () => {
  await read(); P.setShare('pattern'); P.setRemember(true);
  store['oracle.v2.history'] = '[]'; store['oracle.theme'] = 'dark'; store['other.app'] = 'keep';
  P.forgetEverything();
  assert.deepEqual(D.snapshot(), { passive: null, brave: null, tilt: null, location: null, mic: null });
  assert.equal(P.share(), 'choices'); assert.equal(P.remember(), false);
  assert.deepEqual(Object.keys(store), ['other.app']);
  delete store['other.app'];
});
