/* 01 THE OFFER — everyday trades as one checklist. Exchange simulator hidden behind ?simulator=1. */
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
        <div class="bar"><i style="width:${val}%"></i></div></div>`;
    }).join('');
  }

  // v3: a single checklist. The Exchange simulator stays in the code but only renders with ?simulator=1.
  function simulatorPanel(v) {
    return `<section class="panel sim" aria-labelledby="exsim-title">
        <h2 id="exsim-title" class="panel-title">Exchange simulator</h2>
        ${U.simNote('Illustrative dials \u2014 not a measurement of you or any service.')}
        <div class="sim-grid">
          <div class="sliders">${C.EXCHANGE_DIMS.map(d => U.slider(d.id, d.name, v.ex[d.id])).join('')}</div>
          <div class="sim-out">
            <div id="hex-wrap">${hexSvg(v.ex)}</div>
            <div id="model-wrap" aria-live="polite">${modelRows(v.ex)}</div>
            ${U.more('Formulas', C.EXCHANGE_MODEL.map(m => `<p class="claim"><b>${m.name}</b> = <code>${m.formula}</code></p>`).join('') + '<p class="claim">Weights are design assumptions.</p>')}
          </div>
        </div>
      </section>`;
  }

  OracleChapters.register('offer', (app) => {
    const v = state.v2, sim = OracleChapters.simulatorOn;
    app.innerHTML = `<article class="chapter ch-offer">
      ${U.chapterHead('offer', 'What do you trade?',
        'Free apps cost data and attention. Tick the trades you make \u2014 each one shapes your artwork.')}
      ${U.tally('of-count', 'trades')}
      <ul class="rows" aria-label="Everyday trades">
        ${C.OFFERS.map((o, i) => U.row({
          id: 'offer-' + o.id, data: 'data-offer', i, on: (v.offers >> i) & 1,
          title: o.title, checkLabel: 'I make this trade',
          sub: o.line,
          body: E.claim(o.documented.label, o.documented.text, o.documented.src) + E.claim(o.pattern.label, o.pattern.text)
        })).join('')}
      </ul>
      ${sim ? simulatorPanel(v) : ''}
      ${U.chapterNav('extraction')}
    </article>`;

    U.bindRows(app, 'data-offer', (i, on) => {
      if (on) v.offers |= (1 << i); else v.offers &= ~(1 << i);
      // Without the simulator the six art dials follow the ticked trades (deterministic, see OracleContent.deriveEx).
      if (!sim) v.ex = C.deriveEx(v.offers);
    }, U.setTally('of-count'));
    if (sim) app.querySelectorAll('.sliders input[type=range]').forEach(inp => inp.oninput = () => {
      v.ex[inp.dataset.key] = +inp.value;
      document.getElementById('out-' + inp.dataset.key).textContent = inp.value;
      document.getElementById('hex-wrap').innerHTML = hexSvg(v.ex);
      document.getElementById('model-wrap').innerHTML = modelRows(v.ex);
    });
  });
})();
