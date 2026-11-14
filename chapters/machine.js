/* 03 THE MACHINE — the loop as one vertical stepper beside a ring illustration.
 * WP4: each step shows its name and one line; its sourced claim sits behind the row chevron. The company
 * directory ("Who is in this loop") and the documented relations moved to the Sources drawer (app-shell.js). */
(() => {
  const E = OracleEvidence, C = OracleContent, U = OracleChapters.ui;
  let active = -1;

  const N = C.MACHINE.length, CX = 160, CY = 160, R = 118;
  const pos = (i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / N; return [CX + R * Math.cos(a), CY + R * Math.sin(a)]; };
  const triPts = (x, y, s, up) => up ? `${x},${y - s} ${x + s * 0.866},${y + s * 0.5} ${x - s * 0.866},${y + s * 0.5}` : `${x},${y + s} ${x + s * 0.866},${y - s * 0.5} ${x - s * 0.866},${y - s * 0.5}`;

  function loopSvg() {
    const edges = C.MACHINE.map((_, i) => {
      const [x1, y1] = pos(i), [x2, y2] = pos((i + 1) % N);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      return `<line class="ln" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><polygon class="ln" points="${triPts(0, 0, 4, true)}" transform="translate(${mx},${my}) rotate(${ang + 90})"/>`;
    }).join('');
    // Numbers only on the ring; the step names are listed beside it (labels were 9 px and clipped).
    const nodes = C.MACHINE.map((m, i) => {
      const [x, y] = pos(i), a = -Math.PI / 2 + i * 2 * Math.PI / N, lx = CX + (R + 24) * Math.cos(a), ly = CY + (R + 24) * Math.sin(a);
      return `<polygon class="nd ${i === active ? 'on' : ''}" points="${triPts(x, y, 9, true)}"/><text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central">${String(i + 1).padStart(2, '0')}</text>`;
    }).join('');
    return `<svg viewBox="0 0 320 320" class="loopviz" aria-hidden="true">${edges}${nodes}</svg>`;
  }

  OracleChapters.register('machine', (app) => {
    active = -1;
    app.innerHTML = `<article class="chapter ch-machine">
      ${U.chapterHead('machine',
        'A conceptual flow, not any one company\u2019s system. Seven steps, then it starts again.')}
      <div class="machine-grid">
        <div class="ring" id="loop-svg">${loopSvg()}</div>
        <ol class="rows steps" aria-label="The seven steps">
          ${C.MACHINE.map((m, i) => U.row({ id: 'step-' + m.id, i, num: String(i + 1).padStart(2, '0'), title: m.name, sub: m.text,
            body: E.claim(m.claim.label, m.claim.text, m.claim.src) })).join('')}
        </ol>
      </div>
      <p class="who-link"><button type="button" class="cite" id="m-who" aria-haspopup="dialog">Who is in this loop? \u2192</button></p>
      ${U.chapterNav('loop')}
    </article>`;
    U.bindRows(app, 'data-step', () => {}, null, (i, open) => {
      active = open ? i : -1;
      document.getElementById('loop-svg').innerHTML = loopSvg();
    });
    document.getElementById('m-who').onclick = (e) => OracleChapters.openDrawer('@who', e.currentTarget);
  });
})();
