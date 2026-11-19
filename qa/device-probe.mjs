// Device-API probe (v5 WP0; from the v4 audit's api-probe). Wraps every device/browser API the site has ever read
// BEFORE any page script runs, walks the journey, and records which APIs were touched in each phase.
// Asserts the consent gate: no device API is read before the visitor asks (rendering reads such as
// devicePixelRatio for canvas sizing are listed separately), each Device-step action reads only its own APIs,
// and nothing leaves localhost.   BASE=… CHROME=… node device-probe.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const OUT = process.env.OUT || '/tmp/oracle-device-probe.json';
export const INIT = () => {
  const log = window.__api = []; let phase = 'load';
  window.__phase = (p) => { phase = p; };
  const rec = (k) => log.push([phase, k]);
  const wrapGet = (proto, prop, key) => { const d = Object.getOwnPropertyDescriptor(proto, prop); if (!d || !d.get) return;
    Object.defineProperty(proto, prop, { ...d, get() { rec(key || prop); return d.get.call(this); } }); };
  const wrapFn = (obj, prop, key) => { if (!obj || typeof obj[prop] !== 'function') return; const f = obj[prop];
    obj[prop] = function (...a) { rec(key || prop); return f.apply(this, a); }; };
  ['userAgent', 'platform', 'language', 'languages', 'hardwareConcurrency', 'deviceMemory', 'maxTouchPoints', 'cookieEnabled', 'doNotTrack', 'onLine', 'connection', 'bluetooth', 'gpu', 'geolocation', 'mediaDevices', 'credentials', 'permissions', 'storage', 'usb', 'vibrate', 'wakeLock', 'userAgentData', 'brave'].forEach(p => wrapGet(Navigator.prototype, p, 'navigator.' + p));
  ['getBattery', 'getGamepads', 'requestMIDIAccess'].forEach(p => wrapFn(Navigator.prototype, p, 'navigator.' + p + '()'));
  ['width', 'height', 'colorDepth', 'orientation', 'availWidth'].forEach(p => wrapGet(Screen.prototype, p, 'screen.' + p));
  const ro = Intl.DateTimeFormat.prototype.resolvedOptions; Intl.DateTimeFormat.prototype.resolvedOptions = function () { rec('Intl.resolvedOptions (timezone/locale)'); return ro.call(this); };
  const tz = Date.prototype.getTimezoneOffset; Date.prototype.getTimezoneOffset = function () { rec('Date.getTimezoneOffset'); return tz.call(this); };
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext].filter(Boolean)) { const ge = C.prototype.getExtension; C.prototype.getExtension = function (n) { rec('WebGL.getExtension(' + n + ')'); return ge.call(this, n); }; }
  const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { if (/webgl/.test(t)) rec('canvas.getContext(' + t + ')'); return gc.call(this, t, ...a); };
  const td = HTMLCanvasElement.prototype.toDataURL; HTMLCanvasElement.prototype.toDataURL = function (...a) { if (!this.isConnected) rec('canvas.toDataURL (detached canvas)'); return td.apply(this, a); };
  const mt = CanvasRenderingContext2D.prototype.measureText; CanvasRenderingContext2D.prototype.measureText = function (...a) { if (/^72px/.test(this.font)) rec('measureText font probe (72px)'); return mt.apply(this, a); };
  if (window.speechSynthesis) wrapFn(window.speechSynthesis, 'getVoices', 'speechSynthesis.getVoices()');
  if (window.PublicKeyCredential) wrapFn(PublicKeyCredential, 'isUserVerifyingPlatformAuthenticatorAvailable', 'PublicKeyCredential.isUVPAA()');
  if (window.CredentialsContainer) { wrapFn(CredentialsContainer.prototype, 'create', 'navigator.credentials.create()'); wrapFn(CredentialsContainer.prototype, 'get', 'navigator.credentials.get()'); }
  if (window.Geolocation) { wrapFn(Geolocation.prototype, 'getCurrentPosition', 'geolocation.getCurrentPosition()'); wrapFn(Geolocation.prototype, 'watchPosition', 'geolocation.watchPosition()'); }
  if (window.MediaDevices) { wrapFn(MediaDevices.prototype, 'getUserMedia', 'mediaDevices.getUserMedia()'); wrapFn(MediaDevices.prototype, 'enumerateDevices', 'mediaDevices.enumerateDevices()'); }
  if (window.Permissions) wrapFn(Permissions.prototype, 'query', 'permissions.query()');
  if (window.StorageManager) wrapFn(StorageManager.prototype, 'estimate', 'storage.estimate()');
  if (window.GPU) wrapFn(GPU.prototype, 'requestAdapter', 'gpu.requestAdapter()');
  if (window.Bluetooth) wrapFn(Bluetooth.prototype, 'getAvailability', 'bluetooth.getAvailability()');
  if (window.AudioContext) { const AC = window.AudioContext; window.AudioContext = function (...a) { rec('new AudioContext'); return new AC(...a); }; window.AudioContext.prototype = AC.prototype; }
  const pm = Object.getOwnPropertyDescriptor(Performance.prototype, 'memory'); if (pm && pm.get) Object.defineProperty(Performance.prototype, 'memory', { ...pm, get() { rec('performance.memory'); return pm.get.call(this); } });
  const dr = Object.getOwnPropertyDescriptor(Document.prototype, 'referrer'); Object.defineProperty(Document.prototype, 'referrer', { ...dr, get() { rec('document.referrer'); return dr.get.call(this); } });
  const hl = Object.getOwnPropertyDescriptor(History.prototype, 'length'); Object.defineProperty(History.prototype, 'length', { ...hl, get() { rec('history.length'); return hl.get.call(this); } });
  const ae = EventTarget.prototype.addEventListener; EventTarget.prototype.addEventListener = function (t, ...a) { if (/^device(orientation|motion)/.test(t)) rec('addEventListener(' + t + ')'); return ae.call(this, t, ...a); };
  for (const E of ['DeviceOrientationEvent', 'DeviceMotionEvent']) if (window[E] && typeof window[E].requestPermission === 'function') { const f = window[E].requestPermission; window[E].requestPermission = function (...a) { rec(E + '.requestPermission()'); return f.apply(this, a); }; }
  let eth; Object.defineProperty(window, 'ethereum', { configurable: true, get() { rec('window.ethereum'); return eth; }, set(v) { eth = v; } });
  const dpr = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio'); if (dpr && dpr.get) Object.defineProperty(window, 'devicePixelRatio', { ...dpr, get() { rec('window.devicePixelRatio'); return dpr.get.call(this); } });
};
// Reads the page does for rendering only (canvas backing-store size); never shown, stored or used in the art.
const RENDERING = new Set(['window.devicePixelRatio']);
// What each Device-step action may read (v5). Anything else in that phase fails the probe.
const PASSIVE = new Set(['navigator.userAgent', 'navigator.platform', 'navigator.language', 'navigator.languages', 'navigator.hardwareConcurrency',
  'navigator.deviceMemory', 'navigator.maxTouchPoints', 'navigator.connection', 'navigator.gpu', 'navigator.getBattery()', 'navigator.brave',
  'screen.width', 'screen.height', 'screen.colorDepth', 'Intl.resolvedOptions (timezone/locale)', 'Date.getTimezoneOffset',
  'canvas.getContext(webgl)', 'canvas.getContext(experimental-webgl)', 'WebGL.getExtension(WEBGL_debug_renderer_info)', 'canvas.toDataURL (detached canvas)',
  'measureText font probe (72px)', 'speechSynthesis.getVoices()', 'PublicKeyCredential.isUVPAA()', 'gpu.requestAdapter()', 'window.devicePixelRatio']);
