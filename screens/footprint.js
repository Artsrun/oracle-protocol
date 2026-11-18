/* v4 Step 2 · Footprint — pre-filled from the Trade answers (our assumption, said on screen); the visitor corrects it. */
(() => {
  const C = OracleContent, U = OracleChapters.ui, UI = OracleUI, E = OracleEvidence;
  const count = () => C.FOOTPRINT.filter((_, k) => (state.v2.footprint >> k) & 1).length;
  const cap = (n) => `${n} of 8 kinds of data in the lattice.`;
  function detail(c) {
    return `<p><b>Recorded:</b> ${c.observed}.<br><b>Guessed from it:</b> ${c.derived}.<br><b>Not public:</b> ${c.unknown}.</p>
      <h3>What is documented</h3>${E.claim(c.doc.label, c.doc.text, c.doc.src)}
      <h3>Possible uses</h3>${E.claim('INFERRED', c.use)}
      <h3>What you can do</h3>${E.claim(c.controlLabel, c.control, c.controlSrc)}`;
  }
  const why = () => `<p>Our pre-fill links each app type to the data it usually involves, read from the trades you ticked. It is our assumption, not a reading of your device \u2014 nothing is read from it.</p>
    <p><b>Recorded</b> = taken directly (clicks, searches, location). <b>Guessed</b> = computed from that (interests, traits, ties). <b>Not public</b> = who holds copies, for how long.</p>
    <h3>Evidence</h3>
    ${E.claim('VERIFIED', 'Facebook Likes alone told Democrats from Republicans with 85% accuracy (58,000+ volunteers).', ['kosinski13'])}
    ${E.claim('VERIFIED', 'No company in the FTC\u2019s 2024 study gave a full list of the third parties it shared personal data with.', ['ftc6b'])}`;
  OracleChapters.register('extraction', (app) => {
    OracleChapters.dispatch({ type: 'footprint/prefill' }); // only while the visitor has not edited this list
    const v = state.v2, pre = !v.footprintEdited && v.offers;
    app.innerHTML = U.frame({
      id: 'extraction', title: 'What might they know?',
      lead: pre ? 'Pre-ticked from your apps \u2014 our assumption. Change anything.' : 'Tick what apps may know about you.',
      caption: cap(count()),
      body: UI.checkList({ name: 'fp', legend: '<span class="vh">Kinds of data</span>', legendClass: 'legend-vh',
        items: C.FOOTPRINT.map((c, i) => ({ title: c.name, on: (v.footprint >> i) & 1, info: true })) }) +
        `<p class="small"><button type="button" class="btn-link" id="fp-why" aria-haspopup="dialog">How we guessed</button></p>`,
      cta: UI.button('Next', { primary: true, attrs: { 'data-goto': 'device' } })
    });
    app.querySelectorAll('[data-fp]').forEach(b => b.addEventListener('change', () => {
      OracleChapters.dispatch({ type: 'footprint/toggle', i: +b.dataset.fp, on: b.checked });
      b.closest('.check-row').classList.toggle('on', b.checked);
      U.drawPreview(cap(count()));
    }));
    app.querySelectorAll('[data-info^="fp:"]').forEach(b => b.addEventListener('click', () => {
      const c = C.FOOTPRINT[+b.dataset.info.split(':')[1]];
      OracleSheet.open({ title: c.name, html: detail(c), from: b });
    }));
    document.getElementById('fp-why').onclick = (e) => OracleSheet.open({ title: 'How we guessed', html: why(), from: e.currentTarget });
  });
})();
