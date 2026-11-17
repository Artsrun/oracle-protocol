/* v4 Extras — optional, after the artwork: the live sensor demo (v1.2, restyled) and the sources.
 * Nothing here feeds the artwork. */
(() => {
  const E = OracleEvidence;
  OracleChapters.register('extras', (app) => {
    app.innerHTML = `<div class="screen v4s s-extras">
      <div class="screen-top"><button type="button" class="btn-back" data-goto="revelation"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Your artwork</button></div>
      <header class="screen-head"><h1 tabindex="-1">Extras</h1><p class="lead">Optional. Nothing here changes your artwork.</p></header>
      <div class="extras-list">
        <section class="story-card">
          <h2 class="card-title">Sensor demo</h2>
          <p>See what this browser can expose, one permission at a time. Readings stay in this tab and are gone when you close it.</p>
          <p><button type="button" class="btn-quiet" id="ex-sensors">Open the sensor demo</button></p>
        </section>
        <section class="story-card">
          <h2 class="card-title">Sources</h2>
          <p>${E.SOURCES.length} sources behind every claim, each opened on ${E.esc(E.ACCESSED)}, and who is in the loop.</p>
          <p class="opt-row"><button type="button" class="btn-quiet" id="ex-sources" aria-haspopup="dialog">Sources</button><button type="button" class="btn-quiet" id="ex-who" aria-haspopup="dialog">Who is in this loop</button></p>
        </section>
      </div>
    </div>`;
    document.getElementById('ex-sensors').onclick = () => OracleChapters.go('permissions', { hash: '#sensors' });
    document.getElementById('ex-sources').onclick = (e) => OracleEvidenceSheet.openSources(null, e.currentTarget);
    document.getElementById('ex-who').onclick = (e) => OracleEvidenceSheet.openWho(e.currentTarget);
  });
})();
