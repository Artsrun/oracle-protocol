const app = document.getElementById('app');

// v2 a11y: any non-button element with role=button activates on Enter/Space.
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement) || t.getAttribute('role') !== 'button' || t.tagName === 'BUTTON') return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t.click(); }
});

const render = () => {
  app.innerHTML = '';
  document.body.dataset.stage = state.stage;
  syncHud();
  if (window.OracleChapters && OracleChapters.handles(state.stage)) OracleChapters.renderStage(state.stage, app);
  else if (state.stage === 'approach') renderApproach();
  else if (state.stage === 'handshake') renderHandshake();
  else if (state.stage === 'permissions') renderPermissions();
  else if (state.stage === 'portrait') renderPortrait();
  else { state.stage = 'approach'; syncHud(); renderApproach(); }
};

const renderApproach = () => {
  app.innerHTML = `<div class="stage-approach">
    <div class="oracle-sigil" aria-hidden="true"><svg viewBox="0 0 108 108"><polygon class="tri t1" points="54,4 100,84 8,84"/><polygon class="tri t2" points="54,20 86,76 22,76"/><polygon class="tri t3" points="54,34 72,66 36,66"/><polygon class="core" points="54,48 61,61 47,61"/></svg></div>
    <h1 class="oracle-title glitch" data-text="ORACLE">ORACLE</h1>
    <div class="oracle-sub">THE ANATOMY OF ATTENTION</div>
    <p class="oracle-verse">We are all made of data.<br><em>Let the machine witness you \u2014 willingly.</em></p>
    <div class="btn-group">
      ${window.OracleChapters ? `<button type="button" class="btn-primary btn-fill" id="btn-investigate">BEGIN</button>` : `<button type="button" class="btn-primary" id="btn-enter">INITIATE PROTOCOL</button>`}
    </div>
    ${window.OracleChapters ? `<p class="approach-note">Five chapters \u00b7 no permissions needed \u00b7 nothing leaves this tab.</p>` : ''}
  </div>`;
  const ent = document.getElementById('btn-enter');
  if (ent) ent.onclick = () => { state.stage = 'handshake'; render(); };
  const inv = document.getElementById('btn-investigate');
  if (inv) inv.onclick = () => OracleChapters.go('offer');
};

const renderHandshake = () => {
  const cryptoDone = !!state.cryptoAddr;
  const bioDone = state.bioAuth;
  app.innerHTML = `<div class="stage-handshake">
    <div class="stage-label">02 \u00b7 LIVE DEMO \u00b7 IDENTITY (OPTIONAL)</div>
    <div class="handshake-options">
      <div class="auth-card ${cryptoDone ? 'done' : 'active'}">
        <div class="auth-icon">\u26d3\ufe0f</div>
        <div class="auth-info"><h3>WALLET OR ANONYMOUS ID</h3><p>MetaMask, Phantom, or a throwaway ID. A wallet queries its own node; Oracle sends nothing.</p></div>
        <div class="auth-status">${cryptoDone ? '\u2713 LINKED' : '\u25cb PENDING'}</div>
      </div>
      <div class="auth-card ${bioDone ? 'done' : ''}">
        <div class="auth-icon">\ud83e\uddec</div>
        <div class="auth-info"><h3>PASSKEY</h3><p>Fingerprint, face or PIN. Biometrics never reach the page \u2014 only a credential id.</p></div>
        <div class="auth-status">${bioDone ? '\u2713 SEALED' : '\u25cb PENDING'}</div>
      </div>
    </div>
    <div class="btn-group">
      ${!cryptoDone ? `<button type="button" class="btn-primary ${cryptoDone || bioDone ? '' : 'btn-fill'}" id="btn-crypto">\u26d3 GET ID</button>` : ''}
      ${!bioDone ? `<button type="button" class="btn-primary" id="btn-bio">\ud83e\uddec PASSKEY</button>` : ''}
      ${(cryptoDone || bioDone) ? `<button type="button" class="btn-primary btn-fill" id="btn-next">SENSORS \u2192</button>` : ''}
    </div>
    <div class="loading-bar" id="loading-bar" style="display:none"><div class="loading-fill"></div></div>
    <div id="status-msg" role="status" aria-live="polite" style="font-size:10px;color:var(--ink-2);text-align:center;margin-top:12px;min-height:20px;letter-spacing:0.16em;"></div>
  </div>`;
  const setStatus = msg => { const el = document.getElementById('status-msg'); if (el) el.textContent = msg; };
  const setLoading = show => { const el = document.getElementById('loading-bar'); if (el) el.style.display = show ? 'block' : 'none'; };
  const cryptoBtn = document.getElementById('btn-crypto');
  if (cryptoBtn) cryptoBtn.onclick = async () => {
    setLoading(true); setStatus('REQUESTING CHAIN ACCESS...');
    const result = await connectCrypto();
    state.cryptoAddr = result.address; state.cryptoMethod = result.method; state.collected.crypto = result;
    setLoading(false); render();
  };
  const bioBtn = document.getElementById('btn-bio');
  if (bioBtn) bioBtn.onclick = async () => {
    setLoading(true); setStatus('AWAITING BIOMETRIC INPUT...');
    const result = await doBioAuth();
    state.collected.bio = result; state.bioAuth = true;
    setLoading(false); render();
  };
  const nextBtn = document.getElementById('btn-next');
  if (nextBtn) nextBtn.onclick = () => { state.stage = 'permissions'; render(); };
};

