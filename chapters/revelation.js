/* 05 THE REVELATION — deterministic artwork from the visitor's abstract choices; export, share, restore.
 * Also registers the clean artwork view ('art' stage, #art?…). Uses art/oracle-art.js only for generation. */
(() => {
  const A = OracleArt, U = OracleChapters.ui, esc = U.esc;
  const HKEY = 'oracle.v2.history';
  let raf = 0, skipRemember = false;

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
  const shareLink = (p, fmt) => `${baseUrl()}#art?${A.encode(p)}&fmt=${fmt}${lookQuery(lookNow())}`;
  const fmtOf = () => A.FORMATS[state.v2.format] ? state.v2.format : 'portrait';
  const fileName = (p, fmt) => `oracle-${p.s.replace(/^ORACLE-/, "").toLowerCase()}-${A.FORMATS[fmt].w}x${A.FORMATS[fmt].h}.png`;

  async function fontsReady() {
    if (!document.fonts || !document.fonts.load) return;
    const T = TYPEFACES[lookNow().ty] || TYPEFACES.signal;
    try { await Promise.all([...T.load, '400 22px "IBM Plex Mono"', '500 18px "IBM Plex Mono"'].map(f => document.fonts.load(f))); } catch (e) { /* fall back to system fonts */ }
  }
  const overlay = (p, id) => ({
    title: state.v2.title ? 'ORACLE // DIGITAL REMAINS' : '', subtitle: state.v2.title ? 'THE ANATOMY OF ATTENTION' : '',
    seed: p.s, id, text: A.interpret(p), signature: 'ORACLE PROTOCOL'
  });

  function draw(canvas, p, fmt, animate) {
    const F = A.FORMATS[fmt], scene = A.compose(p, F.w / F.h), id = A.compositionId(p);
    canvas.width = F.w; canvas.height = F.h;
    const ctx = canvas.getContext('2d'), RO = renderOpts(lookNow());
    cancelAnimationFrame(raf);
    if (!animate || OracleChapters.reduceMotion()) { A.render(ctx, scene, F.w, F.h, { ...RO, overlay: overlay(p, id) }); return id; }
    const t0 = performance.now(), dur = 1400;
    const frame = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      A.render(ctx, scene, F.w, F.h, { ...RO, progress: 1 - Math.pow(1 - k, 3), overlay: k >= 1 ? overlay(p, id) : null });
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
    const chunks = [textChunk('Software', 'Oracle Protocol v2 / ORACLE // DIGITAL REMAINS v' + A.VERSION), textChunk('Comment', `oracle:${A.encode(p)};id=${id};look=${lookNow().pal}-${lookNow().th}-${lookNow().ty}`)];
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
    const id = draw(c, p, fmt, false);
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
      const enc = A.encode(p), h = readHist().filter(x => x.enc !== enc);
      h.unshift({ enc, s: p.s, id }); localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 12)));
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
    if (m) return A.decode(m[2]);
    if (/^ORACLE-[0-9A-Z]{4}-[0-9A-Z]{4}$/i.test(str)) return A.normalize({ ...OracleChapters.artParams(), s: str.toUpperCase() });
    return null;
  }

  function paramSummary(p) {
    const C = OracleContent, bits = (n, list) => list.filter((_, i) => (n >> i) & 1).map(x => x.title || x.name).join(', ') || 'none';
    return `<div class="param-sum">
      <div><b>Exchanges:</b> ${bits(p.o, C.OFFERS)} <button type="button" class="cite" data-goto="offer">edit</button></div>
      <div><b>Disclosed categories:</b> ${bits(p.f, C.FOOTPRINT)} <button type="button" class="cite" data-goto="extraction">edit</button></div>
      <div><b>Exchange dials:</b> disclosure ${p.d} \u00b7 convenience ${p.c} \u00b7 personalization ${p.p} \u00b7 dependency ${p.y} \u00b7 exposure ${p.x} \u00b7 influence ${p.i} <button type="button" class="cite" data-goto="offer">edit</button></div>
      <div><b>Attention lab:</b> emotion ${p.e} \u00b7 relevance ${p.r} \u00b7 repetition ${p.t} \u00b7 social ${p.k} \u00b7 amplification ${p.a} \u00b7 rounds ${p.n} <button type="button" class="cite" data-goto="loop">edit</button></div>
    </div>`;
  }

  OracleChapters.register('revelation', (app) => {
    ensureSeed();
    const p = params(), fmt = fmtOf(), id = A.compositionId(p);
    history.replaceState(null, '', '#revelation?' + A.encode(p) + '&fmt=' + fmt);
    if (!skipRemember) remember(p, id);
    skipRemember = false;
    const hist = readHist();
    const canNative = typeof navigator.share === 'function';
    app.innerHTML = `<article class="chapter ch-revelation">
      ${U.chapterHead('05 // THE REVELATION', 'The geometry of the exchange',
        'Your choices in chapters 01\u201304 \u2014 never your device readings \u2014 become one reproducible composition. Same seed and parameters, same artwork, anywhere.')}
      <div class="rev-grid">
        <div class="art-frame"><canvas id="art-canvas" role="img" aria-label="Generative artwork ${esc(p.s)}: ${esc(A.interpret(p))}"></canvas></div>
        <div class="rev-controls">
          <h2>ORACLE SEED</h2>
          <div class="seed-line" id="seed-line">${esc(p.s)}<small>composition ${esc(id)}</small></div>
          <p class="interp" id="interp">${esc(A.interpret(p))}</p>
          <div class="btn-row"><button type="button" class="btn-sm amber" id="rv-new">NEW SEED</button><button type="button" class="btn-sm" id="rv-vary">VARY PARAMETERS</button></div>

          <h2>FORMAT</h2>
          <div class="seg" role="group" aria-label="Export format">${Object.entries(A.FORMATS).map(([k, f]) => `<button type="button" data-fmt="${k}" aria-pressed="${k === fmt}">${f.label}</button>`).join('')}</div>
          <label class="check"><input type="checkbox" id="rv-title" ${state.v2.title ? 'checked' : ''}> Editorial title on artwork</label>
          <h2>LOOK</h2>
          <p class="param-sum" id="rv-look">${esc(lookLabel(lookNow()))} \u2014 ${state.v2.look ? 'pinned by the link you opened' : 'follows the site theme (Auto/Night/Day switch, top right)'}. Same seed + same look = identical PNG.
          ${state.v2.look ? '<button type="button" class="cite" id="rv-unpin">use site theme</button>' : ''}</p>

          <h2>EXPORT &amp; SHARE</h2>
          <div class="btn-row">
            <button type="button" class="btn-sm amber" id="rv-download">DOWNLOAD PNG</button>
            <button type="button" class="btn-sm amber" id="rv-share">${canNative ? 'SHARE\u2026' : 'SHARE (download + copy)'}</button>
            <button type="button" class="btn-sm" id="rv-copy">COPY CAPTION</button>
            <button type="button" class="btn-sm" id="rv-link">COPY LINK</button>
            <button type="button" class="btn-sm" id="rv-clean">CLEAN VIEW</button>
          </div>
          <div class="status-line" id="rv-status" role="status" aria-live="polite"></div>
          <label for="rv-caption" class="mini-label">Caption</label>
          <textarea id="rv-caption" class="caption" readonly>${esc(A.caption(p, id, shareLink(p, fmt)))}</textarea>

          <h2>RESTORE A COMPOSITION</h2>
          <div class="restore"><input id="rv-restore" type="text" inputmode="text" autocomplete="off" spellcheck="false" placeholder="ORACLE-XXXX-XXXX or a shared link" aria-label="Seed or link to restore"><button type="button" class="btn-sm" id="rv-restore-btn">RESTORE</button></div>
          <ul class="history" aria-label="Recent compositions in this browser">${hist.map((h, i) => `<li><span>${esc(h.s)} \u00b7 ${esc(h.id)}</span><button type="button" class="cite" data-hist="${i}">restore</button></li>`).join('')}</ul>
          ${hist.length ? `<button type="button" class="btn-sm" id="rv-clear">CLEAR HISTORY</button>` : ''}
          <p class="sim-note">Recent compositions are kept only in this browser\u2019s local storage, parameters only. The link contains the seed and abstract dial values \u2014 no sensor data, location or device identifiers.</p>
        </div>
      </div>
      <section class="panel"><h2 class="panel-title">What made this composition</h2>${paramSummary(p)}
        <p class="sim-note">Identity \u2192 central recursive triangle \u00b7 disclosure \u2192 lattice density \u00b7 relationships \u2192 amber network \u00b7 attention \u2192 flow field \u00b7 feedback \u2192 recursion and echoes \u00b7 influence \u2192 swirl distortion \u00b7 each surrendered exchange \u2192 a crimson shard.</p></section>
      ${U.chapterNav('loop', null)}
    </article>`;

    const canvas = document.getElementById('art-canvas');
    fontsReady().then(() => draw(canvas, p, fmt === 'hires' ? 'portrait' : fmt, true));
    const status = (t) => { document.getElementById('rv-status').textContent = t; };
    const rerender = () => { OracleChapters.go('revelation', { push: false, focus: false }); };

    document.getElementById('rv-new').onclick = () => { state.v2.seed = A.newSeed(); rerender(); };
    document.getElementById('rv-vary').onclick = () => {
      const r = crypto.getRandomValues(new Uint8Array(11)), keys = ['d', 'c', 'p', 'y', 'x', 'i'], lk = ['e', 'r', 't', 'k', 'a'];
      keys.forEach((k, j) => { state.v2.ex[k] = Math.max(0, Math.min(100, state.v2.ex[k] + (r[j] % 25) - 12)); });
      lk.forEach((k, j) => { state.v2.lab[k] = Math.max(0, Math.min(100, state.v2.lab[k] + (r[6 + j] % 25) - 12)); });
      rerender();
    };
    app.querySelectorAll('[data-fmt]').forEach(b => b.onclick = () => { state.v2.format = b.dataset.fmt; rerender(); });
    document.getElementById('rv-title').onchange = (e) => { state.v2.title = e.target.checked; rerender(); };
    document.getElementById('rv-download').onclick = async () => {
      status('Rendering ' + A.FORMATS[fmt].label + '\u2026');
      const { blob, w, h } = await exportBlob(p, fmt);
      download(blob, fileName(p, fmt));
      status(`Downloaded ${fileName(p, fmt)} (${w}\u00d7${h}, ${(blob.size / 1024).toFixed(0)} KB).`);
    };
    document.getElementById('rv-share').onclick = async () => {
      const caption = A.caption(p, id, shareLink(p, fmt));
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
      status(`Native sharing is not available here \u2014 PNG downloaded${ok ? ' and caption copied' : '; copy the caption below'}.`);
    };
    document.getElementById('rv-copy').onclick = async () => status((await copy(A.caption(p, id, shareLink(p, fmt)))) ? 'Caption copied.' : 'Copy blocked \u2014 select the caption text below.');
    document.getElementById('rv-link').onclick = async () => status((await copy(shareLink(p, fmt))) ? 'Link copied.' : 'Copy blocked.');
    document.getElementById('rv-clean').onclick = () => OracleChapters.go('art', { hash: '#art?' + A.encode(p) + '&fmt=' + fmt + lookQuery(lookNow()) });
    const unpin = document.getElementById('rv-unpin');
    if (unpin) unpin.onclick = () => { state.v2.look = null; rerender(); };
    const doRestore = (q) => {
      if (!q) { status('Not a seed or Oracle link.'); return; }
      apply(q); status('Restored ' + q.s + '.'); rerender();
    };
    document.getElementById('rv-restore-btn').onclick = () => doRestore(parseRestore(document.getElementById('rv-restore').value));
    document.getElementById('rv-restore').onkeydown = (e) => { if (e.key === 'Enter') doRestore(parseRestore(e.target.value)); };
    const clr = document.getElementById('rv-clear');
    if (clr) clr.onclick = () => { try { localStorage.removeItem(HKEY); } catch (e) { /* ignore */ } skipRemember = true; rerender(); status('History cleared from this browser.'); };
    app.querySelectorAll('[data-hist]').forEach(b => b.onclick = () => doRestore(A.decode(hist[+b.dataset.hist].enc)));
  });

  // Clean artwork view: only the work, plus minimal controls.
  OracleChapters.register('art', (app) => {
    ensureSeed();
    const p = params(), fmt = fmtOf();
    app.innerHTML = `<div class="art-only">
      <canvas id="art-clean" role="img" aria-label="ORACLE // DIGITAL REMAINS ${esc(p.s)}"></canvas>
      <div class="art-bar">
        <button type="button" class="btn-sm" id="ac-back">\u2190 STUDIO</button>
        ${Object.entries(A.FORMATS).filter(([k]) => k !== 'hires').map(([k, f]) => `<button type="button" class="btn-sm" data-afmt="${k}" aria-pressed="${k === fmt}">${f.w}\u00d7${f.h}</button>`).join('')}
        <button type="button" class="btn-sm amber" id="ac-dl">DOWNLOAD</button>
      </div></div>`;
    fontsReady().then(() => draw(document.getElementById('art-clean'), p, fmt === 'hires' ? 'portrait' : fmt, false));
    document.getElementById('ac-back').onclick = () => OracleChapters.go('revelation');
    app.querySelectorAll('[data-afmt]').forEach(b => b.onclick = () => { state.v2.format = b.dataset.afmt; OracleChapters.go('art', { hash: '#art?' + A.encode(p) + '&fmt=' + b.dataset.afmt + lookQuery(lookNow()), focus: false }); });
    document.getElementById('ac-dl').onclick = async () => { const { blob } = await exportBlob(p, fmt); download(blob, fileName(p, fmt)); };
  });

  // Repaint the artwork when the site theme changes (only while it is not pinned by a link).
  if (window.OracleTheme) OracleTheme.onChange(() => {
    if (state.v2.look || !['revelation', 'art'].includes(state.stage)) return;
    skipRemember = true; OracleChapters.go(state.stage, { push: false, focus: false });
  });
  window.OracleExport = { exportBlob, withMetadata, crc32, parseRestore, lookNow, renderOpts }; // exposed for QA
})();
