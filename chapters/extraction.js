/* 02 THE EXTRACTION — observed vs derived vs unknown; digital footprint explorer; optional live harvest (v1.2). */
(() => {
  const E = OracleEvidence, C = OracleContent, U = OracleChapters.ui;
  let selected = 0;

  function detail(i) {
    const c = C.FOOTPRINT[i], on = (state.v2.footprint >> i) & 1;
    return `<div class="cat-detail">
        <div class="col"><h3 class="c-obs">OBSERVED</h3><p>${c.observed}</p></div>
        <div class="col"><h3 class="c-der">DERIVED</h3><p>${c.derived}</p></div>
        <div class="col"><h3 class="c-unk">UNKNOWN</h3><p>${E.badge('UNKNOWN')} ${c.unknown}</p></div>
      </div>
      <div class="cat-meta">
        <p><b>How it might be used:</b> ${c.use} ${E.badge('INFERRED')}</p>
        <div class="mini-label">Documented vs hypothetical</div>
        ${E.claim(c.doc.label, c.doc.text, c.doc.src)}
        <div class="mini-label">Control or opt-out, where known</div>
        ${E.claim(c.controlLabel, c.control, c.controlSrc)}
      </div>
      <button type="button" class="toggle" id="btn-disclosed" aria-pressed="${on ? 'true' : 'false'}">${on ? '\u25b2' : '\u25b3'} I have disclosed ${c.name.toLowerCase()} somewhere online</button>`;
  }

  OracleChapters.register('extraction', (app) => {
    const granted = Object.values(state.collected || {}).filter(g => g && !g.error).length;
    const denied = Object.values(state.collected || {}).filter(g => g && g.error).length;
    app.innerHTML = `<article class="chapter ch-extraction">
      ${U.chapterHead('02 // THE EXTRACTION', 'Signals, then inferences',
        'What a system <em>observes</em> is not what it <em>knows</em>. Most of the value is in what it derives \u2014 and some things cannot be established at all.')}
      <section class="triad" aria-label="Three kinds of information">
        <div><h3 class="c-obs">OBSERVED</h3><p>Clicks, searches, location readings, posts, device signals \u2014 recorded directly.</p></div>
        <div><h3 class="c-der">DERIVED</h3><p>Interests, likely preferences, engagement propensity, relationship patterns \u2014 computed from observations.</p>
          ${E.claim('VERIFIED', 'Facebook Likes alone predicted traits such as political views (85% accuracy distinguishing Democrat/Republican) in a study of 58,000+ volunteers.', ['kosinski13'])}</div>
        <div><h3 class="c-unk">UNKNOWN</h3><p>What cannot be established from public evidence: complete recipient lists, retention per copy, exact model weights.</p>
          ${E.claim('VERIFIED', 'No company in the FTC\u2019s 2024 study provided a comprehensive list of the third parties it shared personal information with.', ['ftc6b'])}</div>
      </section>

      <section class="panel" aria-labelledby="fp-title">
        <h2 id="fp-title" class="panel-title">Digital footprint explorer</h2>
        <p class="sim-note">Choose a category. Mark the ones you have disclosed somewhere \u2014 the count and pattern shape the artwork\u2019s density. Nothing about you is read here.</p>
        <div class="cat-list" role="tablist" aria-label="Footprint categories">
          ${C.FOOTPRINT.map((c, i) => `<button type="button" role="tab" class="cat-btn ${(state.v2.footprint >> i) & 1 ? 'disclosed' : ''}" id="cat-${c.id}" data-cat="${i}" aria-selected="${i === selected}" aria-controls="cat-panel" tabindex="${i === selected ? 0 : -1}">${c.name}</button>`).join('')}
        </div>
        <div id="cat-panel" role="tabpanel" aria-labelledby="cat-${C.FOOTPRINT[selected].id}">${detail(selected)}</div>
      </section>

      <section class="panel" aria-labelledby="live-title">
        <h2 id="live-title" class="panel-title">What this browser exposes, right now (optional)</h2>
        <div class="live-box">
          <p>The original Oracle protocol (v1.2) lets you grant sensors one tile at a time and see the raw readings \u2014 processed in this tab only, camera and microphone stopped immediately. You can skip it entirely; the investigation and the artwork never use these readings.
          ${granted || denied ? `<br><b>This tab so far:</b> ${granted} tile(s) granted, ${denied} denied/unavailable.` : ''}</p>
          <div class="btn-row">
            <button type="button" class="btn-primary" id="btn-live">OPEN LIVE HARVEST</button>
            ${granted ? `<button type="button" class="btn-sm" id="btn-witness">VIEW PORTRAIT</button>` : ''}
          </div>
        </div>
      </section>
      ${U.chapterNav('offer', 'machine')}
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
    document.getElementById('btn-live').onclick = () => { history.pushState(null, '', '#protocol'); state.stage = 'handshake'; render(); };
    const w = document.getElementById('btn-witness');
    if (w) w.onclick = () => { if (!state.collected.base) state.collected.base = harvestBase(); state.fingerprint = generateHash(state.collected); state.stage = 'portrait'; render(); };
  });
})();
