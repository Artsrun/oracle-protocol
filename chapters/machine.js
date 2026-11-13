/* 03 THE MACHINE — transparent systems map + ecosystem roles with typed, sourced relations. */
(() => {
  const E = OracleEvidence, C = OracleContent, U = OracleChapters.ui;
  let active = 0, filter = 'all', timer = 0;

  const N = C.MACHINE.length, CX = 160, CY = 160, R = 118;
  const pos = (i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / N; return [CX + R * Math.cos(a), CY + R * Math.sin(a)]; };
  const triPts = (x, y, s, up) => up ? `${x},${y - s} ${x + s * 0.866},${y + s * 0.5} ${x - s * 0.866},${y + s * 0.5}` : `${x},${y + s} ${x + s * 0.866},${y - s * 0.5} ${x - s * 0.866},${y - s * 0.5}`;

  function loopSvg() {
    const edges = C.MACHINE.map((_, i) => {
      const [x1, y1] = pos(i), [x2, y2] = pos((i + 1) % N);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      return `<line class="ln" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><polygon class="ln" points="${triPts(0, 0, 4, true)}" transform="translate(${mx},${my}) rotate(${ang + 90})"/>`;
    }).join('');
    const nodes = C.MACHINE.map((m, i) => {
      const [x, y] = pos(i), lx = CX + (R + 26) * Math.cos(-Math.PI / 2 + i * 2 * Math.PI / N), ly = CY + (R + 26) * Math.sin(-Math.PI / 2 + i * 2 * Math.PI / N);
      const anchor = Math.abs(lx - CX) < 12 ? 'middle' : lx > CX ? 'start' : 'end';
      return `<polygon class="nd ${i === active ? 'on' : ''}" points="${triPts(x, y, 9, true)}"/><text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="middle">${String(i + 1).padStart(2, '0')} ${m.name.split(' /')[0]}</text>`;
    }).join('');
    const [px, py] = pos(active);
    return `<svg viewBox="-60 -10 440 340" class="loopviz" aria-hidden="true">${edges}${nodes}<polygon class="pulse" points="${triPts(px, py, 4, true)}"/></svg>`;
  }

  function nodeDetail() {
    const m = C.MACHINE[active];
    return `<h3>${String(active + 1).padStart(2, '0')} \u2014 ${m.name}</h3><p>${m.text}</p>${E.claim(m.claim.label, m.claim.text, m.claim.src)}`;
  }

  function relRows() {
    return C.RELATIONS.filter(r => filter === 'all' || r.type === filter).map(r => {
      const name = (id) => (C.ENTITIES.find(e => e.id === id) || { name: id }).name;
      return `<tr><td>${name(r.from)}${r.to ? ' \u2192 ' + name(r.to) : ''}</td><td>${r.type}</td><td>${E.badge(r.label)}</td><td>${r.note} ${r.src ? E.cite(r.src) : ''}</td></tr>`;
    }).join('') || `<tr><td colspan="4">No relation of this type is documented in the sources used.</td></tr>`;
  }

  OracleChapters.register('machine', (app) => {
    clearInterval(timer);
    const types = ['all', ...new Set(C.RELATIONS.map(r => r.type))];
    app.innerHTML = `<article class="chapter ch-machine">
      ${U.chapterHead('machine', 'The loop',
        'A conceptual flow, not any one company\u2019s system. Pick a step.')}
      <section class="panel" aria-label="Systems map">
        <div class="machine-grid">
          <div><div id="loop-svg">${loopSvg()}</div>
            <div class="btn-row"><button type="button" class="btn-sm primary" id="m-play" ${OracleChapters.reduceMotion() ? 'disabled title="Disabled: reduced motion preferred"' : ''}>PLAY THE LOOP</button></div></div>
          <div><ol class="node-list">${C.MACHINE.map((m, i) => `<li><button type="button" class="node-btn" data-node="${i}" aria-pressed="${i === active}">${String(i + 1).padStart(2, '0')} ${m.name}</button></li>`).join('')}</ol>
            <div class="node-detail" id="node-detail" aria-live="polite">${nodeDetail()}</div></div>
        </div>
      </section>

      <section class="panel" aria-labelledby="eco-title">
        <h2 id="eco-title" class="panel-title">Who does what</h2>
        <p class="sim-note">Roles come from each company\u2019s own documents or a regulator. Two roles do not mean data moves between them.</p>
        <div class="roles">${C.ROLES.map(r => {
          const ents = C.ENTITIES.filter(e => e.roles.includes(r.id));
          return `<div class="role"><h3>${r.name}</h3><ul>${ents.length ? ents.map(e => `<li>${e.name} ${E.cite(e.src)}</li>`).join('') : '<li class="empty">none listed</li>'}</ul></div>`;
        }).join('')}</div>
        ${U.more(`Documented relations (${C.RELATIONS.length})`, `<div class="seg" role="group" aria-label="Relation type">${types.map(t => `<button type="button" data-filter="${t}" aria-pressed="${t === filter}">${t}</button>`).join('')}</div>
        <table class="rel-table"><thead><tr><th>Relation</th><th>Type</th><th>Label</th><th>Evidence</th></tr></thead><tbody id="rel-body">${relRows()}</tbody></table>`, 'm-rel', C.RELATIONS.map(r => r.label))}
      </section>
      ${U.chapterNav('loop')}
    </article>`;

    const setActive = (i) => {
      active = (i + N) % N;
      document.getElementById('loop-svg').innerHTML = loopSvg();
      document.getElementById('node-detail').innerHTML = nodeDetail();
      app.querySelectorAll('.node-btn').forEach((b, j) => b.setAttribute('aria-pressed', j === active));
    };
    app.querySelectorAll('.node-btn').forEach(b => b.onclick = () => { clearInterval(timer); setActive(+b.dataset.node); });
    const play = document.getElementById('m-play');
    play.onclick = () => {
      clearInterval(timer);
      let steps = 0;
      timer = setInterval(() => {
        if (state.stage !== 'machine' || ++steps > N) { clearInterval(timer); return; }
        setActive(active + 1);
      }, 1400);
    };
    app.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {
      filter = b.dataset.filter;
      app.querySelectorAll('[data-filter]').forEach(x => x.setAttribute('aria-pressed', x.dataset.filter === filter));
      document.getElementById('rel-body').innerHTML = relRows();
    });
  });
})();
