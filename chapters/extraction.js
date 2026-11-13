/* 02 THE EXTRACTION — observed vs derived vs unknown; digital footprint explorer; optional live harvest (v1.2). */
(() => {
  const E = OracleEvidence, C = OracleContent, U = OracleChapters.ui;
  let selected = 0;

  function detail(i) {
    const c = C.FOOTPRINT[i], on = (state.v2.footprint >> i) & 1;
    return `<div class="cat-detail">
        <div class="col"><h3 class="c-obs">OBSERVED</h3><p>${c.observed}</p></div>
        <div class="col"><h3 class="c-der">INFERRED</h3><p>${c.derived}</p></div>
        <div class="col"><h3 class="c-unk">UNKNOWN</h3><p>${c.unknown}</p></div>
      </div>
      <button type="button" class="toggle" id="btn-disclosed" aria-pressed="${on ? 'true' : 'false'}">${on ? '\u25b2' : '\u25b3'} I\u2019ve shared this online</button>
      ${U.more('Uses, evidence &amp; controls', E.claim('INFERRED', '<b>Possible uses:</b> ' + c.use) + E.claim(c.doc.label, c.doc.text, c.doc.src) + E.claim(c.controlLabel, '<b>Control:</b> ' + c.control, c.controlSrc), null, ['INFERRED', c.doc.label, c.controlLabel])}`;
  }

  OracleChapters.register('extraction', (app) => {
    const granted = Object.values(state.collected || {}).filter(g => g && !g.error).length;
    const denied = Object.values(state.collected || {}).filter(g => g && g.error).length;
    app.innerHTML = `<article class="chapter ch-extraction">
      ${U.chapterHead('extraction', 'Observed, inferred, unknown',
        'Systems record a little and infer a lot. Some things no outsider can know.')}
      <section class="triad" aria-label="Three kinds of information">
        <div><h3 class="c-obs">OBSERVED</h3><p>Clicks, searches, location, posts \u2014 recorded directly.</p></div>
        <div><h3 class="c-der">INFERRED</h3><p>Interests, traits, relationships \u2014 computed from what was observed.</p>
          ${E.claim('VERIFIED', 'Facebook Likes alone told Democrats from Republicans with 85% accuracy (58,000+ volunteers).', ['kosinski13'])}</div>
        <div><h3 class="c-unk">UNKNOWN</h3><p>Who received copies, how long they keep them, how models weigh you.</p>
          ${E.claim('VERIFIED', 'No company in the FTC\u2019s 2024 study gave a full list of the third parties it shared personal data with.', ['ftc6b'])}</div>
      </section>

      <section class="panel" aria-labelledby="fp-title">
        <h2 id="fp-title" class="panel-title">Your footprint</h2>
        <p class="sim-note">Pick a category; mark it if you\u2019ve shared it. You choose \u2014 nothing is read from your device.</p>
        <div class="cat-list" role="tablist" aria-label="Footprint categories">
          ${C.FOOTPRINT.map((c, i) => `<button type="button" role="tab" class="cat-btn ${(state.v2.footprint >> i) & 1 ? 'disclosed' : ''}" id="cat-${c.id}" data-cat="${i}" aria-selected="${i === selected}" aria-controls="cat-panel" tabindex="${i === selected ? 0 : -1}">${c.name}</button>`).join('')}
        </div>
        <div id="cat-panel" role="tabpanel" aria-labelledby="cat-${C.FOOTPRINT[selected].id}">${detail(selected)}</div>
      </section>

      <section class="panel" aria-labelledby="live-title">
        <h2 id="live-title" class="panel-title">Live sensor demo <small>(optional)</small></h2>
        <div class="live-box">
          <p>See what this browser exposes, one permission at a time. Readings stay in this tab and never reach the artwork.
          ${granted || denied ? `<br><b>So far:</b> ${granted} read, ${denied} denied or unavailable.` : ''}</p>
          <div class="btn-row">
            <button type="button" class="btn-sm" id="btn-live">OPEN SENSOR DEMO</button>
            ${granted ? `<button type="button" class="btn-sm" id="btn-witness">VIEW PORTRAIT</button>` : ''}
          </div>
        </div>
      </section>
      ${U.chapterNav('machine')}
    </article>`;

    const tabs = [...app.querySelectorAll('.cat-btn')];
    const select = (i, focus) => {
      selected = i;
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', j === i); t.tabIndex = j === i ? 0 : -1; });
      const panel = document.getElementById('cat-panel');
      panel.setAttribute('aria-labelledby', tabs[i].id);
      panel.innerHTML = detail(i);
      bindToggle();
      if (focus) tabs[i].focus();
    };
    const bindToggle = () => {
      const b = document.getElementById('btn-disclosed');
      b.onclick = () => {
        state.v2.footprint ^= (1 << selected);
        const on = (state.v2.footprint >> selected) & 1;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.textContent = (on ? '\u25b2' : '\u25b3') + b.textContent.slice(1);
        tabs[selected].classList.toggle('disclosed', !!on);
      };
    };
    tabs.forEach((t, i) => {
      t.onclick = () => select(i);
      t.onkeydown = (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); select((i + 1) % tabs.length, true); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); select((i - 1 + tabs.length) % tabs.length, true); }
      };
    });
    bindToggle();
    document.getElementById('btn-live').onclick = () => { history.pushState(null, '', '#sensors'); state.stage = 'permissions'; render(); };
    const w = document.getElementById('btn-witness');
    if (w) w.onclick = () => { if (!state.collected.base) state.collected.base = harvestBase(); state.fingerprint = generateHash(state.collected); state.stage = 'portrait'; render(); };
  });
})();