const geoFn = typeof harvestGeo === 'function' ? harvestGeo : getGeo;
const batFn = async () => {
  const r = await getBattery();
  return r || { error: 'Battery API withheld (Safari/iOS)' };
};

const fmtPreview = (id, g) => {
  if (!g || g.error) return '';
  if (id === 'geo') return g.lat ? `${g.lat}, ${g.lng}` : '';
  if (id === 'bat') return g.level ? `${g.level}${g.charging ? ' \u26a1' : ''}` : '';
  if (id === 'cam') return g.w ? `${g.w}\u00d7${g.h}` : '';
  if (id === 'mic') return g.avgFreq ? `${g.avgFreq} hz avg` : '';
  if (id === 'base') return `${g.cores || '?'} cores \u00b7 ${g.memory || g.deviceMem || '?'}GB`;
  if (id === 'orient') return `${g.screen || 'live'}  \u03b2 ${g.beta ?? '\u2014'}`;
  if (id === 'shake') return `${g.peaks || 0} peaks \u00b7 ${g.g || '\u2014'}g`;
  if (id === 'gpu') return (g.renderer || 'GPU').slice(0, 28);
  if (id === 'cpu') return `${g.cores || '?'}c \u00b7 ${g.deviceMem ? g.deviceMem + 'GB' : (g.jsHeap ? g.jsHeap.used + 'MB heap' : 'mem ?')} \u00b7 idx ${g.index}`;
  if (id === 'bt') return g.radio ? `radio ${g.radio}` : 'API present';
  if (id === 'net') return `${g.online ? 'ON' : 'OFF'} \u00b7 ${g.type}${g.down != null ? ' \u00b7 ' + g.down + 'Mb' : ''}`;
  return '';
};

const permsConfig = [
  { id: 'geo', icon: '\ud83c\udf0d', name: 'GEOLOCATION', fn: geoFn },
  { id: 'orient', icon: '\ud83e\udded', name: 'ORIENTATION', fn: getOrientation },
  { id: 'shake', icon: '\ud83d\udcf3', name: 'SHAKE / G', fn: getShake },
  { id: 'gpu', icon: '\ud83c\udfae', name: 'GPU', fn: getGpu },
  { id: 'cpu', icon: '\ud83e\udde0', name: 'CPU / MEMORY', fn: getCpuMem },
  { id: 'bt', icon: '\ud83d\udd35', name: 'BLUETOOTH', fn: getBluetooth },
  { id: 'cam', icon: '\ud83d\udcf7', name: 'CAMERA META', fn: getCameraInfo },
  { id: 'mic', icon: '\ud83c\udf99\ufe0f', name: 'MIC ENERGY', fn: getMicEnergy },
  { id: 'bat', icon: '\ud83d\udd0b', name: 'BATTERY', fn: batFn },
  { id: 'net', icon: '\ud83d\udce1', name: 'NETWORK', fn: getNetwork },
  { id: 'base', icon: '\ud83d\udda5\ufe0f', name: 'DEVICE PROFILE', fn: async () => harvestBase() }
];

