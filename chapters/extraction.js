/* 02 THE EXTRACTION — observed vs inferred vs unknown; footprint checklist; optional live sensor demo (v1.2).
 * v3: everything is vertical. Footprint = one checklist row per category, details in an inline accordion. */
(() => {
  const E = OracleEvidence, C = OracleContent, U = OracleChapters.ui;

  const detail = (c) => `<dl class="kv">
      <dt class="c-obs">OBSERVED</dt><dd>${c.observed}</dd>
      <dt class="c-der">INFERRED</dt><dd>${c.derived}</dd>
      <dt class="c-unk">UNKNOWN</dt><dd>${c.unknown}</dd>
    </dl>
    ${E.claim('INFERRED', '<b>Possible uses:</b> ' + c.use)}
    ${E.claim(c.doc.label, c.doc.text, c.doc.src)}
    ${E.claim(c.controlLabel, '<b>Control:</b> ' + c.control, c.controlSrc)}`;

  OracleChapters.register('extraction', (app) => {
    const granted = Object.values(state.collected || {}).filter(g => g && !g.error).length;
    const denied = Object.values(state.collected || {}).filter(g => g && g.error).length;
    const tried = granted || denied;
    app.innerHTML = `<article class="chapter ch-extraction">
      ${U.chapterHead('extraction', 'Observed, inferred, unknown',
        'Systems record a little and infer a lot. Some of it no outsider can know.')}
      <dl class="kinds" aria-label="Three kinds of information">
        <div><dt class="c-obs">OBSERVED</dt><dd>Recorded directly: clicks, searches, location.</dd></div>
        <div><dt class="c-der">INFERRED</dt><dd>Computed from that: interests, traits, ties.</dd></div>
        <div><dt class="c-unk">UNKNOWN</dt><dd>Who holds copies, for how long, how models weigh you.</dd></div>
      </dl>
      ${U.more('Evidence',
        E.claim('VERIFIED', 'Facebook Likes alone told Democrats from Republicans with 85% accuracy (58,000+ volunteers).', ['kosinski13']) +
        E.claim('VERIFIED', 'No company in the FTC\u2019s 2024 study gave a full list of the third parties it shared personal data with.', ['ftc6b']), 'ex-evidence')}

      <h2 id="fp-title" class="section-title">Your footprint</h2>
      <p class="list-hint">Tick what you\u2019ve shared online. Nothing is read from your device.</p>
      ${U.tally('fp-count', 'shared')}
      <ul class="rows" aria-labelledby="fp-title">
        ${C.FOOTPRINT.map((c, i) => U.row({
          id: 'fp-' + c.id, data: 'data-fp', i, on: (state.v2.footprint >> i) & 1,
          title: c.name, checkLabel: 'I\u2019ve shared this online',
          sub: c.observed.split(', ').reduce((a, x) => (a.join(', ') + x).length < 34 ? a.concat(x) : a, []).join(', ') || c.observed,
          body: detail(c)
        })).join('')}
      </ul>

      <details class="more" id="live-more"${tried ? ' open' : ''}>
        <summary>Live sensor demo (optional)</summary>
        <div class="more-body live-box">
          <p>See what this browser exposes, one permission at a time. Readings stay in this tab and never reach the artwork.
          ${tried ? `<br><b>So far:</b> ${granted} read, ${denied} denied or unavailable.` : ''}</p>
          <div class="btn-row">
            <button type="button" class="btn-sm" id="btn-live">OPEN SENSOR DEMO</button>
            ${granted ? `<button type="button" class="btn-sm" id="btn-witness">VIEW PORTRAIT</button>` : ''}
          </div>
        </div>
      </details>
      ${U.chapterNav('machine')}
    </article>`;

    U.bindRows(app, 'data-fp', (i, on) => {
      if (on) state.v2.footprint |= (1 << i); else state.v2.footprint &= ~(1 << i);
    }, U.setTally('fp-count'));
    document.getElementById('btn-live').onclick = () => { history.pushState(null, '', '#sensors'); state.stage = 'permissions'; render(); };
    const w = document.getElementById('btn-witness');
    if (w) w.onclick = () => { if (!state.collected.base) state.collected.base = harvestBase(); state.fingerprint = generateHash(state.collected); state.stage = 'portrait'; render(); };
  });
})();
