/* ORACLE PROTOCOL v4 — the one "see more" surface: a native <dialog> opened only when the visitor taps.
 * showModal() gives the focus trap, Esc and inert background for free; tapping the backdrop or Close shuts it
 * and focus returns to the control that opened it. Bottom sheet on phones, side panel on wide screens (CSS).
 * Nothing stays on screen when it is closed. */
(function () {
  'use strict';
  let dlg = null, opener = null, onClose = null, stack = [], cur = null;
  function ensure() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.id = 'sheet'; dlg.className = 'sheet';
    dlg.setAttribute('aria-labelledby', 'sheet-title');
    dlg.innerHTML = `<div class="sheet-panel">
        <div class="sheet-grab" aria-hidden="true"><span></span></div>
        <div class="sheet-top"><button type="button" class="sheet-back btn-quiet" data-sheet-back hidden>${window.OracleIcons ? OracleIcons.svg('arrow-left') : ''}Back</button><h2 id="sheet-title" class="sheet-title"></h2>
          <button type="button" class="sheet-close btn-quiet" data-sheet-close>${window.OracleIcons ? OracleIcons.svg('x') : ''}Close</button></div>
        <div class="sheet-body" id="sheet-body" tabindex="0" role="region" aria-labelledby="sheet-title"></div>
      </div>`;
    document.body.appendChild(dlg);
    initDrag(dlg);
    // v6 WP6: keep a focused field visible above the on-screen keyboard. --kb lifts the panel by the part of the
    // layout viewport the keyboard covers (iOS keeps the layout viewport; Android may resize it — both end at 0 or more).
    dlg.addEventListener('focusin', () => setTimeout(keepVisible, 60));
    if (window.visualViewport) visualViewport.addEventListener('resize', keepVisible);
    window.addEventListener('resize', keepVisible);
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) { if (Date.now() < quietUntil) return; return close(); } // backdrop (not the click that ends a drag or handle tap)
      if (e.target.closest('[data-sheet-close]')) close();
      if (e.target.closest('[data-sheet-back]')) back();
    });
    dlg.addEventListener('close', () => {
      if (dlg.open) return; // a stale close event: the sheet was reopened (e.g. Options re-rendered) before it fired
      // v6 WP8: closed by Close, Escape, the backdrop or an Android close request → drop the history entry we added.
      if (!closedByPop && isSentinel()) { ignorePop++; history.back(); }
      closedByPop = false;
      const f = opener; opener = null; stack = []; cur = null;
      dlg.querySelector('.sheet-panel').style.removeProperty('--kb'); resetDrag();
      document.documentElement.classList.remove('sheet-open');
      if (onClose) { const fn = onClose; onClose = null; fn(); }
      if (f && document.contains(f)) f.focus();
    });
    return dlg;
  }
  // v6 WP8: opening the sheet adds one history entry (same URL), so Back — including the iOS edge swipe — closes the
  // sheet first. onPop() is called by the app's popstate handler before it routes.
  let ignorePop = 0, closedByPop = false, sheetHref = '';
  const isSentinel = () => !!(history.state && history.state.oracleSheet);
  function onPop() {
    if (ignorePop > 0) { ignorePop--; return true; }            // our own history.back() after a close
    if (dlg && dlg.open && !isSentinel()) {
      closedByPop = true; dlg.close();
      return location.href === sheetHref; // Back to the screen under the sheet: done. A new URL (hash link, typed URL): route it.
    }
    if (isSentinel()) { history.replaceState(null, '', location.href); } // forward onto a stale sheet entry
    return false;
  }
  // ── v7 WP9 (F4, D12–D14): drag the bottom sheet by its grab handle or header (phones only, < 900 px).
  // The panel follows the finger downward. On release it closes past 25 % of its height or faster than 0.4 px/ms
  // (Vaul's thresholds); long sheets (taller than 60 % of the screen) also snap to half height and back to full.
  // A tap on the handle toggles half/full on long sheets. One 160 ms settle, none under reduced motion; no loop.
  // Closing goes through close(), so the history sentinel, onClose and focus return work as before. Keyboard and
  // screen-reader users are unaffected: the sheet opens full height and Close, Esc and Back still close it.
  const CLOSE_FRACTION = 0.25, CLOSE_VELOCITY = 0.4, SETTLE_MS = 160, HALF = 0.5, LONG = 0.6;
  let drag = null, settleTimer = 0, quietUntil = 0;
  const wide = () => window.matchMedia && matchMedia('(min-width: 900px)').matches;
  const reduce = () => (window.OracleChapters && OracleChapters.reduceMotion) ? OracleChapters.reduceMotion() : !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const panelOf = () => dlg && dlg.querySelector('.sheet-panel');
  const isLong = () => { const p = panelOf(), b = dlg.querySelector('#sheet-body'), t = dlg.querySelector('.sheet-top');
    return !!p && (b.scrollHeight + t.offsetHeight + 16) > window.innerHeight * LONG; };
  function settle(p, transform, then) {
    clearTimeout(settleTimer);
    if (reduce()) { p.style.transform = transform; p.style.removeProperty('transition'); if (then) then(); return; }
    p.style.setProperty('transition', `transform ${SETTLE_MS}ms ease-out`, 'important');
    p.style.transform = transform;
    settleTimer = setTimeout(() => { p.style.removeProperty('transition'); if (then) then(); }, SETTLE_MS + 20);
  }
  function setHalf(on) { const p = panelOf(); if (!p) return; p.classList.toggle('sheet-half', !!on); dlg.dataset.snap = on ? 'half' : 'full'; }
  function resetDrag() { const p = panelOf(); drag = null; clearTimeout(settleTimer); if (p) { p.style.removeProperty('transform'); p.style.removeProperty('transition'); } setHalf(false); }
  function initDrag(d) {
    const handles = [d.querySelector('.sheet-grab'), d.querySelector('.sheet-top')];
    const down = (e) => {
      if (wide() || (e.pointerType === 'mouse' && e.button !== 0) || e.target.closest('button, a, input, select, textarea')) return;
      const p = panelOf(); clearTimeout(settleTimer); p.style.removeProperty('transition');
      drag = { id: e.pointerId, el: e.currentTarget, y0: e.clientY, h: p.getBoundingClientRect().height, dy: 0, moved: false, s: [[e.clientY, e.timeStamp]] };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    };
    const move = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dy = e.clientY - drag.y0; if (Math.abs(drag.dy) > 6) drag.moved = true;
      drag.s.push([e.clientY, e.timeStamp]); if (drag.s.length > 6) drag.s.shift();
      if (drag.moved) { panelOf().style.transform = `translateY(${Math.max(0, drag.dy)}px)`; dlg.dataset.dragging = '1'; }
      e.preventDefault();
    };
    const up = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const g = drag; drag = null; delete dlg.dataset.dragging; quietUntil = Date.now() + 400; // the panel may have moved from under the finger
      const p = panelOf(), long = isLong(), half = p.classList.contains('sheet-half');
      if (!g.moved) { if (g.el.classList.contains('sheet-grab') && long) setHalf(!half); p.style.removeProperty('transform'); return; }
      // velocity over the last ~100 ms of samples, px/ms, positive = downward
      const last = g.s[g.s.length - 1]; let first = g.s[0];
      for (const x of g.s) if (last[1] - x[1] <= 100) { first = x; break; }
      const v = last[1] > first[1] ? (last[0] - first[0]) / (last[1] - first[1]) : 0;
      if (g.dy > 0 && (g.dy > g.h * CLOSE_FRACTION || v > CLOSE_VELOCITY)) { settle(p, `translateY(${Math.round(g.h)}px)`, () => { close(); }); return; }
      if (long && !half && g.dy > (g.h - window.innerHeight * HALF) / 2) { const keep = Math.max(0, g.dy - (g.h - window.innerHeight * HALF)); setHalf(true); p.style.transform = `translateY(${keep}px)`; void p.offsetHeight; settle(p, ''); return; }
      if (long && half && (g.dy < -30 || v < -CLOSE_VELOCITY)) { setHalf(false); settle(p, ''); return; }
      settle(p, '');
    };
    handles.forEach(h => { h.addEventListener('pointerdown', down); h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up); });
  }
  function keepVisible() {
    if (!dlg || !dlg.open) return;
    const vv = window.visualViewport, panel = dlg.querySelector('.sheet-panel');
    const kb = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
    panel.style.setProperty('--kb', kb + 'px');
    const a = document.activeElement;
    if (a && dlg.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) {
      const go = () => { if (document.activeElement === a) a.scrollIntoView({ block: 'center' }); };
      requestAnimationFrame(go); setTimeout(go, 150); // again once the panel's new height has settled
    }
  }
  function show(o) {
    const d = ensure();
    cur = o;
    d.querySelector('#sheet-title').textContent = o.title || '';
    d.querySelector('.sheet-back').hidden = !stack.length;
    const body = d.querySelector('#sheet-body');
    body.innerHTML = o.html || '';
    body.scrollTop = 0;
    if (o.onOpen) o.onOpen(body, d);
    const f = o.focus && body.querySelector(o.focus);
    if (f) { f.scrollIntoView({ block: 'center' }); f.focus({ preventScroll: true }); }
    else (stack.length ? d.querySelector('.sheet-back') : d.querySelector('.sheet-close')).focus();
  }
  /** open({ title, html, from, focus: selector, onOpen(body), onClose() }) */
  function open(o) {
    const d = ensure();
    if (d.open) { onClose = null; d.close(); }
    opener = o.from || document.activeElement;
    onClose = o.onClose || null;
    stack = [];
    document.documentElement.classList.add('sheet-open');
    resetDrag();
    d.showModal();
    if (!isSentinel()) history.pushState({ oracleSheet: 1 }, '', location.href);
    sheetHref = location.href;
    show(o);
    return d;
  }
  /** push(view): show another view in the open sheet (e.g. a source); Back returns to the previous one. */
  function push(o) { if (!isOpen()) return open(o); stack.push(cur); show(o); }
  function back() { if (stack.length) show(stack.pop()); }
  function close() { if (dlg && dlg.open) dlg.close(); }
  const isOpen = () => !!(dlg && dlg.open);
  window.OracleSheet = { open, push, back, close, isOpen, onPop, isSentinel };
})();