const permReads = {
 "geo": "Reads latitude/longitude/accuracy once via the Geolocation API after your tap. Shown only on this page; never stored or sent. One-shot request, no watch.",
 "orient": "Reads device tilt (alpha/beta/gamma) events while this tab is open. Processed in this tab; stops when you close or reload it.",
 "shake": "Reads accelerometer magnitude to count shake peaks. Values stay in memory in this tab; stops on close/reload.",
 "gpu": "Reads the WebGL renderer/vendor strings and whether WebGPU offers an adapter. No prompt; nothing leaves the tab.",
 "cpu": "Runs a 24 ms local loop, reads core count, JS heap and storage quota estimate. No prompt; local only.",
 "bt": "Asks only whether a Bluetooth radio is available. Does not scan or pair. Local only.",
 "cam": "Opens the camera, reads resolution/frame rate/label, then immediately stops every track. No frame is drawn, kept or sent.",
 "mic": "Opens the microphone for 0.5 s, reads the average spectrum energy, then stops the track and closes the audio context. No audio is recorded or sent.",
 "bat": "Reads battery level/charging where the browser exposes it (Chromium). Local only.",
 "net": "Reads the browser's coarse connection estimate (type, downlink, RTT) and online flag. Local only.",
 "base": "Reads navigator/screen/Intl properties, probes installed fonts and draws a canvas fingerprint — the passive profile any site can read without asking. Local only."
};

// DENIED = the visitor or browser refused; UNAVAILABLE = no such API/sensor here. LIVE only after a real reading.
const isDenied = g => /denied|notallowed|dismiss|blocked|permission/i.test(String(g.error) + (g.code === 1 ? ' denied' : ''));
const permState = g => !g ? 'tap' : g.error ? (!g.unavailable && isDenied(g) ? 'denied' : 'unavailable') : g.live ? 'live' : 'ok';
const permClass = g => ({ tap: '', denied: 'denied', unavailable: 'unavailable', live: 'granted live', ok: 'granted' })[permState(g)];
const permBadge = g => ({ tap: 'TAP', denied: 'DENIED', unavailable: 'UNAVAILABLE', live: 'LIVE', ok: 'OK' })[permState(g)];

