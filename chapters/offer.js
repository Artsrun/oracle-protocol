/* 01 THE OFFER — voluntary exchange + exchange simulator. */
(() => {
  const E = OracleEvidence, C = OracleContent, U = OracleChapters.ui;

  // Six-axis "exchange hexagon" built from six triangles (no circles).
  function hexSvg(v) {
    const dims = C.EXCHANGE_DIMS, cx = 110, cy = 110, R = 88;
    const pt = (i, r) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    const grid = [0.33, 0.66, 1].map(f => `<polygon points="${dims.map((_, i) => pt(i, R * f).join(',')).join(' ')}" class="hx-grid"/>`).join('');
    const spokes = dims.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" class="hx-grid"/>`).join('');
    const tris = dims.map((d, i) => {
      const a = pt(i, R * v[d.id] / 100), b = pt((i + 1) % 6, R * v[dims[(i + 1) % 6].id] / 100);
      return `<polygon points="${cx},${cy} ${a.join(',')} ${b.join(',')}" class="hx-tri hx-${i}"/>`;
    }).join('');
    const labels = dims.map((d, i) => { const [x, y] = pt(i, R + 14); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${d.name.split(' ').pop().slice(0, 6).toUpperCase()}</text>`; }).join('');
    return `<svg viewBox="-10 -10 240 240" class="hexviz" role="img" aria-label="Exchange shape: ${dims.map(d => d.name + ' ' + v[d.id]).join(', ')}">${grid}${spokes}${tris}${labels}</svg>`;
  }

  function modelRows(v) {
    return C.EXCHANGE_MODEL.map(m => {
      const val = Math.round(m.f(v));
      return `<div class="model-row"><div class="model-top"><span>${m.name}</span><b>${val}</b></div>
        <div class="bar"><i style="width:${val}%"></i></div><code>${m.formula}</code></div>`;
    }).join('');
  }

  OracleChapters.register('offer', (app) => {
    const v = state.v2;
    app.innerHTML = `<article class="chapter ch-offer">
      ${U.chapterHead('01 // THE OFFER', 'What we trade for convenience',
        'Every free feed, assistant and smart speaker is an exchange. Mark the ones you make \u2014 your selection shapes the artwork in chapter 05. It is stored only in this tab.')}
      <section class="offer-grid" aria-label="Everyday exchanges">
        ${C.OFFERS.map((o, i) => {
          const on = (v.offers >> i) & 1;
          return `<div class="offer-card ${on ? 'on' : ''}">
            <h2 class="offer-title">${o.title}</h2>
            <div class="trade"><div><span>YOU GIVE</span>${o.give}</div><div><span>YOU GET</span>${o.get}</div></div>
            <div class="offer-doc"><div class="mini-label">Documented example</div>${E.claim(o.documented.label, o.documented.text, o.documented.src)}</div>
            <div class="offer-pat"><div class="mini-label">General pattern</div>${E.claim(o.pattern.label, o.pattern.text)}</div>
            <button type="button" class="toggle" data-offer="${i}" aria-pressed="${on ? 'true' : 'false'}">${on ? '\u25b2 I make this exchange' : '\u25b3 I make this exchange'}</button>
          </div>`;
        }).join('')}
      </section>

      <section class="panel sim" aria-labelledby="exsim-title">
        <h2 id="exsim-title" class="panel-title">Exchange simulator</h2>
        ${U.simNote('Six illustrative dials and four derived outputs. The weights are design assumptions printed next to each output so you can check them. Nothing here measures you or any service.')}
        <div class="sim-grid">
          <div class="sliders">${C.EXCHANGE_DIMS.map(d => U.slider(d.id, d.name, v.ex[d.id], d.hint)).join('')}</div>
          <div class="sim-out">
            <div id="hex-wrap">${hexSvg(v.ex)}</div>
            <div id="model-wrap" aria-live="polite">${modelRows(v.ex)}</div>
          </div>
        </div>
      </section>
      ${U.chapterNav('approach', 'extraction')}
    </article>`;

    app.querySelectorAll('[data-offer]').forEach(b => b.onclick = () => {
      const i = +b.dataset.offer;
      v.offers ^= (1 << i);
      const on = (v.offers >> i) & 1;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = (on ? '\u25b2' : '\u25b3') + ' I make this exchange';
      b.closest('.offer-card').classList.toggle('on', !!on);
    });
    app.querySelectorAll('.sliders input[type=range]').forEach(inp => inp.oninput = () => {
      v.ex[inp.dataset.key] = +inp.value;
      document.getElementById('out-' + inp.dataset.key).textContent = inp.value;
      document.getElementById('hex-wrap').innerHTML = hexSvg(v.ex);
      document.getElementById('model-wrap').innerHTML = modelRows(v.ex);
    });
  });
})();
