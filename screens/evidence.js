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
  window.OracleEvidenceSheet = { openSource, claim, sourceHtml };
})();
