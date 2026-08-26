const app = document.getElementById('app');

const render = () => {
  app.innerHTML = '';
  syncHud();
  const s = state.stage;
  if (s === 'approach') renderApproach();
  else if (s === 'handshake') renderHandshake();
  else if (s === 'permissions') renderPermissions();
  else if (s === 'portrait') renderPortrait();
};

const renderApproach = () => {
  app.innerHTML = `
  <div class="stage-approach">
    <div class="oracle-sigil">
      <div class="sigil-ring"></div>
      <div class="sigil-ring"></div>
      <div class="sigil-ring"></div>
      <div class="sigil-core"></div>
    </div>
    <h1 class="oracle-title glitch" data-text="ORACLE">ORACLE</h1>
    <div class="oracle-sub">PROTOCOL · v1.1 · IDENTITY LAYER</div>
    <p class="oracle-verse">
      We are all made of data —<br>
      frequencies, patterns, the geometry of choice.<br>
      <em>Human communication is a gift.</em><br>
      Let the machine witness you, willingly.
    </p>
    <button class="btn-primary" id="btn-enter">INITIATE PROTOCOL</button>
  </div>`;
  document.getElementById('btn-enter').onclick = () => {
    state.stage = 'handshake';
    render();
  };
};

const renderHandshake = () => {
  const cryptoDone = !!state.cryptoAddr;
  const bioDone = state.bioAuth;
  app.innerHTML = `
  <div class="stage-handshake">
    <div class="stage-label">PHASE 01 // HANDSHAKE</div>
    <div class="handshake-options">
      <div class="auth-card ${cryptoDone ? 'done' : 'active'}" id="card-crypto">
        <div class="auth-icon">⛓️</div>
        <div class="auth-info">
          <h3>BLOCKCHAIN HANDSHAKE</h3>
          <p>Connect wallet or receive ephemeral identity.<br>MetaMask, Phantom, or anonymous.</p>
        </div>
        <div class="auth-status">${cryptoDone ? '✓ LINKED' : '○ PENDING'}</div>
      </div>
      <div class="auth-card ${bioDone ? 'done' : ''}" id="card-bio">
        <div class="auth-icon">🧬</div>
        <div class="auth-info">
          <h3>BIOMETRIC SEAL</h3>
          <p>WebAuthn passkey — fingerprint, face, or device PIN.<br>Zero server transmission.</p>
        </div>
        <div class="auth-status">${bioDone ? '✓ SEALED' : '○ PENDING'}</div>
      </div>
    </div>
    <div class="btn-group">
      ${!cryptoDone ? `<button class="btn-primary btn-amber" id="btn-crypto">⛓ CONNECT CHAIN</button>` : ''}
      ${!bioDone ? `<button class="btn-primary" id="btn-bio">🧬 SEAL IDENTITY</button>` : ''}
      ${(cryptoDone || bioDone) ? `<button class="btn-primary" id="btn-next">PROCEED →</button>` : ''}
    </div>
    <div class="loading-bar" id="loading-bar" style="display:none"><div class="loading-fill"></div></div>
    <div id="status-msg" style="font-size:10px;color:rgba(0,229,255,0.4);text-align:center;margin-top:12px;min-height:20px;letter-spacing:0.16em;"></div>
  </div>`;

  const setStatus = msg => { const el = document.getElementById('status-msg'); if (el) el.textContent = msg; };
  const setLoading = show => { const el = document.getElementById('loading-bar'); if (el) el.style.display = show ? 'block' : 'none'; };

  const cryptoBtn = document.getElementById('btn-crypto');
  if (cryptoBtn) cryptoBtn.onclick = async () => {
    setLoading(true);
    setStatus('REQUESTING CHAIN ACCESS...');
    const result = await connectCrypto();
    state.cryptoAddr = result.address;
    state.cryptoMethod = result.method;
    state.collected.crypto = result;
    setLoading(false);
    render();
  };

  const bioBtn = document.getElementById('btn-bio');
  if (bioBtn) bioBtn.onclick = async () => {
    setLoading(true);
    setStatus('AWAITING BIOMETRIC INPUT...');
    const result = await doBioAuth();
    state.bioAuth = result.ok;
    state.collected.bio = result;
    setLoading(false);
    if (!result.ok) {
      setStatus(`BIO SEAL: ${result.reason} — proceeding as spectral entity`);
      state.bioAuth = true;
    }
    render();
  };

  const nextBtn = document.getElementById('btn-next');
  if (nextBtn) nextBtn.onclick = () => {
    state.stage = 'permissions';
    render();
  };
};