const renderPermissions = () => {
  app.innerHTML = `<div class="stage-permissions">
    <div class="stage-label">02 \u00b7 LIVE DEMO \u00b7 SENSORS</div>
    <div class="harvest-lead"><span>Each tile asks once. Nothing leaves this tab.</span></div>
    <div class="perm-grid">${permsConfig.map(p => {
      const g = state.collected[p.id];
      const preview = fmtPreview(p.id, g);
      const err = g?.error ? g.error.slice(0, 42) : '';
      return `<button type="button" class="perm-item ${permClass(g)}" data-perm="${p.id}" aria-describedby="reads-${p.id}">
        <span class="perm-badge">${permBadge(g)}</span>
        <span class="perm-icon" aria-hidden="true">${p.icon}</span>
        <span class="perm-name">${p.name}</span>
        ${preview ? `<span class="perm-val" id="pval-${p.id}">${preview}</span>` : ''}
        ${err ? `<span class="perm-val perm-err">${err}</span>` : ''}
      </button>`;
    }).join('')}</div>
    <div class="btn-group">
      <button type="button" class="btn-primary" id="btn-harvest-all">READ ALL</button>
      <button type="button" class="btn-primary btn-fill" id="btn-portrait">PORTRAIT \u2192</button>
    </div>
    <div id="harvest-status" class="harvest-status" role="status" aria-live="polite"></div>
    <details class="perm-explain"><summary>What each tile reads</summary>
      <dl>${permsConfig.map(p => `<dt>${p.name}</dt><dd id="reads-${p.id}">${permReads[p.id]}</dd>`).join('')}</dl>
      <p>DENIED = refused; UNAVAILABLE = this device has no such sensor or API. All tiles are optional and never reach the artwork.</p>
    </details>
    <p class="approach-note"><button type="button" class="cite" id="btn-identity">Add an identity</button>${window.OracleChapters ? ` \u00b7 <button type="button" class="cite" id="btn-back-extraction">Back to 02</button>` : ''}</p>
  </div>`;

  const runOne = async (p) => {
    const el = document.querySelector(`[data-perm="${p.id}"]`);
    if (el) el.classList.add('collecting');
    state.collected[p.id] = await p.fn();
    if (el) el.classList.remove('collecting');
  };

  permsConfig.forEach(p => {
    document.querySelector(`[data-perm="${p.id}"]`).onclick = async () => { await runOne(p); renderPermissions(); };
  });

  document.getElementById('btn-harvest-all').onclick = async () => {
    for (const p of permsConfig) {
      if (state.collected[p.id] && !state.collected[p.id].error) continue;
      const s = document.getElementById('harvest-status');
      if (s) s.textContent = `READING ${p.name}...`;
      await runOne(p);
      renderPermissions();
      await new Promise(r => setTimeout(r, 220));
    }
    const s = document.getElementById('harvest-status');
    if (s) s.textContent = 'DONE';
  };

  document.getElementById('btn-portrait').onclick = () => {
    if (!state.collected.base) state.collected.base = harvestBase();
    state.fingerprint = generateHash(state.collected);
    state.stage = 'portrait';
    render();
  };

  document.getElementById('btn-identity').onclick = () => { history.pushState(null, '', '#protocol'); state.stage = 'handshake'; render(); };
  const backEx = document.getElementById('btn-back-extraction');
  if (backEx) backEx.onclick = () => OracleChapters.go('extraction');

  vitals.listeners.clear();
  vitals.listeners.add((id, payload) => {
    const node = document.getElementById('pval-' + id);
    if (!node) return;
    if (id === 'orient') node.textContent = `${payload.screen || ''}  \u03b2 ${payload.beta ?? '\u2014'}`;
    if (id === 'shake') node.textContent = `${payload.peaks || 0} peaks \u00b7 ${payload.g || '\u2014'}g`;
  });
};

const row = (k, v, cls='') => `<div class="data-row"><span class="data-key">${k}</span><span class="data-val ${cls}">${v ?? '\u2014'}</span></div>`;

