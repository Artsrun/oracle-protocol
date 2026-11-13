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
  function feedHtml(L) {
    const r = rank(sim, L), m = metrics(r);
    return `<div class="metrics">
        <div class="metric"><span>TOP-3 SHARE</span><b>${pct(m.top3)}</b></div>
        <div class="metric"><span>GINI</span><b>${m.gini.toFixed(2)}</b></div>
        <div class="metric"><span>EMOTIONAL LOAD</span><b>${pct(m.emo)}</b></div>
        <div class="metric"><span>ROUNDS</span><b>${L.n}</b></div>
      </div>
      <ol class="feed">${r.map((s, i) => `<li title="emotion ${s.it.emo.toFixed(2)} \u00b7 relevance ${s.it.rel.toFixed(2)} \u00b7 recency ${s.it.rec.toFixed(2)} \u00b7 repetition ${s.it.rep.toFixed(2)} \u00b7 social ${s.it.soc.toFixed(2)}"><span class="rk">#${i + 1}</span><span class="tt">${s.it.title}</span><span class="sh">${pct(s.share)}</span><span class="bar"><i style="width:${Math.min(100, s.share * 100 * 2.5)}%"></i></span></li>`).join('')}</ol>`;
  }
  function formulaHtml(L) {
    const W = weights(L);
    return `<div class="formula">
      <code>score = 0.01 + ${W.we.toFixed(2)}\u00b7emotion + ${W.wr.toFixed(2)}\u00b7relevance + ${W.wc.toFixed(2)}\u00b7recency + ${W.wt.toFixed(2)}\u00b7repetition + ${W.wk.toFixed(2)}\u00b7social</code><br>
      <code>attention share = score^${W.g.toFixed(2)} / \u03a3 score^${W.g.toFixed(2)}</code> &nbsp;(amplification exponent)<br>
      each feedback round: <code>social \u2190 \u00bd\u00b7social + \u00bd\u00b7min(1, share\u00b7N/3)</code>, <code>repetition \u2190 min(1, repetition + 2\u00b7share)</code>, <code>recency \u2190 0.85\u00b7recency</code>
    </div>`;
  }

  OracleChapters.register('loop', (app) => {
    const L = state.v2.lab;
    if (!sim) { sim = fresh(); for (let i = 0; i < L.n; i++) step(sim, L); }
    const sliders = [['e', 'Emotion'], ['r', 'Relevance'], ['w', 'Recency'], ['t', 'Repetition'], ['k', 'Social proof'], ['a', 'Amplification']];
    app.innerHTML = `<article class="chapter ch-loop">
      ${U.chapterHead('loop', 'Attention lab',
        'A toy ranker over ten fictional posts. Set what it rewards, run rounds, watch attention concentrate.')}
      ${U.simNote('Toy model \u2014 not any real algorithm, not evidence of manipulation, not a measurement of you.')}
      <section class="panel lab-grid" aria-labelledby="lab-title">
        <div>
          <h2 id="lab-title" class="panel-title">What it rewards</h2>
          ${sliders.map(([k, n]) => U.slider(k, n, L[k])).join('')}
          <div class="btn-row">
            <button type="button" class="btn-sm primary" id="lab-step">RUN A ROUND</button>
            <button type="button" class="btn-sm" id="lab-chrono">CHRONOLOGICAL</button>
            <button type="button" class="btn-sm" id="lab-reset">RESET</button>
          </div>
        </div>
        <div>
          <h2 class="panel-title">Fictional feed</h2>
          <div id="lab-feed" aria-live="polite">${feedHtml(L)}</div>
          ${U.more('Model rules', `<div id="lab-formula">${formulaHtml(L)}</div>`, null, ['SIMULATED'])}
        </div>
      </section>
      <section class="panel" aria-labelledby="lab-ev">
        <h2 id="lab-ev" class="panel-title">What the evidence says</h2>
        ${E.claim('VERIFIED', 'A randomized experiment on ~2 million Twitter accounts: personalised ranking amplified some political content versus a chronological feed.', ['huszar22'])}
        ${E.claim('VERIFIED', 'EU very large platforms must offer a feed not based on profiling \u2014 the real-world CHRONOLOGICAL.', ['dsa38'])}
        ${U.more('More evidence', E.claim('VERIFIED', 'The same study did not find far-left or far-right groups amplified more than moderates.', ['huszar22']) +
          E.claim('VERIFIED', 'Each moral-emotional word was linked to ~20% more diffusion across 563,312 posts \u2014 an association, not proof a ranker causes it.', ['brady17']) +
          E.claim('VERIFIED', 'X\u2019s published For You pipeline uses explicit (likes, replies) and implicit (profile visits, clicks) signals.', ['x-algo']) +
          E.claim('INFERRED', 'When attention feeds ranking, early leads compound. How strongly any platform does this is not public.'), null, ['VERIFIED', 'INFERRED'])}
      </section>
      ${U.chapterNav('revelation', true)}
    </article>`;

    const refresh = () => {
      document.getElementById('lab-feed').innerHTML = feedHtml(L);
      document.getElementById('lab-formula').innerHTML = formulaHtml(L);
    };
    app.querySelectorAll('.lab-grid input[type=range]').forEach(inp => inp.oninput = () => {
      L[inp.dataset.key] = +inp.value;
      document.getElementById('out-' + inp.dataset.key).textContent = inp.value;
      refresh();
    });
    const run = (k) => { for (let i = 0; i < k; i++) { step(sim, L); L.n = Math.min(12, L.n + 1); } refresh(); };
    document.getElementById('lab-step').onclick = () => run(1);
    document.getElementById('lab-reset').onclick = () => { sim = fresh(); L.n = 0; refresh(); };
    document.getElementById('lab-chrono').onclick = () => {
      Object.assign(L, { e: 0, r: 0, w: 100, t: 0, k: 0, a: 0 });
      app.querySelectorAll('.lab-grid input[type=range]').forEach(inp => { inp.value = L[inp.dataset.key]; document.getElementById('out-' + inp.dataset.key).textContent = inp.value; });
      refresh();
    };
  });
  window.OracleLab = { rank, step, metrics, fresh }; // exposed for QA
})();
