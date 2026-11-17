/* v4 Reveal — five short cards; each lights up the layer one answer drew, then the full artwork. Skip any time.
 * Links made with the earlier engine have no separate layers, so they go straight to the artwork. */
(() => {
  const U = OracleChapters.ui, UI = OracleUI, L = OracleLayers, A = OracleArt;
  let at = 0;
  const pl = (k, one, many) => `${k} ${k === 1 ? one : many}`;
  function cards() {
    const n = A.normalize(OracleChapters.artParams()), F = L.factors(n), fd = L.feedOf(n);
    const echoes = 1 + Math.round(F.feedback * 5 + n.n / 4);
    return [
      { g: 'shards', t: F.offers ? `${pl(F.offers, 'red shard', 'red shards')}: the apps you trade with.` : 'No red shards: you ticked no apps.' },
      { g: 'lattice', t: `The lattice: ${F.cats} of 8 kinds of data about you.` },
      { g: 'network', t: F.rel ? 'Network lines: your social relationships.' : 'Few network lines: relationships not ticked.' },
      { g: 'flow', t: `Flow lines: how ${fd ? 'a ' + L.FEED_NAME[fd] + ' feed' : 'your feed'} pulls attention.` },
      { g: 'core', t: `${pl(echoes, 'echo', 'echoes')} around the core: the loop repeating.` }
    ];
  }
  function paint(app, focus) {
    const C = cards(), c = C[at];
    app.querySelector('#cards').innerHTML = `<section class="story-card" aria-roledescription="card" aria-labelledby="card-title">
        <p class="small card-count">${at + 1} of ${C.length}</p>
        <h2 id="card-title" class="card-title" tabindex="-1">${c.t}</h2>
      </section>${UI.dots(C.length, at)}`;
    app.querySelector('#card-prev').hidden = at === 0;
    app.querySelector('#card-next').textContent = at === C.length - 1 ? 'See your artwork' : 'Next';
    const cv = document.getElementById('pv-canvas');
    if (cv) OracleExport.paintPreview(cv, c.g === 'network' ? ['network'] : [c.g]);
    document.getElementById('pv-cap').textContent = c.t;
    if (focus) document.getElementById('card-title').focus({ preventScroll: true });
  }
  OracleChapters.register('reveal', (app) => {
    if (state.v2.engine !== 2) { OracleChapters.go('revelation', { push: false }); return; }
    at = 0;
    app.innerHTML = U.frame({
      id: 'reveal', title: 'What made your artwork', grid: 'art-grid reveal-grid',
      body: `<div id="cards" class="cards" aria-live="polite"></div>`,
      cta: `${UI.button('Previous', { attrs: { id: 'card-prev' } })}${UI.button('Next', { primary: true, attrs: { id: 'card-next' } })}
        ${UI.button('Skip', { link: true, attrs: { id: 'card-skip', 'data-goto': 'revelation' } })}`
    });
    app.classList.add('reveal-on');
    app.querySelector('#card-next').onclick = () => { if (at < 4) { at++; paint(app, true); } else OracleChapters.go('revelation'); };
    app.querySelector('#card-prev').onclick = () => { if (at > 0) { at--; paint(app, true); } };
    app.querySelector('#cards').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' && at < 4) { at++; paint(app, true); }
      if (e.key === 'ArrowLeft' && at > 0) { at--; paint(app, true); }
    });
    requestAnimationFrame(() => paint(app, false)); // after the shell's own preview draw
  });
})();