const renderPortrait = () => {
  const d = state.collected, base = d.base || {}, crypto = d.crypto || {}, bio = d.bio || {};
  const geo = d.geo || {}, gpu = d.gpu || {}, cpu = d.cpu || {}, bt = d.bt || {};
  const net = d.net || {}, orient = d.orient || {}, shake = d.shake || {};
  const bat = d.bat || {}, cam = d.cam || {}, mic = d.mic || {};
  const memLine = cpu.deviceMem ? cpu.deviceMem + ' GB' : (base.memory ? base.memory + ' GB' : (cpu.jsHeap ? cpu.jsHeap.used + ' MB heap' : '\u2014'));
  app.innerHTML = `<div class="stage-portrait">
    <div class="portrait-header">
      <div class="stage-label">02 \u00b7 LIVE DEMO \u00b7 PORTRAIT</div>
      <h1 class="oracle-title glitch" data-text="WITNESSED" style="font-size:clamp(1.6rem,8vw,2.6rem)">WITNESSED</h1>
      <div class="identity-hash">ORACLE_HASH // ${state.fingerprint}</div>
    </div>
    <div class="portrait-grid">
      <div class="data-panel"><div class="panel-header">CHAIN</div><div class="panel-body">${row('METHOD', crypto.method || 'ANON', 'accent')}${row('CHAIN', crypto.chainId || 'N/A')}${row('BALANCE', crypto.balance)}${crypto.address ? `<div class="wallet-address">${crypto.address}</div>` : ''}</div></div>
      <div class="data-panel"><div class="panel-header">BIO</div><div class="panel-body">${row('PASSKEY', bio.ok ? 'CREATED' : 'NONE', bio.ok ? 'cyan' : 'accent')}${row('TYPE', bio.type || 'N/A')}</div></div>
      <div class="data-panel"><div class="panel-header">CORE</div><div class="panel-body">${row('PLATFORM', base.platform)}${row('CORES', cpu.cores || base.cores, 'accent')}${row('MEM', memLine)}${row('CPU INDEX', cpu.index ?? '\u2014')}${row('SCREEN', base.screen, 'cyan')}${row('VIEWPORT', base.viewport)}</div></div>
      <div class="data-panel"><div class="panel-header">GPU</div><div class="panel-body">${row('RENDERER', (gpu.renderer || base.gpuRenderer || 'N/A').toString().slice(0,40))}${row('VENDOR', (gpu.vendor || base.gpuVendor || 'N/A').toString().slice(0,30))}${row('WEBGPU', gpu.webgpu || 'N/A')}</div></div>
      <div class="data-panel"><div class="panel-header">GEO</div><div class="panel-body">${geo.lat ? row('LAT', geo.lat, 'cyan') + row('LNG', geo.lng, 'cyan') + row('ACC', geo.acc ? Math.round(geo.acc) + 'm' : '\u2014') : `<div style="color:var(--trace);font-size:10px;padding:8px 0">${geo.error || 'WITHHELD'}</div>`}${row('TZ', base.tz)}</div></div>
      <div class="data-panel"><div class="panel-header">FRAME</div><div class="panel-body">${row('SCREEN', orient.screen || base.orientation, 'cyan')}${row('BETA', orient.beta, 'accent')}${row('GAMMA', orient.gamma)}${row('SHAKE', shake.peaks ?? '\u2014')}${row('G', shake.g)}</div></div>
      <div class="data-panel"><div class="panel-header">NET</div><div class="panel-body">${row('TYPE', net.type || base.connType, 'accent')}${row('ONLINE', (net.online ?? base.online) ? 'YES' : 'NO', 'cyan')}${row('BT', bt.radio || (bt.error ? 'N/A' : '\u2014'))}</div></div>
      ${bat.level ? `<div class="data-panel"><div class="panel-header">ENERGY</div><div class="panel-body"><div class="big-number">${bat.level}</div>${row('CHARGING', bat.charging ? 'YES' : 'NO')}</div></div>` : ''}
      ${cam.w ? `<div class="data-panel"><div class="panel-header">CAM</div><div class="panel-body">${row('RES', cam.w + '\u00d7' + cam.h, 'cyan')}${row('FPS', cam.fps)}</div></div>` : ''}
      ${mic.avgFreq ? `<div class="data-panel"><div class="panel-header">MIC</div><div class="panel-body">${row('AVG', mic.avgFreq + ' Hz', 'accent')}</div></div>` : ''}
      <div class="closing-verse">You have been witnessed.<br><em>Close or reload the tab to discard every reading.</em>
        <div class="btn-group" style="margin-top:28px">
          ${window.OracleChapters ? `<button type="button" class="btn-primary btn-fill" id="btn-continue-machine">Next \u00b7 03 MACHINE \u2192</button>` : ''}
          <button type="button" class="btn-primary" id="btn-copy">COPY HASH</button>
          <button type="button" class="btn-primary" id="btn-reset">RESET</button>
        </div>
      </div>
    </div>
  </div>`;
  document.getElementById('btn-copy').onclick = () => {
    navigator.clipboard?.writeText('ORACLE_HASH: ' + state.fingerprint).then(() => {
      const b = document.getElementById('btn-copy'); if (b) b.textContent = 'COPIED';
    });
  };
  const cont = document.getElementById('btn-continue-machine');
  if (cont) cont.onclick = () => OracleChapters.go('machine');
  document.getElementById('btn-reset').onclick = () => {
    state.stage = 'approach'; state.collected = {}; state.cryptoAddr = null; state.bioAuth = false; state.fingerprint = null;
    vitals.listeners.clear(); render();
  };
};

if (window.OracleChapters) OracleChapters.boot(); else render();
