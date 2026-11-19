# Oracle Protocol v7 Plan: Save the build, Sound signature, Honest masking, Draggable sheets

Status: BUILT on `oracle-v7` (WP0–WP10, 19 Nov 2026, Asia/Yerevan); PR into `prod`, not merged. See §11 for what differs from this plan. Plan written 19 Nov 2026 (Asia/Yerevan) against `prod` at `6718795` (PR #6, v6 merged).
Branch when approved: `oracle-v7` off `prod`, one commit per work package, PR into `prod`, never merged without the owner's approval.

Labels: **VERIFIED** = checked in code, a spike run on the box, or a cited source. **INFERRED** = our reasoning, not yet tested. **SIMULATED** = measured in headless Chromium on the box (desktop CPU, optional 4× CPU throttle), not on a phone.

## 1. Summary

The owner picked four features. Not chosen: the QR code and engine 4.

| # | Feature | Lands in | New files | CSP change |
|---|---|---|---|---|
| F1 | Save the build (GIF, gifenc 1.0.3) | `screens/artwork.js` Options, `art/layers.js` (pure stage helper), new `core/build-gif.js` | `vendor/gifenc-1.0.3/` | None |
| F2 | Sound signature (ZzFX 1.4.0, tap only) | Options, new `core/sound.js` | `vendor/zzfx-1.4.0/` | None |
| F3 | Honest masking label | `core/device.js` (new `masking()`), `core/privacy.js` (unchanged rule: only `ok` readings reach buckets), `screens/device.js` readout | none | None |
| F4 | Draggable sheet | `core/sheet.js`, `css/v6.css` (or new `css/v7.css`) | none | None |

Key facts behind the plan:
- **VERIFIED (spike):** an 8-frame draw-in GIF of the fixed reference `ORACLE-7K3F-Q9ZD` (v=2 link; the planned build frames are not built yet) is byte-identical across two separate Chromium contexts and with 4× CPU throttle (hash `56b8d4831c45d3c1…` at 540×675, global palette). Size 0.61 MB at 540×675, 1.70 MB at 1080×1350.
- **VERIFIED (spike):** ZzFX `buildSamples` with randomness 0 gives identical samples on repeated runs (hash `33657a2fb15d9517…`); with the default randomness 0.05 two runs differ.
- **VERIFIED (sources):** Brave (default), Firefox (canvas randomisation in the baseline from Firefox 151) and Safari (Advanced Fingerprinting Protection) add noise to canvas readback, so the PNG and GIF bytes differ in those browsers even though the picture looks the same. Byte-identity is therefore guaranteed only in a browser that does not add readback noise (our QA browser: Playwright Chromium), as the PNG export already is today.
- The art engines are untouched: `compose()`, `compositionId()`, link encoding and all 64 determinism PNG hashes stay as they are.

## 2. Where each feature lands (prod 6718795)

- `art/oracle-art.js`: `render(ctx, scene, w, h, {progress, overlay})` (draw-in by `progress`), `FORMATS` (portrait 1080×1350, hires 2160×2700), `_rng` = cyrb128→sfc32 stream (exported).
- `art/layers.js`: `focus(scene, groups)` fades other groups for the reveal cards; `group(scene, g)`. Groups: shards, lattice, network, flow, core (+ device ring in engine 3 via `art/fingerprint.js`).
- `screens/reveal.js`: six cards (five for v=2), each paints `OracleExport.paintPreview(cv, [group])`.
- `screens/artwork.js`: `draw()`, `exportBlob()` (PNG + tEXt metadata via `withMetadata`, guarded by `clean()`), `download()` via a blob URL, Share (files where `canShare`), Options sheet = vertical list (`optionsHtml`: Format radios, Title checkbox, rows Copy link / Copy caption / Clean view, Shared image mode, More).
- `core/device.js`: consent gate (`allowPassive()` before `readPassive()`); states ok / unavailable / denied / randomised; today "randomised" is set only when `navigator.brave` is present, plus an unstable canvas signature (two reads differ).
- `core/privacy.js`: `buckets()` and `canonical()` use only `state === 'ok'` readings, so anything marked randomised is already excluded from the art and the digest. `rawStrings()`/`findRaw()` guard links, files, captions and storage.
- `core/sheet.js`: native `<dialog>` with `showModal()`, history sentinel so Back closes the sheet (v6 WP8), keyboard lift (`--kb`), push/back stack. `.sheet-grab` exists (aria-hidden). `css/v6.css` sets `.sheet-panel{transition:none}`; ≥900 px it is a side panel.
- `sw.js`: cache-first, same-origin, `ASSETS` list + VERSION from `tools/sw-version.cjs`; `tests/sw.test.cjs` checks that every file `index.html` loads is in ASSETS.
- CSP (`index.html`): `default-src 'self'; connect-src 'none'; img-src 'self' data: blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`.

## 3. Vendored files (verified on the box)

| Library | Pin | File to vendor | Size | SHA-256 | Licence |
|---|---|---|---|---|---|
| gifenc | npm `gifenc@1.0.3` (tarball https://registry.npmjs.org/gifenc/-/gifenc-1.0.3.tgz, integrity `sha512-xdr6AdrfGBcfzncONUOlXMBuc5wJDtOueE3c5rdG0oNgtINLD+f2iFZltrBRZYzACRbKr+mSVU/x98zv2u3jmw==`, gitHead `15e2c3e` = tag v1.0.3) | `dist/gifenc.esm.js` (minified ES module, exports GIFEncoder, quantize, applyPalette, …) | 9,098 B | `217761244379253ba5815510d3048a4fb1f4c4dbe9fb51a5cfbfe26f34eec093` | MIT, © 2017 Matt DesLauriers (`LICENSE.md`, 1,083 B, sha256 `47bc590c…`) |
| ZzFX | npm `zzfx@1.4.0` (tarball https://registry.npmjs.org/zzfx/-/zzfx-1.4.0.tgz, integrity `sha512-yV/7JnIBPThWh/ZLVZLlmadms5bHQQeoWKKA+DafX4554FHypsop1BQrDHhsf2xxXweUmwjWrnpiB42uBGyGlQ==`); identical to GitHub HEAD `ac5a472` (file last changed in `751f171`, 30 Sep 2026) | `ZzFX.js` (ES module, exports `zzfx`, `ZZFX` with `buildSamples`, `playSamples`, `getNote`) | 10,301 B | `43f321101a935892c112a291e2e943b4da33159b43fcd4a21f3eae710f4a27ff` | MIT, © 2019 Frank Force (`LICENSE`, 1,089 B, sha256 `8917d3df…`) |

Code checks (VERIFIED by reading the files): neither file contains `fetch`, `XMLHttpRequest`, `eval`, `new Function`, `Worker` or `import()`. gifenc touches no DOM. ZzFX.js creates `new AudioContext` when the module is evaluated (line 62) and its frequency randomness uses `Math.random()` (line 134), which has no effect when randomness is 0. ZzFXMicro.min.js (1,226 B) also creates an AudioContext at load and plays immediately, with no separate sample builder, so it is not recommended (D7).

Layout (WP1):
```
vendor/README.md                 pins, tarball URLs, integrity, sha256 of each file, how to update
vendor/gifenc-1.0.3/gifenc.esm.js   byte-identical to the npm tarball
vendor/gifenc-1.0.3/LICENSE.md
vendor/zzfx-1.4.0/ZzFX.js           byte-identical to the npm tarball
vendor/zzfx-1.4.0/LICENSE
THIRD_PARTY_NOTICES.md           gifenc (MIT), ZzFX (MIT), cyrb128 + sfc32 from bryc/code (public domain / MIT fallback), fonts (SIL OFL 1.1, already in fonts/)
```
- Loading: both are ES modules; the app's classic scripts load them with `import('./vendor/…')` only on first use. Dynamic import is governed by `script-src` (MDN), and `'self'` allows it, so the CSP is unchanged.
- Service worker: add the two `.js` files to `ASSETS` (not the licences), rerun `node tools/sw-version.cjs`. Extend `tests/sw.test.cjs`: every `import('…')` path found in site JS must be in ASSETS. New `tests/vendor.test.cjs`: sha256 of each vendored file equals `vendor/README.md`, and the forbidden-API scan above stays empty.
- First paint unchanged: nothing in `vendor/` is in `index.html`; `qa/load.mjs` asserts no vendor request before the first tap.

CSP impact, item by item:
- `AudioContext` + `AudioBuffer` playback fetches nothing, so no `media-src` is needed (INFERRED from the CSP model: media-src governs media element loads). We never use an `<audio src=blob:>`.
- gifenc runs on the main thread (D6), so no worker. If a worker is ever chosen, `worker-src` falls back to `child-src`, then `script-src` (MDN), so a same-origin worker file is allowed; a `blob:` worker would not be and is not planned.
- `blob:` URLs: only for the download link, exactly as the PNG Save does today. No on-screen GIF preview, so `img-src blob:` is not newly used.

## 4. Feature specs

### F1. Save the build (GIF)

UX
- One new row in Options, under Copy caption: **Save the build (GIF)**, sub-line "A short animation of your layers, about 0.6 MB". Vertical list, nothing floating.
- Tap → status line "Making the GIF… 3 of 7" (role=status), the row is disabled while working, then the same save path as Save image: download, or the share sheet where `navigator.canShare({files})` is true (Chromium allows `.gif`/`image/gif`, VERIFIED). File name `oracle-<seed>-build-540x675.gif`.
- Nothing animates on screen. The GIF itself plays once (D3). Reduced motion does not change the file; the status text says it is an animation before saving.
- Frames (D2): one per reveal card, cumulative (shards → +lattice → +network → +flow → +core → +device ring for v=3), then the full artwork with the title overlay if "Title on the image" is on. Six or seven frames, 600 ms each, last frame 2.5 s. Legacy v1 links (no layers): eight draw-in frames using `render(…, {progress:k/8})`.

Privacy
- Frames are rendered from `compose(p, aspect, devOut())`, the same input the PNG uses, so the GIF carries exactly what the share mode allows: choices only by default, plus the device pattern only when the visitor chose it.
- Optional GIF Comment Extension (D4) with the same text as the PNG `Comment` chunk, run through `clean()`. No raw reading can reach it; the privacy leak scan is extended to `.gif`.

Determinism
- New pure helper `OracleLayers.stage(scene, groups)` drops items not in `groups` (a filter after compose; no random draws), so `compose()` and every PNG hash are untouched.
- One global palette quantised from the final frame (D5), `applyPalette` per frame, fixed delays and loop flag: same pixels in, same bytes out (VERIFIED in the spike).
- Byte-identical for a given link in the QA browser. Not identical across browsers or devices whose canvas rasterisation differs, or that add readback noise (Brave, Firefox baseline 151+, Safari with ATFP). VERIFIED that these browsers noise `getImageData`/`toBlob`; the effect on the quantised GIF is INFERRED.

Performance (SIMULATED, headless Chromium on the box, 8 frames)
| Size | Render | Encode | File | 4× throttle render / encode |
|---|---|---|---|---|
| 540×675, global palette | 40 ms | 98 ms | 613,247 B | 110 ms / 322 ms |
| 540×675, per-frame palette | 32 ms | 118 ms | 624,103 B | 113 ms / 418 ms |
| 1080×1350, global palette | 126 ms | 229 ms | 1,702,063 B | 447 ms / 849 ms |
| 1080×1350, per-frame palette | 104 ms | 304 ms | 1,731,429 B | 443 ms / 1,206 ms |

Memory: one reused canvas (540×675×4 = 1.46 MB) plus the frame buffers (about 10 MB for 7 frames), released (`width=height=0`) when done, well under the iOS Safari 384 MB canvas limit (VERIFIED limit, WebKit bug 195325). Yield to the event loop between frames so the status line updates.

### F2. Sound signature (ZzFX)

UX
- One row in Options: **Play sound** with sub-line "About one second. Your artwork as a sound." Tap only, never autoplays, no sound anywhere else (muted by default). Tapping again while it plays stops it; `aria-pressed` reflects playing. No visual animation.
- If the context does not start (iOS silent switch, blocked autoplay), the status line says "No sound? Check your phone's silent switch."

Mapping (new `core/sound.js`, pure, `SOUND_V = 1`)
- Input: the same params the link carries (seed + choices, plus `dg`/`db` only when they are in the link, D9).
- `rng = OracleArt._rng(canonical(p) + '|sound|v1')`. Notes from a pentatonic scale via `getNote`; Feed choice → wave shape; number of trades → attack and decay; Footprint count → tremolo; rounds → repeat; device pattern (if present) → a pitch jump. Randomness is always 0; volume capped at 0.5; length capped at 1.2 s.
- Output: a 20-number ZzFX parameter array. The sound is not part of the link, compositionId or any engine, so old links and `ORACLE-7K3F-Q9ZD` are unchanged.

Playback (iOS-safe)
- In the click handler, synchronously: create or reuse our own `AudioContext` and call `resume()` (iOS only resumes inside the user-event call stack; VERIFIED in MDN best practices and WebKit reports).
- Then `await import('./vendor/zzfx-1.4.0/ZzFX.js')`, close the context ZzFX made at import (`ZZFX.audioContext.close()`), build samples with `ZZFX.buildSamples(...params)`, write them with `buffer.copyToChannel()` (not `getChannelData().set`, because Brave and Safari noise `getChannelData` reads), and play on our context.

Determinism
- The parameter array is identical in every browser (sfc32 integer maths). VERIFIED for randomness 0 in Node (two runs, same hash).
- PCM samples use `Math.sin`, `cos` and `tan`, which can differ in the last bits between JS engines (INFERRED). Firefox switches `Math` to fdlibm under its fingerprinting protection (VERIFIED, Mozilla wiki). QA asserts sample hashes in Node and in Playwright Chromium (both V8).

### F3. Honest masking label

Goal: any browser that randomises or spoofs a reading is labelled "Randomised by your browser", and that reading is left out of the art and the digest. Today this happens only when `navigator.brave` is present.

Checks (new `masking(E)` in `core/device.js`, run inside `readPassive()`, so only after Show me):
- M1 Canvas known answer: `putImageData` a fixed 16×16 opaque pattern from a fixed seed, read it back with `getImageData`, compare exactly. Any difference → canvas and fonts randomised. Catches Brave farbling and Firefox canvas randomisation (both noise every readback; VERIFIED sources). Safari ATFP noises only painted pixels (VERIFIED, CanvasNoiseInjection.cpp), so M1 also draws a solid `fillRect` at integer coordinates and compares; whether that triggers Safari noise is INFERRED until tested.
- M2 Repeat read (exists): two signature reads differ → randomised.
- M3 Native integrity (CreepJS-style, rewritten, not copied): for each getter or method we read (`Navigator.prototype` hardwareConcurrency, deviceMemory, userAgent, languages; `Screen.prototype` width and height; `HTMLCanvasElement.prototype.toDataURL`; `CanvasRenderingContext2D.prototype.getImageData` and `measureText`; `WebGLRenderingContext.prototype.getParameter`; `Date.prototype.getTimezoneOffset`; `Intl.DateTimeFormat.prototype.resolvedOptions`): `Function.prototype.toString` must give the native form; no own-property shadow on the instance; no `prototype` on the function. A failure → that reading randomised, note "An extension or setting changes this value."
- M4 Consistency: time zone name vs offset; `screen` size vs `matchMedia('(device-width: …px)')`. A mismatch → randomised.
- Brave stays as today (cores, memory, GPU, canvas, fonts randomised; battery and network off).
- Not detectable, so not labelled randomised (D11): Firefox's tiered core counts (4 or 8) and Safari's fixed screen metrics. When a protection is detected the readout adds one line, "Your browser may also round some values," marked INFERRED.

Privacy: checks run in the tab after consent and keep only booleans and reason codes in `mem`. No new raw value is created, and the guard (`rawStrings`) is extended to the check outputs. `buckets()` and `canonical()` already use only `ok` readings, so no change to `core/privacy.js` logic is needed beyond tests.

Determinism: art engines are unchanged. For a visitor whose readings are newly labelled randomised, the in-tab ring and a remembered device pattern may differ from v6 (INFERRED, intended). Old links are unaffected because `dg`/`db` travel in the link as data (VERIFIED in code).

UX: one summary line at the top of the readout, "Your browser changes 3 of 15 readings to protect you", each affected row keeps the existing "Randomised by your browser" state, and ⓘ names the check. "How identifying is this?" counts only `ok` readings. Copy stays within the v6 word budgets (Device ask 33 words).

### F4. Draggable sheet (vaul-style port into core/sheet.js)

- Phones only (below 900 px). The desktop side panel does not drag.
- Drag starts on the grab handle and the header (D12), with `touch-action:none` there; `overscroll-behavior:contain` on the body. Pointer Events, touch and pen.
- While dragging, the panel follows the finger with `transform: translateY()` and no transition (direct manipulation, not animation).
- On release (vaul constants, VERIFIED in its source): close if dragged down more than 25 % of the panel height or flicked faster than 0.4 px/ms; otherwise settle at the nearest snap point (D13: half and full for long sheets such as Options and Sources; dismiss only for short ones).
- Settling is one 160 ms transform, played once and none under reduced motion (D14).
- Closing by drag calls the existing `close()`, so the history sentinel, focus return and `onClose` run exactly as for Close, Esc and Back (v6 WP8 path).
- Accessibility: dragging gets single-pointer alternatives (WCAG 2.2 SC 2.5.7, VERIFIED). Close stays, and the grab handle becomes a real button, "Expand" / "Collapse" with `aria-expanded`, when the sheet has two snap points. Focus never moves on drag. The keyboard lift (`--kb`) still applies.

## 5. Work packages

| WP | Title | Acceptance criteria | Tests |
|---|---|---|---|
| WP0 | Baseline | Branch `oracle-v7` off prod 6718795; all v6 suites green; 64 determinism hashes recorded; spike results copied to `docs/` | Unit, determinism, e2e Night and Day, contrast, axe, mobile 46/46, device-probe, load |
| WP1 | Vendor + notices | Files byte-identical to npm tarballs; `vendor/README.md`, `THIRD_PARTY_NOTICES.md`; SW ASSETS + VERSION; nothing loaded at first paint | `tests/vendor.test.cjs` (sha256, forbidden-API scan), extended `tests/sw.test.cjs`, `qa/load.mjs` (no vendor request before tap), CSP unchanged (string compare) |
| WP2 | Build stages (pure) | `OracleLayers.stage()` + `OracleBuild.frames(p, engine)`; compose and compositionId untouched | Unit: stage order and counts per engine; determinism 64/64 unchanged |
| WP3 | GIF encoder module | `core/build-gif.js`: lazy import, one reused canvas, global palette, delays, play once, Comment extension via `clean()`, release memory; returns `image/gif` Blob | Playwright: same link twice → identical SHA-256; fixed reference GIF hash recorded for v1, v2, v3 fixtures; size ≤ 1 MB at 540×675; leak scan of GIF bytes for raw readings |
| WP4 | Save the build UX | Options row, status progress, disabled while working, download or share; file name; no on-screen animation | e2e Night and Day; axe 0; contrast; mobile.mjs (row reachable at 360×640); share stub sees `image/gif` |
| WP5 | Sound mapping | `core/sound.js` pure; `SOUND_V=1`; params from link only; randomness 0; caps | Unit: snapshot of params for fixtures; identical across runs; volume ≤ 0.5, ≤ 1.2 s; Node sample hash |
| WP6 | Sound playback UX | Options row; context created and resumed in the tap; ZzFX's own context closed; `copyToChannel`; stop on second tap; no AudioContext before the tap | Playwright with an AudioContext spy: zero contexts before tap, samples hash equals Node hash, no playback on load or navigation; axe |
| WP7 | Masking checks | `masking()` M1–M4 in `readPassive()` only after consent; reasons in memory; Brave path unchanged | Unit with fake envs: clean Chromium (0 flags), Brave, Firefox-style XOR noise, Safari-style painted-pixel noise, spoofing extension, legit UTC user (0 flags); digest stable when noisy readings vary; privacy guard |
| WP8 | Masking UX | Summary line, row states, ⓘ text with check name and VERIFIED/INFERRED labels; word budgets | `qa/device-probe.mjs` extended (11 → about 16 checks); e2e with init-scripts that simulate farbling; axe; words.mjs |
| WP9 | Draggable sheet | Drag from grab and header; 25 % or 0.4 px/ms closes; snap points; one 160 ms settle or none under reduced motion; Expand/Collapse button; Back, Esc, Close unchanged | Playwright touch via CDP: 40 % drag closes and removes the history sentinel; 10 % drag stays; fast flick closes; snap; reduced-motion run; v6 WP8 Back tests; axe 0; mobile 46/46 |
| WP10 | QA, docs, PR | All suites green; GIF and sound hashes added to determinism; QA.md v7 with before/after; README; real-device checklist (Brave first); PR opened, not merged | Full suite run in Night and Day |

## 6. Platform notes

iOS / iPadOS Safari
- AudioContext must be created or resumed inside the tap handler's call stack, and touchend/click (not touchstart) is the reliable activation (VERIFIED: MDN Web Audio best practices; WebKit bug 248265; Stack Overflow 57510426).
- The ring/silent switch may mute Web Audio (INFERRED); hence the status hint.
- Total canvas memory is capped (384 MB on iOS 15+); release canvases by setting width and height to 0 (VERIFIED: WebKit bug 195325, PQINA).
- Share sheet "Save Image" keeps GIF animation in Photos (INFERRED; real-device check).
- Safari 26 applies its fingerprinting protection in regular browsing only to known fingerprinting scripts, so most visitors see no noise; ATFP "All Browsing" or Private Browsing adds canvas and audio readback noise (VERIFIED: WebKit Safari 26.0 and Private Browsing 2.0 posts).

Brave
- Farbling uses a per-session, per-site seed. Default mode flips low-order bits in `getImageData`/`toDataURL`/`toBlob` and slightly scales Web Audio reads; `hardwareConcurrency` reports between 2 and the true value (VERIFIED: Brave issues 9186 and 10808, Brave "Fingerprinting defenses 2.0").
- Consequences: GIF and PNG bytes differ from QA hashes in Brave (the picture looks the same), and the sound is written with `copyToChannel`, never read back.

Firefox
- Canvas randomisation is on in the baseline from Firefox 151 (desktop) and in FPP/private browsing from 145. Tiered `hardwareConcurrency` (4 or 8) and fdlibm `Math` apply in FPP (VERIFIED: Mozilla wiki "Fingerprinting", last updated 9 Nov 2026).
- Full `resistFingerprinting` (Tor-style) also fixes the time zone to UTC and spoofs other values; M4 must not flag a real UTC user (INFERRED).

Masking false positives (INFERRED, to test)
- A privacy extension that patches canvas legitimately is still "randomised by your browser". The copy says "your browser or an extension".
- Multi-monitor and zoom setups can make `screen` vs `device-width` disagree, so M4 compares with tolerance and needs two independent mismatches.

## 7. Risks

| # | Risk | Label | Mitigation |
|---|---|---|---|
| R1 | GIF and PNG bytes differ in Brave, Firefox 151+ and Safari ATFP (readback noise) | VERIFIED | Promise byte-identity only for the QA browser; say "looks the same" in docs; tie into the masking line |
| R2 | Canvas rasterisation differs across GPUs and OSes | INFERRED (the basis of canvas fingerprinting, VERIFIED by WebKit) | Determinism tested in Playwright Chromium, as for PNG today |
| R3 | GIF encode time on low-end phones | SIMULATED (0.43 s at 4× throttle, 540×675) | 540 px default, yield between frames, progress text |
| R4 | iOS AudioContext stays suspended if resumed after an await | VERIFIED | Resume synchronously in the tap; own context; close ZzFX's |
| R5 | ZzFX creates an AudioContext at import | VERIFIED (source) | Import only after the tap; close it; no patch to the vendored file |
| R6 | PCM differs across JS engines | INFERRED | Hash params everywhere, PCM only in V8 |
| R7 | Masking false positives (UTC users, multi-monitor, zoom) | INFERRED | Clean fixtures must give zero flags; M4 needs two mismatches |
| R8 | Masking false negatives (tiered cores, fixed screen) | VERIFIED protections exist; detection impossible INFERRED | Note line, not a randomised label |
| R9 | Safari noise only on painted pixels may evade M1 | VERIFIED behaviour, outcome INFERRED | Draw-and-read variant; real Safari ATFP test |
| R10 | Device pattern for some visitors changes vs v6 | INFERRED | Intended; old links carry dg/db as data |
| R11 | Drag conflicts with body scroll and iOS overscroll | INFERRED | Header-only drag, overscroll containment, touch tests |
| R12 | Dragging needs a single-pointer alternative | VERIFIED (WCAG 2.5.7) | Close button and Expand/Collapse button |
| R13 | Some viewers loop a play-once GIF | INFERRED | Accept; last frame holds 2.5 s |
| R14 | Vendor updates drift | INFERRED | sha256 pinned in tests; update only by a WP |

## 8. Decisions (recommended default first)

- D1 GIF size: **540×675** (0.61 MB) / 1080×1350 (1.70 MB).
- D2 GIF frames: **cumulative build, one per reveal card + final** / draw-in progress frames.
- D3 Loop: **play once** / loop forever.
- D4 GIF metadata: **Comment extension with the same text as the PNG** / none.
- D5 Palette: **one global palette from the final frame** / per-frame palettes.
- D6 Encoding thread: **main thread, yielding between frames** / a same-origin Worker.
- D7 ZzFX file: **full ZzFX.js 1.4.0, unmodified** / ZzFXMicro (needs a patch).
- D8 Sound placement: **Options row only** / also a button on the artwork screen.
- D9 Sound inputs: **only what the link carries (seed + choices, + dg/db if shared)** / always include the in-tab device ring.
- D10 Masking checks: **M1–M4, main thread** / also a Worker cross-check.
- D11 Undetectable generalisation (Firefox tiered cores, Safari fixed screen): **a note line only** / exclude those readings whenever any protection is detected.
- D12 Drag area: **grab handle + header** / whole sheet when scrolled to top.
- D13 Snap points: **half + full for long sheets, dismiss only for short** / dismiss only everywhere.
- D14 Settle motion: **one 160 ms transform, none under reduced motion** / always instant.

## 9. QA plan

- Unit: `node --test tests/*.test.cjs` + new `vendor`, `sound`, `build`, `masking` tests.
- Determinism: existing 64 PNG hashes unchanged; add GIF hashes (v1, v2, v3 fixtures) and sound sample hashes.
- End-to-end: `qa/v5.mjs` successor in Night and Day, mobile.mjs 46 targets, contrast (min 4.5), axe 0, load (vendor lazy), device-probe extended, privacy leak scan over links, PNG, GIF, captions and storage.
- Real devices (owner): Brave Android and desktop first, then iOS Safari (silent switch, share to Photos, drag), Firefox (canvas randomisation label), Safari with ATFP All Browsing.

## 10. Sources

- Brave, Fingerprinting defenses 2.0: https://brave.com/privacy-updates/4-fingerprinting-defenses-2.0/
- Brave issue 9186 (canvas farbling): https://github.com/brave/brave-browser/issues/9186
- Brave issue 10808 (hardwareConcurrency): https://github.com/brave/brave-browser/issues/10808
- JShelter, Brave farbling summary (incl. Web Audio): https://jshelter.org/farbling/
- Mozilla wiki, Fingerprinting (protections by version): https://wiki.mozilla.org/Fingerprinting
- Mozilla Security Blog, 10 Nov 2026: https://blog.mozilla.org/security/2026/11/10/open-research-stronger-privacy-making-firefox-users-harder-to-fingerprint/
- WebKit, Private Browsing 2.0: https://webkit.org/blog/15697/private-browsing-2-0/
- WebKit, Safari 26.0 features (privacy): https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- WebKit CanvasNoiseInjection.cpp: https://github.com/WebKit/WebKit/blob/2c0d424af07af5643f6a61691fa1d6f34a7f0b24/Source/WebCore/html/CanvasNoiseInjection.cpp
- WebKit PR 10367 (Web Audio noise): https://github.com/WebKit/WebKit/pull/10367
- MDN, Web Audio API best practices (autoplay): https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- Stack Overflow 57510426 (Safari resume in event call stack): https://stackoverflow.com/questions/57510426/cannot-resume-audiocontext-in-safari
- WebKit bug 248265 (touchend activation): https://bugs.webkit.org/show_bug.cgi?id=248265
- WebKit bug 195325 (canvas memory limit): https://bugs.webkit.org/show_bug.cgi?id=195325
- PQINA, total canvas memory: https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/
- MDN CSP worker-src: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/worker-src
- MDN CSP script-src: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src
- MDN navigator.share: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
- Chromium Web Share file allowlist: https://chromium.googlesource.com/chromium/src/+/0ffd3e1174ecb399d5bd7cdd8491530e3d5057c2/chrome/browser/webshare/share_service_impl.cc
- WCAG 2.2 SC 2.5.7 Dragging Movements: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- vaul constants (pinned): https://github.com/emilkowalski/vaul/blob/3e97aac6a38e4481bade71d7233ed6002e80f9b0/src/constants.ts
- CreepJS lies module (pinned): https://github.com/abrahamjuliot/creepjs/blob/10aa6724cd33a1015db1574211890518cd04f0cc/src/lies/index.ts
- arkenfox TZP: https://github.com/arkenfox/TZP
- gifenc 1.0.3 tarball: https://registry.npmjs.org/gifenc/-/gifenc-1.0.3.tgz ; ZzFX 1.4.0 tarball: https://registry.npmjs.org/zzfx/-/zzfx-1.4.0.tgz

Spike artefacts (not in the repo): `/workspace/oracle-qa/v7-plan/spike/` (spike.mjs, spike-results.json, zz.mjs, zz-results.json) and `/workspace/oracle-qa/v7-plan/vendor-check/`.

## 11. As built (19 Nov 2026, Asia/Yerevan)

One commit per work package on `oracle-v7` (WP0 `40d974e` … WP9 `97b08a9`, WP10 docs). Results and the real-device checklist: `docs/QA.md` → "v7 build".

| Plan | As built |
|---|---|
| `OracleBuild.frames(p, engine)` | `art/build.js` `frames(engineV, title)`: the frame list depends only on the engine and the title switch. Default title on → v1 8 frames, v=2 6, v=3 7. |
| GIF glue in `core/build-gif.js` | As planned; rendering stays in `screens/artwork.js` (`OracleExport.exportGif`), encoding streams one frame at a time (only one RGBA frame held), palette only on the first frame (global table, no local tables). |
| Options rows with sub-lines | Rows without sub-lines. To keep ≤12 controls on open, Copy caption and Clean view moved under More. |
| GIF: download or share | Download (plus the Photos tip where files can be shared), same as Save image. |
| Sound: 20-number array | 21 numbers (ZzFX 1.4.0 has 21 parameters incl. `filter`). Withheld/no-ring links use the choices-only sound. |
| Masking in `core/device.js` | As planned (`masking()`, M1–M4); results kept as booleans and reason codes (`OracleDevice.maskingResult()`); `core/privacy.js` logic unchanged. M4 screen check is skipped where `device-width` is unsupported. QA device fixtures now wrap their overrides to look native (they stand in for browser-native protections). |
| ⓘ text, sources | Three sources added to `data/evidence.js` (Brave fingerprinting defenses 2.0, Mozilla wiki Fingerprinting, WebKit Private Browsing 2.0; accessed 2026-11-19). The sheet body became a focusable region (axe scrollable-region-focusable). |
| `device-probe.mjs` 11 → ~16 | Not extended; new `qa/masking.mjs` (61 checks) covers the masking consent gate, labels and false positives. |
| Grab handle → Expand/Collapse button | Pointer-only handle (tap toggles half/full on long sheets). A focusable handle would be the 13th control on Options; keyboard users get the full sheet. New `css/v7.css`. |
| GIF and sound hashes in determinism | Pinned in `qa/gif.mjs` (8 GIF hashes), `tests/sound.test.cjs` and `qa/sound.mjs` (2 PCM hashes). |
