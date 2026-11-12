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
      return route;
    }
    if (route === 'protocol') return 'handshake';
    if (ROUTES.includes(route)) return route;
    return 'approach';
  }

  function boot() {
    buildDrawer();
    document.getElementById('phase-rail').addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]');
      if (b) go(b.dataset.go);
    });
    window.addEventListener('popstate', () => { state.stage = fromLocation(); render(); });
    document.addEventListener('click', (e) => {
      const c = e.target.closest('.cite');
      if (c) { e.preventDefault(); openDrawer(c.dataset.source, c); }
      const g = e.target.closest('[data-goto]');
      if (g) { e.preventDefault(); go(g.dataset.goto); }
    });
    state.stage = fromLocation();
    render();
  }

  // ── shared templates ────────────────────────────────────────────────────
  const esc = E.esc;
  const chapterHead = (n, title, lead) => `
    <header class="ch-head">
      <div class="stage-label">CHAPTER ${n}</div>
      <h1 class="ch-title">${title}</h1>
      ${lead ? `<p class="ch-lead">${lead}</p>` : ''}
    </header>`;
  const chapterNav = (prev, next) => {
    const P = PHASES.find(p => p.id === prev), N = PHASES.find(p => p.id === next);
    return `<nav class="ch-nav" aria-label="Chapter navigation">
      ${P ? `<button type="button" class="btn-primary btn-ghost" data-goto="${P.id}">\u2190 ${P.n} ${P.label}</button>` : '<span></span>'}
      ${N ? `<button type="button" class="btn-primary btn-amber" data-goto="${N.id}">${N.n} ${N.label} \u2192</button>` : ''}
    </nav>`;
  };
  const slider = (id, name, value, hint, extra) => `
    <div class="slider">
      <label for="sl-${id}"><span>${name}</span><output id="out-${id}" for="sl-${id}">${value}</output></label>
      <input type="range" id="sl-${id}" data-key="${id}" min="0" max="100" step="1" value="${value}" ${extra || ''}>
      ${hint ? `<small>${hint}</small>` : ''}
    </div>`;
  const simNote = (text) => `<p class="sim-note">${E.badge('SIMULATED')} ${text || 'Illustrative model \u2014 not a measurement of you, not a real privacy-risk score, not any company\u2019s algorithm.'}</p>`;

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
      <p class="drawer-meta">All ${E.SOURCES.length} sources were opened while building this release (accessed ${E.ACCESSED}). Where a publisher blocks automated access, the canonical link is shown and the copy actually read is listed as \u201cread via\u201d. Court complaints are allegations, not findings.</p>
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
    ui: { chapterHead, chapterNav, slider, simNote, esc }
  };
})();
