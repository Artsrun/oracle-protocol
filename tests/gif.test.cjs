// v7 WP3: GIF glue (core/build-gif.js) with the vendored gifenc — global palette, plays once, Comment extension.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const GIF = require('../core/build-gif.js');
const B = require('../art/build.js');
const load = () => import(pathToFileURL(path.join(__dirname, '../vendor/gifenc-1.0.3/gifenc.esm.js')).href);
const W = 40, H = 50;
// a deterministic synthetic "build": each frame adds a band of colour
const painter = (plan) => (f) => {
  const k = plan.indexOf(f) + 1, px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, band = Math.floor(y / (H / 7));
    const on = band < k; px[i] = on ? (band * 37) & 255 : 8; px[i + 1] = on ? (x * 6) & 255 : 10; px[i + 2] = on ? 200 - band * 20 : 24; px[i + 3] = 255;
  }
  return px;
};
const has = (u8, ascii) => Buffer.from(u8).includes(Buffer.from(ascii, 'latin1'));

test('gif: comment block round-trips, including text longer than one 255-byte sub-block', () => {
  const t = 'oracle:' + 'x'.repeat(600) + ';id=ABC';
  const blk = GIF.commentBlock(t);
  assert.equal(blk[0], 0x21); assert.equal(blk[1], 0xfe); assert.equal(blk[2], 255); assert.equal(blk.at(-1), 0);
  const fake = Uint8Array.from([...Buffer.from('GIF89a'), 1, 0, 1, 0, 0, 0, 0, 0x3b]);
  assert.deepEqual(GIF.readComments(GIF.withComment(fake, t)), [t]);
  assert.throws(() => GIF.withComment(Uint8Array.from([1, 2, 3]), 'x'));
});
test('gif: non-ASCII becomes "?" (the GIF comment is 7-bit text)', () => {
  assert.deepEqual([...GIF.commentBlock('a\u00e9')], [0x21, 0xfe, 2, 97, 63, 0]);
});
test('gif: encode is deterministic, plays once, one global palette, carries the comment, all frames present', async () => {
  const G = await load();
  const plan = B.frames(3, true), seen = [];
  const run = () => GIF.encode(G, plan, painter(plan), { w: W, h: H, comment: 'oracle:s=ORACLE-7K3F-Q9ZD&v=3;id=X', yield: false, onProgress: (d, n) => seen.push(d + '/' + n) });
  const a = await run(), b = await run();
  assert.equal(crypto.createHash('sha256').update(a).digest('hex'), crypto.createHash('sha256').update(b).digest('hex'));
  assert.equal(Buffer.from(a.subarray(0, 6)).toString('latin1'), 'GIF89a');
  assert.equal(a.at(-1), 0x3b);
  assert.ok(!has(a, 'NETSCAPE2.0'), 'no loop extension: plays once (D3)');
  assert.ok(a[10] & 0x80, 'global colour table present (D5)');
  assert.deepEqual(GIF.readComments(a), ['oracle:s=ORACLE-7K3F-Q9ZD&v=3;id=X']);
  // count image descriptors and check none has a local colour table; read the frame delays
  let i = 13 + 3 * (1 << ((a[10] & 7) + 1)), frames = 0; const delays = [];
  const skip = (j) => { while (a[j] !== 0) j += a[j] + 1; return j + 1; };
  while (a[i] !== 0x3b) {
    if (a[i] === 0x21) { if (a[i + 1] === 0xf9) delays.push((a[i + 4] | (a[i + 5] << 8)) * 10); i = skip(i + 2); }
    else if (a[i] === 0x2c) { frames++; assert.equal(a[i + 9] & 0x80, 0, 'no local colour table'); i = skip(i + 11); }
    else assert.fail('unexpected block ' + a[i]);
  }
  assert.equal(frames, plan.length);
  assert.deepEqual(delays, plan.map(f => f.delay));
  assert.equal(seen.length, 2 * plan.length); assert.equal(seen.at(-1), '7/7');
});
test('gif: file name follows the PNG naming (seed, "build", size)', () => {
  assert.equal(GIF.fileName('ORACLE-7K3F-Q9ZD'), 'oracle-7k3f-q9zd-build-540x675.gif');
  assert.equal(GIF.W / GIF.H, 1080 / 1350);
});
