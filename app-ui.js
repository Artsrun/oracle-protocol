const app = document.getElementById('app');

// v2 a11y: any non-button element with role=button activates on Enter/Space.
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement) || t.getAttribute('role') !== 'button' || t.tagName === 'BUTTON') return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t.click(); }
});

const render = () => {
  app.innerHTML = '';
  document.body.dataset.stage = state.stage;
  document.body.classList.add('v4'); // v4: one look everywhere
  syncHud();
  if (state.stage !== 'device' && window.OracleDevice) OracleDevice.stopAll(); // v5: tilt and mic stop when the Device step is left
  if (window.OracleChapters && OracleChapters.handles(state.stage)) OracleChapters.renderStage(state.stage, app);
  else if (state.stage === 'approach') renderApproach();
  else { state.stage = 'approach'; syncHud(); renderApproach(); }
};

const renderApproach = () => {
  app.innerHTML = `<div class="stage-approach">
    <div class="oracle-sigil" aria-hidden="true"><svg viewBox="0 0 108 108"><polygon class="tri t1" points="54,4 100,84 8,84"/><polygon class="tri t2" points="54,20 86,76 22,76"/><polygon class="tri t3" points="54,34 72,66 36,66"/><polygon class="core" points="54,48 61,61 47,61"/></svg></div>
    <h1 class="oracle-title glitch" data-text="ORACLE">ORACLE</h1>
    <div class="oracle-sub">THE ANATOMY OF ATTENTION</div>
    ${window.OracleChapters ? `<p class="approach-lead">Answer a few questions about your digital life. Get a one-of-a-kind artwork made from your answers.</p>` : ''}
    <div class="btn-group">
      ${window.OracleChapters ? `<button type="button" class="btn-primary btn-fill" id="btn-investigate">Begin</button>` : `<button type="button" class="btn-primary" id="btn-enter">INITIATE PROTOCOL</button>`}
    </div>
    ${window.OracleChapters ? `<p class="approach-note">About three minutes \u00b7 permissions optional \u00b7 nothing leaves this tab.</p>` : ''}
    <p class="oracle-verse">We are all made of data.<br><em>Let the machine witness you \u2014 willingly.</em></p>
  </div>`;
  const ent = document.getElementById('btn-enter');
  if (ent) ent.onclick = () => OracleChapters.go('offer');
  const inv = document.getElementById('btn-investigate');
  if (inv) inv.onclick = () => OracleChapters.go('offer');
};

if (window.OracleChapters) OracleChapters.boot(); else render();
