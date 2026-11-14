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

  // v3: the Exchange simulator is hidden unless ?simulator=1. Without it the dials follow the marked exchanges.
  const simulatorOn = /[?&]simulator=1\b/.test(location.search);
  if (!simulatorOn && window.OracleContent && OracleContent.deriveEx) state.v2.ex = OracleContent.deriveEx(0);

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
  // preview: caption text for the live artwork preview (WP2). The preview sits in the header, in page flow.
  const chapterHead = (id, title, lead, preview) => `
    <header class="ch-head${preview ? ' has-preview' : ''}">
      <div class="stage-label">${(PHASES.find(p => p.id === id) || { n: '', label: id }).n} \u00b7 ${(PHASES.find(p => p.id === id) || { label: id }).label}</div>
      <h1 class="ch-title">${title}</h1>
      ${lead ? `<p class="ch-lead">${lead}</p>` : ''}
      ${preview ? `<figure class="preview">
        <canvas id="pv-canvas" width="216" height="270" role="img" aria-label="Your artwork so far"></canvas>
        <figcaption><span class="pv-kicker">Your artwork so far</span><span id="pv-cap" aria-live="polite">${preview}</span></figcaption>
      </figure>` : ''}
    </header>`;
  // Redraw the header preview from the current choices; optionally say what just changed (in visual terms).
  function drawPreview(caption) {
    const c = document.getElementById('pv-canvas');
    if (!c || !window.OracleExport || !OracleExport.paintPreview) return;
    OracleExport.paintPreview(c);
    if (caption) document.getElementById('pv-cap').textContent = caption;
  }
  // Forward only: going back is the phase rail (one navigation pattern, not two). One style in every chapter:
  // the Next button is the screen's filled action; in-chapter actions are outlined.
  const chapterNav = (next) => {
    const N = PHASES.find(p => p.id === next);
    return N ? `<nav class="ch-nav" aria-label="Next chapter"><button type="button" class="btn-primary btn-fill" data-goto="${N.id}">Next \u00b7 ${N.n} ${N.label} \u2192</button></nav>` : '';
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

  // v3: one list-row pattern (checkbox + title + one line + chevron disclosure), like a settings checklist.
  const chevron = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  // A row without `data` is a plain step (number instead of a checkbox), e.g. the Machine stepper (WP4).
  const row = ({ id, data, i, on, title, sub, body, checkLabel, num }) => `
    <li class="row ${on ? 'on' : ''}${data ? '' : ' step'}">
      <div class="row-main">
        ${data ? `<input type="checkbox" class="row-check" id="${id}" ${data}="${i}" ${on ? 'checked' : ''} aria-describedby="${id}-sub">
        <label class="row-text" for="${id}"><span class="row-title">${title}</span><span class="vh"> \u2014 ${checkLabel}</span><span class="row-sub" id="${id}-sub">${sub}</span></label>`
        : `<span class="row-num" aria-hidden="true">${num || ''}</span>
        <div class="row-text" id="${id}"><span class="row-title">${title}</span><span class="row-sub">${sub}</span></div>`}
        ${body ? `<button type="button" class="row-exp" aria-expanded="false" aria-controls="${id}-more" data-row="${i}" aria-label="Details: ${title.replace(/<[^>]+>/g, '')}">${chevron}</button>` : ''}
      </div>
      ${body ? `<div class="row-more" id="${id}-more" hidden>${body}</div>` : ''}
    </li>`;
  // Accordion: one row open at a time. onCheck(i, on) runs on every checkbox change; onToggle(i, open) on disclosure.
  function bindRows(root, data, onCheck, onCount, onToggle) {
    const boxes = [...root.querySelectorAll('[' + data + ']')];
    const count = () => onCount && onCount(boxes.filter(b => b.checked).length, boxes.length);
    boxes.forEach(b => b.addEventListener('change', () => {
      b.closest('.row').classList.toggle('on', b.checked);
      onCheck(+b.getAttribute(data), b.checked); count();
    }));
    root.querySelectorAll('.row-exp').forEach(btn => btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      root.querySelectorAll('.row-exp[aria-expanded=true]').forEach(o => { if (o !== btn) { o.setAttribute('aria-expanded', 'false'); document.getElementById(o.getAttribute('aria-controls')).hidden = true; } });
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.getElementById(btn.getAttribute('aria-controls')).hidden = !open;
      if (onToggle) onToggle(+btn.dataset.row, open);
    }));
    count();
  }
  const tally = (id, unit) => `<div class="tally" aria-live="polite"><span><b id="${id}">0</b> of <span id="${id}-n">0</span> ${unit}</span><span class="meter" aria-hidden="true"><i id="${id}-bar"></i></span></div>`;
  const setTally = (id) => (n, total) => {
    const b = document.getElementById(id); if (!b) return;
    b.textContent = n; document.getElementById(id + '-n').textContent = total;
    document.getElementById(id + '-bar').style.width = (100 * n / total) + '%';
  };

  // ── sources drawer ──────────────────────────────────────────────────────
  let lastFocus = null, relFilter = 'all';
  // WP4: the company directory and documented relations live here (moved from 03 Machine). Nothing deleted.
  const C = window.OracleContent;
  function relRows() {
    const name = (id) => (C.ENTITIES.find(e => e.id === id) || { name: id }).name;
    return C.RELATIONS.filter(r => relFilter === 'all' || r.type === relFilter).map(r =>
      `<tr><td>${name(r.from)}${r.to ? ' \u2192 ' + name(r.to) : ''}</td><td>${r.type}</td><td>${E.badge(r.label)}</td><td>${r.note} ${r.src ? E.cite(r.src) : ''}</td></tr>`).join('')
      || `<tr><td colspan="4">No relation of this type is documented in the sources used.</td></tr>`;
  }
  function whoSection() {
    if (!C || !C.ROLES) return '';
    const types = ['all', ...new Set(C.RELATIONS.map(r => r.type))];
    return `<section class="who" id="drawer-who" tabindex="-1" aria-labelledby="who-title">
      <h3 id="who-title" class="who-title">Who is in this loop</h3>
      <p class="drawer-meta">Roles come from each company\u2019s own documents or a regulator. Two roles do not mean data moves between them.</p>
      <div class="roles">${C.ROLES.map(r => {
        const ents = C.ENTITIES.filter(e => e.roles.includes(r.id));
        return `<div class="role"><h4>${r.name}</h4><ul>${ents.length ? ents.map(e => `<li>${e.name} ${E.cite(e.src)}</li>`).join('') : '<li class="empty">none listed</li>'}</ul></div>`;
      }).join('')}</div>
      ${more(`Documented relations (${C.RELATIONS.length})`, `<div class="seg" role="group" aria-label="Relation type">${types.map(t => `<button type="button" data-filter="${t}" aria-pressed="${t === relFilter}">${t}</button>`).join('')}</div>
      <table class="rel-table"><thead><tr><th>Relation</th><th>Type</th><th>Label</th><th>Evidence</th></tr></thead><tbody id="rel-body">${relRows()}</tbody></table>`, 'm-rel', C.RELATIONS.map(r => r.label))}
    </section>`;
  }
  const bindWho = (d) => d.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {
    relFilter = b.dataset.filter;
    d.querySelectorAll('[data-filter]').forEach(x => x.setAttribute('aria-pressed', x.dataset.filter === relFilter));
    d.querySelector('#rel-body').innerHTML = relRows();
  });
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
      ${whoSection()}
      <p class="drawer-meta">Opening a source link leaves Oracle and loads that publisher\u2019s site; Oracle itself never makes network requests with your data.</p>
    </div>`;
    document.body.appendChild(d);
    bindWho(d);
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
    const target = sourceId && document.getElementById(sourceId === '@who' ? 'drawer-who' : 'src-' + sourceId);
    if (target && sourceId === '@who') { target.scrollIntoView({ block: 'start' }); target.focus({ preventScroll: true }); }
    else if (target) { target.classList.add('src-hit'); target.scrollIntoView({ block: 'center' }); target.focus({ preventScroll: true }); }
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
    renderStage: (stage, app) => {
      // WP2: the seed exists from the first chapter on, so every choice can show up in the preview.
      // Random (crypto), never derived from device data.
      if (ROUTES.includes(stage) && !state.v2.seed && window.OracleArt) state.v2.seed = OracleArt.newSeed();
      registry[stage](app);
      drawPreview();
    },
    go, boot, openDrawer, closeDrawer, artParams, reduceMotion, simulatorOn,
    ui: { chapterHead, drawPreview, chapterNav, slider, simNote, more, esc, row, bindRows, tally, setTally }
  };
})();
