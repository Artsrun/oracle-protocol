const vitals = window.vitals || {
  motionOn: false,
  lastAcc: null,
  shakePeaks: 0,
  lastShakeAt: 0,
  listeners: new Set()
};

const emitVital = (id, payload) => {
  if (state.collected[id] && !state.collected[id].error) {
    state.collected[id] = { ...state.collected[id], ...payload, live: true };
  }
  vitals.listeners.forEach(fn => fn(id, payload));
};

const queryPerm = window.queryPerm || (async (name) => {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const s = await navigator.permissions.query({ name });
    return s.state;
  } catch { return 'unknown'; }
});

const geoHint = (code) => {
  if (code === 1) return 'Denied \u2014 Settings \u2192 Safari \u2192 Location \u2192 Allow';
  if (code === 2) return 'Position unavailable';
  if (code === 3) return 'Timed out \u2014 tap retry';
  return 'Geo failed';
};

const harvestGeo = () => new Promise(async (res) => {
  if (!navigator.geolocation) return res({ error: 'Geolocation API absent' });
  const perm = await queryPerm('geolocation');
  navigator.geolocation.getCurrentPosition(
    p => res({
      lat: p.coords.latitude.toFixed(5),
      lng: p.coords.longitude.toFixed(5),
      acc: p.coords.accuracy,
      alt: p.coords.altitude,
      heading: p.coords.heading,
      speed: p.coords.speed,
      perm
    }),
    e => res({ error: geoHint(e.code), code: e.code, perm }),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
  );
});

const requestMotionPerm = async () => {
  const need =
    (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') ||
    (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function');
  if (!need) return 'granted';
  try {
    const o = typeof DeviceOrientationEvent.requestPermission === 'function'
      ? await DeviceOrientationEvent.requestPermission()
      : 'granted';
    const m = typeof DeviceMotionEvent.requestPermission === 'function'
      ? await DeviceMotionEvent.requestPermission()
      : 'granted';
    return (o === 'granted' || m === 'granted') ? 'granted' : 'denied';
  } catch (e) {
    return 'denied';
  }
};

const attachMotion = () => {
  if (vitals.motionOn) return;
  vitals.motionOn = true;
  window.addEventListener('deviceorientation', (e) => {
    emitVital('orient', {
      alpha: e.alpha != null ? e.alpha.toFixed(1) : '\u2014',
      beta: e.beta != null ? e.beta.toFixed(1) : '\u2014',
      gamma: e.gamma != null ? e.gamma.toFixed(1) : '\u2014',
      abs: !!e.absolute,
      screen: screen.orientation?.type || 'unknown'
    });
  }, { passive: true });
  window.addEventListener('devicemotion', (e) => {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    const last = vitals.lastAcc;
    vitals.lastAcc = mag;
    if (last != null && Math.abs(mag - last) > 12 && Date.now() - vitals.lastShakeAt > 280) {
      vitals.shakePeaks += 1;
      vitals.lastShakeAt = Date.now();
    }
    emitVital('shake', {
      g: mag.toFixed(2),
      peaks: vitals.shakePeaks,
      last: vitals.lastShakeAt ? new Date(vitals.lastShakeAt).toISOString().slice(11, 19) : '\u2014'
    });
  }, { passive: true });
};

const getOrientation = async () => {
  if (!('DeviceOrientationEvent' in window) && !screen.orientation) {
    return { error: 'Orientation API absent' };
  }
  const perm = await requestMotionPerm();
  if (perm === 'denied') return { error: 'Motion permission denied', screen: screen.orientation?.type };
  attachMotion();
  return { alpha: '0.0', beta: '0.0', gamma: '0.0', screen: screen.orientation?.type || 'unknown', live: true, perm };
};

const getShake = async () => {
  if (!('DeviceMotionEvent' in window)) return { error: 'Motion API absent' };
  const perm = await requestMotionPerm();
  if (perm === 'denied') return { error: 'Shake permission denied' };
  attachMotion();
  return { g: '9.8', peaks: vitals.shakePeaks, last: '\u2014', live: true, perm };
};

const getGpu = async () => {
  const gl = getWebGLInfo();
  let webgpu = null;
  try {
    if (navigator.gpu?.requestAdapter) {
      const ad = await navigator.gpu.requestAdapter();
      webgpu = ad ? (ad.info?.device || ad.info?.description || 'adapter') : 'no adapter';
    }
  } catch { webgpu = 'blocked'; }
  return { renderer: gl.renderer, vendor: gl.vendor, ext: gl.ext, maxTex: gl.maxTex, webgpu: webgpu || 'N/A' };
};

const getCpuMem = async () => {
  const t0 = performance.now();
  let n = 0;
  while (performance.now() - t0 < 24) n++;
  const jsHeap = performance.memory
    ? {
        used: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1),
        total: +(performance.memory.totalJSHeapSize / 1048576).toFixed(1),
        limit: +(performance.memory.jsHeapSizeLimit / 1048576).toFixed(0)
      }
    : null;
  let quota = null;
  try {
    if (navigator.storage?.estimate) {
      const e = await navigator.storage.estimate();
      quota = e.quota ? +(e.quota / 1073741824).toFixed(2) : null;
    }
  } catch {}
  return {
    cores: navigator.hardwareConcurrency || null,
    deviceMem: navigator.deviceMemory || null,
    jsHeap,
    quotaGB: quota,
    index: Math.round(n / 1000)
  };
};

const getBluetooth = async () => {
  if (!navigator.bluetooth) return { error: 'Web Bluetooth absent (Safari/iOS/Firefox)' };
  try {
    const avail = await navigator.bluetooth.getAvailability();
    return { api: true, radio: avail ? 'ON' : 'OFF' };
  } catch (e) {
    return { api: true, error: e.message };
  }
};

const getNetwork = async () => {
  const c = navigator.connection;
  return {
    type: c?.effectiveType || 'unknown',
    down: c?.downlink ?? null,
    rtt: c?.rtt ?? null,
    save: !!c?.saveData,
    online: navigator.onLine
  };
};
