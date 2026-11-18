// core/device.js — readers with a fake environment (no browser). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../core/device.js');

function fakeEnv(o) {
  o = o || {};
  const canvas = () => {
    let reads = 0; const c = { width: 0, height: 0 };
    c.getContext = (t) => {
      if (/webgl/.test(t)) return o.gl === null ? null : { RENDERER: 1, VENDOR: 2, getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 3, UNMASKED_VENDOR_WEBGL: 4 }),
        getParameter: (k) => ({ 1: 'WebKit WebGL', 2: 'WebKit', 3: o.renderer || 'ANGLE (NVIDIA GeForce RTX 4070 SENTINEL-GPU-7Q)', 4: 'Google Inc. (NVIDIA)' })[k] };
      return { font: '', fillRect() {}, fillText() {}, beginPath() {}, arc() {}, stroke() {},
        measureText(s) { const f = this.font; return { width: f.includes('Georgia') || f.includes('Arial') ? 300 : 280 }; } };
    };
    c.toDataURL = () => 'data:image/png;base64,AAAA' + (o.noise ? Math.random() : 'X') + (reads++ * 0);
    return c;
  };
  const nav = {
    userAgent: o.ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; SENTINEL-UA-3K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    languages: o.languages || ['en-US', 'hy'], hardwareConcurrency: o.cores === undefined ? 16 : o.cores, deviceMemory: o.memory === undefined ? 8 : o.memory,
    maxTouchPoints: 0, connection: o.connection === undefined ? { effectiveType: '4g' } : o.connection,
    getBattery: o.battery === null ? undefined : async () => ({ level: 0.57, charging: false }),
    gpu: o.webgpu === null ? undefined : { requestAdapter: async () => ({ info: o.webgpu || { vendor: 'nvidia', description: 'RTX SENTINEL-WGPU-5M' } }) },
    brave: o.brave ? { isBrave: async () => true } : undefined,
    geolocation: o.geo === null ? undefined : { getCurrentPosition: (ok, err) => setTimeout(() => o.geo === 'denied' ? err({ code: 1 }) : ok({ coords: { latitude: o.lat ?? 40.18123, longitude: 44.51789 } }), 5) }
  };
  const win = { devicePixelRatio: 2, speechSynthesis: { getVoices: () => [1, 2, 3] },
    PublicKeyCredential: { isUserVerifyingPlatformAuthenticatorAvailable: async () => true },
    DeviceOrientationEvent: o.doe === null ? undefined : { requestPermission: o.motionPerm ? async () => o.motionPerm : undefined },
    addEventListener(t, h) { this._h = h; if (o.tiltEvents) setTimeout(() => h({ beta: 10, gamma: 5 }), 10); }, removeEventListener() { this._h = null; } };
  return { navigator: nav, screen: { width: 2560, height: 1440, colorDepth: 24 }, window: win,
    Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: o.tz || 'Asia/Kathmandu' }) }) },
    Date: function () { return { getTimezoneOffset: () => o.offset ?? -345 }; },
    matchMedia: (q) => ({ matches: /dark/.test(q) }), canvas };
}

test('consent gate: passive readings refuse to run before Show me', async () => {
  D.forget();
  await assert.rejects(() => D.readPassive(fakeEnv()), /Show me/);
  assert.equal(D.snapshot().passive, null);
});

