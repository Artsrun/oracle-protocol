/* v4 Step 5 · Artwork — the visitor's artwork: Save image, Share, Options (in the sheet). Export, PNG metadata,
 * share, restore and history are unchanged from v2/v3 so the fixed reference stays byte-identical.
 * Also registers the clean artwork view ('art' stage, #art?…). Moved from chapters/revelation.js in v4 WP7. */
(() => {
  const A = OracleArt, U = OracleChapters.ui, esc = U.esc;
  const HKEY = 'oracle.v2.history';
  let raf = 0, skipRemember = false, moreOpen = false;

  // v4: new artworks use the layered engine (v=2 in the link); older links keep the legacy engine (art/engine.js).
  const E = () => OracleEngine.get(state.v2.engine);
  // v5: what leaves the tab (link, PNG, caption, share) follows the share mode. A pattern that came in with a link is
  // already public, so it travels on; this tab's own reading travels only when the visitor chose "Choices + device
  // pattern" (core/privacy.js). Otherwise the exported ring is the withheld style. The canvas on screen shows the in-tab ring.
  const FP = () => window.OracleFingerprint;
  const devOut = () => {
    if (E().v !== 3) return undefined;
    const c = FP().context();
    if (c.mode === 'pattern') return c;
    if (c.mode === 'full' && window.OraclePrivacy && OraclePrivacy.share() === 'pattern') return FP().toPattern(c);
    return FP().WITHHELD;
  };
  const devPart = (d) => d && d.mode === 'pattern' ? `&dg=${d.dg}&db=${OraclePrivacy.dbCode(d.db)}` : '';
  // Runtime guard: nothing written to a link, file or caption may contain a raw reading (core/privacy.js findRaw).
  const clean = (text) => !(window.OraclePrivacy && window.OracleDevice && OraclePrivacy.findRaw(text, OracleDevice.snapshot()).length);
  const enc = (p) => { const out = A.encode(p) + E().q + devPart(devOut()); return clean(out) ? out : A.encode(p) + E().q; };
  // The lead under the artwork says what made it and what a saved image or link carries (PLAN-v5 §18.5).
  const leadText = () => {
    const c = E().v === 3 ? FP().context() : { mode: 'none' };
    if (c.mode === 'pattern') return 'Made from the link\u2019s answers and device pattern.';
    if (c.mode !== 'full') return 'Made only from your answers. Nothing left this tab.';
    return devOut().mode === 'pattern' ? 'Made from your answers and this device. Image and link add your device pattern.' : 'Made from your answers and this device. Image and link: choices only.';
  };
  const capOf = (p, fmt) => { const d = devOut(), c = E().caption(p, E().compositionId(p, d), shareLink(p, fmt), d); return clean(c) ? c : E().caption(p, E().compositionId(p, d), '', FP() ? FP().WITHHELD : d); };
  const encChoices = (p) => A.encode(p) + E().q; // history keeps choices only (PLAN-v5 §18.3)
  const ensureSeed = () => { if (!state.v2.seed) state.v2.seed = A.newSeed(); };
  const params = () => A.normalize(OracleChapters.artParams());
  const baseUrl = () => location.origin + location.pathname;
  // ── look = palette × mode × type used to paint the artwork. Follows the site theme unless a link pinned one. ──
  const TYPEFACES = {
    signal: { display: 'Syne, sans-serif', weight: 800, mono: '"IBM Plex Mono", monospace', load: ['800 58px Syne'] },
    instrument: { display: '"Space Grotesk", sans-serif', weight: 700, mono: '"IBM Plex Mono", monospace', load: ['700 58px "Space Grotesk"'] },
    almanac: { display: 'Fraunces, serif', weight: 600, mono: '"IBM Plex Mono", monospace', load: ['600 58px Fraunces'] }
  };
  const LABEL = { observatory: 'Observatory', sodium: 'Sodium', spectral: 'Spectral', dark: 'Night', light: 'Day', signal: 'Signal', instrument: 'Instrument', almanac: 'Almanac' };
  const lookNow = () => {
    if (state.v2.look) return state.v2.look;
    const c = window.OracleTheme ? OracleTheme.current() : { palette: 'observatory', mode: 'dark', type: 'signal' };
    return { pal: c.palette, th: c.mode, ty: c.type };
  };
  const lookQuery = (L) => `&pal=${L.pal}&th=${L.th}&ty=${L.ty}`;
  const lookLabel = (L) => `${LABEL[L.pal]} \u00b7 ${LABEL[L.th]} \u00b7 ${LABEL[L.ty]}`;
  const renderOpts = (L) => ({ palette: L.pal + '-' + L.th, fonts: TYPEFACES[L.ty] || TYPEFACES.signal });
  const shareLink = (p, fmt) => `${baseUrl()}#art?${enc(p)}&fmt=${fmt}${lookQuery(lookNow())}`;
  const fmtOf = () => A.FORMATS[state.v2.format] ? state.v2.format : 'portrait';
  const fileName = (p, fmt) => `oracle-${p.s.replace(/^ORACLE-/, "").toLowerCase()}-${A.FORMATS[fmt].w}x${A.FORMATS[fmt].h}.png`;

  async function fontsReady() {
    if (!document.fonts || !document.fonts.load) return;
    const T = TYPEFACES[lookNow().ty] || TYPEFACES.signal;
    try { await Promise.all([...T.load, '400 22px "IBM Plex Mono"', '500 18px "IBM Plex Mono"'].map(f => document.fonts.load(f))); } catch (e) { /* fall back to system fonts */ }
  }
  const overlay = (p, id, dev) => ({
    title: state.v2.title ? 'ORACLE // DIGITAL REMAINS' : '', subtitle: state.v2.title ? 'THE ANATOMY OF ATTENTION' : '',
    seed: p.s, id, text: E().interpret(p, dev), signature: 'ORACLE PROTOCOL'
  });

  // dev: undefined → the in-tab ring (screen); exportBlob passes devOut() so files follow the share mode.
  function draw(canvas, p, fmt, animate, dev) {
    const F = A.FORMATS[fmt], scene = E().compose(p, F.w / F.h, dev), id = E().compositionId(p, dev);
    canvas.width = F.w; canvas.height = F.h;
    const ctx = canvas.getContext('2d'), RO = renderOpts(lookNow());
    cancelAnimationFrame(raf);
    if (!animate || OracleChapters.reduceMotion()) { A.render(ctx, scene, F.w, F.h, { ...RO, overlay: overlay(p, id, dev) }); return id; }
    const t0 = performance.now(), dur = 1400;
    const frame = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      A.render(ctx, scene, F.w, F.h, { ...RO, progress: 1 - Math.pow(1 - k, 3), overlay: k >= 1 ? overlay(p, id, dev) : null });
      if (k < 1 && document.contains(canvas)) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return id;
  }

  // ── PNG metadata (tEXt) so the file itself carries seed + abstract parameters ──
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (bytes) => { let c = 0xffffffff; for (const b of bytes) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function textChunk(key, value) {
    const data = new TextEncoder().encode(key + '\0' + value);
    const type = new TextEncoder().encode('tEXt');
    const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
    dv.setUint32(0, data.length); out.set(type, 4); out.set(data, 8);
    const body = new Uint8Array(4 + data.length); body.set(type, 0); body.set(data, 4);
    dv.setUint32(8 + data.length, crc32(body));
    return out;
  }
  async function withMetadata(blob, p, id) {
    const buf = new Uint8Array(await blob.arrayBuffer());
    const iend = buf.length - 12; // IEND is always the final 12-byte chunk
    const chunks = [textChunk('Software', E().software), textChunk('Comment', `oracle:${enc(p)};id=${id};look=${lookNow().pal}-${lookNow().th}-${lookNow().ty}`)];
    if (!clean(E().software + ' oracle:' + enc(p))) throw new Error('Oracle: a raw reading reached the file metadata'); // never expected: enc() already guards
    const total = chunks.reduce((a, c) => a + c.length, 0);
    const out = new Uint8Array(buf.length + total);
    out.set(buf.subarray(0, iend), 0);
    let o = iend; for (const c of chunks) { out.set(c, o); o += c.length; }
    out.set(buf.subarray(iend), o);
    return new Blob([out], { type: 'image/png' });
  }

  async function exportBlob(p, fmt) {
    await fontsReady();
    const F = A.FORMATS[fmt], c = document.createElement('canvas');
    const id = draw(c, p, fmt, false, devOut());
    const blob = await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/png'));
    c.width = c.height = 0; // release backing store early (mobile)
    return { blob: await withMetadata(blob, p, id), id, w: F.w, h: F.h };
  }
  // v7 WP3 (F1): "Save the build" — an animated GIF of the build, from the link data only (choices + the exported
  // ring that devOut() allows), painted with the same renderer as the PNG. One reused canvas, released afterwards.
  async function exportGif(p, onProgress) {
    await fontsReady();
    const G = await OracleVendor.load('gifenc');
    const w = OracleGif.W, h = OracleGif.H, dev = devOut(), eng = E();
    const scene = eng.compose(p, w / h, dev), id = eng.compositionId(p, dev), RO = renderOpts(lookNow());
    const plan = OracleBuild.frames(eng.v, !!state.v2.title);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const paint = (f) => {
      const sc = f.groups ? OracleLayers.stage(scene, f.groups) : scene;
      A.render(ctx, sc, w, h, { ...RO, progress: f.progress, overlay: f.overlay ? overlay(p, id, dev) : null });
      return ctx.getImageData(0, 0, w, h).data;
    };
    const comment = `oracle:${enc(p)};id=${id};look=${lookNow().pal}-${lookNow().th}-${lookNow().ty}`;
    if (!clean(eng.software + ' ' + comment)) throw new Error('Oracle: a raw reading reached the GIF metadata');
    try {
      const bytes = await OracleGif.encode(G, plan, paint, { w, h, comment, onProgress });
      return { blob: new Blob([bytes], { type: 'image/gif' }), id, w, h, frames: plan.length, name: OracleGif.fileName(p.s) };
    } finally { c.width = c.height = 0; }
  }
  // v7 WP6 (F2): "Play sound" — tap only, never autoplays, about one second. Our AudioContext is created or resumed
  // synchronously inside the tap (iOS needs that), then ZzFX builds the samples from OracleSound.params(): the link's
  // seed and choices, plus the device pattern only if the link carries one (devOut()). ZzFX makes its own context
  // when it loads; that one is closed and ours is used. The samples are written with copyToChannel, never read back.
  let audio = null, voice = null;
  function stopSound() { if (voice) { const v = voice; voice = null; try { v.src.onended = null; v.src.stop(); } catch (e) { /* already ended */ } v.done(); } }
  function playSound(p, btn, st) {
    if (voice) { stopSound(); st('Sound stopped.'); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { st('Sound is not available in this browser.'); return; }
    if (!audio || audio.state === 'closed') audio = new AC();
    const resumed = audio.state === 'suspended' ? audio.resume() : Promise.resolve();
    const done = () => { btn.setAttribute('aria-pressed', 'false'); };
    btn.setAttribute('aria-pressed', 'true');
    const L = OracleSound.params(p, devOut());
    OracleVendor.load('zzfx').then(({ ZZFX }) => {
      if (ZZFX.audioContext !== audio) { try { if (ZZFX.audioContext && ZZFX.audioContext.close) ZZFX.audioContext.close(); } catch (e) { /* ignore */ } ZZFX.audioContext = audio; }
      const samples = ZZFX.buildSamples(...L);
      const buf = audio.createBuffer(1, samples.length, ZZFX.sampleRate);
      buf.copyToChannel(Float32Array.from(samples), 0);
      const src = audio.createBufferSource(); src.buffer = buf; src.connect(audio.destination);
      voice = { src, done }; src.onended = () => { if (voice && voice.src === src) { voice = null; done(); } };
      src.start();
      st('Playing your artwork as a sound (about ' + (samples.length / ZZFX.sampleRate).toFixed(1) + ' s).');
      return resumed.then(() => { if (audio.state !== 'running') st('No sound? Check your phone\u2019s silent switch.'); });
    }).catch(() => { voice = null; done(); st('Sound could not start here.'); });
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fallback below */ }
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove(); return ok;
  }

  // ── history (parameters only, this browser only) ──
  const readHist = () => { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (e) { return []; } };
  function remember(p, id) {
    try {
      const e = encChoices(p), h = readHist().filter(x => x.enc !== e);
      h.unshift({ enc: e, s: p.s, id }); localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 12)));
    } catch (e) { /* storage unavailable: history is optional */ }
  }
  function apply(p) {
    const v = state.v2;
    v.seed = p.s; v.offers = p.o; v.footprint = p.f;
    Object.assign(v.ex, { d: p.d, c: p.c, p: p.p, y: p.y, x: p.x, i: p.i });
    Object.assign(v.lab, { e: p.e, r: p.r, t: p.t, k: p.k, a: p.a, n: p.n });
  }
  function parseRestore(str) {
    str = String(str || '').trim();
    const m = /#(art|revelation)\?(.*)$/.exec(str);
    if (m) { state.v2.engine = OracleEngine.of(m[2]); if (state.v2.engine === 3) OracleFingerprint.setContext(OracleFingerprint.parseDevice(m[2])); return A.decode(m[2]); }
    if (/^ORACLE-[0-9A-Z]{4}-[0-9A-Z]{4}$/i.test(str)) { state.v2.fromUrl = false; if (window.OracleFingerprint && OracleFingerprint.context().mode === 'pattern') OracleFingerprint.setContext(null); }
    if (/^ORACLE-[0-9A-Z]{4}-[0-9A-Z]{4}$/i.test(str)) return A.normalize({ ...OracleChapters.artParams(), s: str.toUpperCase() });
    return null;
  }

  // v8 WP2: decorative icons beside visible captions (core/icons.js).
  const ic = (n, c) => window.OracleIcons ? OracleIcons.svg(n, c) : '';
  const FMT_ICON = { portrait: 'rectangle-vertical', story: 'smartphone', square: 'square', hires: 'image' };
  // What each answer drew (layered engine). Each line links back to the screen that changes it.
  function madeFrom(p) {
    const n = A.normalize(p), F = OracleLayers.factors(n), fd = OracleLayers.feedOf(n);
    const pl = (k, one, many) => `${k} ${k === 1 ? one : many}`;
    return [
      [`${pl(F.offers, 'red shard', 'red shards')}: the apps you trade with`, 'offer'],
      [`Lattice: ${F.cats} of 8 kinds of data`, 'extraction'],
      [`Network lines: social relationships ${F.rel ? 'ticked' : 'not ticked'}`, 'extraction'],
      [`Flow lines: ${fd ? OracleLayers.FEED_NAME[fd] : 'your own feed mix'}`, 'loop'],
      [`${pl(1 + Math.round(F.feedback * 5 + n.n / 4), 'echo', 'echoes')} around the core: ${pl(n.n, 'round', 'rounds')}`, 'loop']
    ].concat(E().v === 3 ? [[FP().describe(FP().context()).replace(/\.$/, ''), 'device']] : []);
  }
  // v6 WP5: one vertical, settings-style list. On open: Format, Title, the action rows and (engine 3) the share mode;
  // v7 WP4/WP6: "Save the build (GIF)" and "Play sound" join the open rows; Copy caption (beside the caption) and
  // Clean view (beside New seed) moved under More, so Options still opens with ≤12 controls.
  // everything else sits under one "More" row. `moreOpen` keeps "More" open across a re-render caused inside it.
  const optionsHtml = (p, id, fmt, hist) => `
    <fieldset class="opt-group"><legend><h3>Format</h3></legend>
    <div class="radio-cards opt-radios">${Object.entries(A.FORMATS).map(([k, f]) => `<label class="radio-card${k === fmt ? ' on' : ''}"><input type="radio" name="rv-fmt" value="${k}"${k === fmt ? ' checked' : ''}><span class="row-ic">${ic(FMT_ICON[k])}</span><span class="rc-text"><span class="row-title">${f.label.replace(/\s*\d+\u00d7\d+$/, '')}</span><span class="row-sub">${f.w}\u00d7${f.h}</span></span></label>`).join('')}</div></fieldset>
    <label class="opt-check"><input type="checkbox" id="rv-title" ${state.v2.title ? 'checked' : ''}>${ic('type')}Title on the image</label>
    <ul class="opt-rows">
      <li><button type="button" class="opt-rowbtn" id="rv-link">${ic('link')}Copy link</button></li>
      <li><button type="button" class="opt-rowbtn" id="rv-gif">${ic('film')}<span class="cap">Save the build (GIF)</span></button></li>
      <li><button type="button" class="opt-rowbtn" id="rv-sound" aria-pressed="false">${ic('volume-2')}<span class="cap">Play sound</span></button></li>
    </ul>
    ${E().v === 3 ? shareHtml() : ''}
    <details class="more-opts"${moreOpen ? ' open' : ''}><summary>${ic('chevron-down', 'i-sm')}More</summary><div class="more-body">
    <h3>Seed</h3>
    <div class="seed-line" id="seed-line">${esc(p.s)} <span class="small">composition ${esc(id)}</span></div>
    <p class="small" id="rv-look">Look: ${esc(lookLabel(lookNow()))} \u00b7 ${state.v2.look ? 'from the link' : 'follows site theme'}
      ${state.v2.look ? '<button type="button" class="btn-link" id="rv-unpin">Use site theme</button>' : ''}</p>
    <div><button type="button" class="opt-rowbtn" id="rv-new">New seed</button></div>
    <div><button type="button" class="opt-rowbtn" id="rv-clean">Clean view</button></div>
    ${E().v === 3 ? deviceMoreHtml() : ''}
    ${E().v >= 2 ? `<h3>What you made it from</h3><ul class="made-from">${madeFrom(p).map(([t, ch]) => `<li><span>${esc(t)}</span> <button type="button" class="btn-link" data-goto="${ch}">Edit</button></li>`).join('')}</ul>` : `<h3>About this artwork</h3><p>${esc(E().interpret(p))}</p><p class="small">Made with the earlier engine; it renders exactly as when it was shared.</p>`}
    <label for="rv-caption"><h3>Caption</h3></label>
    <textarea id="rv-caption" class="caption" rows="5" readonly>${esc(capOf(p, fmt))}</textarea>
    <div><button type="button" class="opt-rowbtn" id="rv-copy">Copy caption</button></div>
    <label for="rv-restore"><h3>Open a seed or link</h3></label>
    <div class="opt-row"><input id="rv-restore" type="text" inputmode="text" autocomplete="off" spellcheck="false" placeholder="ORACLE-XXXX-XXXX or a link"><button type="button" class="btn-quiet" id="rv-restore-btn">Open</button></div>
    <h3 id="rv-hist-label">Recent (this browser only)</h3>
    ${hist.length ? `<ul class="history" aria-labelledby="rv-hist-label">${hist.map((h, i) => `<li><span>${esc(h.s)} \u00b7 ${esc(h.id)}</span><button type="button" class="btn-link" data-hist="${i}">Open</button></li>`).join('')}</ul>
    <button type="button" class="btn-quiet" id="rv-clear">Clear history</button>` : '<p class="small">Nothing yet.</p>'}
    <p class="small">${E().v === 3 && devOut().mode === 'pattern' ? 'The link and the file hold the seed, your answers as numbers and an 8-character device pattern with a 3-character code. No readings, no server.' : 'The link and the file hold only the seed and your answers as numbers. No personal data, no server.'}</p>
    </div></details>`;
  // v5: share mode (Choices only by default), Remember this device (off by default), Forget everything.
  function shareHtml() {
    const c = FP().context(), mode = OraclePrivacy.share();
    if (c.mode !== 'full') return `<h3>Device ring</h3><p class="small">${c.mode === 'pattern' ? 'Drawn from the device pattern in the link you opened.' : 'Plain ring: no device readings used.'}</p>
      <ul class="opt-rows"><li><button type="button" class="opt-rowbtn" data-goto="device">Add the Device step</button></li></ul>`;
    const r = (v, t, sub) => `<label class="radio-card${mode === v ? ' on' : ''}"><input type="radio" name="rv-share-mode" value="${v}"${mode === v ? ' checked' : ''}><span class="rc-text"><span class="row-title">${t}</span><span class="row-sub">${sub}</span></span></label>`;
    return `<fieldset class="radio-cards opt-group"><legend><h3>Shared image</h3></legend>
      ${r('choices', 'Choices only', 'Nothing about this device leaves the tab.')}
      ${r('pattern', 'Choices + device pattern', 'Adds your rough time zone, core-count band and GPU family, never the readings.')}</fieldset>`;
  }
  // v6 WP5: Remember and Forget everything moved under "More" (behaviour unchanged).
  function deviceMoreHtml() {
    const c = FP().context();
    return `${c.mode === 'full' ? `<label class="opt-check"><input type="checkbox" id="rv-remember" ${OraclePrivacy.remember() ? 'checked' : ''}> Remember this device</label>
      <p class="small">Draws the same pattern next visit. Anyone using this browser profile could redraw it.</p>` : ''}
      <div><button type="button" class="opt-rowbtn" id="rv-forget">Forget everything</button></div>`;
  }

  OracleChapters.register('revelation', (app) => {
    ensureSeed();
    const p = params(), fmt = fmtOf(), id = E().compositionId(p);
    history.replaceState(null, '', '#revelation?' + enc(p) + '&fmt=' + fmt);
    if (!skipRemember) remember(p, id);
    skipRemember = false;
    const canNative = typeof navigator.share === 'function';
    app.innerHTML = `<div class="screen v4s s-revelation">
      ${U.topBar('revelation')}
      <div class="screen-grid art-grid">
        <header class="screen-head"><h1 tabindex="-1">Your artwork</h1><p class="small seed-tag">${esc(p.s)}</p></header>
        <figure class="art-frame art-stage"><canvas id="art-canvas" role="img" aria-label="Generative artwork ${esc(p.s)}: ${esc(E().interpret(p))}"></canvas></figure>
        <div class="screen-main">
          <p class="lead" id="rv-mode">${esc(leadText())}</p>
          <div class="screen-cta art-actions">
            <button type="button" class="btn-primary" id="rv-download">${ic('download')}Save image</button>
            <button type="button" class="btn-quiet" id="rv-share">${ic('share-2')}${canNative ? 'Share\u2026' : 'Share'}</button>
            <button type="button" class="btn-quiet" id="rv-options" aria-haspopup="dialog">${ic('sliders-horizontal')}Options</button>
          </div>
          <p class="status-line small" id="rv-status" role="status" aria-live="polite"></p>
          <p class="opt-row"><button type="button" class="btn-link" id="rv-restart">${ic('rotate-ccw', 'i-sm')}Start over</button><button type="button" class="btn-link" data-goto="extras">${ic('layout-grid', 'i-sm')}Extras</button></p>
        </div>
      </div>
    </div>`;

    const canvas = document.getElementById('art-canvas');
    fontsReady().then(() => draw(canvas, p, fmt === 'hires' ? 'portrait' : fmt, true));
    const status = (t) => { const el = document.getElementById('rv-status'); if (el) el.textContent = t; };
    const rerender = (keepSheet) => { const reopen = keepSheet && OracleSheet.isOpen(); OracleSheet.close(); OracleChapters.go('revelation', { push: false, focus: false }); if (reopen) openOptions(); };
    document.getElementById('rv-download').onclick = async () => {
      status('Rendering ' + A.FORMATS[fmt].label + '\u2026');
      const { blob, w, h } = await exportBlob(p, fmt);
      download(blob, fileName(p, fmt));
      // v6 WP10 (D8): where this browser can share image files (iOS Safari, Android Chrome), a download lands in
      // Files/Downloads, so say how to reach Photos. Feature detection only — no user-agent read.
      let tip = '';
      try { tip = navigator.canShare && navigator.canShare({ files: [new File([blob], fileName(p, fmt), { type: 'image/png' })] }) ? ' To put it in Photos, use Share \u2192 Save Image.' : ''; } catch (e) { tip = ''; }
      status(`Saved ${fileName(p, fmt)} (${w}\u00d7${h}, ${(blob.size / 1024).toFixed(0)} KB).${tip}`);
    };
    document.getElementById('rv-share').onclick = async () => {
      const caption = capOf(p, fmt);
      status('Preparing image\u2026');
      const { blob } = await exportBlob(p, fmt);
      const file = typeof File === 'function' ? new File([blob], fileName(p, fmt), { type: 'image/png' }) : null;
      try {
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'ORACLE // DIGITAL REMAINS', text: caption }); status('Shared.'); return; }
        if (typeof navigator.share === 'function') { await navigator.share({ title: 'ORACLE // DIGITAL REMAINS', text: caption, url: shareLink(p, fmt) }); status('Shared link and caption (this device cannot share image files).'); return; }
      } catch (e) {
        if (e && e.name === 'AbortError') { status('Share cancelled.'); return; }
      }
      download(blob, fileName(p, fmt));
      const ok = await copy(caption);
      status(`Sharing is not available here \u2014 image downloaded${ok ? ' and caption copied' : '; copy the caption in Options'}.`);
    };
    document.getElementById('rv-restart').onclick = () => {
      Object.assign(state.v2, OracleState.reduce(state.v2, { type: 'reset' }));
      state.v2.look = null; state.v2.ex = OracleContent.deriveEx(0); if (window.OracleFingerprint) OracleFingerprint.setContext(null); OracleChapters.go('approach');
    };
    function openOptions() {
      const hist = readHist();
      OracleSheet.open({ title: 'Options', html: optionsHtml(p, id, fmt, hist), from: document.getElementById('rv-options'), onOpen: (body) => {
        const st = (t) => { status(t); const s2 = body.querySelector('#rv-opt-status'); if (s2) s2.textContent = t; };
        body.insertAdjacentHTML('afterbegin', '<p class="small" id="rv-opt-status" role="status" aria-live="polite"></p>');
        const more = body.querySelector('.more-opts');
        if (more) more.addEventListener('toggle', () => { moreOpen = more.open; });
        body.querySelectorAll('[name=rv-fmt]').forEach(r => r.onchange = () => { state.v2.format = r.value; rerender(true); });
        body.querySelector('#rv-title').onchange = (e) => { state.v2.title = e.target.checked; rerender(true); };
        body.querySelector('#rv-new').onclick = () => { state.v2.seed = A.newSeed(); state.v2.engine = (OracleEngine.DEVICE || OracleEngine.LAYERED).v; state.v2.fromUrl = false; if (window.OracleDeviceStep) OracleDeviceStep.refresh().then(() => rerender(true)); else rerender(true); };
        body.querySelector('#rv-copy').onclick = async () => st((await copy(capOf(p, fmt))) ? 'Caption copied.' : 'Copy blocked \u2014 select the caption text.');
        body.querySelector('#rv-link').onclick = async () => st((await copy(shareLink(p, fmt))) ? 'Link copied.' : 'Copy blocked.');
        body.querySelector('#rv-clean').onclick = () => { OracleSheet.close(); OracleChapters.go('art', { hash: '#art?' + enc(p) + '&fmt=' + fmt + lookQuery(lookNow()) }); };
        // v7 WP4 (F1): the build as a GIF. Built only on this tap, from the link data; the button shows progress
        // (the live region announces start and end only), and a second tap while busy does nothing.
        const gifBtn = body.querySelector('#rv-gif');
        gifBtn.onclick = async () => {
          if (gifBtn.getAttribute('aria-disabled') === 'true') return;
          const cap = gifBtn.querySelector('.cap') || gifBtn, label = cap.textContent;
          gifBtn.setAttribute('aria-disabled', 'true');
          st('Building the GIF\u2026');
          try {
            const g = await exportGif(p, (d, n) => { cap.textContent = `Building\u2026 frame ${d} of ${n}`; });
            download(g.blob, g.name);
            let tip = '';
            try { tip = navigator.canShare && navigator.canShare({ files: [new File([g.blob], g.name, { type: 'image/gif' })] }) ? ' To put it in Photos, open it from Files and use Share \u2192 Save Image.' : ''; } catch (e) { tip = ''; }
            st(`Saved ${g.name} (${g.frames} frames, ${(g.blob.size / 1024).toFixed(0)} KB, plays once).${tip}`);
          } catch (e) {
            st('Could not build the GIF here. Save image still works.');
          } finally { cap.textContent = label; gifBtn.removeAttribute('aria-disabled'); }
        };
        const snd = body.querySelector('#rv-sound');
        snd.onclick = () => playSound(p, snd, st);
        const unpin = body.querySelector('#rv-unpin');
        if (unpin) unpin.onclick = () => { state.v2.look = null; rerender(true); };
        const doRestore = (q) => { if (!q) { st('Not a seed or Oracle link.'); return; } apply(q); status('Opened ' + q.s + '.'); (window.OracleDeviceStep ? OracleDeviceStep.refresh() : Promise.resolve()).then(() => rerender(false)); };
        body.querySelector('#rv-restore-btn').onclick = () => doRestore(parseRestore(body.querySelector('#rv-restore').value));
        body.querySelector('#rv-restore').onkeydown = (e) => { if (e.key === 'Enter') doRestore(parseRestore(e.target.value)); };
        const clr = body.querySelector('#rv-clear');
        if (clr) clr.onclick = () => { try { localStorage.removeItem(HKEY); } catch (e) { /* ignore */ } skipRemember = true; rerender(true); status('History cleared from this browser.'); };
        body.querySelectorAll('[data-hist]').forEach(b => b.onclick = () => { state.v2.engine = OracleEngine.of(hist[+b.dataset.hist].enc); if (state.v2.engine === 3) OracleFingerprint.setContext(OracleFingerprint.parseDevice(hist[+b.dataset.hist].enc)); doRestore(A.decode(hist[+b.dataset.hist].enc)); });
        body.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => OracleSheet.close()));
        body.querySelectorAll('[name=rv-share-mode]').forEach(r => r.onchange = () => { OraclePrivacy.setShare(r.value); rerender(true); st(r.value === 'pattern' ? 'Saved images and links now add your device pattern.' : 'Saved images and links carry your choices only.'); });
        const rem = body.querySelector('#rv-remember');
        if (rem) rem.onchange = () => { OraclePrivacy.setRemember(rem.checked); OracleDeviceStep.refresh().then(() => rerender(true)); };
        const fg = body.querySelector('#rv-forget');
        if (fg) fg.onclick = () => { OracleChapters.forgetEverything(); skipRemember = true; rerender(true); st('Forgotten. Browser permissions you granted stay until you reset them in site settings.'); };
      } });
    }
    document.getElementById('rv-options').onclick = () => { moreOpen = false; openOptions(); };
  });

  // Clean artwork view: only the work, plus minimal controls.
  OracleChapters.register('art', (app) => {
    ensureSeed();
    const p = params(), fmt = fmtOf();
    app.innerHTML = `<div class="art-only v4s">
      <canvas id="art-clean" role="img" aria-label="ORACLE // DIGITAL REMAINS ${esc(p.s)}"></canvas>
      <div class="art-bar">
        <button type="button" class="btn-quiet" id="ac-back">${ic('arrow-left')}Back</button>
        ${Object.entries(A.FORMATS).filter(([k]) => k !== 'hires').map(([k, f]) => `<button type="button" class="btn-quiet" data-afmt="${k}" aria-pressed="${k === fmt}">${f.w}\u00d7${f.h}</button>`).join('')}
        <button type="button" class="btn-primary" id="ac-dl">${ic('download')}Save image</button>
      </div></div>`;
    fontsReady().then(() => draw(document.getElementById('art-clean'), p, fmt === 'hires' ? 'portrait' : fmt, false));
    document.getElementById('ac-back').onclick = () => OracleChapters.go('revelation');
    app.querySelectorAll('[data-afmt]').forEach(b => b.onclick = () => { state.v2.format = b.dataset.afmt; OracleChapters.go('art', { hash: '#art?' + enc(p) + '&fmt=' + b.dataset.afmt + lookQuery(lookNow()), focus: false }); });
    document.getElementById('ac-dl').onclick = async () => { const { blob } = await exportBlob(p, fmt); download(blob, fileName(p, fmt)); };
  });

  // Repaint the artwork when the site theme changes (only while it is not pinned by a link).
  if (window.OracleTheme) OracleTheme.onChange(() => {
    if (state.v2.look || !['revelation', 'art'].includes(state.stage)) return;
    if (OracleSheet.isOpen()) OracleSheet.close();
    skipRemember = true; OracleChapters.go(state.stage, { push: false, focus: false });
  });
  // WP2: the small live preview shown in the headers of 01, 02 and 04 — same engine, same look as the 05 canvas,
  // portrait aspect, no overlay text. Drawn instantly (no draw-in), so nothing animates.
  // v4: `focus` (layer names) fades the other layers so one stands out (Reveal cards; layered engine only).
  function paintPreview(canvas, focus) {
    const p = params(), w = canvas.width, h = canvas.height;
    let scene = E().compose(p, A.FORMATS.portrait.w / A.FORMATS.portrait.h);
    if (focus && E().v >= 2) scene = OracleLayers.focus(scene, focus);
    A.render(canvas.getContext('2d'), scene, w, h, { ...renderOpts(lookNow()), overlay: null });
    canvas.setAttribute('aria-label', 'Your artwork so far: ' + E().interpret(p));
  }
  if (window.OracleTheme) OracleTheme.onChange(() => { const c = document.getElementById('pv-canvas'); if (c) paintPreview(c); });
  window.OracleExport = { paintPreview, exportBlob, exportGif, withMetadata, crc32, parseRestore, lookNow, renderOpts }; // exposed for QA
})();
