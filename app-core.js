const canvas = document.getElementById('cosmos');
const ctx = canvas.getContext('2d');
let W, H, particles = [];
let mx = 0, my = 0;

const reduceMotionMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const cosmosDpr = () => Math.min(window.devicePixelRatio || 1, 2);
const resize = () => {
  const d = cosmosDpr();
  W = canvas.width = Math.round(window.innerWidth * d);
  H = canvas.height = Math.round(window.innerHeight * d);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(d, 0, 0, d, 0, 0);
  if (!cosmosRaf) drawCosmosStatic();
};
window.addEventListener('resize', resize);
window.addEventListener('pointermove', e => {
  mx = (e.clientX / window.innerWidth - 0.5) * 40;
  my = (e.clientY / window.innerHeight - 0.5) * 40;
});

for (let i = 0; i < 90; i++) {
  particles.push({
    x: Math.random() * 2000 - 1000,
    y: Math.random() * 2000 - 1000,
    z: Math.random() * 1000,
    s: Math.random() * 1.4 + 0.4,
    v: Math.random() * 0.35 + 0.08
  });
}

const drawParticle = (p) => {
  const sx = (p.x / p.z) * 400 + window.innerWidth / 2 + mx;
  const sy = (p.y / p.z) * 400 + window.innerHeight / 2 + my;
  const r = p.s * (1 - p.z / 1000);
  const alpha = (1 - p.z / 1000) * 0.72;
  if (sx > 0 && sx < window.innerWidth && sy > 0 && sy < window.innerHeight) {
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.globalAlpha = alpha;
    ctx.fill();
  }
};

// Starfield colours come from the theme tokens (--bg / --signal), re-read when the theme changes.
const cosmosCol = { bg: '#020408', star: '#00e5ff' };
function readCosmosColours() {
  const cs = getComputedStyle(document.documentElement);
  cosmosCol.bg = cs.getPropertyValue('--bg').trim() || '#020408';
  cosmosCol.star = cs.getPropertyValue('--signal').trim() || '#00e5ff';
}
readCosmosColours();
if (window.OracleTheme) OracleTheme.onChange(() => { readCosmosColours(); if (!cosmosRaf) drawCosmosStatic(); });

// Reduced motion: one static frame, no rAF loop.
function drawCosmosStatic() {
  ctx.globalAlpha = 1;
  ctx.fillStyle = cosmosCol.bg;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.fillStyle = cosmosCol.star;
  for (const p of particles) drawParticle(p);
  ctx.globalAlpha = 1;
}

let cosmosRaf = 0;
// v3: the starfield is ambience for the approach screen only. It plays for COSMOS_MS, then settles to one
// static frame and never restarts on its own. Chapters always get the static frame. Reduced motion: static only.
const COSMOS_MS = 6000;
let cosmosUntil = 0;
resize();
const animCosmos = () => {
  if (performance.now() > cosmosUntil || document.hidden) { settleCosmos(); return; }
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = cosmosCol.bg;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.globalAlpha = 1;
  ctx.fillStyle = cosmosCol.star;
  for (const p of particles) {
    p.z -= p.v;
    if (p.z <= 0) {
      p.x = Math.random() * 2000 - 1000;
      p.y = Math.random() * 2000 - 1000;
      p.z = 1000;
    }
    drawParticle(p);
  }
  ctx.globalAlpha = 1;
  cosmosRaf = requestAnimationFrame(animCosmos);
};
function settleCosmos() {
  cancelAnimationFrame(cosmosRaf);
  cosmosRaf = 0; cosmosUntil = 0;
  drawCosmosStatic();
}
const startCosmos = () => {
  cancelAnimationFrame(cosmosRaf);
  if (reduceMotionMq.matches) { settleCosmos(); return; }
  cosmosUntil = performance.now() + COSMOS_MS;
  animCosmos();
};
reduceMotionMq.addEventListener?.('change', () => { if (reduceMotionMq.matches) settleCosmos(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && cosmosRaf) settleCosmos(); });
startCosmos();

const state = {
  stage: 'approach'
};

// v2: five chapters + approach. The v1.2 protocol (handshake → harvest → witness) lives inside step 2 (Footprint).
// WP6: one plain name per chapter, used by the nav, the kicker ("Step N of 5") and the H1. Route ids do not change.
// v4: the screen list lives in core/router.js; PHASES is derived from it (same ids and labels as before).
const PHASES = OracleRouter.FLOW.filter(id => id !== 'reveal').map(id => {
  const S = OracleRouter.byId(id); return { id, n: String(S.step), label: S.label };
});
const LEGACY_PARENT = { art: 'revelation', reveal: 'revelation', extras: 'revelation' };
const stepName = (P) => P.id === 'approach' ? P.label : `Step ${P.n} of ${OracleRouter.TOTAL} \u00b7 ${P.label}`;
const visited = new Set();

const syncHud = () => {
  if (state.stage !== 'approach' && cosmosRaf) settleCosmos(); // chapters: static background, no motion
  const cur = LEGACY_PARENT[state.stage] || state.stage;
  const P = PHASES.find(p => p.id === cur);
  if (P && P.id !== 'approach') visited.add(P.id);
  const el = document.getElementById('hud-phase');
  if (el) el.textContent = state.stage === 'art' ? 'Artwork' : P ? stepName(P) + (LEGACY_PARENT[state.stage] === 'extraction' ? ' \u00b7 live demo' : '') : state.stage;
  const rail = document.getElementById('phase-rail');
  if (!rail) return;
  rail.classList.remove('open');
  // Phone: one in-flow button reads "Step 2 of 5 · Footprint" and opens the list below it (pushes content down,
  // never overlays). Wider screens show the list inline. Visited chapters carry a tick.
  const chapters = PHASES.filter(p => p.id !== 'approach');
  rail.innerHTML = `<button type="button" class="rail-toggle" aria-expanded="false" aria-controls="rail-list">
      <span class="rail-now">${P ? stepName(P) : 'Chapters'}</span>
      <span class="rail-meter" aria-hidden="true">${chapters.map(p => `<i class="${p.id === cur ? 'on' : visited.has(p.id) ? 'done' : ''}"></i>`).join('')}</span>
      <span class="vh">, all chapters</span>
    </button>
    <ol class="rail-list" id="rail-list">${PHASES.map(p => {
      const on = p.id === cur, done = !on && visited.has(p.id);
      return `<li><button type="button" class="phase-pip ${on ? 'on' : done ? 'done' : ''}" data-go="${p.id}" ${on ? 'aria-current="step"' : ''}>${done ? '<span class="pip-mark" aria-hidden="true">\u2713</span>' : ''}<span class="pip-l">${p.label}</span>${done ? '<span class="vh"> (visited)</span>' : ''}</button></li>`;
    }).join('')}</ol>`;
};

// v5 WP9: the v1.2 sensor demo readers (canvas/WebGL/font probes, wallet, passkey creation, battery, camera, mic)
// were retired. Every device reading now lives in core/device.js, behind the Device step's Show me / Allow taps.
