/* v4 Step 2 · Footprint — pre-filled from the Trade answers (our assumption, said on screen); the visitor corrects it. */
(() => {
  const C = OracleContent, U = OracleChapters.ui, UI = OracleUI, E = OracleEvidence;
  const ICONS = { identity: 'user', location: 'map-pin', relationships: 'users', interests: 'heart', purchases: 'shopping-bag', conversations: 'messages-square', surroundings: 'eye', attention: 'mouse-pointer-click' }; // v8 WP2
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
        items: C.FOOTPRINT.map((c, i) => ({ title: c.name, icon: ICONS[c.id], on: (v.footprint >> i) & 1 })) }),
      cta: UI.button('Next', { primary: true, icon: 'arrow-right', after: true, attrs: { 'data-goto': 'device' } }) + UI.button('Why these?', { link: true, icon: 'circle-help', iconCls: 'i-sm', attrs: { id: 'why-fp', 'aria-haspopup': 'dialog' } })
    });
    app.querySelectorAll('[data-fp]').forEach(b => b.addEventListener('change', () => {
      OracleChapters.dispatch({ type: 'footprint/toggle', i: +b.dataset.fp, on: b.checked });
      b.closest('.check-row').classList.toggle('on', b.checked);
      U.drawPreview(cap(count()));
    }));
    // v6 WP3: one sheet — how we guessed, then a row per kind (each opens its evidence; Back returns here)
    document.getElementById('why-fp').onclick = (e) => OracleSheet.open({ title: 'Why these?', from: e.currentTarget,
      html: `<h3>How we guessed</h3>${why()}<h3>Each kind</h3>` + UI.whyRows('fp', C.FOOTPRINT.map(c => c.name), C.FOOTPRINT.map(c => ICONS[c.id])),
      onOpen: (body) => UI.bindWhyRows(body, (i) => ({ title: C.FOOTPRINT[i].name, html: detail(C.FOOTPRINT[i]) })) });
  });
})();
