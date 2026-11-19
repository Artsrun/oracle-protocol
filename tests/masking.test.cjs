// v7 WP7: masking checks M1–M4 (core/device.js masking()). Fixtures model each protection; a clean browser and a
// real UTC user must give ZERO flags (false positives are the worse failure: they hide real readings).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../core/device.js');
const P = require('../core/privacy.js');
const { fakeEnv } = require('./fake-env.cjs');

// A pixel-accurate fake 2D canvas. noise: null | 'brave' (random low-bit flips on every read, also toDataURL) |
// 'firefox' (a fixed per-session XOR on some pixels; toDataURL stable within the session) | 'safari' (noise on painted
// pixels only, not on putImageData pixels).
function pixelCanvas(noise, sessionKey, base) {
  let calls = 0;
  return () => {
    const c = { width: 0, height: 0 }; let px = new Uint8ClampedArray(0), painted = new Uint8Array(0), W = 0;
    const size = () => { if (W !== c.width || px.length !== c.width * c.height * 4) { W = c.width; px = new Uint8ClampedArray(c.width * c.height * 4); painted = new Uint8Array(c.width * c.height); } };
    const hex = (s) => { const m = /^#([0-9a-f]{6})$/i.exec(s) || [0, '000000']; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
    const ctx = {
      fillStyle: '#000000', font: '', strokeStyle: '',
      createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      putImageData(img) { size(); px.set(img.data); painted.fill(0); },
      fillRect(x, y, w, h) { size(); const [r, g, b] = hex(this.fillStyle); for (let j = y; j < y + h && j < c.height; j++) for (let i = x; i < x + w && i < c.width; i++) { const k = (j * c.width + i) * 4; px[k] = r; px[k + 1] = g; px[k + 2] = b; px[k + 3] = 255; painted[j * c.width + i] = 1; } },
      getImageData(x, y, w, h) {
        size(); const out = Uint8ClampedArray.from(px); calls++;
        for (let p = 0; p < out.length / 4; p++) {
          if (noise === 'brave' && (p * 7 + calls * 13) % 23 === 0) out[p * 4] ^= 1;
          if (noise === 'firefox' && (p + sessionKey) % 17 === 0) out[p * 4 + 1] ^= 1;
          if (noise === 'safari' && painted[p] && (p + sessionKey) % 11 === 0) out[p * 4 + 2] ^= 1;
        }
        return { width: w, height: h, data: out };
      },
      fillText() {}, beginPath() {}, arc() {}, stroke() {},
      measureText(s) { const f = this.font; return { width: f.includes('Georgia') || f.includes('Arial') ? 300 : 280 }; }
    };
    c.getContext = (t) => /webgl/.test(t) ? base().getContext(t) : ctx;
    c.toDataURL = () => 'data:image/png;base64,AAAA' + (noise === 'brave' ? Math.random() : noise ? 'K' + sessionKey : 'X');
    return c;
  };
}
// Native-looking functions: a Proxy around a function stringifies as native code in V8 (that is also why a Proxy-based
// spoofing extension can evade M3 — an honest limit, documented in QA.md).
const nat = (f) => new Proxy(f, {});
function maskEnv(o) {
  o = o || {};
  const base = fakeEnv({ brave: o.brave, tz: o.tz || 'Asia/Yerevan', offset: o.offset ?? -240 });
  const vals = { hardwareConcurrency: 16, deviceMemory: 8, userAgent: base.navigator.userAgent, languages: ['en-US', 'hy'], width: 2560, height: 1440 };
  const NavP = {}, ScrP = {};
  for (const k of ['hardwareConcurrency', 'deviceMemory', 'userAgent', 'languages']) Object.defineProperty(NavP, k, { get: nat(() => vals[k]), configurable: true });
  for (const k of ['width', 'height']) Object.defineProperty(ScrP, k, { get: nat(() => vals[k]), configurable: true });
  ScrP.colorDepth = 24;
  const nav = Object.create(NavP);
  for (const [k, v] of Object.entries(base.navigator)) if (!(k in NavP)) nav[k] = v;
  const scr = Object.create(ScrP);
  const proto = (names) => { const p = {}; names.forEach(n => { p[n] = nat(() => 0); }); return { prototype: p }; };
  const win = Object.assign(base.window, {
    Navigator: { prototype: NavP }, Screen: { prototype: ScrP }, HTMLCanvasElement: proto(['toDataURL']),
    CanvasRenderingContext2D: proto(['getImageData', 'measureText']), WebGLRenderingContext: proto(['getParameter'])
  });
  const off = o.offset ?? -240, tz = o.tz || 'Asia/Yerevan';
  class FakeDate extends Date { getTimezoneOffset() { return off; } }
  FakeDate.prototype.getTimezoneOffset = nat(() => off);
  const Intl2 = { DateTimeFormat: Object.assign((loc, opts) => opts ? Intl.DateTimeFormat(loc, opts) : { resolvedOptions: () => ({ timeZone: tz }) }, { prototype: { resolvedOptions: nat(() => ({})) } }) };
  win.Date = FakeDate; win.Intl = Intl2;
  const dev = o.devSize || [2560, 1440];
  const matchMedia = (q) => {
    let m = /\(min-device-(width|height): (-?\d+)px\) and \(max-device-(?:width|height): (\d+)px\)/.exec(q);
    if (m) { const v = m[1] === 'width' ? dev[0] : dev[1]; return { matches: v >= +m[2] && v <= +m[3] }; }
    if (/min-device-(width|height): 0px/.test(q)) return { matches: true };
    return { matches: /dark/.test(q) };
  };
  const env = { ...base, navigator: nav, screen: scr, window: win, Date: FakeDate, Intl: Intl2, matchMedia, canvas: pixelCanvas(o.noise || null, o.key || 3, base.canvas) };
  if (o.spoof) o.spoof(env, NavP, ScrP, vals);
  return env;
}
const run = async (o) => { D.forget(); D.allowPassive(); const R = await D.readPassive(maskEnv(o)); return { R, mk: D.maskingResult(), S: D.snapshot() }; };
const flagged = (mk) => Object.keys(mk.flags).sort();
const rand = (R) => Object.values(R).filter(e => e.state === 'randomised').map(e => e.id).sort();

test('masking: nothing runs before Show me (readPassive refuses without consent)', async () => {
  D.forget(); await assert.rejects(D.readPassive(maskEnv())); assert.equal(D.maskingResult(), null);
});
test('masking: clean Chromium-like browser → all four checks ran, ZERO flags, nothing randomised', async () => {
  const { R, mk } = await run();
  assert.deepEqual(mk.ran, { m1: true, m2: true, m3: true, m4: true });
  assert.deepEqual(flagged(mk), []); assert.deepEqual(rand(R), []);
});
test('masking: real UTC users (UTC, Etc/UTC, GMT) and a real +05:45 zone → ZERO flags', async () => {
  for (const [tz, offset] of [['UTC', 0], ['Etc/UTC', 0], ['Etc/GMT', 0], ['Asia/Kathmandu', -345], ['Asia/Yerevan', -240]]) {
    const { mk } = await run({ tz, offset }); assert.deepEqual(flagged(mk), [], tz);
  }
});
test('masking: one screen mismatch alone (zoom, second monitor) → ZERO flags; both → screen flagged (M4)', async () => {
  assert.deepEqual(flagged((await run({ devSize: [1920, 1440] })).mk), []);
  assert.deepEqual(flagged((await run({ devSize: [1440, 2560] })).mk), [], 'rotated is the same screen');
  const { R, mk } = await run({ devSize: [1920, 1080] });
  assert.deepEqual(flagged(mk), ['screen']); assert.equal(R.screen.state, 'randomised'); assert.equal(R.screen.note, D.MASK_NOTE.m4screen);
});
test('masking: Brave-style farbling → M1 + M2 flag canvas and fonts; Brave rows keep their Brave notes', async () => {
  const { R, mk } = await run({ noise: 'brave', brave: true });
  assert.deepEqual(mk.flags.canvas.sort(), ['m1', 'm2']); assert.deepEqual(mk.flags.fonts, ['m1']);
  assert.equal(R.canvas.state, 'randomised'); assert.match(R.canvas.note, /Brave/);
});
test('masking: Firefox-style per-session XOR (stable within a session, so M2 misses it) → M1 catches canvas + fonts', async () => {
  const { R, mk } = await run({ noise: 'firefox' });
  assert.deepEqual(flagged(mk), ['canvas', 'fonts']); assert.deepEqual(mk.flags.canvas, ['m1']);
  assert.deepEqual(rand(R), ['canvas', 'fonts']); assert.equal(R.canvas.note, D.MASK_NOTE.m1);
});
test('masking: Safari-style noise on painted pixels only → M1 painted-rect read catches it', async () => {
  const { mk } = await run({ noise: 'safari' });
  assert.deepEqual(flagged(mk), ['canvas', 'fonts']);
});
test('masking: spoofing extension (non-native getter, instance shadow, patched method) → M3 flags exactly those readings', async () => {
  const { R, mk } = await run({ spoof: (env, NavP) => {
    Object.defineProperty(NavP, 'hardwareConcurrency', { get() { return 4; } });           // rewritten getter
    Object.defineProperty(env.navigator, 'deviceMemory', { value: 2, enumerable: true });    // shadow on the instance
    env.window.WebGLRenderingContext.prototype.getParameter = function getParameter() { return 'Fake GPU'; };
  } });
  assert.deepEqual(flagged(mk), ['cores', 'gpu', 'memory']); assert.ok(Object.values(mk.flags).every(c => c.join() === 'm3'));
  assert.equal(R.cores.state, 'randomised'); assert.equal(R.cores.note, 'An extension or setting changes this value.');
});
test('masking: spoofed time zone (name says New York, clock says UTC+4) → tz flagged (M4)', async () => {
  const { R, mk } = await run({ tz: 'America/New_York', offset: -240 });
  assert.deepEqual(flagged(mk), ['tz']); assert.equal(R.tz.state, 'randomised');
});
test('masking: the digest is stable when noisy readings vary between sessions (flagged readings are left out)', async () => {
  const a = P.canonical((await run({ noise: 'firefox', key: 3 })).S), b = P.canonical((await run({ noise: 'firefox', key: 8 })).S);
  assert.equal(a, b); assert.match(a, /canvas=-\|fontset=-$/);
  const clean = P.canonical((await run()).S); assert.notEqual(clean, a);
  assert.equal(P.buckets((await run({ noise: 'brave', brave: true })).S).fonts, null);
});
test('masking: the result holds booleans and reason codes only — no raw reading', async () => {
  for (const o of [{}, { noise: 'brave', brave: true }, { noise: 'firefox' }, { tz: 'America/New_York', offset: -240 }]) {
    const { mk, S } = await run(o), json = JSON.stringify(mk);
    assert.deepEqual(P.rawStrings(S).filter(s => json.includes(s)), []);
    assert.ok(Object.values(mk.ran).every(v => typeof v === 'boolean'));
    assert.ok(Object.values(mk.flags).flat().every(c => /^m(1|2|3|4tz|4screen)$/.test(c)));
  }
});
test('masking: isNative — native and Proxy-wrapped functions pass; plain functions and functions with prototype fail', () => {
  assert.ok(D.isNative(Math.max)); assert.ok(D.isNative(Object.getOwnPropertyDescriptor(Map.prototype, 'size').get));
  assert.ok(!D.isNative(function () { return 4; })); assert.ok(!D.isNative(() => 4)); assert.ok(D.isNative(undefined));
});
