/* v4 Step 4 · Feed — pick the feed you scroll; "Let it run" shows attention concentrating (SIMULATED toy model);
 * Tune opens the six weights in the sheet. Each choice changes only the flow lines and core echoes of the art. */
(() => {
  const U = OracleChapters.ui, UI = OracleUI, E = OracleEvidence, K = OracleRanker, S = OracleState;
  const FEEDS = [
    { id: 'newest', icon: 'arrow-down-wide-narrow', title: 'Newest first', sub: 'Posts in time order.', art: 'Newest first: few, loose flow lines.' },
    { id: 'foryou', icon: 'sparkles', title: 'For you', sub: 'Picked from what you like.', art: 'For you: flow lines pulled to one point.' },
    { id: 'engaging', icon: 'flame', title: 'Most engaging', sub: 'Picked to keep you watching.', art: 'Most engaging: dense lines, strong swirl.' }
  ];
  const RUN = 4;
  const SLIDERS = [['e', 'Emotion'], ['r', 'Relevance'], ['w', 'Recency'], ['t', 'Repetition'], ['k', 'Social proof'], ['a', 'Amplification']];
  const pct = (x) => Math.round(x * 100) + '%';
  const result = (L) => {
    const now = K.after(L);
    return L.n ? `After ${L.n} ${L.n === 1 ? 'round' : 'rounds'}, the top 3 posts get <b>${pct(now.top3)}</b> of attention.`
      : `The top 3 posts get <b>${pct(now.top3)}</b> of attention.`;
  };
  const evidence = () => `${E.claim('VERIFIED', 'A randomized experiment on ~2 million Twitter accounts: personalised ranking amplified some political content versus a chronological feed.', ['huszar22'])}
    ${E.claim('VERIFIED', 'The same study did not find far-left or far-right groups amplified more than moderates.', ['huszar22'])}
    ${E.claim('VERIFIED', 'EU very large platforms must offer a feed not based on profiling \u2014 a real-world counterpart to Newest first.', ['dsa38'])}
    ${E.claim('VERIFIED', 'Each moral-emotional word was linked to ~20% more diffusion across 563,312 posts \u2014 an association, not proof a ranker causes it.', ['brady17'])}
    ${E.claim('VERIFIED', 'X\u2019s published For You pipeline uses explicit (likes, replies) and implicit (profile visits, clicks) signals.', ['x-algo'])}
    ${E.claim('INFERRED', 'When attention feeds ranking, early leads compound. How strongly any platform does this is not public.')}`;
  const feedList = (L) => `<ol class="feed-list">${K.after(L).ranked.map((s, i) => `<li><span>${i + 1}. ${s.it.title}</span><b>${pct(s.share)}</b></li>`).join('')}</ol>`;
  const tuneHtml = (L) => `<p>${E.badge('SIMULATED')} A toy ranker over ten made-up posts \u2014 not any real algorithm, not a measurement of you.</p>
    ${SLIDERS.map(([k, n]) => `<div class="tune-row"><label for="tune-${k}">${n}</label><output id="tune-${k}-out" for="tune-${k}">${L[k]}</output>
      <input type="range" id="tune-${k}" data-tune="${k}" min="0" max="100" step="1" value="${L[k]}"></div>`).join('')}
    <p id="tune-result" aria-live="polite">${result(L)}</p>
    <h3>The feed now</h3><div id="tune-feed">${feedList(L)}</div>
    <h3>Model rules</h3><p class="small">score = 0.01 + emotion\u00b7w + relevance\u00b7w + recency\u00b7w + repetition\u00b7w + social\u00b7w; attention share = score^(1 + 4\u00b7amplification) / sum. Each round, attention raises social proof and repetition; recency fades.</p>`;

  OracleChapters.register('loop', (app) => {
    const v = state.v2, cur = () => S.presetOf(state.v2.lab);
    app.innerHTML = U.frame({
      id: 'loop', title: 'Which feed do you scroll most?',
      caption: (FEEDS.find(f => f.id === cur()) || { art: 'Pick a feed to shape the flow lines.' }).art,
      body: UI.radioCards({ name: 'feed', legend: '<span class="vh">Feed</span>', legendClass: 'legend-vh', items: FEEDS, value: cur() }) +
        `<p class="feed-result" aria-live="polite">${E.badge('SIMULATED')} <span id="feed-result">${result(v.lab)}</span></p>
        <div class="feed-tools">${UI.button(v.lab.n ? 'Reset' : 'Run', { icon: v.lab.n ? 'rotate-ccw' : 'play', attrs: { id: 'feed-run' } })}${UI.button('Tune', { icon: 'sliders-horizontal', attrs: { id: 'feed-tune', 'aria-haspopup': 'dialog' } })}${UI.button('Sources', { link: true, icon: 'book-open', attrs: { id: 'feed-ev', 'aria-haspopup': 'dialog' } })}</div>`,
      cta: UI.button('Next', { primary: true, icon: 'arrow-right', after: true, attrs: { 'data-goto': OracleRouter.next('loop') } })
    });
    const res = () => { document.getElementById('feed-result').innerHTML = result(state.v2.lab); };
    const syncRadios = () => { const id = cur(); app.querySelectorAll('[name=feed]').forEach(r => { r.checked = r.value === id; r.closest('.radio-card').classList.toggle('on', r.checked); }); };
    app.querySelectorAll('[name=feed]').forEach(r => r.addEventListener('change', () => {
      if (!r.checked) return;
      OracleChapters.dispatch({ type: 'feed/pick', id: r.value });
      syncRadios(); res(); U.drawPreview(FEEDS.find(f => f.id === r.value).art);
    }));
    let timer = 0;
    const runBtn = document.getElementById('feed-run');
    runBtn.onclick = () => {
      clearTimeout(timer);
      if (state.v2.lab.n) { OracleChapters.dispatch({ type: 'rounds/reset' }); runBtn.innerHTML = UI.ic('play') + 'Run'; res(); U.drawPreview('Rounds reset: echoes cleared.'); return; }
      runBtn.innerHTML = UI.ic('rotate-ccw') + 'Reset';
      const tick = () => {
        OracleChapters.dispatch({ type: 'rounds/run', k: 1 }); res();
        U.drawPreview(`Round ${state.v2.lab.n}: one more echo around the core.`);
        if (state.v2.lab.n < RUN) timer = setTimeout(tick, OracleChapters.reduceMotion() ? 0 : 350);
      };
      tick();
    };
    // v8 WP3: the seven "How the loop works" cards left the main path; they open from here.
    document.getElementById('feed-ev').onclick = (e) => OracleSheet.open({ title: 'What the evidence says', from: e.currentTarget,
      html: `<ul class="opt-rows"><li><button type="button" class="opt-rowbtn" id="feed-how">${UI.ic('book-open')}How the loop works \u00b7 7 cards</button></li></ul>${evidence()}`,
      onOpen: (body) => { body.querySelector('#feed-how').onclick = () => { OracleSheet.close(); OracleChapters.go('machine'); }; } });
    document.getElementById('feed-tune').onclick = (e) => OracleSheet.open({
      title: 'Tune the ranker', html: tuneHtml(state.v2.lab), from: e.currentTarget,
      onOpen: (body) => body.querySelectorAll('[data-tune]').forEach(inp => inp.addEventListener('input', () => {
        OracleChapters.dispatch({ type: 'tune/set', key: inp.dataset.tune, value: +inp.value });
        body.querySelector('#tune-' + inp.dataset.tune + '-out').textContent = inp.value;
        body.querySelector('#tune-result').innerHTML = result(state.v2.lab);
        body.querySelector('#tune-feed').innerHTML = feedList(state.v2.lab);
        syncRadios(); res(); U.drawPreview();
      })),
      onClose: () => { syncRadios(); res(); }
    });
  });
})();
