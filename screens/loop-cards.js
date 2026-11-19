/* v4 Step 3 · Loop — seven tap-through cards (one step each), Skip any time. Evidence opens in the sheet. */
(() => {
  const C = OracleContent, U = OracleChapters.ui, UI = OracleUI, E = OracleEvidence;
  const N = C.MACHINE.length;
  let at = 0;
  const card = (i) => {
    const m = C.MACHINE[i];
    return `<section class="story-card" aria-roledescription="card" aria-labelledby="card-title">
        <p class="small card-count">${i + 1} of ${N}</p>
        <h2 id="card-title" class="card-title">${m.name}</h2>
        <p class="card-text">${m.text}</p>
        <p><button type="button" class="btn-link" id="card-ev" aria-haspopup="dialog">Evidence</button>${i === N - 1 ? ` <button type="button" class="btn-link" id="card-who" aria-haspopup="dialog">Who is in this loop?</button>` : ''}</p>
      </section>`;
  };
  function paint(app, focus) {
    const body = app.querySelector('#cards');
    body.innerHTML = card(at) + UI.dots(N, at);
    app.querySelector('#card-prev').hidden = at === 0;
    const next = app.querySelector('#card-next');
    UI.setLabel(next, at === N - 1 ? 'Next' : 'Next card');
    app.querySelector('#card-skip').hidden = at === N - 1;
    document.getElementById('card-ev').onclick = (e) => { const m = C.MACHINE[at]; OracleSheet.open({ title: m.name, html: E.claim(m.claim.label, m.claim.text, m.claim.src), from: e.currentTarget }); };
    const who = document.getElementById('card-who');
    if (who) who.onclick = (e) => OracleChapters.openDrawer('@who', e.currentTarget);
    if (focus) document.getElementById('card-title').focus({ preventScroll: true });
  }
  OracleChapters.register('machine', (app) => {
    at = 0;
    app.innerHTML = U.frame({
      id: 'machine', title: 'The loop', lead: 'A general model, not one company\u2019s system.',
      caption: 'Your artwork so far',
      body: `<div id="cards" class="cards" aria-live="polite"></div>`,
      cta: `${UI.button('Previous', { icon: 'arrow-left', attrs: { id: 'card-prev' } })}${UI.button('Next card', { primary: true, icon: 'arrow-right', after: true, attrs: { id: 'card-next' } })}
        ${UI.button('Skip', { link: true, icon: 'skip-forward', attrs: { id: 'card-skip', 'data-goto': 'loop' } })}`
    });
    app.querySelector('#card-next').onclick = () => { if (at < N - 1) { at++; paint(app, true); } else OracleChapters.go('loop'); };
    app.querySelector('#card-prev').onclick = () => { if (at > 0) { at--; paint(app, true); } };
    UI.swipe(app.querySelector('#cards'), () => { if (at < N - 1) { at++; paint(app, true); } }, () => { if (at > 0) { at--; paint(app, true); } }); // v6 WP9
    app.querySelector('#cards').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' && at < N - 1) { at++; paint(app, true); }
      if (e.key === 'ArrowLeft' && at > 0) { at--; paint(app, true); }
    });
    paint(app, false);
  });
})();
