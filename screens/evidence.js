/* v4 evidence in the sheet: a source opens inside the sheet (Back returns), and every [source] button anywhere
 * opens it there. Claims keep their honest labels (VERIFIED needs a source; INFERRED/SIMULATED say what they are). */
(() => {
  const E = OracleEvidence, esc = E.esc;
  const sourceHtml = (s) => `<p><b>${esc(s.title)}</b></p>
    <p class="small">${esc(s.publisher)} \u00b7 ${esc(s.date)} \u00b7 ${esc(s.type)}</p>
    <h3>What it supports here</h3><p>${esc(s.supports)}</p>
    <p class="small">Opened ${esc(E.ACCESSED)}. ${s.verifiedVia !== s.url ? 'Read via a copy because the publisher blocked access.' : ''}</p>
    <p><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">Open the source</a> <span class="small">(leaves Oracle)</span></p>`;
  function openSource(id, from) {
    const s = E.byId[id]; if (!s) return;
    const view = { title: s.short, html: sourceHtml(s), from };
    if (OracleSheet.isOpen()) OracleSheet.push(view); else OracleSheet.open(view);
  }
  // Capture phase: runs before the legacy drawer handler, so a source never opens behind a modal sheet.
  document.addEventListener('click', (e) => {
    const c = e.target.closest('.cite[data-source]');
    if (!c || !document.body.classList.contains('v4')) return;
    e.preventDefault(); e.stopPropagation();
    openSource(c.dataset.source, c);
  }, true);
  const claim = (c) => E.claim(c.label, c.text, c.src);

  // All sources (was the Sources drawer). A source id scrolls to and focuses that entry.
  const sourcesHtml = () => `<dl class="legend">${Object.entries(E.LABELS).map(([k, v]) => `<div><dt>${E.badge(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    <p class="small">${E.SOURCES.length} sources, each opened on ${esc(E.ACCESSED)}. “Read via” = the copy actually read when the publisher blocked access. Complaints are allegations, not findings.</p>
    <ol class="source-list">${E.SOURCES.map(s => `<li id="src-${s.id}" tabindex="-1">
      <p><b>${esc(s.title)}</b></p>
      <p class="small">${esc(s.publisher)} · ${esc(s.date)} · ${esc(s.type)}</p>
      <p><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url.replace(/^https?:\/\//, '').slice(0, 60))}</a>${s.verifiedVia !== s.url ? ` <span class="small">(read via <a href="${esc(s.verifiedVia)}" target="_blank" rel="noopener noreferrer">${esc(s.verifiedVia.replace(/^https?:\/\//, '').slice(0, 40))}…</a>)</span>` : ''}</p>
      <p>${esc(s.supports)}</p></li>`).join('')}</ol>
    <p class="small">Opening a source link leaves Oracle and loads that publisher’s site; Oracle itself never makes network requests.</p>
    <p><button type="button" class="btn-quiet" id="open-who">Who is in this loop</button></p>`;
  function openSources(id, from) {
    OracleSheet.open({ title: 'Sources', html: sourcesHtml(), from, focus: id ? '#src-' + id : null,
      onOpen: (body) => { body.querySelector('#open-who').onclick = () => OracleSheet.push(whoView()); } });
  }
  // Who is in this loop (moved from the drawer): roles from each company's own documents or a regulator.
  let relFilter = 'all';
  function relRows() {
    const C = OracleContent, name = (id) => (C.ENTITIES.find(e => e.id === id) || { name: id }).name;
    return C.RELATIONS.filter(r => relFilter === 'all' || r.type === relFilter).map(r =>
      `<tr><td>${name(r.from)}${r.to ? ' → ' + name(r.to) : ''}</td><td>${r.type}</td><td>${E.badge(r.label)}</td><td>${r.note} ${r.src ? E.cite(r.src) : ''}</td></tr>`).join('')
      || `<tr><td colspan="4">No relation of this type is documented in the sources used.</td></tr>`;
  }
  function whoView() {
    const C = OracleContent, types = ['all', ...new Set(C.RELATIONS.map(r => r.type))];
    return { title: 'Who is in this loop', html: `<p class="small">Roles come from each company’s own documents or a regulator. Two roles do not mean data moves between them.</p>
      <div class="roles">${C.ROLES.map(r => {
        const ents = C.ENTITIES.filter(e => e.roles.includes(r.id));
        return `<div class="role"><h3>${r.name}</h3><ul>${ents.length ? ents.map(e => `<li>${e.name} ${E.cite(e.src)}</li>`).join('') : '<li class="small">none listed</li>'}</ul></div>`;
      }).join('')}</div>
      <h3>Documented relations (${C.RELATIONS.length})</h3>
      <div class="opt-row" role="group" aria-label="Relation type">${types.map(t => `<button type="button" class="btn-quiet" data-filter="${t}" aria-pressed="${t === relFilter}">${t}</button>`).join('')}</div>
      <div class="table-wrap"><table class="rel-table"><thead><tr><th>Relation</th><th>Type</th><th>Label</th><th>Evidence</th></tr></thead><tbody id="rel-body">${relRows()}</tbody></table></div>`,
      onOpen: (body) => body.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {
        relFilter = b.dataset.filter;
        body.querySelectorAll('[data-filter]').forEach(x => x.setAttribute('aria-pressed', x.dataset.filter === relFilter));
        body.querySelector('#rel-body').innerHTML = relRows();
      }) };
  }
  const openWho = (from) => OracleSheet.open({ ...whoView(), from });
  window.OracleEvidenceSheet = { openSource, openSources, openWho, claim, sourceHtml };
})();