const permsConfig = [
  { id: 'geo', icon: '🌍', name: 'GEOLOCATION', fn: getGeo },
  { id: 'cam', icon: '📷', name: 'CAMERA META', fn: getCameraInfo },
  { id: 'mic', icon: '🎙️', name: 'MIC ENERGY', fn: getMicEnergy },
  { id: 'bat', icon: '🔋', name: 'BATTERY', fn: getBattery },
  { id: 'base', icon: '🖥️', name: 'DEVICE PROFILE', fn: async () => harvestBase() }
];

const renderPermissions = () => {
  app.innerHTML = `
  <div class="stage-permissions">
    <div class="stage-label">PHASE 02 // DATA HARVEST</div>
    <div style="text-align:center;margin-bottom:8px;">
      <span style="font-style:italic;color:rgba(255,255,255,0.4);font-size:0.92rem;">
        Grant what you will. Withhold what you must.
      </span>
    </div>
    <div class="perm-grid">
      ${permsConfig.map(p => {
        const granted = state.collected[p.id];
        const cls = granted ? 'granted' : '';
        const preview = granted && !granted.error ?
          (p.id === 'geo' ? `${granted.lat}, ${granted.lng}` :
           p.id === 'bat' ? (granted ? `${granted.level} ${granted.charging ? '⚡' : ''}` : '—') :
           p.id === 'cam' ? (granted.w ? `${granted.w}×${granted.h}` : granted.error?.slice(0,20)) :
           p.id === 'mic' ? (granted.avgFreq ? `${granted.avgFreq} hz avg` : granted.error?.slice(0,20)) :
           p.id === 'base' ? `${granted.cores} cores / ${granted.memory || '?'}GB` : '') : '';
        return `
        <div class="perm-item ${cls}" data-perm="${p.id}">
          <div class="perm-icon">${p.icon}</div>
          <div class="perm-name">${p.name}</div>
          ${preview ? `<div class="perm-val">${preview}</div>` : ''}
          ${granted?.error ? `<div class="perm-val" style="color:var(--crimson)">${granted.error.slice(0,30)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>
    <div class="btn-group">
      <button class="btn-primary btn-amber" id="btn-harvest-all">⚡ HARVEST ALL</button>
      <button class="btn-primary" id="btn-portrait">VIEW PORTRAIT →</button>
    </div>
    <div id="harvest-status" style="font-size:10px;color:rgba(0,229,255,0.3);text-align:center;margin-top:14px;letter-spacing:0.16em;min-height:20px;"></div>
  </div>`;

  permsConfig.forEach(p => {
    document.querySelector(`[data-perm="${p.id}"]`).onclick = async (e) => {
      const el = e.currentTarget;
      el.classList.add('collecting');
      const result = await p.fn();
      state.collected[p.id] = result;
      el.classList.remove('collecting');
      renderPermissions();
    };
  });

  document.getElementById('btn-harvest-all').onclick = async () => {
    for (const p of permsConfig) {
      if (!state.collected[p.id]) {
        const statusEl = document.getElementById('harvest-status');
        if (statusEl) statusEl.textContent = `COLLECTING ${p.name}...`;
        state.collected[p.id] = await p.fn();
        renderPermissions();
        await new Promise(r => setTimeout(r, 280));
      }
    }
    const statusEl = document.getElementById('harvest-status');
    if (statusEl) statusEl.textContent = 'HARVEST COMPLETE';
  };

  document.getElementById('btn-portrait').onclick = () => {
    if (!state.collected.base) state.collected.base = harvestBase();
    state.fingerprint = generateHash(state.collected);
    state.stage = 'portrait';
    render();
  };
};

const row = (k, v, cls='') => `<div class="data-row"><span class="data-key">${k}</span><span class="data-val ${cls}">${v ?? '—'}</span></div>`;

const renderPortrait = () => {
  const d = state.collected;
  const base = d.base || {};
  const crypto = d.crypto || {};
  const bio = d.bio || {};
  const geo = d.geo || {};
  const bat = d.bat || {};
  const cam = d.cam || {};
  const mic = d.mic || {};
  const fonts = base.fonts || [];
  const logs = [
    `> PROTOCOL INITIATED ${new Date().toISOString()}`,
    `> CHAIN: ${crypto.method || 'ANON'} // ${crypto.address ? crypto.address.slice(0,10)+'...' : 'ephemeral'}`,
    `> BIO SEAL: ${bio.ok ? 'VERIFIED ✓' : bio.reason || 'SPECTRAL'}`,
    `> GEO: ${geo.lat ? `${geo.lat}, ${geo.lng}` : 'WITHHELD'}`,
    `> GPU: ${base.gpuRenderer?.slice(0,30) || 'N/A'}`,
    `> CORES: ${base.cores} // MEM: ${base.memory}GB`,
    `> CANVAS FP: ${base.canvasFP || 'N/A'}`,
    `> FONTS DETECTED: ${base.fontsCount || 0}`,
    `> IDENTITY HASH: ${state.fingerprint}`,
    `> STATUS: WITNESSED ✓`
  ];
  const entropyBlocks = Array.from({length: 48}, () =>
    `<div class="entropy-block" style="--dur:${(Math.random()*1.5+0.5).toFixed(1)}s;--del:${(Math.random()*2).toFixed(1)}s;opacity:${(Math.random()*0.7+0.1).toFixed(2)};background:${Math.random()>0.7?'var(--amber)':'var(--cyan)'}"></div>`
  ).join('');

  app.innerHTML = `
  <div class="stage-portrait">
    <div class="portrait-header">
      <div class="stage-label">PHASE 03 // IDENTITY PORTRAIT</div>
      <h1 class="oracle-title glitch" data-text="WITNESSED" style="font-size:clamp(1.6rem,8vw,2.6rem)">WITNESSED</h1>
      <div class="identity-hash">ORACLE_HASH // ${state.fingerprint}</div>
    </div>
    <div class="portrait-grid">
      <div class="data-panel" style="--delay:0s">
        <div class="panel-header"><span class="panel-icon">⛓️</span> CHAIN IDENTITY</div>
        <div class="panel-body">
          ${row('METHOD', crypto.method || 'ANON', 'accent')}
          ${row('CHAIN', crypto.chainId === 1 ? 'ETH MAINNET' : crypto.chainId || 'N/A')}
          ${row('BALANCE', crypto.balance || '—', 'accent')}
          ${crypto.note ? `<div style="font-size:9px;color:rgba(255,255,255,0.3);margin-top:8px;line-height:1.5">${crypto.note}</div>` : ''}
          <div class="wallet-address">${crypto.address || 'NO ADDRESS'}</div>
        </div>
      </div>
      <div class="data-panel" style="--delay:0.3s">
        <div class="panel-header"><span class="panel-icon">🧬</span> BIOMETRIC SEAL</div>
        <div class="panel-body">
          ${row('STATUS', bio.ok ? 'VERIFIED' : 'SPECTRAL', bio.ok ? 'cyan' : 'accent')}
          ${row('TYPE', bio.type || 'N/A')}
          ${row('TRANSPORT', (bio.transports || []).join(', ') || 'N/A')}
          ${bio.credId ? `<div class="wallet-address">${bio.credId}</div>` : ''}
          ${!bio.ok ? `<div style="font-size:9px;color:rgba(255,171,0,0.5);margin-top:8px">${bio.reason || ''}</div>` : ''}
        </div>
      </div>
      <div class="data-panel" style="--delay:0.6s">
        <div class="panel-header"><span class="panel-icon">🖥️</span> DEVICE CORE</div>
        <div class="panel-body">
          ${row('PLATFORM', base.platform)}
          ${row('CORES', base.cores, 'accent')}
          ${row('MEMORY', base.memory ? base.memory + ' GB' : '—')}
          ${row('TOUCH PTS', base.touch)}
          ${row('SCREEN', base.screen, 'cyan')}
          ${row('PIXEL RATIO', base.pixelRatio)}
          ${row('COLOR DEPTH', base.colorDepth ? base.colorDepth + '-bit' : '—')}
        </div>
      </div>
      <div class="data-panel" style="--delay:0.9s">
        <div class="panel-header"><span class="panel-icon">🎮</span> GPU ORACLE</div>
        <div class="panel-body">
          ${row('RENDERER', (base.gpuRenderer || 'N/A').slice(0,40))}
          ${row('VENDOR', (base.gpuVendor || 'N/A').slice(0,30))}
          ${row('EXTENSIONS', base.glExt || 0, 'accent')}
          ${row('MAX TEXTURE', base.glMaxTex ? base.glMaxTex + 'px' : '—')}
        </div>
      </div>
      <div class="data-panel" style="--delay:1.2s">
        <div class="panel-header"><span class="panel-icon">🌍</span> GEOSIGNAL</div>
        <div class="panel-body">
          ${geo.lat ? row('LAT', geo.lat, 'cyan') + row('LNG', geo.lng, 'cyan') + row('ACCURACY', geo.acc ? Math.round(geo.acc) + 'm' : '—') : `<div style="color:rgba(255,171,0,0.4);font-size:10px;padding:8px 0">LOCATION WITHHELD<br><span style="color:rgba(255,255,255,0.2)">respect</span></div>`}
          ${row('TIMEZONE', base.tz)}
          ${row('TZ OFFSET', base.tzOffset != null ? (base.tzOffset > 0 ? '-' : '+') + Math.abs(base.tzOffset/60) + 'h' : '—')}
          ${row('LOCALE', base.locale)}
        </div>
      </div>
      <div class="data-panel" style="--delay:1.5s">
        <div class="panel-header"><span class="panel-icon">📡</span> NETWORK PULSE</div>
        <div class="panel-body">
          ${row('TYPE', base.connType, 'accent')}
          ${row('DOWNLINK', base.connDown !== 'N/A' ? base.connDown + ' Mb/s' : '—')}
          ${row('RTT', base.connRTT !== 'N/A' ? base.connRTT + ' ms' : '—')}
          ${row('DATA SAVER', base.dataSaver ? 'ON' : 'OFF')}
          ${row('ONLINE', base.online ? 'YES' : 'NO', 'cyan')}
          ${row('REFERRER', (base.referrer || '—').slice(0,24))}
          ${row('HIST LEN', base.histLen || 0)}
        </div>
      </div>
      ${bat.level ? `<div class="data-panel" style="--delay:1.8s"><div class="panel-header"><span class="panel-icon">🔋</span> ENERGY STATE</div><div class="panel-body"><div class="big-number">${bat.level}</div><div class="score-bar"><div class="score-fill" style="--fill:${bat.level}"></div></div>${row('CHARGING', bat.charging ? '⚡ YES' : 'NO', bat.charging ? 'cyan' : 'accent')}</div></div>` : ''}
      ${cam.w ? `<div class="data-panel" style="--delay:2.1s"><div class="panel-header"><span class="panel-icon">📷</span> CAMERA SPEC</div><div class="panel-body">${row('RESOLUTION', cam.w + '×' + cam.h, 'cyan')}${row('FPS', cam.fps)}${row('FACING', cam.facing)}${row('DEVICE', cam.deviceId)}</div></div>` : ''}
      ${mic.avgFreq ? `<div class="data-panel" style="--delay:2.4s"><div class="panel-header"><span class="panel-icon">🎙️</span> AUDIO FIELD</div><div class="panel-body">${row('AVG FREQ', mic.avgFreq + ' Hz', 'accent')}${row('BINS', mic.bins)}${row('SAMPLE RATE', mic.sampleRate ? (mic.sampleRate/1000).toFixed(1) + ' kHz' : '—')}</div></div>` : ''}
      <div class="data-panel" style="--delay:2.7s">
        <div class="panel-header"><span class="panel-icon">⚡</span> CAPABILITIES</div>
        <div class="panel-body">
          ${[['BLUETOOTH', base.hasBT], ['USB', base.hasUSB], ['SHARE', base.hasShare], ['VIBRATE', base.hasVibrate], ['CLIPBOARD', base.hasClipboard], ['WAKE LOCK', base.hasWakeLock], ['SPEECH', base.hasSpeech], ['CRYPTO API', base.hasCrypto], ['MIDI', base.hasMIDI], ['GAMEPADS', base.hasGP > 0 ? `${base.hasGP} connected` : false], ['DO NOT TRACK', base.dnt === '1'], ['COOKIES', base.cookies]].map(([k, v]) => row(k, typeof v === 'string' ? v : v ? '✓ YES' : '✗ NO', v ? 'cyan' : '')).join('')}
        </div>
      </div>
      <div class="data-panel" style="--delay:3s">
        <div class="panel-header"><span class="panel-icon">🔮</span> FINGERPRINT</div>
        <div class="panel-body">
          ${row('CANVAS FP', base.canvasFP)}
          ${row('FONTS', (base.fontsCount || 0) + ' detected', 'cyan')}
          ${row('UPTIME', base.perfNow ? (base.perfNow/1000).toFixed(1) + 's' : '—')}
          ${row('SPEECH VOICES', base.speechVoices || 0)}
          <div class="fingerprint-display">${fonts.slice(0,10).join(' · ') || 'no fonts detected'}</div>
          <div class="entropy-viz" style="margin-top:12px">${entropyBlocks}</div>
        </div>
      </div>
      <div class="data-panel" style="--delay:3.3s">
        <div class="panel-header"><span class="panel-icon">🗣️</span> LINGUISTIC PROFILE</div>
        <div class="panel-body">
          ${row('LANGUAGE', base.lang, 'accent')}
          ${row('LANGUAGES', (base.langs || '—').slice(0,30))}
          ${row('LOCALE', base.locale)}
          ${row('MATH π', base.mathPi)}
          ${row('MATH e', base.mathE)}
        </div>
      </div>
      <div class="data-panel" style="--delay:3.6s;grid-column:1/-1">
        <div class="panel-header"><span class="panel-icon">🖥</span> ORACLE TERMINAL</div>
        <div class="panel-body">
          <div class="terminal-log">
            ${logs.map((l, i) => {
              const cls = l.includes('✓') ? 'ok' : (l.includes('WITHHELD') || l.includes('SPECTRAL')) ? 'warn' : '';
              return `<span class="log-line ${cls}" style="animation:fadeIn ${0.3 + i*0.12}s ease both">${l}</span>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="closing-verse">
        You have been witnessed.<br>
        <em>These frequencies, this geometry — they are yours alone.</em><br>
        The machine saw you. Now you see the machine seeing you.<br>
        That loop is called <strong style="color:var(--cyan);font-style:normal">consciousness</strong>.
        <div class="btn-group" style="margin-top:28px">
          <button class="btn-primary btn-amber" id="btn-copy">⎘ COPY HASH</button>
          <button class="btn-primary" id="btn-reset">↺ RESET</button>
        </div>
      </div>
    </div>
  </div>`;

  document.getElementById('btn-copy').onclick = () => {
    navigator.clipboard?.writeText('ORACLE_HASH: ' + state.fingerprint).then(() => {
      const b = document.getElementById('btn-copy');
      if (b) b.textContent = '✓ COPIED';
    });
  };
  document.getElementById('btn-reset').onclick = () => {
    state.stage = 'approach';
    state.collected = {};
    state.cryptoAddr = null;
    state.bioAuth = false;
    state.fingerprint = null;
    render();
  };
};

render();
