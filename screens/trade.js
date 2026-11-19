/* v4 Step 1 · Trade — one question, six plain choices. v6 WP3: one "Why these?" link opens the sheet with a row per
 * choice; each row opens that choice's evidence (2 taps), with Back to the list. */
(() => {
  const C = OracleContent, U = OracleChapters.ui, UI = OracleUI, E = OracleEvidence;
  // Plain names for the six trades (the evidence text is unchanged; see data/content.js).
  const NAMES = { social: 'Social apps', free: 'Search, maps & mail', ai: 'AI assistants', devices: 'Smart speakers & devices', identity: 'ID or age checks', entertainment: 'Streaming & feeds' };
  const shards = (n) => n === 0 ? 'No trades yet: no red shards.' : `${n} ${n === 1 ? 'trade' : 'trades'}: ${n} red ${n === 1 ? 'shard' : 'shards'}.`;
  const count = () => C.OFFERS.filter((_, k) => (state.v2.offers >> k) & 1).length;
  function detail(o) {
    return `<p><b>You give:</b> ${o.give}.<br><b>You get:</b> ${o.get}.</p>
      <h3>What is documented</h3>${E.claim(o.documented.label, o.documented.text, o.documented.src)}
      <h3>Our reading</h3>${E.claim(o.pattern.label, o.pattern.text)}`;
  }
  OracleChapters.register('offer', (app) => {
    const v = state.v2;
    app.innerHTML = U.frame({
      id: 'offer', title: 'Which do you use?', lead: 'Each trades your data for something you want.',
      caption: shards(count()),
      body: UI.checkList({ name: 'offer', legend: '<span class="vh">Apps and services you use</span>', legendClass: 'legend-vh',
        items: C.OFFERS.map((o, i) => ({ title: NAMES[o.id], on: (v.offers >> i) & 1 })) }),
      cta: UI.button('Next', { primary: true, attrs: { 'data-goto': 'extraction' } }) + UI.button('Why these?', { link: true, attrs: { id: 'why-offer', 'aria-haspopup': 'dialog' } })
    });
    app.querySelectorAll('[data-offer]').forEach(b => b.addEventListener('change', () => {
      OracleChapters.dispatch({ type: 'trade/toggle', i: +b.dataset.offer, on: b.checked });
      b.closest('.check-row').classList.toggle('on', b.checked);
      U.drawPreview(shards(count()));
    }));
    document.getElementById('why-offer').onclick = (e) => OracleSheet.open({ title: 'Why these?', from: e.currentTarget,
      html: `<p>Each of these gives you something and takes data in return. Tap one for what is documented.</p>` +
        UI.whyRows('offer', C.OFFERS.map(o => NAMES[o.id])),
      onOpen: (body) => UI.bindWhyRows(body, (i) => ({ title: NAMES[C.OFFERS[i].id], html: detail(C.OFFERS[i]) })) });
  });
  window.OracleTrade = { NAMES };
})();
