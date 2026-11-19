// Device fixtures for the v5 Device step (docs/PLAN-v5.md §11). Each profile is installed with
//   await context.addInitScript(install, PROFILES.pixel)
// before any page script runs, and replaces the browser APIs the Device step reads with fixed values. String values
// carry SENTINEL tokens so the privacy tests can prove a raw reading never reaches a link, a PNG, storage or a request.
// Mocks only: real-device behaviour (Brave, iOS Safari, Firefox) still needs the real-device matrix in docs/QA.md.
'use strict';
const S = { ua: 'SENTINEL-UA-3K', gpu: 'SENTINEL-GPU-7Q', wgpu: 'SENTINEL-WGPU-5M', lang: 'x-sntl' };
const UA = {
  android: `Mozilla/5.0 (Linux; Android 14; Pixel 8 ${S.ua}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36`,
  iphone: `Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X; ${S.ua}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1`,
  windows: `Mozilla/5.0 (Windows NT 10.0; Win64; x64; ${S.ua}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36`,
  macff: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0; ${S.ua}) Gecko/20100101 Firefox/145.0`
};
const PROFILES = {
  pixel: { name: 'Pixel-like (Android Chrome)', ua: UA.android, platform: 'Linux armv81', languages: ['en-US', 'hy', S.lang], cores: 8, memory: 8, touch: 5,
    screen: { w: 412, h: 915, depth: 24 }, gpu: { vendor: 'Qualcomm', renderer: `Adreno (TM) 740 ${S.gpu}` }, webgpu: { vendor: 'qualcomm', architecture: 'adreno-7xx', device: '', description: `Adreno 740 ${S.wgpu}` },
    battery: { level: 0.57, charging: false }, connection: { effectiveType: '4g', downlink: 9.5, rtt: 50, saveData: false }, voices: 12, passkey: true,
    motion: 'granted', motionApi: true, tilt: { alpha: 120, beta: 35, gamma: -12 }, geo: { lat: 40.18123, lng: 44.51789, acc: 18 }, mic: 'granted' },
  iphone: { name: 'iPhone-like (iOS Safari)', ua: UA.iphone, platform: 'iPhone', languages: ['en-GB', S.lang], cores: 4, memory: null, touch: 5,
    screen: { w: 390, h: 844, depth: 24 }, gpu: { vendor: 'Apple Inc.', renderer: 'Apple GPU' }, webgpu: { vendor: 'apple', architecture: 'common-3', device: '', description: '' },
    battery: null, connection: null, voices: 40, passkey: true,
    motion: 'granted', motionApi: true, tilt: { alpha: 10, beta: 60, gamma: 20 }, geo: { lat: -33.86912, lng: 151.20932, acc: 35 }, mic: 'granted' },
  windows: { name: 'Windows desktop, NVIDIA (Chrome)', ua: UA.windows, platform: 'Win32', languages: ['en-US', 'ru', 'hy', S.lang], cores: 16, memory: 8, touch: 0,
    screen: { w: 2560, h: 1440, depth: 24 }, gpu: { vendor: 'Google Inc. (NVIDIA)', renderer: `ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 ${S.gpu} Direct3D11 vs_5_0 ps_5_0, D3D11)` },
    webgpu: { vendor: 'nvidia', architecture: 'lovelace', device: '', description: `NVIDIA GeForce RTX 4070 ${S.wgpu}` },
    battery: { level: 1, charging: true }, connection: { effectiveType: '4g', downlink: 10, rtt: 50, saveData: false }, voices: 3, passkey: true,
    motion: 'none', motionApi: true, geo: { lat: 52.37012, lng: 4.89034, acc: 900 }, mic: 'granted' },
  macff: { name: 'macOS Firefox (protections on)', ua: UA.macff, platform: 'MacIntel', languages: ['de-DE', 'en', S.lang], cores: 8, memory: null, touch: 0,
    screen: { w: 1512, h: 982, depth: 30 }, gpu: { vendor: 'Apple', renderer: 'Apple M1, or similar' }, webgpu: { vendor: 'apple', architecture: '', device: '', description: '' },
    battery: null, connection: null, voices: 70, passkey: true, canvasNoise: 'per-read',
    motion: 'none', motionApi: false, geo: 'denied', mic: 'denied' },
  brave: { name: 'Brave-like (randomised)', ua: UA.windows, platform: 'Win32', languages: ['en-US', S.lang], cores: 'random', memory: 'random', touch: 0,
    screen: { w: 1920, h: 1080, depth: 24 }, gpu: { vendor: 'Google Inc.', renderer: 'ANGLE (Google, Vulkan 1.3.0, generic)' }, webgpu: 'empty',
    battery: 'fixed', connection: null, voices: 3, passkey: true, brave: true, canvasNoise: 'per-session', fontNoise: true,
    motion: 'none', motionApi: true, geo: { lat: 40.18123, lng: 44.51789, acc: 25 }, mic: 'granted' },
  missing: { name: 'Everything missing', ua: UA.windows, platform: '', languages: [], cores: null, memory: null, touch: 0,
    screen: { w: 1280, h: 800, depth: 24 }, gpu: null, webgpu: null, battery: null, connection: null, voices: null, passkey: null,
    motion: 'absent', motionApi: false, geo: 'absent', mic: 'absent' }
};
const SENTINELS = (p) => [S.ua, S.gpu, S.wgpu, S.lang, 'Kathmandu', '40.18', '44.51', '33.86', '151.2', '52.37', '4.890'].filter(Boolean);

// Runs inside the page (serialised by Playwright). Must be self-contained.
// v7: these profiles stand in for what a BROWSER does natively (its own C++ getters), so the overrides are wrapped to
// look native (a Proxy stringifies as native code and has no own prototype); otherwise the v7 masking check M3 would
// rightly treat them as a spoofing extension. qa/device-probe.mjs has a separate, deliberately non-native "extension".
function install(P) {
  const nat = (f) => new Proxy(f, {});
  const def = (o, k, get) => { try { Object.defineProperty(o, k, { configurable: true, get: nat(get) }); } catch (e) { /* ignore */ } };
  const val = (o, k, v) => { try { Object.defineProperty(o, k, { configurable: true, writable: true, value: v }); } catch (e) { /* ignore */ } };
  const N = Navigator.prototype, rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const sess = { cores: rnd(2, 8), memory: [2, 4, 8][rnd(0, 2)], canvas: rnd(1, 250), font: Math.random() * 0.02 };
  window.__fixture = P.name;
  def(N, 'userAgent', () => P.ua);
  def(N, 'platform', () => P.platform);
  def(N, 'languages', () => Object.freeze(P.languages.slice()));
  def(N, 'language', () => P.languages[0] || '');
  def(N, 'hardwareConcurrency', () => P.cores === 'random' ? sess.cores : (P.cores == null ? undefined : P.cores));
  if (P.memory == null) { try { delete N.deviceMemory; } catch (e) {} def(N, 'deviceMemory', () => undefined); }
  else def(N, 'deviceMemory', () => P.memory === 'random' ? sess.memory : P.memory);
  def(N, 'maxTouchPoints', () => P.touch);
  def(Screen.prototype, 'width', () => P.screen.w); def(Screen.prototype, 'height', () => P.screen.h);
  def(Screen.prototype, 'colorDepth', () => P.screen.depth);
  // a real browser's CSS device-width/height agree with its screen size; answer those media queries from the profile
  const mm = window.matchMedia.bind(window);
  window.matchMedia = nat({ matchMedia(q) {
    const parts = String(q).split(/\s+and\s+/), dev = { width: P.screen.w, height: P.screen.h };
    const conds = parts.map(t => /^\(\s*(min-|max-)?device-(width|height)\s*:\s*(-?[\d.]+)px\s*\)$/.exec(t.trim()));
    if (!conds.every(Boolean)) return mm(q);
    const matches = conds.every(([, mx, k, v]) => mx === 'min-' ? dev[k] >= +v : mx === 'max-' ? dev[k] <= +v : dev[k] === +v);
    return { matches, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false };
  } }.matchMedia);
  if (P.brave) val(N, 'brave', { isBrave: async () => true });
  // battery
  if (P.battery === 'fixed') val(N, 'getBattery', async () => ({ level: 1, charging: true, chargingTime: 0, dischargingTime: Infinity }));
  else if (P.battery) val(N, 'getBattery', async () => ({ level: P.battery.level, charging: P.battery.charging, chargingTime: Infinity, dischargingTime: 7200 }));
  else val(N, 'getBattery', undefined);
  def(N, 'connection', () => P.connection ? { ...P.connection } : undefined);
  def(N, 'bluetooth', () => undefined);
  // GPU: WebGL debug strings, WebGPU adapter
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext].filter(Boolean)) {
    const gp = C.prototype.getParameter;
    C.prototype.getParameter = nat({ getParameter(k) { if (P.gpu && k === 0x9246) return P.gpu.renderer; if (P.gpu && k === 0x9245) return P.gpu.vendor; return gp.call(this, k); } }.getParameter);
  }
  if (!P.gpu) { const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : gc.call(this, t, ...a); }; }
  if (P.webgpu === null) def(N, 'gpu', () => undefined);
  else { const info = P.webgpu === 'empty' ? { vendor: '', architecture: '', device: '', description: '' } : P.webgpu; def(N, 'gpu', () => ({ requestAdapter: async () => ({ info: { ...info } }) })); }
  // canvas + font readback noise (Firefox resistFingerprinting / Brave farbling, simulated)
  if (P.canvasNoise) {
    const td = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = nat({ toDataURL(...a) {
      if (!this.isConnected) { const x = HTMLCanvasElement.prototype.getContext.call(this, '2d'); if (x) { x.fillStyle = `rgb(${P.canvasNoise === 'per-read' ? rnd(1, 250) : sess.canvas},7,7)`; x.fillRect(1, 1, 1, 1); } }
      return td.apply(this, a);
    } }.toDataURL);
  }
  if (P.fontNoise) {
    const mt = CanvasRenderingContext2D.prototype.measureText;
    CanvasRenderingContext2D.prototype.measureText = nat({ measureText(s) { const m = mt.call(this, s); if (!/^72px/.test(this.font)) return m; const w = m.width * (1 + sess.font * (this.font.length % 7)); return { width: w }; } }.measureText);
  }
  if (P.voices == null) def(window, 'speechSynthesis', () => undefined);
  else if (window.speechSynthesis) val(window.speechSynthesis, 'getVoices', () => Array.from({ length: P.voices }, (_, i) => ({ name: 'v' + i })));
  // passkeys (passive check only)
  if (P.passkey == null) def(window, 'PublicKeyCredential', () => undefined);
  else if (window.PublicKeyCredential) val(window.PublicKeyCredential, 'isUserVerifyingPlatformAuthenticatorAvailable', async () => P.passkey);
  // motion
  if (P.motion === 'absent') { def(window, 'DeviceOrientationEvent', () => undefined); def(window, 'DeviceMotionEvent', () => undefined); }
  else {
    const perm = P.motion === 'denied' ? 'denied' : 'granted';
    for (const E of ['DeviceOrientationEvent', 'DeviceMotionEvent']) if (window[E]) {
      if (P.motionApi) val(window[E], 'requestPermission', async () => { window.__motionAsked = (window.__motionAsked || 0) + 1; return perm; });
      else val(window[E], 'requestPermission', undefined);
    }
    if (P.motion === 'granted') {
      const ae = EventTarget.prototype.addEventListener; let iv = 0, t = 0;
      EventTarget.prototype.addEventListener = function (type, ...a) {
        if (this === window && type === 'deviceorientation' && !iv) iv = setInterval(() => { t++; const T = P.tilt;
          window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: T.alpha, beta: T.beta + Math.sin(t / 3) * 4, gamma: T.gamma + Math.cos(t / 4) * 3, absolute: false })); }, 80);
        return ae.call(this, type, ...a);
      };
    }
  }
  // geolocation
  if (P.geo === 'absent') def(N, 'geolocation', () => undefined);
  else if (window.Geolocation) {
    val(Geolocation.prototype, 'getCurrentPosition', function (ok, err) {
      window.__geoAsked = (window.__geoAsked || 0) + 1;
      setTimeout(() => {
        if (P.geo === 'denied') return err && err({ code: 1, message: 'User denied Geolocation', PERMISSION_DENIED: 1 });
        ok({ coords: { latitude: P.geo.lat, longitude: P.geo.lng, accuracy: P.geo.acc, altitude: null, heading: null, speed: null }, timestamp: Date.now() });
      }, 60);
    });
  }
  // microphone: a quiet synthetic tone through a real Web Audio graph
  if (P.mic === 'absent') def(N, 'mediaDevices', () => undefined);
  else if (window.MediaDevices) {
    val(MediaDevices.prototype, 'getUserMedia', async function (c) {
      window.__micAsked = (window.__micAsked || 0) + 1;
      if (c && c.video) throw new DOMException('camera not part of v5', 'NotAllowedError');
      if (P.mic === 'denied') throw new DOMException('Permission denied', 'NotAllowedError');
      const ac = new AudioContext(), osc = ac.createOscillator(), g = ac.createGain(), dst = ac.createMediaStreamDestination();
      osc.frequency.value = 440; g.gain.value = 0.02; osc.connect(g).connect(dst); osc.start();
      const s = dst.stream; s.getTracks().forEach(tr => { const st = tr.stop.bind(tr); tr.stop = () => { st(); window.__micStopped = (window.__micStopped || 0) + 1; try { osc.stop(); ac.close(); } catch (e) {} }; });
      return s;
    });
  }
}
module.exports = { PROFILES, SENTINELS, S, install };