test('parseUA names browser and system in plain words', () => {
  assert.deepEqual(D.parseUA('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/156.0.1.2 Mobile Safari/537.36'), { browser: 'Chrome', version: '156', os: 'Android', mobile: true });
  assert.equal(D.parseUA('Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) Version/26.0 Mobile/15E148 Safari/604.1').browser, 'Safari');
  assert.equal(D.parseUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0').os, 'macOS');
  assert.equal(D.parseUA('Mozilla/5.0 (Windows NT 10.0) Chrome/150 Safari/537.36 Edg/150.0').browser, 'Edge');
});

test('gpuClass maps renderer strings to seven vendor classes', () => {
  assert.equal(D.gpuClass('Apple GPU'), 'apple');
  assert.equal(D.gpuClass('ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11)'), 'nvidia');
  assert.equal(D.gpuClass('Adreno (TM) 740'), 'qualcomm');
  assert.equal(D.gpuClass('Mali-G715'), 'arm');
  assert.equal(D.gpuClass('ANGLE (Intel, Intel(R) UHD Graphics 620)'), 'intel');
  assert.equal(D.gpuClass('AMD Radeon RX 7800'), 'amd');
  assert.equal(D.gpuClass('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))'), 'generic');
});

test('passive readout: every signal has a state; values come from the environment', async () => {
  D.forget(); D.allowPassive();
  const R = await D.readPassive(fakeEnv());
  for (const id of ['browser', 'langs', 'tz', 'screen', 'touch', 'cores', 'memory', 'gpu', 'webgpu', 'canvas', 'fonts', 'voices', 'battery', 'network', 'scheme', 'passkey'])
    assert.ok(['ok', 'unavailable', 'denied', 'randomised'].includes(R[id].state), id);
  assert.equal(R.browser.value, 'Chrome 150 on Windows');
  assert.equal(R.tz.raw.offsetH, 5.75);
  assert.equal(R.gpu.raw.cls, 'nvidia');
  assert.equal(R.cores.state, 'ok'); assert.equal(R.battery.value, '57%');
  assert.equal(R.fonts.raw.count, 2);
  assert.equal(R.passkey.value, 'Can use passkeys');
  assert.equal(Object.keys(R).length, 16);
});

test('missing APIs read "unavailable", never an invented value', async () => {
  D.forget(); D.allowPassive();
  const R = await D.readPassive(fakeEnv({ memory: null, battery: null, connection: null, webgpu: null, gl: null, cores: 0 }));
  for (const id of ['memory', 'battery', 'network', 'webgpu', 'gpu', 'cores']) assert.equal(R[id].state, 'unavailable', id);
  assert.equal(R.gpu.raw.cls, 'generic');
});

test('Brave: randomised signals are marked RANDOMISED and battery reads as turned off', async () => {
  D.forget(); D.allowPassive();
  const R = await D.readPassive(fakeEnv({ brave: true, connection: null, webgpu: { vendor: '', description: '' } }));
  for (const id of ['cores', 'memory', 'canvas', 'fonts', 'gpu', 'webgpu']) assert.equal(R[id].state, 'randomised', id);
  assert.equal(R.battery.state, 'unavailable');
  assert.match(R.browser.value, /^Brave on Windows/);
  assert.equal(D.snapshot().brave, true);
});

test('canvas that changes between two reads is detected as randomised (Firefox/Safari protections)', async () => {
  D.forget(); D.allowPassive();
  const R = await D.readPassive(fakeEnv({ noise: true }));
  assert.equal(R.canvas.state, 'randomised');
});

test('location keeps only the 30° band and hemisphere; the rounded reading is returned once', async () => {
  D.forget();
  const r = await D.readLocation(fakeEnv());
  assert.deepEqual({ state: r.state, band: r.band, hemi: r.hemi }, { state: 'ok', band: 1, hemi: 'N' });
  assert.equal(r.shown, '40.2\u00b0 N, 44.5\u00b0 E');
  assert.deepEqual(D.snapshot().location, { state: 'ok', band: 1, hemi: 'N' });
  assert.ok(!JSON.stringify(D.snapshot()).includes('40.1') && !JSON.stringify(D.snapshot()).includes('44.5'));
  assert.equal((await D.readLocation(fakeEnv({ lat: -70 }))).band, 2);
  assert.equal((await D.readLocation(fakeEnv({ geo: 'denied' }))).state, 'denied');
  assert.equal((await D.readLocation(fakeEnv({ geo: null }))).state, 'unavailable');
});

test('tilt: denied, no sensor (unavailable after the wait) and live — no pose is kept', async () => {
  D.forget();
  assert.equal((await D.requestTilt(null, fakeEnv({ motionPerm: 'denied' }), 50)).state, 'denied');
  assert.equal((await D.requestTilt(null, fakeEnv({}), 80)).state, 'unavailable');
  assert.equal((await D.requestTilt(null, fakeEnv({ doe: null }), 50)).state, 'unavailable');
  const poses = []; const r = await D.requestTilt(p => poses.push(p), fakeEnv({ motionPerm: 'granted', tiltEvents: true }), 300);
  assert.equal(r.state, 'ok'); assert.equal(poses.length, 1);
  assert.deepEqual(D.snapshot().tilt, { state: 'ok' });
  D.stopTilt();
});

test('mic: level buckets from dBFS (RMS of the waveform, not a frequency)', () => {
  assert.equal(D.levelOf(-70), 'quiet'); assert.equal(D.levelOf(-38), 'room'); assert.equal(D.levelOf(-12), 'loud');
});

test('forget() clears every reading and the consent', async () => {
  D.allowPassive(); await D.readPassive(fakeEnv()); await D.readLocation(fakeEnv());
  D.forget();
  assert.deepEqual(D.snapshot(), { passive: null, brave: null, tilt: null, location: null, mic: null });
  assert.equal(D.passiveAllowed(), false);
});
