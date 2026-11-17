/* v4 Start — what this is, how long it takes, one button. The picture is a labelled example (fixed seed). */
(() => {
  const U = OracleChapters.ui;
  const EXAMPLE = { s: 'ORACLE-7K3F-Q9ZD', o: 21, f: 77, e: 90, r: 30, t: 60, k: 80, a: 80, n: 4 };
  OracleChapters.register('approach', (app) => {
    app.innerHTML = `<div class="screen v4s s-approach">
      <div class="start-grid">
        <figure class="start-art"><canvas id="start-art" width="432" height="540" role="img" aria-label="Example artwork: red shards, a lattice and flowing lines around a triangle"></canvas>
          <figcaption class="small">Example artwork</figcaption></figure>
        <div class="start-text">
          <p class="brand">Oracle Protocol</p>
          <h1 tabindex="-1">Turn your digital life into art</h1>
          <p class="lead">Three questions. Your answers become a unique artwork.</p>
          <div class="screen-cta"><button type="button" class="btn-primary" id="btn-begin">Begin</button></div>
          <p class="small">About 2 minutes \u00b7 no permissions \u00b7 nothing leaves this tab</p>
        </div>
      </div>
    </div>`;
    document.getElementById('btn-begin').onclick = () => OracleChapters.go('offer');
    const c = document.getElementById('start-art');
    OracleArt.render(c.getContext('2d'), OracleLayers.compose(EXAMPLE, 0.8), c.width, c.height, { ...OracleExport.renderOpts(OracleExport.lookNow()), overlay: null });
  });
})();
