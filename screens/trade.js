/* v4 Step 1 · Trade — one question, six plain choices; details and evidence open in the sheet on tap. */
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
        items: C.OFFERS.map((o, i) => ({ title: NAMES[o.id], on: (v.offers >> i) & 1, info: true })) }),
      cta: UI.button('Next', { primary: true, attrs: { 'data-goto': 'extraction' } })
    });
    app.querySelectorAll('[data-offer]').forEach(b => b.addEventListener('change', () => {
      OracleChapters.dispatch({ type: 'trade/toggle', i: +b.dataset.offer, on: b.checked });
      b.closest('.check-row').classList.toggle('on', b.checked);
      U.drawPreview(shards(count()));
    }));
    app.querySelectorAll('[data-info^="offer:"]').forEach(b => b.addEventListener('click', () => {
      const o = C.OFFERS[+b.dataset.info.split(':')[1]];
      OracleSheet.open({ title: NAMES[o.id], html: detail(o), from: b });
    }));
  });
  window.OracleTrade = { NAMES };
})();
