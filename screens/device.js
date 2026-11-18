/* v5 Step 3 · Device — optional, skippable in one tap. Sub-states inside one screen (Back walks them):
 *   ask      3a: "Want to see what yours says?"  [Show me] [Skip]       — nothing is read before Show me
 *   readout  3b: six grouped rows of what any site can read, ⓘ = what, which API, why sites read it, art parameter
 *   tilt / loc / mic  3c–3e: one optional card each [Allow] [Not now]; each API is touched only inside its Allow tap. Readings stay in memory (core/device.js); the artwork gets only
 * buckets and a salted digest (core/privacy.js → art/fingerprint.js). */
(() => {
  const U = OracleChapters.ui, UI = OracleUI, esc = U.esc, D = OracleDevice, P = OraclePrivacy, FP = OracleFingerprint;
  let sub = 'ask', busy = false, result = null; // result: the last card's answer, shown once, never stored
  const CARDS = ['tilt', 'loc', 'mic'];
  const CARD = {
    tilt: { title: 'Let the artwork follow your phone?', lead: 'It moves as you hold your phone, only while you\u2019re on this screen. Not saved.' },
    loc: { title: 'Use your rough location?', lead: 'We keep only your hemisphere and a 30\u00b0 band, never the exact spot.' },
    mic: { title: 'Listen to the room for 2 seconds?', lead: 'Only how loud it is. Sound is never recorded or saved.' }
  };
  const NO = { denied: 'Not allowed. To change that later, use your browser\u2019s site settings.', unavailable: 'This device or browser doesn\u2019t offer it.' };
  const nextOf = (c) => CARDS[CARDS.indexOf(c) + 1] || null;
  const prevOf = (c) => CARDS[CARDS.indexOf(c) - 1] || 'readout';
  const GROUPS = [
    { id: 'browser', title: 'Browser', items: ['browser', 'langs', 'passkey'] },
    { id: 'screen', title: 'Screen', items: ['screen', 'touch', 'scheme'] },
    { id: 'hardware', title: 'Hardware', items: ['cores', 'memory', 'battery'] },
    { id: 'graphics', title: 'Graphics', items: ['gpu', 'webgpu'] },
    { id: 'time', title: 'Time and network', items: ['tz', 'network'] },
    { id: 'render', title: 'Fonts and rendering', items: ['fonts', 'canvas', 'voices'] }
  ];
  const NAME = { browser: 'Browser and system', langs: 'Languages', passkey: 'Passkeys', screen: 'Screen', touch: 'Touch', scheme: 'Display preference',
    cores: 'Processor cores', memory: 'Memory', battery: 'Battery', gpu: 'Graphics chip (WebGL)', webgpu: 'Graphics adapter (WebGPU)', tz: 'Time zone',
    network: 'Connection', fonts: 'Fonts', canvas: 'Canvas drawing', voices: 'Speech voices' };
  const WHY = { browser: 'To adapt pages; with other values it helps recognise a browser.', langs: 'To pick a language; the list and its order also narrow you down.',
    passkey: 'To offer passkey sign-in.', screen: 'To lay out pages; size and pixel ratio also narrow down the device model.', touch: 'To switch to touch controls.',
    scheme: 'To match dark or light mode and respect reduced motion.', cores: 'To size background work; also a common fingerprinting value.',
    memory: 'To send lighter pages to low-memory devices.', battery: 'To save power. Firefox and Safari do not offer it.',
    gpu: 'To choose graphics quality; the model name is a strong fingerprinting value.', webgpu: 'To run graphics and compute on the GPU.',
    tz: 'To show local times.', network: 'To send lighter media on slow connections.', fonts: 'To check which fonts can be used; the set differs between devices.',
    canvas: 'The same drawing comes out slightly different per GPU, driver and fonts; trackers use this.', voices: 'To read text aloud; the voice list differs between systems.' };
  const ART = { browser: 'Not used for the art.', langs: 'Breaks in the outer ridge (in this tab).', passkey: 'Not used for the art.',
    screen: 'Ridge spacing and line weight (in this tab); part of the digest.', touch: 'Ridge endings drawn as dots (in this tab); part of the digest.',
    scheme: 'Which ridge is filled (in this tab); part of the digest.', cores: 'Number of ridge loops, 3\u20137. The band goes in the bucket code if you share your pattern.',
    memory: 'Ridge thickness (in this tab); part of the digest.', battery: 'Glow strength, in this tab only.',
    gpu: 'Ridge colour. The GPU family goes in the bucket code if you share your pattern.', webgpu: 'Helps name the GPU family.',
    tz: 'Turns the ring 15\u00b0 per hour. The hour goes in the bucket code if you share your pattern.', network: 'Dash rhythm (in this tab); part of the digest.',
    fonts: 'Ridge texture (in this tab); the font set is part of the digest.', canvas: 'Part of the digest (ridge shape).', voices: 'Not used for the art.' };
  const STATE_TEXT = { ok: 'Read', unavailable: 'Not shared by this browser', randomised: 'Randomised by your browser', denied: 'Not allowed' };
  const badge = (st) => `<span class="dev-state dev-${st}">${STATE_TEXT[st] || st}</span>`;
  const passive = () => (D.snapshot().passive || null);
  const short = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '\u2026' : s; };
  const PRE = { battery: 'battery ' };
  const summary = (g, R) => g.items.map(id => R[id]).filter(Boolean).map(e => e.state === 'ok' ? (PRE[e.id] || '') + short(e.value, 34) : e.state === 'randomised' ? 'randomised' : null).filter(Boolean).join(' \u00b7 ') || 'Not shared by this browser';
  const countRead = (R) => Object.values(R || {}).filter(e => e.state === 'ok').length;

  // In-tab ring from this device: buckets + digest for the current seed (per-artwork salt unless Remember is on).
  async function refresh() {
    const S = D.snapshot();
    if (!D.hasAny() || !state.v2.seed) { if (FP.context().mode === 'full') FP.setContext(null); return FP.context(); }
    if (FP.context().mode === 'pattern' && state.v2.fromUrl) return FP.context(); // a link's pattern stays until a new seed
    const pat = await P.pattern(state.v2.seed, S);
    if (!pat) return FP.context();
    return FP.setContext({ mode: 'full', dg: pat.dg, db: { gpu: pat.b.gpu, cores: pat.b.cores, tzh: pat.b.tzh }, b: pat.b });
  }

  function detail(g, R) {
    return g.items.map(id => { const e = R[id]; if (!e) return '';
      return `<h3>${NAME[id]} ${badge(e.state)}</h3>
        <p><b>${esc(e.state === 'ok' || e.state === 'randomised' ? e.value : STATE_TEXT[e.state])}</b>${e.note ? `<br><span class="small">${esc(e.note)}</span>` : ''}</p>
        <p class="small">Read with <code>${esc(e.api)}</code>, no prompt.</p>
        <p><b>Why sites read it:</b> ${WHY[id]}<br><b>In your artwork:</b> ${ART[id]}</p>`; }).join('') +
      `<p class="small">Shown only in this tab. Nothing here is sent anywhere or saved.</p>`;
  }

  function askBody() {
    return `<p class="small">Optional. Skip and your artwork gets a plain ring.</p>`;
  }
  function readoutBody(R) {
    const rows = GROUPS.map(g => `<div class="dev-row"><dt>${g.title}</dt><dd><span>${esc(summary(g, R))}</span>
      <button type="button" class="info" data-dev-info="${g.id}" aria-haspopup="dialog" aria-label="Details: ${g.title}">i</button></dd></div>`).join('');
    return `<dl class="dev-list" aria-label="What this browser shares">${rows}</dl>
      <p class="small" id="dev-count">${countRead(R)} readings. None left this tab.</p>
      <p class="small"><button type="button" class="btn-link" id="dev-forget">Forget everything</button></p>`;
  }

  function cardBody(c) {
    if (!result) return `<p class="small">Optional. Skip it and nothing is asked.</p>`;
    const r = result, ok = r.state === 'ok';
    let t = !ok ? NO[r.state] || NO.unavailable
      : c === 'tilt' ? (OracleChapters.reduceMotion() ? 'Allowed. Motion is reduced on this device, so use the slider instead.' : 'Allowed. Tilt your phone: the preview follows. Nothing is kept.')
      : c === 'loc' ? `Read once: ${r.shown}. Kept: ${D.BAND_LABEL[r.band]} band, ${r.hemi === 'N' ? 'north' : 'south'}. The coordinates are gone.`
      : `Level: ${r.level} (${r.dbfs} dBFS over 2 s). Kept: \u201c${r.level}\u201d. Nothing recorded.`;
    const slider = c === 'tilt' && ok && OracleChapters.reduceMotion() ? `<p><label for="tilt-slider">Tilt the preview</label><br><input type="range" id="tilt-slider" min="-30" max="30" value="0"></p>` : '';
    return `<p role="status" id="perm-result">${esc(t)}</p>${slider}`;
  }
  function tiltTo(gamma, beta) {
    const c = document.getElementById('pv-canvas'); if (!c) return;
    const gx = Math.max(-30, Math.min(30, gamma || 0)), by = Math.max(-30, Math.min(30, (beta || 0) - 45));
    c.style.transform = `perspective(600px) rotateY(${(gx / 3).toFixed(1)}deg) rotateX(${(-by / 3).toFixed(1)}deg)`;
  }
  async function allow(app, c) {
    if (busy) return; busy = true; paint(app, false);
    try {
      if (c === 'tilt') result = await D.requestTilt(OracleChapters.reduceMotion() ? null : (p) => tiltTo(p.gamma, p.beta));
      if (c === 'loc') { result = await D.readLocation(); await refresh(); }
      if (c === 'mic') { result = await D.readMic(2000); await refresh(); }
    } catch (e) { result = { state: 'unavailable' }; }
    busy = false; if (state.stage === 'device' && sub === c) paint(app, true);
  }
  function leaveCard(app, c) { if (c === 'tilt') D.stopTilt(); result = null; const n = nextOf(c); if (n) { sub = n; paint(app, true); } else { D.stopAll(); OracleChapters.go('machine'); } }

  function paint(app, focus) {
    const R = passive();
    if (sub !== 'ask' && !R) sub = 'ask';
    if (CARDS.includes(sub)) return paintCard(app, focus);
    const ask = sub === 'ask';
    app.innerHTML = U.frame({
      id: 'device',
      title: ask ? 'What does your device say?' : 'Any website could read this',
      lead: ask ? 'Every website can read things about your device without asking. Want to see what yours says? Nothing leaves this tab.' : 'No prompt, no permission.',
      caption: ask ? 'Your artwork so far' : FP.describe(FP.context()),
      body: ask ? askBody() : readoutBody(R),
      cta: ask ? `${UI.button(busy ? 'Reading\u2026' : 'Show me', { primary: true, attrs: { id: 'dev-show', disabled: busy } })}${UI.button('Skip', { link: true, attrs: { id: 'dev-skip' } })}`
        : UI.button('Next', { primary: true, attrs: { id: 'dev-next' } })
    });
    const back = app.querySelector('[data-back]');
    if (back && !ask) { back.removeAttribute('data-back'); back.onclick = (e) => { e.preventDefault(); sub = 'ask'; paint(app, true); }; }
    if (ask) {
      app.querySelector('#dev-show').onclick = () => show(app);
      app.querySelector('#dev-skip').onclick = () => { D.stopAll(); OracleChapters.go('machine'); };
    } else {
      app.querySelector('#dev-next').onclick = () => { result = null; sub = 'tilt'; paint(app, true); };
      app.querySelectorAll('[data-dev-info]').forEach(b => b.onclick = () => { const g = GROUPS.find(x => x.id === b.dataset.devInfo); OracleSheet.open({ title: g.title, html: detail(g, passive()), from: b }); });
      app.querySelector('#dev-forget').onclick = () => forget(app);
    }
    U.drawPreview();
    if (focus) { const h = app.querySelector('h1'); if (h) h.focus({ preventScroll: true }); }
  }

  function paintCard(app, focus) {
    const c = sub, C = CARD[c], done = !!result;
    app.innerHTML = U.frame({
      id: 'device', title: C.title, lead: C.lead, caption: FP.describe(FP.context()), body: cardBody(c),
      cta: done ? UI.button('Next', { primary: true, attrs: { id: 'perm-next' } })
        : `${UI.button(busy ? (c === 'mic' ? 'Listening\u2026' : 'Asking\u2026') : 'Allow', { primary: true, attrs: { id: 'perm-allow', disabled: busy } })}${UI.button('Not now', { link: true, attrs: { id: 'perm-skip' } })}`
    });
    const back = app.querySelector('[data-back]');
    if (back) { back.removeAttribute('data-back'); back.onclick = (e) => { e.preventDefault(); if (c === 'tilt') D.stopTilt(); result = null; sub = prevOf(c); paint(app, true); }; }
    const a = app.querySelector('#perm-allow'); if (a) a.onclick = () => allow(app, c);
    const k = app.querySelector('#perm-skip'); if (k) k.onclick = () => leaveCard(app, c);
    const n = app.querySelector('#perm-next'); if (n) n.onclick = () => leaveCard(app, c);
    const sl = app.querySelector('#tilt-slider'); if (sl) sl.oninput = () => tiltTo(+sl.value, 45);
    U.drawPreview();
    if (focus) { const h = app.querySelector(done ? '#perm-result' : 'h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
  }

  async function show(app) {
    if (busy) return; busy = true; paint(app, false);
    try { D.allowPassive(); await D.readPassive(); await refresh(); sub = 'readout'; }
    catch (e) { sub = 'ask'; }
    busy = false; if (state.stage === 'device') paint(app, true);
  }
  function forget(app) {
    P.forgetEverything(); FP.setContext(null); sub = 'ask';
    paint(app, true);
    const s = app.querySelector('.screen-main'); if (s) s.insertAdjacentHTML('afterbegin', '<p class="small" role="status">Forgotten. Browser permissions you granted stay until you reset them in your browser\u2019s site settings.</p>');
  }

  OracleChapters.register('device', (app) => { if (sub !== 'ask' && !passive()) sub = 'ask'; if (CARDS.includes(sub) && !busy) result = null; paint(app, false); });
  window.OracleDeviceStep = { refresh, GROUPS, NAME, reset: () => { sub = 'ask'; result = null; } };
})();
