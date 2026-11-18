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
  const enc = (p) => A.encode(p) + E().q + devPart(devOut());
  const capOf = (p, fmt) => { const d = devOut(); return E().caption(p, E().compositionId(p, d), shareLink(p, fmt), d); };
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
    if (/^ORACLE-[0-9A-Z]{4}-[0-9A-Z]{4}$/i.test(str)) return A.normalize({ ...OracleChapters.artParams(), s: str.toUpperCase() });
    return null;
  }

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
    ];
  }
  const optionsHtml = (p, id, fmt, hist) => `
    <h3>Format</h3>
    <div class="radio-cards compact">${Object.entries(A.FORMATS).map(([k, f]) => `<label class="radio-card${k === fmt ? ' on' : ''}"><input type="radio" name="rv-fmt" value="${k}"${k === fmt ? ' checked' : ''}><span class="rc-text"><span class="row-title">${f.label}</span><span class="row-sub">${f.w}\u00d7${f.h}</span></span></label>`).join('')}</div>
    <label class="opt-check"><input type="checkbox" id="rv-title" ${state.v2.title ? 'checked' : ''}> Title on the image</label>
    <div class="opt-row"><button type="button" class="btn-quiet" id="rv-link">Copy link</button><button type="button" class="btn-quiet" id="rv-copy">Copy caption</button><button type="button" class="btn-quiet" id="rv-clean">Clean view</button></div>
    <h3>Seed</h3>
    <div class="seed-line" id="seed-line">${esc(p.s)} <span class="small">composition ${esc(id)}</span></div>
    <p class="small" id="rv-look">Look: ${esc(lookLabel(lookNow()))} \u00b7 ${state.v2.look ? 'from the link' : 'follows site theme'}
      ${state.v2.look ? '<button type="button" class="btn-link" id="rv-unpin">Use site theme</button>' : ''}</p>
    <div class="opt-row"><button type="button" class="btn-quiet" id="rv-new">New seed</button></div>
    ${E().v >= 2 ? `<h3>What you made it from</h3><ul class="made-from">${madeFrom(p).map(([t, ch]) => `<li><span>${esc(t)}</span> <button type="button" class="btn-link" data-goto="${ch}">Edit</button></li>`).join('')}</ul>` : `<h3>About this artwork</h3><p>${esc(E().interpret(p))}</p><p class="small">Made with the earlier engine; it renders exactly as when it was shared.</p>`}
    <label for="rv-caption"><h3>Caption</h3></label>
    <textarea id="rv-caption" class="caption" rows="5" readonly>${esc(capOf(p, fmt))}</textarea>
    <label for="rv-restore"><h3>Open a seed or link</h3></label>
    <div class="opt-row"><input id="rv-restore" type="text" inputmode="text" autocomplete="off" spellcheck="false" placeholder="ORACLE-XXXX-XXXX or a link"><button type="button" class="btn-quiet" id="rv-restore-btn">Open</button></div>
    <h3 id="rv-hist-label">Recent (this browser only)</h3>
    ${hist.length ? `<ul class="history" aria-labelledby="rv-hist-label">${hist.map((h, i) => `<li><span>${esc(h.s)} \u00b7 ${esc(h.id)}</span><button type="button" class="btn-link" data-hist="${i}">Open</button></li>`).join('')}</ul>
    <button type="button" class="btn-quiet" id="rv-clear">Clear history</button>` : '<p class="small">Nothing yet.</p>'}
    <p class="small">The link and the file hold only the seed and your answers as numbers. No personal data, no server.</p>`;

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
          <p class="lead">Made only from your answers. Nothing left this tab.</p>
          <div class="screen-cta art-actions">
            <button type="button" class="btn-primary" id="rv-download">Save image</button>
            <button type="button" class="btn-quiet" id="rv-share">${canNative ? 'Share\u2026' : 'Share'}</button>
            <button type="button" class="btn-quiet" id="rv-options" aria-haspopup="dialog">Options</button>
          </div>
          <p class="status-line small" id="rv-status" role="status" aria-live="polite"></p>
          <p class="opt-row"><button type="button" class="btn-link" id="rv-restart">Start over</button><button type="button" class="btn-link" data-goto="extras">Extras</button></p>
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
      status(`Saved ${fileName(p, fmt)} (${w}\u00d7${h}, ${(blob.size / 1024).toFixed(0)} KB).`);
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
      state.v2.look = null; state.v2.ex = OracleContent.deriveEx(0); OracleChapters.go('approach');
    };
    function openOptions() {
      const hist = readHist();
      OracleSheet.open({ title: 'Options', html: optionsHtml(p, id, fmt, hist), from: document.getElementById('rv-options'), onOpen: (body) => {
        const st = (t) => { status(t); const s2 = body.querySelector('#rv-opt-status'); if (s2) s2.textContent = t; };
        body.insertAdjacentHTML('afterbegin', '<p class="small" id="rv-opt-status" role="status" aria-live="polite"></p>');
        body.querySelectorAll('[name=rv-fmt]').forEach(r => r.onchange = () => { state.v2.format = r.value; rerender(true); });
        body.querySelector('#rv-title').onchange = (e) => { state.v2.title = e.target.checked; rerender(true); };
        body.querySelector('#rv-new').onclick = () => { state.v2.seed = A.newSeed(); state.v2.engine = OracleEngine.LAYERED.v; rerender(true); };
        body.querySelector('#rv-copy').onclick = async () => st((await copy(capOf(p, fmt))) ? 'Caption copied.' : 'Copy blocked \u2014 select the caption text.');
        body.querySelector('#rv-link').onclick = async () => st((await copy(shareLink(p, fmt))) ? 'Link copied.' : 'Copy blocked.');
        body.querySelector('#rv-clean').onclick = () => { OracleSheet.close(); OracleChapters.go('art', { hash: '#art?' + enc(p) + '&fmt=' + fmt + lookQuery(lookNow()) }); };
        const unpin = body.querySelector('#rv-unpin');
        if (unpin) unpin.onclick = () => { state.v2.look = null; rerender(true); };
        const doRestore = (q) => { if (!q) { st('Not a seed or Oracle link.'); return; } apply(q); status('Opened ' + q.s + '.'); rerender(false); };
        body.querySelector('#rv-restore-btn').onclick = () => doRestore(parseRestore(body.querySelector('#rv-restore').value));
        body.querySelector('#rv-restore').onkeydown = (e) => { if (e.key === 'Enter') doRestore(parseRestore(e.target.value)); };
        const clr = body.querySelector('#rv-clear');
        if (clr) clr.onclick = () => { try { localStorage.removeItem(HKEY); } catch (e) { /* ignore */ } skipRemember = true; rerender(true); status('History cleared from this browser.'); };
        body.querySelectorAll('[data-hist]').forEach(b => b.onclick = () => { state.v2.engine = OracleEngine.of(hist[+b.dataset.hist].enc); if (state.v2.engine === 3) OracleFingerprint.setContext(OracleFingerprint.parseDevice(hist[+b.dataset.hist].enc)); doRestore(A.decode(hist[+b.dataset.hist].enc)); });
        body.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => OracleSheet.close()));
      } });
    }
    document.getElementById('rv-options').onclick = openOptions;
  });

  // Clean artwork view: only the work, plus minimal controls.
  OracleChapters.register('art', (app) => {
    ensureSeed();
    const p = params(), fmt = fmtOf();
    app.innerHTML = `<div class="art-only v4s">
      <canvas id="art-clean" role="img" aria-label="ORACLE // DIGITAL REMAINS ${esc(p.s)}"></canvas>
      <div class="art-bar">
        <button type="button" class="btn-quiet" id="ac-back">Back</button>
        ${Object.entries(A.FORMATS).filter(([k]) => k !== 'hires').map(([k, f]) => `<button type="button" class="btn-quiet" data-afmt="${k}" aria-pressed="${k === fmt}">${f.w}\u00d7${f.h}</button>`).join('')}
        <button type="button" class="btn-primary" id="ac-dl">Save image</button>
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
  window.OracleExport = { paintPreview, exportBlob, withMetadata, crc32, parseRestore, lookNow, renderOpts }; // exposed for QA
})();
