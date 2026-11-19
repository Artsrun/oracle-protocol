/* ORACLE PROTOCOL v7 — "Save the build" GIF encoder glue (docs/PLAN-v7.md F1, D1–D6).
 * Uses the vendored gifenc 1.0.3 (vendor/, byte-identical to npm; loaded by core/vendor.js only on the tap).
 * - One global palette (D5): quantised from the FINAL frame, written once; every frame is mapped onto it.
 * - Plays once (D3): no NETSCAPE loop extension (gifenc repeat −1).
 * - A GIF Comment Extension (D4) carries the same text as the PNG Comment (seed + choices, never a raw reading),
 *   inserted just before the trailer.
 * - Encoding streams frame by frame on the main thread and yields between frames (D6), so the page stays responsive
 *   and only one RGBA frame is held at a time.
 * Pure helpers are CommonJS-exported for Node tests; nothing here touches the network. */
(function (root) {
  'use strict';
  const W = 540, H = 675; // D1: half the portrait format, same 4:5 aspect
  /** GIF89a Comment Extension: 0x21 0xFE, sub-blocks of ≤255 bytes, 0x00 terminator. ASCII only. */
  function commentBlock(text) {
    const bytes = [];
    for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); bytes.push(c < 128 ? c : 63); }
    const out = [0x21, 0xfe];
    for (let i = 0; i < bytes.length; i += 255) { const part = bytes.slice(i, i + 255); out.push(part.length, ...part); }
    out.push(0);
    return Uint8Array.from(out);
  }
  /** Insert the comment before the trailer byte (0x3B). */
  function withComment(gif, text) {
    if (gif[gif.length - 1] !== 0x3b) throw new Error('Oracle: not a finished GIF');
    const c = commentBlock(text), out = new Uint8Array(gif.length + c.length);
    out.set(gif.subarray(0, gif.length - 1), 0); out.set(c, gif.length - 1); out[out.length - 1] = 0x3b;
    return out;
  }
  /** Read every Comment Extension back (used by tests and the restore path to prove the file carries the link). */
  function readComments(gif) {
    const out = [], skipSub = (i) => { while (gif[i] !== 0) i += gif[i] + 1; return i + 1; };
    let i = 13; const flags = gif[10];
    if (flags & 0x80) i += 3 * (1 << ((flags & 7) + 1));
    while (i < gif.length) {
      const b = gif[i];
      if (b === 0x3b) break;
      if (b === 0x21) {
        const label = gif[i + 1]; let j = i + 2;
        if (label === 0xfe) { let s = ''; while (gif[j] !== 0) { for (let k = 1; k <= gif[j]; k++) s += String.fromCharCode(gif[j + k]); j += gif[j] + 1; } out.push(s); i = j + 1; } else i = skipSub(j);
      } else if (b === 0x2c) {
        const f = gif[i + 9]; let j = i + 10;
        if (f & 0x80) j += 3 * (1 << ((f & 7) + 1));
        i = skipSub(j + 1);
      } else break;
    }
    return out;
  }
  const yieldNow = () => new Promise(r => setTimeout(r, 0));
  /**
   * encode(G, plan, paint, opts) → Uint8Array
   *  G: the gifenc module; plan: OracleBuild.frames(); paint(frame) → RGBA Uint8ClampedArray (w×h);
   *  opts: { w, h, comment, onProgress(done, total), yield: bool }.
   */
  async function encode(G, plan, paint, opts) {
    const w = opts.w || W, h = opts.h || H, n = plan.length, step = opts.onProgress || (() => {});
    const palette = G.quantize(await paint(plan[n - 1]), 256, { format: 'rgb565' });
    const gif = G.GIFEncoder();
    for (let i = 0; i < n; i++) {
      const rgba = await paint(plan[i]);
      const index = G.applyPalette(rgba, palette, 'rgb565');
      gif.writeFrame(index, w, h, i === 0 ? { palette, delay: plan[i].delay, repeat: -1 } : { delay: plan[i].delay });
      step(i + 1, n);
      if (opts.yield !== false) await yieldNow();
    }
    gif.finish();
    return withComment(gif.bytes(), opts.comment || '');
  }
  const fileName = (seed) => `oracle-${String(seed).replace(/^ORACLE-/, '').toLowerCase()}-build-${W}x${H}.gif`;
  const api = { W, H, commentBlock, withComment, readComments, encode, fileName };
  root.OracleGif = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
