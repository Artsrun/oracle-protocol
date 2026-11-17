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
        <div class="sheet-grab" aria-hidden="true"></div>
        <div class="sheet-top"><button type="button" class="sheet-back btn-quiet" data-sheet-back hidden>Back</button><h2 id="sheet-title" class="sheet-title"></h2>
          <button type="button" class="sheet-close btn-quiet" data-sheet-close>Close</button></div>
        <div class="sheet-body" id="sheet-body"></div>
      </div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) return close();                 // backdrop
      if (e.target.closest('[data-sheet-close]')) close();
      if (e.target.closest('[data-sheet-back]')) back();
    });
    dlg.addEventListener('close', () => {
      const f = opener; opener = null; stack = []; cur = null;
      document.documentElement.classList.remove('sheet-open');
      if (onClose) { const fn = onClose; onClose = null; fn(); }
      if (f && document.contains(f)) f.focus();
    });
    return dlg;
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
    d.showModal();
    show(o);
    return d;
  }
  /** push(view): show another view in the open sheet (e.g. a source); Back returns to the previous one. */
  function push(o) { if (!isOpen()) return open(o); stack.push(cur); show(o); }
  function back() { if (stack.length) show(stack.pop()); }
  function close() { if (dlg && dlg.open) dlg.close(); }
  const isOpen = () => !!(dlg && dlg.open);
  window.OracleSheet = { open, push, back, close, isOpen };
})();
