// Shared fake browser environment for core/device.js + core/privacy.js unit tests.
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
module.exports = { fakeEnv };
