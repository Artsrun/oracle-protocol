/* ORACLE PROTOCOL v4 — shell: router, answers, navigation, the screen frame, footer.
 * Classic script (no build). Depends on: core/*, ui/components.js, app-core.js (state, syncHud, PHASES),
 * data/evidence.js, data/content.js. Screens register with OracleChapters.register(id, renderFn). */
window.OracleChapters = (() => {
  const E = window.OracleEvidence;
  const registry = {};
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Visitor choices that drive the artwork. v5 rule: your choices, and if you allow it your device's readings, shape the
  // artwork in this tab; readings never leave the tab (only an opt-in salted digest + three coarse buckets may).
  // v4: the initial values come from core/state.js (same field names as v2, so links and art read the same values).
  state.v2 = (() => { const i = OracleState.initial(); return { engine: i.engine, offers: i.offers, footprint: i.footprint, footprintEdited: i.footprintEdited, feed: i.feed, ex: i.ex, lab: i.lab, seed: i.seed, format: i.format, title: i.title, fromUrl: i.fromUrl }; })();

  // The six legacy dials (d…i) follow the ticked trades; they only matter to links on the legacy engine.
  // v4 WP9: the hidden Exchange simulator (?simulator=1) was deleted.
  state.v2.ex = OracleContent.deriveEx(0);

  const ROUTES = PHASES.map(p => p.id).filter(id => id !== 'approach');
  const hashFor = (id) => id === 'approach' ? location.pathname + location.search : '#' + id;

  function go(id, opts) {
    opts = opts || {};
    state.stage = id;
    if (opts.push !== false) {
      const target = opts.hash || hashFor(id);
      // v6 WP8: leaving from inside a sheet replaces the sheet's history entry instead of stacking on it
      const sheetTop = window.OracleSheet && OracleSheet.isSentinel && OracleSheet.isSentinel();
      if (sheetTop) history.replaceState(null, '', id === 'approach' && !opts.hash ? location.pathname + location.search : target);
      else if ((location.hash || '') !== target && !(id === 'approach' && !location.hash)) history.pushState(null, '', target);
    }
    render();
    window.scrollTo(0, 0);
    const h = document.querySelector('#app h1, #app h2');
    if (h && opts.focus !== false) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  function fromLocation() {
    const T = window.OracleTheme || { PALETTES: ['observatory'], TYPES: ['signal'] };
    const L = window.OracleArt ? OracleState.parseHash(location.hash, OracleArt.decode, T) : { route: location.hash.replace(/^#/, '').split('?')[0] };
    const route = L.route;
    if (L.params) {
      const p = L.params;
      Object.assign(state.v2.ex, { d: p.d, c: p.c, p: p.p, y: p.y, x: p.x, i: p.i });
      Object.assign(state.v2.lab, { e: p.e, r: p.r, t: p.t, k: p.k, a: p.a, n: p.n });
      state.v2.offers = p.o; state.v2.footprint = p.f; state.v2.footprintEdited = true; state.v2.seed = p.s; state.v2.fromUrl = true; state.v2.engine = L.engine;
      if (L.fmt) state.v2.format = L.fmt;
      if (L.engine === 3 && window.OracleFingerprint) OracleFingerprint.setContext(OracleFingerprint.parseDevice(L.device ? `dg=${L.device.dg}&db=${L.device.db}` : ''));
      state.v2.look = L.look; // a link's look; #art links without one get the legacy look; plain #revelation follows the site
      return route;
    }
    const S = OracleRouter.byRoute(route);
    if (S && OracleRouter.ALIASES[route]) history.replaceState(null, '', '#' + S.route);
    if (S && S.id !== 'art') return S.id;
    return 'approach';
  }

  // ── colour theme: Auto (device) / Night / Day, persisted by theme-boot.js ──
  function buildThemeSwitch() {
    const T = window.OracleTheme; if (!T) return;
    const wrap = document.createElement('span');
    wrap.className = 'theme-switch';
    wrap.innerHTML = `<label for="theme-select" class="foot-label">Colour theme</label>
      <select id="theme-select" title="Colour theme">
        <option value="auto">Auto</option><option value="dark">Night</option><option value="light">Day</option>
      </select><span class="vh" id="theme-now" aria-live="polite"></span>`;
    const sel = wrap.querySelector('select'), now = wrap.querySelector('#theme-now');
    const sync = () => {
      const c = T.current();
      sel.value = T.pref();
      sel.options[0].textContent = 'Auto \u00b7 ' + (c.mode === 'light' ? 'Day' : 'Night');
      now.textContent = 'Theme: ' + (c.mode === 'light' ? 'Day' : 'Night') + (T.pref() === 'auto' ? ', following this device' : '');
    };
    sel.onchange = () => { if (typeof state !== 'undefined' && state.v2) state.v2.look = null; T.setPref(sel.value); };
    T.onChange(sync); sync();
    document.getElementById('sitefoot').appendChild(wrap); // WP6: theme switch lives in the in-flow footer
  }
  // Hidden dev switch (?themelab): compare palettes and type pairings; writes ?palette=&type= and keeps the hash.
  function buildThemeLab() {
    const T = window.OracleTheme;
    if (!T || !/[?&]themelab\b/.test(location.search)) return;
    const c = T.current(), lab = document.createElement('div');
    lab.className = 'theme-lab'; lab.setAttribute('role', 'group'); lab.setAttribute('aria-label', 'Theme lab');
    const opt = (list, v) => list.map(x => `<option value="${x}" ${x === v ? 'selected' : ''}>${x}</option>`).join('');
    lab.innerHTML = `<label>palette <select data-k="palette">${opt(T.PALETTES, c.palette)}</select></label>
      <label>type <select data-k="type">${opt(T.TYPES, c.type)}</select></label>`;
    lab.addEventListener('change', (e) => {
      const q = new URLSearchParams(location.search); q.set(e.target.dataset.k, e.target.value);
      location.search = q.toString();
    });
    document.body.appendChild(lab);
  }

  // v6 WP11: offline copy of the site's own files (sw.js: same-origin, cache-first). No install prompt or banner:
  // the browser's own install offer is suppressed. ?nosw=1 removes the worker (and its cache) for testing.
  function offline() {
    window.addEventListener('beforeinstallprompt', (e) => e.preventDefault());
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    if (/[?&]nosw=1\b/.test(location.search)) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
      if (window.caches) caches.keys().then((ks) => ks.filter((k) => k.startsWith('oracle-')).forEach((k) => caches.delete(k))).catch(() => {});
      return;
    }
    const reg = () => navigator.serviceWorker.register('sw.js').catch(() => {});
    if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg);
  }
  function boot() {
    offline();
    buildThemeSwitch();
    buildFooter();
    buildThemeLab();
    document.getElementById('phase-rail').addEventListener('click', (e) => {
      const t = e.target.closest('.rail-toggle');
      if (t) { const open = t.getAttribute('aria-expanded') !== 'true'; t.setAttribute('aria-expanded', open); t.parentElement.classList.toggle('open', open); return; }
      const b = e.target.closest('[data-go]');
      if (b) go(b.dataset.go);
    });
    window.addEventListener('popstate', () => {
      if (OracleSheet.onPop && OracleSheet.onPop()) return; // Back closed the sheet (or was our own clean-up)
      OracleSheet.close(); state.stage = fromLocation();
      if (state.stage === 'device' && window.OracleDeviceStep) OracleDeviceStep.fromHistory(history.state && history.state.dev);
      render();
      const h = document.querySelector('#app h1'); // v6 WP8: focus lands on the screen's question after Back
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    });
    document.addEventListener('click', (e) => {
      const c = e.target.closest('.cite[data-source]');
      if (c) { e.preventDefault(); OracleEvidenceSheet.openSource(c.dataset.source, c); }
      const g = e.target.closest('[data-goto]');
      if (g) { e.preventDefault(); go(g.dataset.goto); }
      const bk = e.target.closest('[data-back]'); // v4: Back goes to the previous screen (and keeps the answers)
      if (bk) { e.preventDefault(); go(bk.dataset.back); }
    });
    state.stage = fromLocation();
    render();
  }

  // ── shared templates ────────────────────────────────────────────────────
  const esc = E.esc;
  // ── v4 frame (WP3): top bar (Back · progress · n of 5), art stage, question, body, one in-flow primary action ──
  const backIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function topBar(id) {
    const R = OracleRouter, pr = R.progress(id), prev = R.prev(id);
    return `<div class="screen-top">
      ${prev ? `<button type="button" class="btn-back" data-back="${prev}">${backIcon}Back</button>` : ''}
      ${pr.step ? `${OracleUI.progress(pr.step, pr.total, pr.label)}<span class="step-of">${pr.step} of ${pr.total}</span>` : ''}
    </div>`;
  }
  const artStage = (caption, cls) => `<figure class="art-stage${cls ? ' ' + cls : ''}">
      <canvas id="pv-canvas" width="432" height="540" role="img" aria-label="Your artwork so far"></canvas>
      <figcaption><span id="pv-cap" aria-live="polite">${caption || 'Your artwork so far'}</span></figcaption>
    </figure>`;
  /** frame({ id, title, lead, body, cta, caption }) → one v4 screen. `title` is the screen's one question (h1). */
  const frame = (o) => `<div class="screen v4s s-${o.id}">
      ${topBar(o.id)}
      <div class="screen-grid${o.grid ? ' ' + o.grid : ''}">
        <header class="screen-head"><h1 tabindex="-1">${o.title}</h1>${o.lead ? `<p class="lead">${o.lead}</p>` : ''}</header>
        ${o.noArt ? '' : artStage(o.caption)}
        <div class="screen-main">${o.body || ''}${o.cta ? `<div class="screen-cta">${o.cta}</div>` : ''}</div>
      </div>
    </div>`;
  // Redraw the header preview from the current choices; optionally say what just changed (in visual terms).
  function drawPreview(caption) {
    const c = document.getElementById('pv-canvas');
    if (!c || !window.OracleExport || !OracleExport.paintPreview) return;
    fitArt(); sizeCanvas(c); // v6 WP7: answers can change the text height; keep the preview fitted and sharp
    OracleExport.paintPreview(c);
    if (caption) document.getElementById('pv-cap').textContent = caption;
  }
  // ── v6 WP7: sharp, larger art on phones ──────────────────────────────────────────
  // Backing store = CSS size × min(devicePixelRatio, 3), capped at 1440 × 1800. devicePixelRatio is
  // a rendering read only (as before); nothing from it reaches the artwork's parameters or any link.
  function sizeCanvas(c) {
    if (!c || !c.getClientRects().length) return false;
    const r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.max(1, Math.min(1440, Math.round(r.width * dpr))), h = Math.round(w * 5 / 4);
    if (c.width === w && c.height === h) return false;
    c.width = w; c.height = h; return true;
  }
  // Portrait phones: grow the question-screen preview into the empty band above the button row, up to 34 % of the
  // viewport height and 45 % of its width; never smaller than the CSS size, never pushing Next off-screen.
  function fitArt() {
    const grid = document.querySelector('#app .screen-grid:not(.art-grid)'), c = document.getElementById('pv-canvas');
    if (!grid || !c) return;
    // styles.css's reduced-motion rule gives every property a 0.01 ms transition; without this the measured
    // column would lag one frame behind the value just set.
    grid.style.setProperty('transition', 'none', 'important');
    grid.style.removeProperty('grid-template-columns');
    const W = innerWidth, H = innerHeight;
    if (W >= 900 || W > H) return;
    const screen = grid.closest('.screen'), cta = grid.querySelector('.screen-cta');
    if (!screen || !cta) return;
    const base = c.closest('.art-stage').getBoundingClientRect().width;
    const maxW = Math.min(W * 0.45, H * 0.34 * 0.8);
    if (maxW <= base + 2) return;
    // fits = the screen stays one viewport tall and a 12 px band is left above the button row
    const fits = (w) => { grid.style.gridTemplateColumns = `minmax(0,1fr) ${Math.round(w)}px`;
      const sr = screen.getBoundingClientRect(); if (sr.bottom + scrollY > H + 0.5 && sr.height > H + 0.5) return false;
      let prev = cta.previousElementSibling; while (prev && !prev.getClientRects().length) prev = prev.previousElementSibling;
      return !prev || cta.getBoundingClientRect().top - prev.getBoundingClientRect().bottom >= 12; };
    if (!fits(base)) { grid.style.removeProperty('grid-template-columns'); return; }
    let lo = base, hi = maxW;
    if (fits(hi)) lo = hi; else for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
    if (lo - base < 2) grid.style.removeProperty('grid-template-columns'); else grid.style.gridTemplateColumns = `minmax(0,1fr) ${Math.round(lo)}px`;
  }
  // Re-fit after layout settles (web fonts change line heights) and on resize; repaint only a canvas whose size changed.
  function refit() {
    if (window.OracleSheet && OracleSheet.isOpen()) return; // the keyboard or a sheet: leave the page as it is
    fitArt();
    for (const c of document.querySelectorAll('#pv-canvas, #start-art')) if (sizeCanvas(c)) (c.__paint || drawPreview)();
  }
  let fitT = 0;
  window.addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(refit, 200); });

  // ── footer (Start, Artwork, Extras): Sources · Forget everything · theme, one per row ──
  function buildFooter() {
    const foot = document.getElementById('sitefoot');
    const btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'btn-sources'; btn.className = 'foot-btn';
    btn.textContent = 'Sources'; btn.setAttribute('aria-haspopup', 'dialog');
    btn.onclick = () => OracleEvidenceSheet.openSources(null, btn);
    foot.prepend(btn); // v6 WP5: vertical list — Sources, Forget everything, theme; the duplicate Extras is gone
    const fg = document.createElement('button'); fg.type = 'button'; fg.id = 'foot-forget'; fg.className = 'foot-btn'; fg.textContent = 'Forget everything';
    fg.onclick = () => { forgetEverything(); render(); const n = document.querySelector('#sitefoot .foot-note'); if (n) n.textContent = 'Forgotten. Permissions you granted stay until you reset them in site settings.'; };
    btn.after(fg);
  }
  // v5: one Forget everything (footer, Device step, Options): readings, salt, share mode, Remember, every oracle.* key,
  // the device part of the address. Answers stay in memory (they are never stored); Start over clears them.
  function forgetEverything() {
    if (window.OraclePrivacy) OraclePrivacy.forgetEverything();
    if (window.OracleFingerprint) OracleFingerprint.setContext(null);
    if (window.OracleDeviceStep) OracleDeviceStep.reset();
    if (/[?&]dg=/.test(location.hash)) history.replaceState(null, '', location.hash.replace(/&dg=[^&]*/g, '').replace(/&db=[^&]*/g, ''));
  }

  // v4: every answer goes through the pure reducer in core/state.js; state.v2 is updated in place so the screens
  // that still read it directly see the same object.
  const deps = { deriveEx: (o) => OracleContent.deriveEx(o), prefill: (o) => OracleState.prefillFootprint(o) };
  function dispatch(action) { Object.assign(state.v2, OracleState.reduce(state.v2, action, deps)); return state.v2; }
  function artParams() {
    const v = state.v2;
    return { s: v.seed, o: v.offers, f: v.footprint, ...v.ex, e: v.lab.e, r: v.lab.r, t: v.lab.t, k: v.lab.k, a: v.lab.a, n: v.lab.n };
  }

  return {
    register: (id, fn) => { registry[id] = fn; },
    handles: (stage) => !!registry[stage],
    renderStage: (stage, app) => {
      // WP2: the seed exists from the first chapter on, so every choice can show up in the preview.
      // Random (crypto), never derived from device data.
      if ((ROUTES.includes(stage) || stage === 'reveal') && !state.v2.seed && window.OracleArt) state.v2.seed = OracleArt.newSeed();
      registry[stage](app);
      drawPreview(); // v6 WP7: fits and sizes the preview first, then draws once
      requestAnimationFrame(refit); if (document.fonts) document.fonts.ready.then(refit);
    },
    go, boot, artParams, dispatch, reduceMotion, forgetEverything,
    openDrawer: (id, from) => id === '@who' ? OracleEvidenceSheet.openWho(from) : OracleEvidenceSheet.openSources(id, from),
    ui: { frame, topBar, artStage, drawPreview, esc, sizeCanvas, fitArt }
  };
})();
