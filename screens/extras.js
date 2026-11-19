/* v4 Extras — optional, after the artwork: the sources (v5: the sensor demo is retired; readings live in step 3).
 * Nothing here feeds the artwork. */
(() => {
  const E = OracleEvidence;
  const ic = (n) => window.OracleIcons ? OracleIcons.svg(n) : '';
  OracleChapters.register('extras', (app) => {
    app.innerHTML = `<div class="screen v4s s-extras">
      <div class="screen-top"><button type="button" class="btn-back" data-goto="revelation">${ic('arrow-left')}Your artwork</button></div>
      <header class="screen-head"><h1 tabindex="-1">Extras</h1><p class="lead">Optional. Nothing here changes your artwork.</p></header>
      <div class="extras-list">
        <section class="story-card">
          <h2 class="card-title">Your device</h2>
          <p>What this browser shares, and the ring it draws, are in step 3. Readings stay in this tab.</p>
          <p><button type="button" class="btn-quiet" id="ex-device" data-goto="device">${ic('monitor-smartphone')}Device step</button></p>
        </section>
        <section class="story-card">
          <h2 class="card-title">Sources</h2>
          <p>${E.SOURCES.length} sources behind every claim, each opened on ${E.esc(E.ACCESSED)}, and who is in the loop.</p>
          <p class="opt-row"><button type="button" class="btn-quiet" id="ex-sources" aria-haspopup="dialog">${ic('book-open')}Sources</button><button type="button" class="btn-quiet" id="ex-who" aria-haspopup="dialog">${ic('users')}Who is in this loop</button></p>
        </section>
      </div>
    </div>`;
    document.getElementById('ex-sources').onclick = (e) => OracleEvidenceSheet.openSources(null, e.currentTarget);
    document.getElementById('ex-who').onclick = (e) => OracleEvidenceSheet.openWho(e.currentTarget);
  });
})();
