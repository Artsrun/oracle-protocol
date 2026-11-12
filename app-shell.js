/* ORACLE PROTOCOL v2 — chapter shell: router, v2 state, navigation, sources drawer.
 * Classic script (no build). Depends on: app-core.js (state, syncHud, PHASES), data/evidence.js, data/content.js.
 * Chapters register with OracleChapters.register(id, renderFn). */
window.OracleChapters = (() => {
  const E = window.OracleEvidence;
  const registry = {};
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Visitor choices that drive simulations + artwork. Abstract values only — never sensor readings.
  state.v2 = {
    offers: 0, footprint: 0,
    ex: { d: 50, c: 50, p: 50, y: 50, x: 50, i: 50 },
    lab: { e: 50, r: 50, t: 30, k: 40, a: 40, n: 0, w: 30 }, // w = recency weight (model only, not artwork)
    seed: null, format: 'portrait', title: true, fromUrl: false
  };

  const ROUTES = ['offer', 'extraction', 'machine', 'loop', 'revelation'];
  const hashFor = (id) => id === 'approach' ? location.pathname + location.search : '#' + id;

  function go(id, opts) {
    opts = opts || {};
    state.stage = id;
    if (opts.push !== false) {
      const target = opts.hash || hashFor(id);
      if ((location.hash || '') !== target && !(id === 'approach' && !location.hash)) history.pushState(null, '', target);
    }
    render();
    window.scrollTo(0, 0);
    const h = document.querySelector('#app h1, #app h2');
    if (h && opts.focus !== false) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  function fromLocation() {
    const h = location.hash.replace(/^#/, '');
    const [route, query] = h.split('?');
    if ((route === 'art' || route === 'revelation') && query && window.OracleArt) {
      const p = OracleArt.decode(query);
      Object.assign(state.v2.ex, { d: p.d, c: p.c, p: p.p, y: p.y, x: p.x, i: p.i });
      Object.assign(state.v2.lab, { e: p.e, r: p.r, t: p.t, k: p.k, a: p.a, n: p.n });
      state.v2.offers = p.o; state.v2.footprint = p.f; state.v2.seed = p.s; state.v2.fromUrl = true;
      const fm = /(?:^|&)fmt=(portrait|story|square|hires)/.exec(query);
      if (fm) state.v2.format = fm[1];
      // Artwork look carried by the link (palette-mode-type). Links without one predate theming: legacy look.
      const g = (k, list) => { const m = new RegExp('(?:^|&)' + k + '=([a-z]+)').exec(query); return m && list.includes(m[1]) ? m[1] : null; };
      const T = window.OracleTheme || { PALETTES: ['observatory'], TYPES: ['signal'] };
      const pal = g('pal', T.PALETTES), th = g('th', ['dark', 'light']), ty = g('ty', T.TYPES);
      if (pal || th || ty) state.v2.look = { pal: pal || 'observatory', th: th || 'dark', ty: ty || 'signal' };
      else if (route === 'art') state.v2.look = { pal: 'observatory', th: 'dark', ty: 'signal' };
      else state.v2.look = null; // plain #revelation?… follows the site theme
      return route;
    }
    if (route === 'protocol') return 'handshake';
    if (route === 'sensors') return 'permissions';
    if (ROUTES.includes(route)) return route;
    return 'approach';
  }

  // ── colour theme: Auto (device) / Night / Day, persisted by theme-boot.js ──
  function buildThemeSwitch() {
    const T = window.OracleTheme; if (!T) return;
    const wrap = document.createElement('span');
    wrap.className = 'theme-switch';
    wrap.innerHTML = `<label for="theme-select" class="vh">Colour theme</label>
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
    document.querySelector('.hud-bar').appendChild(wrap);
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

  function boot() {
    buildThemeSwitch();
    buildDrawer();
    buildThemeLab();
    document.getElementById('phase-rail').addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]');
      if (b) go(b.dataset.go);
    });
    window.addEventListener('popstate', () => { const d = document.getElementById('sources-drawer'); if (d && !d.hidden) closeDrawer(); state.stage = fromLocation(); render(); });
    document.addEventListener('click', (e) => {
      const c = e.target.closest('.cite[data-source]');
      if (c) { e.preventDefault(); openDrawer(c.dataset.source, c); }
      const g = e.target.closest('[data-goto]');
      if (g) { e.preventDefault(); go(g.dataset.goto); }
    });
    state.stage = fromLocation();
    render();
  }

  // ── shared templates ────────────────────────────────────────────────────
  const esc = E.esc;
  const chapterHead = (id, title, lead) => `
    <header class="ch-head">
      <div class="stage-label">${(PHASES.find(p => p.id === id) || { n: '', label: id }).n} \u00b7 ${(PHASES.find(p => p.id === id) || { label: id }).label}</div>
      <h1 class="ch-title">${title}</h1>
      ${lead ? `<p class="ch-lead">${lead}</p>` : ''}
    </header>`;
  // Forward only: going back is the phase rail (one navigation pattern, not two).
  const chapterNav = (next) => {
    const N = PHASES.find(p => p.id === next);
    return N ? `<nav class="ch-nav" aria-label="Next chapter"><button type="button" class="btn-primary" data-goto="${N.id}">Next \u00b7 ${N.n} ${N.label} \u2192</button></nav>` : '';
  };
  const slider = (id, name, value, hint, extra) => `
    <div class="slider">
      <div class="slider-head"><label for="sl-${id}">${name}</label><output id="out-${id}" for="sl-${id}">${value}</output></div>
      <input type="range" id="sl-${id}" data-key="${id}" min="0" max="100" step="1" value="${value}" ${extra || ''}>
      ${hint ? `<small>${hint}</small>` : ''}
    </div>`;
  const simNote = (text) => `<p class="sim-note">${E.badge('SIMULATED')} ${text || 'Illustrative model \u2014 not a measurement of you or any company\u2019s system.'}</p>`;
  // Progressive disclosure: detail lives in <details>; the summary shows the evidence labels inside.
  const more = (summary, body, id, labels) => `<details class="more"${id ? ` id="${id}"` : ''}><summary>${summary}${labels ? ' ' + [...new Set(labels)].map(l => E.badge(l)).join(' ') : ''}</summary><div class="more-body">${body}</div></details>`;

  // ── sources drawer ──────────────────────────────────────────────────────
  let lastFocus = null;
  function buildDrawer() {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'btn-sources'; btn.className = 'hud-sources';
    btn.textContent = 'SOURCES'; btn.setAttribute('aria-haspopup', 'dialog');
    btn.onclick = () => openDrawer(null, btn);
    document.querySelector('.hud-bar').appendChild(btn);

    const d = document.createElement('div');
    d.id = 'sources-drawer'; d.className = 'drawer'; d.hidden = true;
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'drawer-title');
    d.innerHTML = `<div class="drawer-panel">
      <div class="drawer-top"><h2 id="drawer-title">Sources &amp; provenance</h2><button type="button" class="drawer-close" aria-label="Close sources">\u00d7</button></div>
      <dl class="legend">${Object.entries(E.LABELS).map(([k, v]) => `<div><dt>${E.badge(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <p class="drawer-meta">${E.SOURCES.length} sources, each opened on ${E.ACCESSED}. \u201cRead via\u201d = the copy actually read when the publisher blocked access. Complaints are allegations, not findings.</p>
      <ol class="source-list">${E.SOURCES.map(s => `<li id="src-${s.id}" tabindex="-1">
        <div class="src-title">${esc(s.title)}</div>
        <div class="src-meta">${esc(s.publisher)} \u00b7 ${esc(s.date)} \u00b7 ${esc(s.type)}</div>
        <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url)}</a>
        ${s.verifiedVia !== s.url ? `<div class="src-via">read via <a href="${esc(s.verifiedVia)}" target="_blank" rel="noopener noreferrer">${esc(s.verifiedVia.replace(/^https?:\/\//, '').slice(0, 64))}\u2026</a></div>` : ''}
        <p class="src-supports">${esc(s.supports)}</p></li>`).join('')}</ol>
      <p class="drawer-meta">Opening a source link leaves Oracle and loads that publisher\u2019s site; Oracle itself never makes network requests with your data.</p>
    </div>`;
    document.body.appendChild(d);
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('.drawer-close')) closeDrawer(); });
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
      if (e.key === 'Tab') { // focus trap
        const f = [...d.querySelectorAll('button, a[href]')];
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  function openDrawer(sourceId, from) {
    const d = document.getElementById('sources-drawer');
    lastFocus = from || document.activeElement;
    d.hidden = false; document.body.classList.add('drawer-open');
    d.querySelectorAll('.src-hit').forEach(n => n.classList.remove('src-hit'));
    const target = sourceId && document.getElementById('src-' + sourceId);
    if (target) { target.classList.add('src-hit'); target.scrollIntoView({ block: 'center' }); target.focus({ preventScroll: true }); }
    else d.querySelector('.drawer-close').focus();
  }
  function closeDrawer() {
    const d = document.getElementById('sources-drawer');
    d.hidden = true; document.body.classList.remove('drawer-open');
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  function artParams() {
    const v = state.v2;
    return { s: v.seed, o: v.offers, f: v.footprint, ...v.ex, e: v.lab.e, r: v.lab.r, t: v.lab.t, k: v.lab.k, a: v.lab.a, n: v.lab.n };
  }

  return {
    register: (id, fn) => { registry[id] = fn; },
    handles: (stage) => !!registry[stage],
    renderStage: (stage, app) => registry[stage](app),
    go, boot, openDrawer, closeDrawer, artParams, reduceMotion,
    ui: { chapterHead, chapterNav, slider, simNote, more, esc }
  };
})();