const ALLOW = {
  'device: show me': PASSIVE,
  'device: tilt allow': new Set(['DeviceOrientationEvent.requestPermission()', 'DeviceMotionEvent.requestPermission()', 'addEventListener(deviceorientation)', 'window.devicePixelRatio']),
  'device: location allow': new Set(['navigator.geolocation', 'geolocation.getCurrentPosition()', 'window.devicePixelRatio']),
  'device: mic allow': new Set(['navigator.mediaDevices', 'mediaDevices.getUserMedia()', 'new AudioContext', 'window.devicePixelRatio'])
};
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail !== undefined ? '  — ' + JSON.stringify(detail).slice(0, 500) : ''}`); };

const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const run = async (name, opts, steps) => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', ...opts }); await ctx.addInitScript(INIT);
  const p = await ctx.newPage(); const reqs = []; p.on('request', r => reqs.push(r.url()));
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const phase = (x) => p.evaluate((x) => window.__phase(x), x);
  await steps(p, phase, ctx);
  const log = await p.evaluate(() => window.__api).catch(() => []);
  await ctx.close();
  const by = {}; for (const [ph, k] of log) (by[ph] = by[ph] || new Set()).add(k);
  return { name, phases: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, [...v].sort()])), external: reqs.filter(u => !u.startsWith('http://127.0.0.1:8765/') && !/^(data|blob):/.test(u)), errs };
};
const W = (p, ms = 350) => p.waitForTimeout(ms);
const has = async (p, sel) => !!(await p.$(sel));
const res = [];
// A. the journey with the Device step skipped (or absent before v5 WP4)
res.push(await run('journey (device step skipped)', { acceptDownloads: true }, async (p, phase) => {
  await p.goto(BASE); await W(p, 600);
  await phase('trade'); await p.click('#btn-begin'); await W(p); await p.click('label[for=offer-0]'); await p.click('label[for=offer-2]');
  await phase('footprint'); await p.click('[data-goto=extraction]'); await W(p);
  // v8 WP3: Feed is step 3 and Device step 4; the loop cards and Reveal open off the path (feed sources sheet, artwork chip).
  await phase('loop'); await p.click('.s-extraction .btn-primary'); await W(p); await p.goto(BASE + '#machine'); await W(p); for (let i = 0; i < 7; i++) { await p.click('#card-next'); await W(p, 120); }
  await phase('feed'); await W(p); await p.click('label.radio-card'); await p.click('#feed-run'); await W(p, 1200);
  await phase('device: ask'); await p.click('.s-loop .btn-primary'); await W(p);
  if (await has(p, '#dev-skip')) { await phase('device: skip'); await p.click('#dev-skip'); await W(p); }
  await phase('reveal'); await p.click('.made-chips [data-goto=reveal]'); await W(p); for (let i = 0; i < 6 && await has(p, '#card-next'); i++) { await p.click('#card-next'); await W(p, 120); }
  await phase('artwork'); await W(p, 600);
  await phase('artwork: save image'); await Promise.all([p.waitForEvent('download'), p.click('#rv-download')]); await W(p);
  await phase('artwork: options'); await p.click('#rv-options'); await W(p); await p.keyboard.press('Escape');
  await phase('extras'); await p.goto(BASE + '#extras'); await W(p, 500);
}));
// B. the Device step with everything allowed (v5 WP4+; skipped automatically before it exists)
res.push(await run('device step (all allowed)', { permissions: ['geolocation', 'microphone', 'accelerometer', 'gyroscope', 'magnetometer'], geolocation: { latitude: 40.18, longitude: 44.51 } }, async (p, phase) => {
  await p.goto(BASE + '#device'); await W(p, 600);
  if (!(await has(p, '#dev-show'))) { res.noDeviceStep = true; return; }
  await phase('device: ask (nothing tapped)'); await W(p, 300);
  await phase('device: show me'); await p.click('#dev-show'); await W(p, 1200);
  await phase('device: readout next'); await p.click('#dev-next'); await W(p, 300);
  if (!(await has(p, '#perm-allow'))) { res.noPermCards = true; return; } // before v5 WP5
  await phase('device: tilt allow'); await p.click('#perm-allow'); await W(p, 1800);
  await phase('device: tilt next'); await p.click('#perm-next'); await W(p, 300);
  await phase('device: location allow'); await p.click('#perm-allow'); await W(p, 1500);
  await phase('device: location next'); await p.click('#perm-next'); await W(p, 300);
  await phase('device: mic allow'); await p.click('#perm-allow'); await W(p, 2800);
  await phase('device: leave'); await p.click('#perm-next'); await W(p, 500);
}));
const J = res[0];
const before = ['load', 'trade', 'footprint', 'device: ask', 'device: skip', 'loop', 'feed', 'reveal', 'artwork', 'artwork: save image', 'artwork: options', 'extras'];
const touched = before.flatMap(ph => (J.phases[ph] || []).filter(k => !RENDERING.has(k)).map(k => ph + ': ' + k));
check('consent gate: the journey (Device step skipped) reads no device API — rendering reads only', !touched.length, touched);
check('rendering reads on the journey are devicePixelRatio only (canvas sizing)', before.flatMap(ph => J.phases[ph] || []).every(k => RENDERING.has(k)), before.flatMap(ph => J.phases[ph] || []));
const D = res[1];
if (res.noDeviceStep) console.log('SKIP  Device step not built yet (before v5 WP4)');
else {
  const pre = (D.phases['load'] || []).concat(D.phases['device: ask (nothing tapped)'] || []).filter(k => !RENDERING.has(k));
  check('consent gate: opening the Device step reads nothing until Show me', !pre.length, pre);
  if (res.noPermCards) console.log('SKIP  permission cards not built yet (before v5 WP5)');
  for (const [ph, allow] of Object.entries(ALLOW)) {
    if (res.noPermCards && ph !== 'device: show me') continue;
    const got = D.phases[ph] || [], extra = got.filter(k => !allow.has(k));
    check(`"${ph}" reads only its own APIs`, got.length && !extra.length, { got, extra });
  }
  const after = ['device: readout next', 'device: tilt next', 'device: location next', 'device: leave'].flatMap(ph => (D.phases[ph] || []).filter(k => !RENDERING.has(k) && !/^addEventListener/.test(k)).map(k => ph + ': ' + k));
  check('moving on (Next) reads nothing new', !after.length, after);
  const dropped = Object.values(D.phases).flat().concat(Object.values(J.phases).flat()).filter(k => /credentials\.create|ethereum|getUserMedia.*video|storage\.estimate|performance\.memory|bluetooth|getGamepads|referrer|history\.length|enumerateDevices/.test(k));
  check('dropped signals are never read (camera, passkey creation, wallet, heap, quota, Bluetooth, gamepads, referrer, history)', !dropped.length, [...new Set(dropped)]);
}
const ext = res.flatMap(r => r.external);
check('0 requests leave localhost', !ext.length, ext);
check('0 page errors', !res.some(r => r.errs.length), res.map(r => r.errs));
fs.writeFileSync(OUT, JSON.stringify({ when: new Date().toString(), chrome: b.version(), res, results }, null, 1));
for (const r of res) { console.log('\n###', r.name); for (const [k, v] of Object.entries(r.phases)) console.log(' ', k.padEnd(30), v.join(', ')); }
const pass = results.filter(r => r.ok).length;
console.log(`\ndevice-probe: ${pass}/${results.length} passed (Chrome ${b.version()})`);
await b.close();
process.exit(pass === results.length ? 0 : 1);
