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
  document.body.classList.add('v4'); // v4: one look everywhere, the sensor demo included (WP9)
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
    ${window.OracleChapters ? `<p class="approach-lead">Answer a few questions about your digital life. Get a one-of-a-kind artwork made from your answers.</p>` : ''}
    <div class="btn-group">
      ${window.OracleChapters ? `<button type="button" class="btn-primary btn-fill" id="btn-investigate">Begin</button>` : `<button type="button" class="btn-primary" id="btn-enter">INITIATE PROTOCOL</button>`}
    </div>
    ${window.OracleChapters ? `<p class="approach-note">About three minutes \u00b7 no permissions needed \u00b7 nothing leaves this tab.</p>` : ''}
    <p class="oracle-verse">We are all made of data.<br><em>Let the machine witness you \u2014 willingly.</em></p>
  </div>`;
  const ent = document.getElementById('btn-enter');
  if (ent) ent.onclick = () => { state.stage = 'handshake'; render(); };
  const inv = document.getElementById('btn-investigate');
  if (inv) inv.onclick = () => OracleChapters.go('offer');
};

// v4 WP9: the sensor demo lives in Extras, after the artwork. Same readings and honest states, v4 look, no emoji.
const backIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const demoTop = (label) => `<div class="screen-top"><button type="button" class="btn-back" id="demo-back">${backIcon}Extras</button><span class="step-of">Sensor demo \u00b7 ${label}</span></div>`;
const bindDemoBack = () => { const b = document.getElementById('demo-back'); if (b) b.onclick = () => window.OracleChapters ? OracleChapters.go('extras') : null; };

const renderHandshake = () => {
  const cryptoDone = !!state.cryptoAddr;
  const bioDone = state.bioAuth;
  app.innerHTML = `<div class="stage-handshake screen v4s demo">
    ${demoTop('identity (optional)')}
    <h1 tabindex="-1">Add an identity</h1>
    <div class="handshake-options">
      <div class="auth-card ${cryptoDone ? 'done' : 'active'}">
        <div class="auth-info"><h3>Wallet or anonymous ID</h3><p>MetaMask, Phantom, or a throwaway ID. A wallet queries its own node; Oracle sends nothing.</p></div>
        <div class="auth-status">${cryptoDone ? 'Linked' : 'Not linked'}</div>
      </div>
      <div class="auth-card ${bioDone ? 'done' : ''}">
        <div class="auth-info"><h3>Passkey</h3><p>Fingerprint, face or PIN. Biometrics never reach the page \u2014 only a credential id.</p></div>
        <div class="auth-status">${bioDone ? 'Created' : 'Not created'}</div>
      </div>
    </div>
    <div class="btn-group">
      ${!cryptoDone ? `<button type="button" class="${cryptoDone || bioDone ? 'btn-quiet' : 'btn-primary'}" id="btn-crypto">Get an ID</button>` : ''}
      ${!bioDone ? `<button type="button" class="btn-quiet" id="btn-bio">Create a passkey</button>` : ''}
      ${(cryptoDone || bioDone) ? `<button type="button" class="btn-primary" id="btn-next">Back to sensors</button>` : ''}
    </div>
    <div class="loading-bar" id="loading-bar" style="display:none"><div class="loading-fill"></div></div>
    <div id="status-msg" class="small" role="status" aria-live="polite"></div>
  </div>`;
  const setStatus = msg => { const el = document.getElementById('status-msg'); if (el) el.textContent = msg; };
  const setLoading = show => { const el = document.getElementById('loading-bar'); if (el) el.style.display = show ? 'block' : 'none'; };
  const cryptoBtn = document.getElementById('btn-crypto');
  if (cryptoBtn) cryptoBtn.onclick = async () => {
    setLoading(true); setStatus('Asking your wallet\u2026');
    const result = await connectCrypto();
    state.cryptoAddr = result.address; state.cryptoMethod = result.method; state.collected.crypto = result;
    setLoading(false); render();
  };
  const bioBtn = document.getElementById('btn-bio');
  if (bioBtn) bioBtn.onclick = async () => {
    setLoading(true); setStatus('Waiting for your passkey\u2026');
    const result = await doBioAuth();
    state.collected.bio = result; state.bioAuth = true;
    setLoading(false); render();
  };
  const nextBtn = document.getElementById('btn-next');
  if (nextBtn) nextBtn.onclick = () => { history.pushState(null, '', '#sensors'); state.stage = 'permissions'; render(); };
  bindDemoBack();
};

const geoFn = harvestGeo; // v5 WP1: the dead getGeo fallback (unused since v1.2) was removed
const batFn = async () => {
  const r = await getBattery();
  return r || { error: 'Battery API withheld (Safari/iOS)' };
};

const fmtPreview = (id, g) => {
  if (!g || g.error) return '';
  if (id === 'geo') return g.lat ? `${g.lat}, ${g.lng}` : '';
  if (id === 'bat') return g.level ? `${g.level}${g.charging ? ', charging' : ''}` : '';
  if (id === 'cam') return g.w ? `${g.w}\u00d7${g.h}` : '';
  if (id === 'mic') return g.level ? `${g.dbfs} dBFS (${g.level})` : '';
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
  { id: 'geo', name: 'Location', fn: geoFn },
  { id: 'orient', name: 'Orientation', fn: getOrientation },
  { id: 'shake', name: 'Motion (shake)', fn: getShake },
  { id: 'gpu', name: 'Graphics chip', fn: getGpu },
  { id: 'cpu', name: 'Processor and memory', fn: getCpuMem },
  { id: 'bt', name: 'Bluetooth', fn: getBluetooth },
  { id: 'cam', name: 'Camera details', fn: getCameraInfo },
  { id: 'mic', name: 'Microphone level', fn: getMicEnergy },
  { id: 'bat', name: 'Battery', fn: batFn },
  { id: 'net', name: 'Network', fn: getNetwork },
  { id: 'base', name: 'Device profile', fn: async () => harvestBase() }
];

const permReads = {
 "geo": "Reads latitude/longitude/accuracy once via the Geolocation API after your tap. Shown only on this page; never stored or sent. One-shot request, no watch.",
 "orient": "Reads device tilt (alpha/beta/gamma) events while this tab is open. Processed in this tab; stops when you close or reload it.",
 "shake": "Reads accelerometer magnitude to count shake peaks. Values stay in memory in this tab; stops on close/reload.",
 "gpu": "Reads the WebGL renderer/vendor strings and whether WebGPU offers an adapter. No prompt; nothing leaves the tab.",
 "cpu": "Runs a 24 ms local loop, reads core count, JS heap and storage quota estimate. No prompt; local only.",
 "bt": "Asks only whether a Bluetooth radio is available. Does not scan or pair. Local only.",
 "cam": "Opens the camera, reads resolution/frame rate/label, then immediately stops every track. No frame is drawn, kept or sent.",
 "mic": "Opens the microphone for 2 s, measures how loud the room is (RMS level in dBFS), then stops the track and closes the audio context. No audio is recorded or sent.",
 "bat": "Reads battery level/charging where the browser exposes it (Chromium). Local only.",
 "net": "Reads the browser's coarse connection estimate (type, downlink, RTT) and online flag. Local only.",
 "base": "Reads navigator/screen/Intl properties, probes installed fonts and draws a canvas fingerprint — the passive profile any site can read without asking. Local only."
};

// DENIED = the visitor or browser refused; UNAVAILABLE = no such API/sensor here. LIVE only after a real reading.
const isDenied = g => /denied|notallowed|dismiss|blocked|permission/i.test(String(g.error) + (g.code === 1 ? ' denied' : ''));
const permState = g => !g ? 'tap' : g.error ? (!g.unavailable && isDenied(g) ? 'denied' : 'unavailable') : g.live ? 'live' : 'ok';
const permClass = g => ({ tap: '', denied: 'denied', unavailable: 'unavailable', live: 'granted live', ok: 'granted' })[permState(g)];
const permBadge = g => ({ tap: 'TAP', denied: 'DENIED', unavailable: 'UNAVAILABLE', live: 'LIVE', ok: 'OK' })[permState(g)];

let permJust = null; // v3: only the tile that just changed plays its settle animation (once); re-renders don't replay it
const renderPermissions = () => {
  const just = permJust; permJust = null;
  app.innerHTML = `<div class="stage-permissions screen v4s demo">
    ${demoTop('sensors')}
    <h1 tabindex="-1">What this browser can expose</h1>
    <p class="lead">Each row asks once. Readings stay in this tab and never reach the artwork.</p>
    <ul class="perm-list">${permsConfig.map(p => {
      const g = state.collected[p.id];
      const preview = fmtPreview(p.id, g);
      const err = g?.error ? g.error.slice(0, 60) : '';
      return `<li class="perm-row ${permClass(g)}${just === p.id ? ' just' : ''}">
        <button type="button" class="perm-item" data-perm="${p.id}" aria-describedby="reads-${p.id}">
          <span class="perm-name">${p.name}</span>
          ${preview ? `<span class="perm-val" id="pval-${p.id}">${preview}</span>` : ''}
          ${err ? `<span class="perm-val perm-err">${err}</span>` : ''}
          <span class="perm-badge">${permBadge(g)}</span>
        </button></li>`;
    }).join('')}</ul>
    <div class="screen-cta">
      <button type="button" class="btn-quiet" id="btn-harvest-all">Read all</button>
      <button type="button" class="btn-primary" id="btn-portrait">See the portrait</button>
    </div>
    <div id="harvest-status" class="small" role="status" aria-live="polite"></div>
    <details class="perm-explain"><summary>What each row reads</summary>
      <dl>${permsConfig.map(p => `<dt>${p.name}</dt><dd id="reads-${p.id}">${permReads[p.id]}</dd>`).join('')}</dl>
      <p>TAP = not asked yet. OK = read once. LIVE = updating from a real event. DENIED = you or the browser refused. UNAVAILABLE = this device has no such sensor or API.</p>
    </details>
    <p><button type="button" class="btn-link" id="btn-identity">Add an identity (optional)</button></p>
  </div>`;

  const runOne = async (p) => {
    const el = document.querySelector(`[data-perm="${p.id}"]`);
    if (el) el.classList.add('collecting');
    state.collected[p.id] = await p.fn();
    if (el) el.classList.remove('collecting');
  };

  permsConfig.forEach(p => {
    document.querySelector(`[data-perm="${p.id}"]`).onclick = async () => { await runOne(p); permJust = p.id; renderPermissions(); };
  });

  document.getElementById('btn-harvest-all').onclick = async () => {
    for (const p of permsConfig) {
      if (state.collected[p.id] && !state.collected[p.id].error) continue;
      const s = document.getElementById('harvest-status');
      if (s) s.textContent = `Reading ${p.name}\u2026`;
      await runOne(p);
      permJust = p.id; renderPermissions();
      await new Promise(r => setTimeout(r, 220));
    }
    const s = document.getElementById('harvest-status');
    if (s) s.textContent = 'Done.';
  };

  document.getElementById('btn-portrait').onclick = () => {
    if (!state.collected.base) state.collected.base = harvestBase();
    state.fingerprint = generateHash(state.collected);
    state.stage = 'portrait';
    render();
  };

  document.getElementById('btn-identity').onclick = () => { history.pushState(null, '', '#protocol'); state.stage = 'handshake'; render(); };
  bindDemoBack();

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
  app.innerHTML = `<div class="stage-portrait screen v4s demo">
    ${demoTop('portrait')}
    <div class="portrait-header">
      <h1 tabindex="-1">Your device portrait</h1>
      <div class="identity-hash">ORACLE_HASH // ${state.fingerprint}</div>
    </div>
    <div class="portrait-grid">
      <div class="data-panel"><div class="panel-header">CHAIN</div><div class="panel-body">${row('METHOD', crypto.method || 'ANON', 'accent')}${row('CHAIN', crypto.chainId || 'N/A')}${row('BALANCE', crypto.balance)}${crypto.address ? `<div class="wallet-address">${crypto.address}</div>` : ''}</div></div>
      <div class="data-panel"><div class="panel-header">BIO</div><div class="panel-body">${row('PASSKEY', bio.ok ? 'CREATED' : 'NONE', bio.ok ? 'cyan' : 'accent')}${row('TYPE', bio.type || 'N/A')}</div></div>
      <div class="data-panel"><div class="panel-header">CORE</div><div class="panel-body">${row('PLATFORM', base.platform)}${row('CORES', cpu.cores || base.cores, 'accent')}${row('MEM', memLine)}${row('CPU INDEX', cpu.index ?? '\u2014')}${row('SCREEN', base.screen, 'cyan')}${row('VIEWPORT', base.viewport)}</div></div>
      <div class="data-panel"><div class="panel-header">GPU</div><div class="panel-body">${row('RENDERER', (gpu.renderer || base.gpuRenderer || 'N/A').toString().slice(0,40))}${row('VENDOR', (gpu.vendor || base.gpuVendor || 'N/A').toString().slice(0,30))}${row('WEBGPU', gpu.webgpu || 'N/A')}</div></div>
      <div class="data-panel"><div class="panel-header">GEO</div><div class="panel-body">${geo.lat ? row('LAT', geo.lat, 'cyan') + row('LNG', geo.lng, 'cyan') + row('ACC', geo.acc ? Math.round(geo.acc) + 'm' : '\u2014') : `<div class="small">${geo.error || 'Withheld'}</div>`}${row('TZ', base.tz)}</div></div>
      <div class="data-panel"><div class="panel-header">FRAME</div><div class="panel-body">${row('SCREEN', orient.screen || base.orientation, 'cyan')}${row('BETA', orient.beta, 'accent')}${row('GAMMA', orient.gamma)}${row('SHAKE', shake.peaks ?? '\u2014')}${row('G', shake.g)}</div></div>
      <div class="data-panel"><div class="panel-header">NET</div><div class="panel-body">${row('TYPE', net.type || base.connType, 'accent')}${row('ONLINE', (net.online ?? base.online) ? 'YES' : 'NO', 'cyan')}${row('BT', bt.radio || (bt.error ? 'N/A' : '\u2014'))}</div></div>
      ${bat.level ? `<div class="data-panel"><div class="panel-header">ENERGY</div><div class="panel-body"><div class="big-number">${bat.level}</div>${row('CHARGING', bat.charging ? 'YES' : 'NO')}</div></div>` : ''}
      ${cam.w ? `<div class="data-panel"><div class="panel-header">CAM</div><div class="panel-body">${row('RES', cam.w + '\u00d7' + cam.h, 'cyan')}${row('FPS', cam.fps)}</div></div>` : ''}
      ${mic.level ? `<div class="data-panel"><div class="panel-header">MIC</div><div class="panel-body">${row('LEVEL', mic.dbfs + ' dBFS', 'accent')}${row('ROOM', mic.level)}</div></div>` : ''}
      <div class="closing-verse"><p>Close or reload the tab to discard every reading.</p>
        <div class="screen-cta">
          ${window.OracleChapters ? `<button type="button" class="btn-primary" id="btn-continue-machine">Back to Extras</button>` : ''}
          <button type="button" class="btn-quiet" id="btn-copy">Copy hash</button>
          <button type="button" class="btn-quiet" id="btn-reset">Clear readings</button>
        </div>
      </div>
    </div>
  </div>`;
  document.getElementById('btn-copy').onclick = () => {
    navigator.clipboard?.writeText('ORACLE_HASH: ' + state.fingerprint).then(() => {
      const b = document.getElementById('btn-copy'); if (b) b.textContent = 'Copied';
    });
  };
  const cont = document.getElementById('btn-continue-machine');
  if (cont) cont.onclick = () => OracleChapters.go('extras');
  bindDemoBack();
  document.getElementById('btn-reset').onclick = () => {
    state.collected = {}; state.cryptoAddr = null; state.bioAuth = false; state.fingerprint = null;
    vitals.listeners.clear(); window.OracleChapters ? OracleChapters.go('extras') : (state.stage = 'approach', render());
  };
};

if (window.OracleChapters) OracleChapters.boot(); else render();
