const app = document.getElementById('app');

const render = () => {
  app.innerHTML = '';
  syncHud();
  if (state.stage === 'approach') renderApproach();
  else if (state.stage === 'handshake') renderHandshake();
  else if (state.stage === 'permissions') renderPermissions();
  else renderPortrait();
};

const renderApproach = () => {
  app.innerHTML = `<div class="stage-approach">
    <div class="oracle-sigil"><div class="sigil-ring"></div><div class="sigil-ring"></div><div class="sigil-ring"></div><div class="sigil-core"></div></div>
    <h1 class="oracle-title glitch" data-text="ORACLE">ORACLE</h1>
    <div class="oracle-sub">PROTOCOL \u00b7 v1.2 \u00b7 IDENTITY LAYER</div>
    <p class="oracle-verse">We are all made of data \u2014<br>frequencies, patterns, the geometry of choice.<br><em>Human communication is a gift.</em><br>Let the machine witness you, willingly.</p>
    <button class="btn-primary" id="btn-enter">INITIATE PROTOCOL</button>
  </div>`;
  document.getElementById('btn-enter').onclick = () => { state.stage = 'handshake'; render(); };
};

const renderHandshake = () => {
  const cryptoDone = !!state.cryptoAddr;
  const bioDone = state.bioAuth;
  app.innerHTML = `<div class="stage-handshake">
    <div class="stage-label">PHASE 01 // HANDSHAKE</div>
    <div class="handshake-options">
      <div class="auth-card ${cryptoDone ? 'done' : 'active'}">
        <div class="auth-icon">\u26d3\ufe0f</div>
        <div class="auth-info"><h3>BLOCKCHAIN HANDSHAKE</h3><p>Connect wallet or receive ephemeral identity.<br>MetaMask, Phantom, or anonymous.</p></div>
        <div class="auth-status">${cryptoDone ? '\u2713 LINKED' : '\u25cb PENDING'}</div>
      </div>
      <div class="auth-card ${bioDone ? 'done' : ''}">
        <div class="auth-icon">\ud83e\uddec</div>
        <div class="auth-info"><h3>BIOMETRIC SEAL</h3><p>WebAuthn passkey \u2014 fingerprint, face, or device PIN.<br>Zero server transmission.</p></div>
        <div class="auth-status">${bioDone ? '\u2713 SEALED' : '\u25cb PENDING'}</div>
      </div>
    </div>
    <div class="btn-group">
      ${!cryptoDone ? `<button class="btn-primary btn-amber" id="btn-crypto">\u26d3 CONNECT CHAIN</button>` : ''}
      ${!bioDone ? `<button class="btn-primary" id="btn-bio">\ud83e\uddec SEAL IDENTITY</button>` : ''}
      ${(cryptoDone || bioDone) ? `<button class="btn-primary" id="btn-next">PROCEED \u2192</button>` : ''}
    </div>
    <div class="loading-bar" id="loading-bar" style="display:none"><div class="loading-fill"></div></div>
    <div id="status-msg" style="font-size:10px;color:rgba(0,229,255,0.4);text-align:center;margin-top:12px;min-height:20px;letter-spacing:0.16em;"></div>
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
  { id: 'geo', icon: '\ud83c\udf0d', name: 'GEOLOCATION', hint: 'tap to grant', fn: geoFn },
  { id: 'orient', icon: '\ud83e\udded', name: 'ORIENTATION', hint: 'iOS asks once', fn: getOrientation },
  { id: 'shake', icon: '\ud83d\udcf3', name: 'SHAKE / G', hint: 'move the phone', fn: getShake },
  { id: 'gpu', icon: '\ud83c\udfae', name: 'GPU', hint: 'WebGL + WebGPU', fn: getGpu },
  { id: 'cpu', icon: '\ud83e\udde0', name: 'CPU / MEMORY', hint: 'cores \u00b7 heap \u00b7 quota', fn: getCpuMem },
  { id: 'bt', icon: '\ud83d\udd35', name: 'BLUETOOTH', hint: 'availability only', fn: getBluetooth },
  { id: 'cam', icon: '\ud83d\udcf7', name: 'CAMERA META', hint: 'no frames kept', fn: getCameraInfo },
  { id: 'mic', icon: '\ud83c\udf99\ufe0f', name: 'MIC ENERGY', hint: 'spectrum sample', fn: getMicEnergy },
  { id: 'bat', icon: '\ud83d\udd0b', name: 'BATTERY', hint: 'Chrome/Android', fn: batFn },
  { id: 'net', icon: '\ud83d\udce1', name: 'NETWORK', hint: 'type \u00b7 rtt', fn: getNetwork },
  { id: 'base', icon: '\ud83d\udda5\ufe0f', name: 'DEVICE PROFILE', hint: 'no prompt', fn: async () => harvestBase() }
];

const permClass = g => !g ? '' : g.error ? 'denied' : g.live ? 'granted live' : 'granted';
const permBadge = g => !g ? 'TAP' : g.error ? 'DENIED' : g.live ? 'LIVE' : 'OK';

const renderPermissions = () => {
  app.innerHTML = `<div class="stage-permissions">
    <div class="stage-label">PHASE 02 // DATA HARVEST</div>
    <div class="harvest-lead">Grant what you will. Withhold what you must.
      <span>Each tile is a separate grant. iOS geo + motion only fire from this tap.</span>
    </div>
    <div class="perm-grid">${permsConfig.map(p => {
      const g = state.collected[p.id];
      const preview = fmtPreview(p.id, g);
      const err = g?.error ? g.error.slice(0, 42) : '';
      return `<div class="perm-item ${permClass(g)}" data-perm="${p.id}">
        <div class="perm-badge">${permBadge(g)}</div>
        <div class="perm-icon">${p.icon}</div>
        <div class="perm-name">${p.name}</div>
        ${preview ? `<div class="perm-val" id="pval-${p.id}">${preview}</div>` : `<div class="perm-hint">${p.hint}</div>`}
        ${err ? `<div class="perm-val perm-err">${err}</div>` : ''}
      </div>`;
    }).join('')}</div>
    <div class="btn-group">
      <button class="btn-primary btn-amber" id="btn-harvest-all">\u26a1 HARVEST ALL</button>
      <button class="btn-primary" id="btn-portrait">VIEW PORTRAIT \u2192</button>
    </div>
    <div id="harvest-status" class="harvest-status"></div>
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
      if (s) s.textContent = `COLLECTING ${p.name}...`;
      await runOne(p);
      renderPermissions();
      await new Promise(r => setTimeout(r, 220));
    }
    const s = document.getElementById('harvest-status');
    if (s) s.textContent = 'HARVEST COMPLETE';
  };

  document.getElementById('btn-portrait').onclick = () => {
    if (!state.collected.base) state.collected.base = harvestBase();
    state.fingerprint = generateHash(state.collected);
    state.stage = 'portrait';
    render();
  };

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
      <div class="stage-label">PHASE 03 // IDENTITY PORTRAIT</div>
      <h1 class="oracle-title glitch" data-text="WITNESSED" style="font-size:clamp(1.6rem,8vw,2.6rem)">WITNESSED</h1>
      <div class="identity-hash">ORACLE_HASH // ${state.fingerprint}</div>
    </div>
    <div class="portrait-grid">
      <div class="data-panel"><div class="panel-header">CHAIN</div><div class="panel-body">${row('METHOD', crypto.method || 'ANON', 'accent')}${row('CHAIN', crypto.chainId || 'N/A')}${row('BALANCE', crypto.balance)}${crypto.address ? `<div class="wallet-address">${crypto.address}</div>` : ''}</div></div>
      <div class="data-panel"><div class="panel-header">BIO</div><div class="panel-body">${row('STATUS', bio.ok ? 'VERIFIED' : 'SPECTRAL', bio.ok ? 'cyan' : 'accent')}${row('TYPE', bio.type || 'N/A')}</div></div>
      <div class="data-panel"><div class="panel-header">CORE</div><div class="panel-body">${row('PLATFORM', base.platform)}${row('CORES', cpu.cores || base.cores, 'accent')}${row('MEM', memLine)}${row('CPU INDEX', cpu.index ?? '\u2014')}${row('SCREEN', base.screen, 'cyan')}${row('VIEWPORT', base.viewport)}</div></div>
      <div class="data-panel"><div class="panel-header">GPU</div><div class="panel-body">${row('RENDERER', (gpu.renderer || base.gpuRenderer || 'N/A').toString().slice(0,40))}${row('VENDOR', (gpu.vendor || base.gpuVendor || 'N/A').toString().slice(0,30))}${row('WEBGPU', gpu.webgpu || 'N/A')}</div></div>
      <div class="data-panel"><div class="panel-header">GEO</div><div class="panel-body">${geo.lat ? row('LAT', geo.lat, 'cyan') + row('LNG', geo.lng, 'cyan') + row('ACC', geo.acc ? Math.round(geo.acc) + 'm' : '\u2014') : `<div style="color:rgba(255,171,0,.4);font-size:10px;padding:8px 0">${geo.error || 'WITHHELD'}</div>`}${row('TZ', base.tz)}</div></div>
      <div class="data-panel"><div class="panel-header">FRAME</div><div class="panel-body">${row('SCREEN', orient.screen || base.orientation, 'cyan')}${row('BETA', orient.beta, 'accent')}${row('GAMMA', orient.gamma)}${row('SHAKE', shake.peaks ?? '\u2014')}${row('G', shake.g)}</div></div>
      <div class="data-panel"><div class="panel-header">NET</div><div class="panel-body">${row('TYPE', net.type || base.connType, 'accent')}${row('ONLINE', (net.online ?? base.online) ? 'YES' : 'NO', 'cyan')}${row('BT', bt.radio || (bt.error ? 'N/A' : '\u2014'))}</div></div>
      ${bat.level ? `<div class="data-panel"><div class="panel-header">ENERGY</div><div class="panel-body"><div class="big-number">${bat.level}</div>${row('CHARGING', bat.charging ? 'YES' : 'NO')}</div></div>` : ''}
      ${cam.w ? `<div class="data-panel"><div class="panel-header">CAM</div><div class="panel-body">${row('RES', cam.w + '\u00d7' + cam.h, 'cyan')}${row('FPS', cam.fps)}</div></div>` : ''}
      ${mic.avgFreq ? `<div class="data-panel"><div class="panel-header">MIC</div><div class="panel-body">${row('AVG', mic.avgFreq + ' Hz', 'accent')}</div></div>` : ''}
      <div class="closing-verse">You have been witnessed.<br><em>These frequencies, this geometry \u2014 they are yours alone.</em>
        <div class="btn-group" style="margin-top:28px">
          <button class="btn-primary btn-amber" id="btn-copy">COPY HASH</button>
          <button class="btn-primary" id="btn-reset">RESET</button>
        </div>
      </div>
    </div>
  </div>`;
  document.getElementById('btn-copy').onclick = () => {
    navigator.clipboard?.writeText('ORACLE_HASH: ' + state.fingerprint).then(() => {
      const b = document.getElementById('btn-copy'); if (b) b.textContent = 'COPIED';
    });
  };
  document.getElementById('btn-reset').onclick = () => {
    state.stage = 'approach'; state.collected = {}; state.cryptoAddr = null; state.bioAuth = false; state.fingerprint = null;
    vitals.listeners.clear(); render();
  };
};

render();
