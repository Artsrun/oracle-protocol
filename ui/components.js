/* ORACLE PROTOCOL v4 — UI components as small string templates (no framework, no build).
 * Native controls only: checkboxes and radios inside fieldsets, buttons, a native <dialog> for the sheet.
 * Classic script + CommonJS (markup is unit-tested in Node). Behaviour is bound by the screens with event
 * delegation, so a component never needs inline handlers (CSP: script-src 'self'). */
(function (root) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const strip = (s) => String(s || '').replace(/<[^>]+>/g, '');
  const attrs = (o) => Object.entries(o || {}).filter(([, v]) => v !== false && v != null).map(([k, v]) => v === true ? ` ${k}` : ` ${k}="${esc(v)}"`).join('');

  /** A vertical list of full-row checkboxes. items: [{ title, sub?, on, info? }]; `info` adds an ⓘ button. */
  function checkList({ name, legend, hint, items, legendClass }) {
    return `<fieldset class="checklist" data-list="${esc(name)}">
      <legend class="${legendClass || 'q'}">${legend}</legend>
      ${hint ? `<p class="q-hint">${hint}</p>` : ''}
      <ul class="check-rows">${items.map((it, i) => `
        <li class="check-row${it.on ? ' on' : ''}">
          <input type="checkbox" id="${esc(name)}-${i}" data-${esc(name)}="${i}"${it.on ? ' checked' : ''}${it.sub ? ` aria-describedby="${esc(name)}-${i}-sub"` : ''}>
          <label for="${esc(name)}-${i}"><span class="row-title">${it.title}</span>${it.sub ? `<span class="row-sub" id="${esc(name)}-${i}-sub">${it.sub}</span>` : ''}</label>
          ${it.info ? `<button type="button" class="info" data-info="${esc(name)}:${i}" aria-haspopup="dialog" aria-label="Why we say this: ${esc(strip(it.title))}">i</button>` : ''}
        </li>`).join('')}
      </ul>
    </fieldset>`;
  }

  /** A native radio group drawn as cards. items: [{ id, title, sub }]; value = selected id. */
  function radioCards({ name, legend, items, value, legendClass }) {
    return `<fieldset class="radio-cards" data-list="${esc(name)}">
      <legend class="${legendClass || 'q'}">${legend}</legend>
      ${items.map(it => `
        <label class="radio-card${it.id === value ? ' on' : ''}">
          <input type="radio" name="${esc(name)}" value="${esc(it.id)}"${it.id === value ? ' checked' : ''}>
          <span class="rc-text"><span class="row-title">${it.title}</span>${it.sub ? `<span class="row-sub">${it.sub}</span>` : ''}</span>
        </label>`).join('')}
    </fieldset>`;
  }

  /** 5-segment progress. Announced as "Step n of 5". */
  function progress(step, total, label) {
    total = total || 5;
    return `<div class="progress" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${step}" aria-label="Step ${step} of ${total}${label ? ': ' + esc(label) : ''}">
      ${Array.from({ length: total }, (_, i) => `<i class="${i < step ? 'on' : ''}"></i>`).join('')}
    </div>`;
  }

  /** Dots for story cards (decorative; the card says "n of N" in text). */
  const dots = (n, at) => `<div class="dots" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i class="${i === at ? 'on' : i < at ? 'done' : ''}"></i>`).join('')}</div>`;

  /** Buttons: one primary per screen; the rest quiet. */
  const button = (label, o) => {
    o = o || {};
    return `<button type="button" class="${o.primary ? 'btn-primary' : o.link ? 'btn-link' : 'btn-quiet'}${o.cls ? ' ' + o.cls : ''}"${attrs(o.attrs)}>${label}</button>`;
  };

  /** Provenance badge. One meaning each: VERIFIED (sourced), INFERRED, SIMULATED, UNKNOWN. */
  const badge = (label) => `<span class="prov prov-${esc(String(label).toLowerCase())}">${esc(label)}</span>`;

  const api = { esc, strip, checkList, radioCards, progress, dots, button, badge };
  root.OracleUI = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
