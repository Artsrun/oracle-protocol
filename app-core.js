const canvas = document.getElementById('cosmos');
const ctx = canvas.getContext('2d');
let W, H, particles = [];
let mx = 0, my = 0;

const resize = () => {
  W = canvas.width = window.innerWidth * devicePixelRatio;
  H = canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
};
resize();
window.addEventListener('resize', resize);
window.addEventListener('pointermove', e => {
  mx = (e.clientX / window.innerWidth - 0.5) * 40;
  my = (e.clientY / window.innerHeight - 0.5) * 40;
});

for (let i = 0; i < 90; i++) {
  particles.push({
    x: Math.random() * 2000 - 1000,
    y: Math.random() * 2000 - 1000,
    z: Math.random() * 1000,
    s: Math.random() * 1.4 + 0.4,
    v: Math.random() * 0.35 + 0.08
  });
}

const animCosmos = () => {
  ctx.fillStyle = 'rgba(2,4,8,0.18)';
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  particles.forEach(p => {
    p.z -= p.v;
    if (p.z <= 0) {
      p.x = Math.random() * 2000 - 1000;
      p.y = Math.random() * 2000 - 1000;
      p.z = 1000;
    }
    const sx = (p.x / p.z) * 400 + window.innerWidth / 2 + mx;
    const sy = (p.y / p.z) * 400 + window.innerHeight / 2 + my;
    const r = p.s * (1 - p.z / 1000);
    const alpha = (1 - p.z / 1000) * 0.72;
    if (sx > 0 && sx < window.innerWidth && sy > 0 && sy < window.innerHeight) {
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,229,255,${alpha})`;
      ctx.fill();
    }
  });
  requestAnimationFrame(animCosmos);
};
animCosmos();

const tickClock = () => {
  const el = document.getElementById('hud-clock');
  if (el) el.textContent = new Date().toISOString().slice(11, 19) + 'Z';
};
setInterval(tickClock, 1000);
tickClock();

const state = {
  stage: 'approach',
  cryptoAddr: null,
  cryptoMethod: null,
  bioAuth: false,
  bioId: null,
  collected: {},
  permsGranted: [],
  fingerprint: null
};

const PHASES = [
  { id: 'approach', label: '00 APPROACH' },
  { id: 'handshake', label: '01 HANDSHAKE' },
  { id: 'permissions', label: '02 HARVEST' },
  { id: 'portrait', label: '03 WITNESS' }
];

const syncHud = () => {
  const names = { approach: 'APPROACH', handshake: 'HANDSHAKE', permissions: 'HARVEST', portrait: 'WITNESS' };
  const el = document.getElementById('hud-phase');
  if (el) el.textContent = names[state.stage] || state.stage;
  const rail = document.getElementById('phase-rail');
  if (!rail) return;
  const idx = PHASES.findIndex(p => p.id === state.stage);
  rail.innerHTML = PHASES.map((p, i) => {
    const cls = i === idx ? 'on' : i < idx ? 'done' : '';
    return `<div class="phase-pip ${cls}">${p.label}</div>`;
  }).join('');
};

const getCanvasFingerprint = () => {
  const c = document.createElement('canvas');
  c.width = 300; c.height = 60;
  const x = c.getContext('2d');
  x.fillStyle = '#0a1825';
  x.fillRect(0, 0, 300, 60);
  x.fillStyle = '#00e5ff';
  x.font = '14px Arial';
  x.fillText('ORACLE_PROTOCOL_v1.1',
    10, 30);
  x.strokeStyle = '#ffab00';
  x.beginPath();
  x.arc(260, 30, 15, 0, Math.PI * 2);
  x.stroke();
  return c.toDataURL().split(',')[1].slice(0, 32);
};

const getWebGLInfo = () => {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return { renderer: 'N/A', vendor: 'N/A', ext: 0 };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      ext: gl.getSupportedExtensions()?.length || 0,
      maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE)
    };
  } catch { return { renderer: 'blocked', vendor: 'blocked', ext: 0 }; }
};

const detectFonts = () => {
  const test = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana',
    'Helvetica', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
    'Trebuchet MS', 'Impact', 'Lucida Console', 'Tahoma', 'Geneva',
    'Optima', 'Futura', 'Gill Sans', 'Baskerville', 'Didot'];
  const c = document.createElement('canvas');
  const x = c.getContext('2d');
  x.font = '72px monospace';
  const base = x.measureText('mmmmmmmmmmlli').width;
  return test.filter(f => {
    x.font = `72px ${f}, monospace`;
    return x.measureText('mmmmmmmmmmlli').width !== base;
  });
};

const generateHash = (data) => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
};

const harvestBase = () => {
  const nav = navigator;
  const scr = screen;
  const gl = getWebGLInfo();
  const fonts = detectFonts();
  const fp = getCanvasFingerprint();
  return {
    ua: nav.userAgent,
    platform: nav.platform,
    lang: nav.language,
    langs: (nav.languages || []).join(', '),
    cookies: nav.cookieEnabled,
    dnt: nav.doNotTrack,
    online: nav.onLine,
    cores: nav.hardwareConcurrency,
    memory: nav.deviceMemory,
    touch: nav.maxTouchPoints,
    screen: `${scr.width}×${scr.height}`,
    colorDepth: scr.colorDepth,
    pixelRatio: window.devicePixelRatio,
    orientation: scr.orientation?.type || 'unknown',
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    tzOffset: new Date().getTimezoneOffset(),
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    visitTime: new Date().toISOString(),
    gpuRenderer: gl.renderer,
    gpuVendor: gl.vendor,
    glExt: gl.ext,
    glMaxTex: gl.maxTex,
    fonts,
    fontsCount: fonts.length,
    canvasFP: fp,
    hasBT: !!nav.bluetooth,
    hasUSB: !!nav.usb,
    hasShare: !!nav.share,
    hasVibrate: !!nav.vibrate,
    hasClipboard: !!nav.clipboard,
    hasWakeLock: !!nav.wakeLock,
    hasSpeech: !!window.SpeechSynthesisUtterance,
    speechVoices: window.speechSynthesis?.getVoices()?.length || 0,
    hasLS: !!window.localStorage,
    hasSS: !!window.sessionStorage,
    hasIDB: !!window.indexedDB,
    hasCrypto: !!window.crypto?.subtle,
    hasMIDI: !!nav.requestMIDIAccess,
    hasGP: (nav.getGamepads?.() || []).filter(Boolean).length,
    perfNow: Math.round(performance.now()),
    perfTiming: performance.timing ? 'supported' : 'N/A',
    connType: nav.connection?.effectiveType || 'unknown',
    connDown: nav.connection?.downlink || 'N/A',
    connRTT: nav.connection?.rtt || 'N/A',
    dataSaver: nav.connection?.saveData || false,
    referrer: document.referrer || '(direct)',
    histLen: window.history.length,
    mathE: Math.E.toString().slice(2, 10),
    mathPi: Math.PI.toString().slice(2, 10)
  };
};

const connectCrypto = async () => {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest']
      });
      const ethBal = (parseInt(balance, 16) / 1e18).toFixed(6);
      return { method: 'MetaMask', address: accounts[0], chainId: parseInt(chainId, 16), balance: `${ethBal} ETH` };
    } catch (e) {
      return { method: 'MetaMask', error: e.message, address: null };
    }
  }
  return {
    method: 'Anonymous',
    address: '0x' + Array.from(crypto.getRandomValues(new Uint8Array(20))).map(b => b.toString(16).padStart(2, '0')).join(''),
    chainId: 1,
    balance: 'unknown',
    note: 'No wallet detected — ephemeral identity assigned'
  };
};

const doBioAuth = async () => {
  if (!window.PublicKeyCredential) return { ok: false, reason: 'WebAuthn not supported' };
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return { ok: false, reason: 'No platform authenticator' };
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'ORACLE PROTOCOL' },
        user: { id: userId, name: 'witness@oracle', displayName: 'WITNESS' },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: { userVerification: 'required' },
        timeout: 60000
      }
    });
    return {
      ok: true,
      credId: btoa(Array.from(new Uint8Array(cred.rawId)).map(b => String.fromCharCode(b)).join('')).slice(0, 24) + '...',
      type: cred.type,
      transports: cred.response.getTransports?.() || ['unknown']
    };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
};

const getGeo = () => new Promise(res => {
  navigator.geolocation.getCurrentPosition(
    p => res({ lat: p.coords.latitude.toFixed(4), lng: p.coords.longitude.toFixed(4), acc: p.coords.accuracy }),
    e => res({ error: e.message }),
    { timeout: 8000 }
  );
});

const getBattery = async () => {
  if (!navigator.getBattery) return null;
  try {
    const b = await navigator.getBattery();
    return { level: Math.round(b.level * 100) + '%', charging: b.charging, chargeTime: b.chargingTime, dischargeTime: b.dischargingTime };
  } catch { return null; }
};

const getCameraInfo = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    stream.getTracks().forEach(t => t.stop());
    return { w: settings.width, h: settings.height, fps: settings.frameRate, facing: settings.facingMode || 'desk', deviceId: track.label?.slice(0, 20) + '...' };
  } catch (e) { return { error: e.message }; }
};

const getMicEnergy = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    await new Promise(r => setTimeout(r, 500));
    analyser.getByteFrequencyData(buf);
    const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
    stream.getTracks().forEach(t => t.stop());
    audioCtx.close();
    return { avgFreq: avg.toFixed(1), bins: analyser.frequencyBinCount, sampleRate: audioCtx.sampleRate };
  } catch (e) { return { error: e.message }; }
};
