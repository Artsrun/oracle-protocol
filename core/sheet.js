/* ORACLE PROTOCOL v4 — the one "see more" surface: a native <dialog> opened only when the visitor taps.
 * showModal() gives the focus trap, Esc and inert background for free; tapping the backdrop or Close shuts it
 * and focus returns to the control that opened it. Bottom sheet on phones, side panel on wide screens (CSS).
 * Nothing stays on screen when it is closed. */
(function () {
  'use strict';
  let dlg = null, opener = null, onClose = null;
  function ensure() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.id = 'sheet'; dlg.className = 'sheet';
    dlg.setAttribute('aria-labelledby', 'sheet-title');
    dlg.innerHTML = `<div class="sheet-panel">
        <div class="sheet-grab" aria-hidden="true"></div>
        <div class="sheet-top"><h2 id="sheet-title" class="sheet-title"></h2>
          <button type="button" class="sheet-close btn-quiet" data-sheet-close>Close</button></div>
        <div class="sheet-body" id="sheet-body"></div>
      </div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) return close();                 // backdrop
      if (e.target.closest('[data-sheet-close]')) close();
    });
    dlg.addEventListener('close', () => {
      const f = opener; opener = null;
      document.documentElement.classList.remove('sheet-open');
      if (onClose) { const fn = onClose; onClose = null; fn(); }
      if (f && document.contains(f)) f.focus();
    });
    return dlg;
  }
  /** open({ title, html, from, focus: selector, onOpen(body), onClose() }) */
  function open(o) {
    const d = ensure();
    if (d.open) d.close();
    opener = o.from || document.activeElement;
    onClose = o.onClose || null;
    d.querySelector('#sheet-title').textContent = o.title || '';
    const body = d.querySelector('#sheet-body');
    body.innerHTML = o.html || '';
    body.scrollTop = 0;
    document.documentElement.classList.add('sheet-open');
    d.showModal();
    if (o.onOpen) o.onOpen(body, d);
    const f = o.focus && body.querySelector(o.focus);
    if (f) { f.scrollIntoView({ block: 'center' }); f.focus({ preventScroll: true }); }
    else d.querySelector('.sheet-close').focus();
    return d;
  }
  function close() { if (dlg && dlg.open) dlg.close(); }
  const isOpen = () => !!(dlg && dlg.open);
  window.OracleSheet = { open, close, isOpen };
})();
