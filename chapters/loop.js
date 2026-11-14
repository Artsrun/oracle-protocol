/* 04 THE FEEDBACK LOOP — attention laboratory. A transparent toy ranker over fictional items. */
(() => {
  const E = OracleEvidence, C = OracleContent, U = OracleChapters.ui;
  let sim = null;
  const fresh = () => C.LAB_ITEMS.map(it => ({ ...it, soc: 0.1, rep: 0, rec0: it.rec }));

  // ── the model (pure) ─────────────────────────────────────────────────────
  const weights = (L) => ({ we: L.e / 100, wr: L.r / 100, wc: L.w / 100, wt: L.t / 100, wk: L.k / 100, g: 1 + 4 * L.a / 100 });
  function rank(items, L) {
    const W = weights(L);
    const scored = items.map(it => ({ it, score: 0.01 + W.we * it.emo + W.wr * it.rel + W.wc * it.rec + W.wt * it.rep + W.wk * it.soc }));
    const pow = scored.map(s => Math.pow(s.score, W.g));
    const sum = pow.reduce((a, b) => a + b, 0);
    scored.forEach((s, i) => { s.share = pow[i] / sum; });
    return scored.sort((a, b) => b.share - a.share);
  }
  function step(items, L) {
    const r = rank(items, L), n = items.length;
    for (const s of r) {
      s.it.soc = Math.min(1, 0.5 * s.it.soc + 0.5 * Math.min(1, s.share * n / 3)); // attention → social proof
      s.it.rep = Math.min(1, s.it.rep + s.share * 2);                              // shown → repeated
      s.it.rec = s.it.rec * 0.85;                                                 // time passes
    }
  }
  function metrics(r) {
    const shares = r.map(s => s.share).sort((a, b) => a - b), n = shares.length;
    let g = 0; shares.forEach((x, i) => { g += (2 * (i + 1) - n - 1) * x; });
    return { top3: r.slice(0, 3).reduce((a, s) => a + s.share, 0), gini: g / (n * shares.reduce((a, b) => a + b, 0)), emo: r.reduce((a, s) => a + s.share * s.it.emo, 0) };
  }

  const pct = (x) => (x * 100).toFixed(1) + '%';
  const pct0 = (x) => Math.round(x * 100) + '%';
  // WP3: three presets first; the six raw weights are for the curious. Values measured with window.OracleLab
  // (top-3 share round 0 → 4): Newest first 46% → 46%, For you 42% → 48%, Most engaging 69% → 92%.
  const PRESETS = [
    { id: 'newest', name: 'Newest first', v: { e: 0, r: 0, w: 100, t: 0, k: 0, a: 0 }, art: 'Newest first: fewer flow lines, less swirl.' },
    { id: 'foryou', name: 'For you', v: { e: 20, r: 90, w: 30, t: 20, k: 30, a: 30 }, art: 'For you: flow lines pulled toward one point.' },
    { id: 'engaging', name: 'Most engaging', v: { e: 90, r: 30, w: 30, t: 60, k: 80, a: 80 }, art: 'Most engaging: dense flow lines, strong swirl.' }
  ];
  const presetOf = (L) => PRESETS.find(p => Object.keys(p.v).every(k => L[k] === p.v[k]));
  function sentence(L) {
    const r = rank(sim, L), m = metrics(r);
    const lead = L.n === 0 ? 'Before any rounds' : `After ${L.n} ${L.n === 1 ? 'round' : 'rounds'}`;
    return { top3: m.top3, html: `${lead}, the top 3 posts take <b>${pct0(m.top3)}</b> of all attention. Top post: ${r[0].it.title}.` };
  }
  function feedHtml(L) {
    const r = rank(sim, L);
    return `<ol class="feed">${r.map((s, i) => `<li title="emotion ${s.it.emo.toFixed(2)} \u00b7 relevance ${s.it.rel.toFixed(2)} \u00b7 recency ${s.it.rec.toFixed(2)} \u00b7 repetition ${s.it.rep.toFixed(2)} \u00b7 social ${s.it.soc.toFixed(2)}"><span class="rk">#${i + 1}</span><span class="tt">${s.it.title}</span><span class="sh">${pct(s.share)}</span><span class="bar"><i style="width:${Math.min(100, s.share * 100 * 2.5)}%"></i></span></li>`).join('')}</ol>`;
  }
  function formulaHtml(L) {
    const W = weights(L), m = metrics(rank(sim, L));
    return `<p class="claim">Top-3 share ${pct(m.top3)} \u00b7 Gini ${m.gini.toFixed(2)} (0 = attention spread evenly, 1 = one post takes all) \u00b7 emotional load ${pct(m.emo)} (attention-weighted emotion of what is shown) \u00b7 rounds ${L.n}</p>
      <div class="formula">
      <code>score = 0.01 + ${W.we.toFixed(2)}\u00b7emotion + ${W.wr.toFixed(2)}\u00b7relevance + ${W.wc.toFixed(2)}\u00b7recency + ${W.wt.toFixed(2)}\u00b7repetition + ${W.wk.toFixed(2)}\u00b7social</code><br>
      <code>attention share = score^${W.g.toFixed(2)} / \u03a3 score^${W.g.toFixed(2)}</code> &nbsp;(amplification exponent)<br>
      each feedback round: <code>social \u2190 \u00bd\u00b7social + \u00bd\u00b7min(1, share\u00b7N/3)</code>, <code>repetition \u2190 min(1, repetition + 2\u00b7share)</code>, <code>recency \u2190 0.85\u00b7recency</code>
    </div>`;
  }

  // What each lab weight does to the artwork (art/oracle-art.js factors). Recency only feeds the toy ranker.
  const LAB_EFFECT = { e: 'Emotion: flow lines reshaped.', r: 'Relevance: flow lines pulled harder.', w: 'Recency changes the feed, not the artwork.',
    t: 'Repetition: echoes around the core.', k: 'Social proof: network links changed.', a: 'Amplification: swirl changed.' };
  OracleChapters.register('loop', (app) => {
    const L = state.v2.lab;
    if (!sim) { sim = fresh(); for (let i = 0; i < L.n; i++) step(sim, L); }
    const sliders = [['e', 'Emotion'], ['r', 'Relevance'], ['w', 'Recency'], ['t', 'Repetition'], ['k', 'Social proof'], ['a', 'Amplification']];
    const cur = presetOf(L), S = sentence(L);
    app.innerHTML = `<article class="chapter ch-loop">
      ${U.chapterHead('loop',
        'A toy ranker over ten fictional posts. Pick what it rewards, run rounds, watch attention concentrate.',
        'Pick a ranking or run a round to reshape it.')}
      ${U.simNote('Toy model \u2014 not any real algorithm, not evidence of manipulation, not a measurement of you.')}
      <section class="lab" aria-labelledby="lab-title">
        <fieldset class="presets">
          <legend id="lab-title">Rank the feed by</legend>
          <div class="preset-row">${PRESETS.map(p => `<label class="preset"><input type="radio" name="lab-preset" value="${p.id}" ${cur && cur.id === p.id ? 'checked' : ''}><span>${p.name}</span></label>`).join('')}</div>
        </fieldset>
        <p class="lab-sentence" id="lab-sentence" aria-live="polite" data-top3="${S.top3}">${S.html}</p>
        <div id="lab-feed">${feedHtml(L)}</div>
        <div class="btn-row">
          <button type="button" class="btn-sm" id="lab-step">Run a round</button>
          <button type="button" class="btn-sm" id="lab-reset">Reset rounds</button>
        </div>
        ${U.more('Adjust the ranker yourself', `<div class="lab-sliders">${sliders.map(([k, n]) => U.slider(k, n, L[k])).join('')}</div>`, 'lab-adjust')}
        ${U.more('Model rules', `<div id="lab-formula">${formulaHtml(L)}</div>`, null, ['SIMULATED'])}
      </section>
      <section class="panel" aria-labelledby="lab-ev">
        <h2 id="lab-ev" class="panel-title">What the evidence says</h2>
        ${E.claim('VERIFIED', 'A randomized experiment on ~2 million Twitter accounts: personalised ranking amplified some political content versus a chronological feed.', ['huszar22'])}
        ${E.claim('VERIFIED', 'EU very large platforms must offer a feed not based on profiling \u2014 a real-world counterpart to Newest first.', ['dsa38'])}
        ${U.more('More evidence', E.claim('VERIFIED', 'The same study did not find far-left or far-right groups amplified more than moderates.', ['huszar22']) +
          E.claim('VERIFIED', 'Each moral-emotional word was linked to ~20% more diffusion across 563,312 posts \u2014 an association, not proof a ranker causes it.', ['brady17']) +
          E.claim('VERIFIED', 'X\u2019s published For You pipeline uses explicit (likes, replies) and implicit (profile visits, clicks) signals.', ['x-algo']) +
          E.claim('INFERRED', 'When attention feeds ranking, early leads compound. How strongly any platform does this is not public.'), null, ['VERIFIED', 'INFERRED'])}
      </section>
      ${U.chapterNav('revelation')}
    </article>`;

    const refresh = () => {
      const S = sentence(L), el = document.getElementById('lab-sentence');
      el.innerHTML = S.html; el.dataset.top3 = S.top3;
      document.getElementById('lab-feed').innerHTML = feedHtml(L);
      document.getElementById('lab-formula').innerHTML = formulaHtml(L);
      const p = presetOf(L);
      app.querySelectorAll('[name=lab-preset]').forEach(r => { r.checked = !!p && r.value === p.id; });
    };
    const syncSliders = () => app.querySelectorAll('.lab-sliders input[type=range]').forEach(inp => { inp.value = L[inp.dataset.key]; document.getElementById('out-' + inp.dataset.key).textContent = inp.value; });
    app.querySelectorAll('.lab-sliders input[type=range]').forEach(inp => inp.oninput = () => {
      L[inp.dataset.key] = +inp.value;
      document.getElementById('out-' + inp.dataset.key).textContent = inp.value;
      refresh(); U.drawPreview(LAB_EFFECT[inp.dataset.key]);
    });
    app.querySelectorAll('[name=lab-preset]').forEach(r => r.onchange = () => {
      const p = PRESETS.find(x => x.id === r.value); if (!p || !r.checked) return;
      Object.assign(L, p.v); syncSliders(); refresh(); U.drawPreview(p.art);
    });
    const run = (k) => { for (let i = 0; i < k; i++) { step(sim, L); L.n = Math.min(12, L.n + 1); } refresh(); U.drawPreview(`Round ${L.n}: more echoes around the core.`); };
    document.getElementById('lab-step').onclick = () => run(1);
    document.getElementById('lab-reset').onclick = () => { sim = fresh(); L.n = 0; refresh(); U.drawPreview('Rounds reset: echoes cleared.'); };
  });
  window.OracleLab = { rank, step, metrics, fresh, PRESETS }; // exposed for QA
})();
