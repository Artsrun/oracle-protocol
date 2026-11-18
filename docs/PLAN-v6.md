# Oracle Protocol v6 — Mobile UI/UX Plan

Status: **approved 2026-11-18 with defaults D1–D10; being built on branch `oracle-v6` (as-built notes in §As-built at the end).**
Written 2026-11-18 21:30 (Asia/Yerevan, UTC+4). Audited: `prod` @ `35d33d5` (PRs #3–#5 merged). The local server serves
the same bytes as https://artsrun.github.io/oracle-protocol (SHA-256 of `index.html`, `css/v4.css` and `screens/device.js` match).
Tools: headless Google Chrome 156.0.8078.47 via playwright-core, mobile emulation (`isMobile`, touch, DPR 3), Night and Day.

Evidence: `/workspace/oracle-qa/v6-plan/`
- `audit.json`: 13 screens × 5 viewports × 2 schemes (130 measurements). Script: `tools/audit.mjs`.
- `behaviour.json`: motion, Back/history/focus, keyboard, share/save, PWA/offline, safe area, load. Script: `tools/behave.mjs`.
- `tools/safe.mjs` (safe-area insets), `tools/extra.mjs` (320×568, 667×375, 932×430, 768×1024, text zoom).
- `shots/{dark,light}/<screen>-<view>.png` (first viewport) and `-full.png` (full page at 360 and 390).
- Contact sheets: `key-1-landscape-art-collapses.png`, `key-2-next-below-fold.png`, `key-3-small-preview-and-blur.png`, `key-4-options-sheet-and-keyboard.png`.

Labels: **VERIFIED** = measured in this audit, in Chrome's mobile emulation (real phones are still pending).
**INFERRED** = read from the code or a cited source, not measured. **SIMULATED** = an emulated condition that only
approximates the real one: on-screen keyboard, throttled network, notch insets.

---

## 1. Summary

On a portrait phone, v5 is already in good shape. There is no horizontal overflow at any size. All but one tap target
are at least 44 px. Animation stops (0 running animations, 0 rAF calls after 8 s). Nothing is fixed over content except
the bottom sheet, which opens only on a tap. On question screens the primary button sits at 90–98 % of the screen
height, in the thumb zone.

**What breaks is everything that is not a 390–430 px portrait phone:**
- **Landscape:** the artwork collapses to a 2 × 2 px dot.
- **Short phones:** Next is pushed off-screen.
- **Notched phones:** controls sit inside the safe-area insets.
- **The on-screen keyboard** hides the seed field.

Three further problems:
- The live art preview is a 112 × 140 px thumbnail, and the Reveal canvas is drawn at 0.42 × the pixels a 3 × screen needs.
- The Options sheet is the busiest surface in the app (25 controls, 146 words) and uses horizontal controls.
- Browser Back with a sheet open leaves the screen.

The v4/v5 carry-overs are still open:
- Trade has 14 controls and Footprint 19, against a target of 10.
- The Device ask is 42 words against 40, and the permission cards 44–50 against 30.
- Real devices have not been tested (Brave first).

v6 is a **fit-and-finish release for phones**, in 13 work packages (WP0–WP12). It adds no new chapters or content. The
privacy model, the art engines and the reference seed do not change.

## 2. Audit findings (measured)

### 2.1 What already works (keep)

| Check | Result | Label |
|---|---|---|
| Horizontal overflow | 0 px on all 13 screens × 9 viewports (320–1280), Night and Day | VERIFIED |
| Tap targets < 44 px | 0 on journey screens; 1 in Options (`Open` link in Recent, 31 × 44) | VERIFIED |
| Primary action position, portrait question screens | Top edge at 90–93 %, bottom at 98 % of the viewport (360/390/430) | VERIFIED |
| Motion (no reduced-motion preference) | 0 running animations and 0 rAF calls/2 s, 8 s after Start, Trade, Device, Loop, Reveal, Artwork | VERIFIED |
| Reduced motion | Global `prefers-reduced-motion` rule; starfield static; tilt has a slider fallback (`screens/device.js:111`) | INFERRED (code) |
| Sticky/fixed over content | Only `#sheet` (native `<dialog>`, opened by a tap) | VERIFIED |
| Escape closes the sheet; focus returns to the ⓘ that opened it | yes | VERIFIED |
| In-app navigation focus | H1 focused on Next/Back | VERIFIED |
| Outbound requests on load (live) | only `artsrun.github.io` | VERIFIED |
| Font sizes per screen | 3–4 (13/16/19/26 phone; 38 heading on desktop) | VERIFIED |
| Night vs Day | identical layout; only word counts differ by 2 on Device screens (scheme reading) | VERIFIED |
| axe / contrast | 0 violations, lowest 4.5:1 (v5 QA, `docs/QA.md`) | VERIFIED (v5 run) |

### 2.2 Problems, ranked

| # | Severity | Finding | Numbers | Label | Evidence |
|---|---|---|---|---|---|
| F1 | Critical | **Landscape: the artwork collapses** on Start, Reveal and Artwork | Canvas 2 × 3 / 2 × 2 / 2 × 2 CSS px at 844 × 390 and at 667 × 375. Cause: `calc((100svh - 470px) * .8)` and similar go negative (`css/v4.css:113,174,175`) | VERIFIED | `key-1-landscape-art-collapses.png`, `shots/dark/06b-artwork-land844.png` |
| F2 | High | **Landscape: question screens scroll, Next below the fold** | At 844 × 390: Trade 1.52 vp, Footprint 1.92, Device readout 1.81, Feed 1.48, Loop 1.28. At 667 × 375: Footprint 1.99, with Next at 187 % | VERIFIED | `shots/footprint-se-land-667x375.png` |
| F3 | High | **Short phones: Next off-screen** | At 360 × 640: Footprint 1.17 vp (Next at 107–114 %), Device readout 1.27 vp (Next at 117–124 %). At 320 × 568: Footprint 1.32 vp (Next at 124 %) | VERIFIED | `key-2-next-below-fold.png` |
| F4 | High | **Art too small and soft on phones** | Preview 112 × 140 CSS px on every question screen (4.8 % of a 390 × 844 screen) while Trade leaves about 270 px empty. Reveal bitmap 432 × 540 shown at 339 × 423 CSS px on a 3 × screen = 0.42 × the device pixels (430 px wide: 0.36 ×). Start 0.60 ×. Artwork 1.20 × (fine). Desktop 1.0 × | VERIFIED | `key-3-small-preview-and-blur.png` |
| F5 | High | **Safe-area insets ignored** on v4 screens, although the page asks for `viewport-fit=cover` | With emulated insets of 47 px top and 34 px bottom: Back is 8 px from the top and Next 16 px from the bottom, inside the 34 px home-indicator zone. `body.v4 #app{padding:0}` drops the old `--safe-t`/`--safe-b` padding. The sheet panel has 0 px bottom inset padding | SIMULATED (CDP `Emulation.setSafeAreaInsetsOverride`) | `tools/safe.mjs`, `shots/safearea-*.png` |
| F6 | High | **Inputs zoom on iOS and the keyboard hides the field** | `#rv-restore`, the caption textarea and the theme select are 13 px; iOS Safari zooms into focused fields under 16 px. With the keyboard simulated by shrinking the viewport to 508 px, the focused seed field ends at y 583, off-screen; the sheet does not scroll it into view | INFERRED (zoom: css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom) + SIMULATED (keyboard) | `key-4-options-sheet-and-keyboard.png` |
| F7 | High | **Browser Back with a sheet open leaves the screen** | Trade + open ⓘ sheet + history Back → Start (sheet gone, screen gone). This is the iOS edge-swipe and desktop path. Chrome on Android 126+ treats system Back as a close request for a modal `<dialog>`, so there it should close the sheet instead (developer.chrome.com/release-notes/126) | VERIFIED (history Back) / INFERRED (Android) | `behaviour.json` → back |
| F8 | Medium | **Focus after browser Back lands on `<body>`**; Device sub-steps (readout, three cards) and the cards are not in history | After Back, `document.activeElement` = BODY. Back from the Device readout skips the ask and leaves the step | VERIFIED | `behaviour.json` → back |
| F9 | Medium | **Options sheet overload, horizontal controls** | 25 controls, 146 words, 18 text runs under 14 px. Format is a 2 × 2 grid that prints each size twice ("1080×1350 / 1080×1350"). Copy link / Copy caption / Clean view sit in a horizontal pill row. Engine words ("composition C-…", "seed") on open | VERIFIED | `shots/light/06c-artwork-options-m390.png` |
| F10 | Medium | **Carry-over: v4 control targets missed** | Trade 14 controls, Footprint 19 (target ≤ 10): one ⓘ per row plus "How we guessed" | VERIFIED (re-measured) | `audit.json` |
| F11 | Medium | **Carry-over: v5 copy over budget** | Device ask 42 words (≤ 40); permission card 48–50 (≤ 30); readout 110–112 incl. rows | VERIFIED (re-measured) | `audit.json` |
| F12 | Medium | **Not installable, not offline** | No manifest, no `apple-touch-icon`, favicon `data:,`, 0 service workers; reloading offline fails (`ERR_INTERNET_DISCONNECTED`) | VERIFIED | `behaviour.json` → pwa |
| F13 | Medium | **First screen waits for 27 scripts** | 38 requests (27 scripts, 5 CSS, 4 fonts), 206 kB over the wire live (397 kB uncompressed). Begin visible after 2.1 s live from this box (FCP 0.5 s); 5.6 s with Slow 4G + 4 × CPU | VERIFIED (live) + SIMULATED (throttled) | `behaviour.json` → load |
| F14 | Low | **Footer chrome is a horizontal pill row and duplicates Extras** | Artwork shows Extras twice (screen link + footer). Footer = 3 pills + a select, in a row | VERIFIED | `shots/dark/06b-artwork-m390-full.png` |
| F15 | Low | **Cards: no swipe** | Loop (7) and Reveal (6) cards move with buttons and arrow keys only (`screens/loop-cards.js:38`, `reveal.js:50`) | INFERRED (code) | — |
| F16 | Low | **Sheet grabber is decorative** | `.sheet-grab` is `aria-hidden` with no drag handler; Apple HIG uses a grabber to mean "resizable" (developer.apple.com/design/human-interface-guidelines/sheets) | INFERRED (code) | `core/sheet.js` |
| F17 | Low | **Type ignores the browser's font-size setting** | Tokens are px (`--t-s:13px; --t-b:16px`); doubling the root font size leaves the H1 at 26 px | VERIFIED | `tools/extra.mjs` |
| F18 | Info | **Share on phones not testable headless** | Headless has no `navigator.share`; the fallback works (downloads `oracle-7k3f-q9zd-1080x1350.png`, 1080 × 1350, 1.4 MB, copies the caption, says so). The native share sheet, iOS "Save to Photos" and Brave behaviour are unverified | VERIFIED (fallback) / unverified (native) | `behaviour.json` → share |

### 2.3 Words and controls per screen (390 × 844, Night; whole page incl. header)

| Screen | Words | Controls | Options | Viewports at 360 × 640 / 390 × 844 / 844 × 390 |
|---|---|---|---|---|
| Start | 32 | 5 | 0 | 1.08 / 1.06 / 1.00 |
| Trade | 45 | 14 | 6 | 1.00 / 1.00 / 1.52 |
| Footprint | 47 | 19 | 8 | 1.17 / 1.00 / 1.92 |
| Device ask | 42 | 3 | 0 | 1.00 / 1.00 / 1.00 |
| Device readout | 112 | 10 | 0 | 1.27 / 1.00 / 1.81 |
| Device card | 50 | 3 | 0 | 1.00 / 1.00 / 1.00 |
| Loop card | 33 | 4 | 0 | 1.00 / 1.00 / 1.28 |
| Feed | 55 | 8 | 3 | 1.00 / 1.00 / 1.48 |
| Reveal card | 20 | 3 | 0 | 1.00 / 1.00 / 1.00 (art 2 px) |
| Artwork | 29 | 10 | 0 | 1.08 / 1.06 / 1.12 (art 2 px) |
| Options sheet | 146 | 25 | 5 | sheet scrolls inside |
| Extras | 59 | 8 | 0 | 1.08 / 1.06 / 1.49 |

## 3. Work packages (one commit each, branch `oracle-v6` off `prod`; PR opened, never merged without approval)

Priority: P0 = broken, P1 = clearly worse on phones, P2 = polish/robustness.

**WP0 — Baseline and mobile harness (P0).**
- Scope: add `qa/mobile.mjs`:
  - nine viewports: 320 × 568, 360 × 640, 390 × 844, 430 × 932, 667 × 375, 844 × 390, 932 × 430, 768 × 1024 and 1280 × 800;
  - Night and Day;
  - what it records: art size and backing ratio, viewports, primary-button position, safe-area insets (CDP), the simulated keyboard, the Back/focus script, the cards and the sheet.
- Accept: reproduces this audit's numbers within ±1; all existing suites green (unit 64/64, determinism 64/64, e2e 128/128 × 2, axe 0, contrast ≥ 4.5, device-probe 11/11).
- Test: run on `prod` before any change; logs go to `/workspace/oracle-qa/v6/wp/0/`.

**WP1 — Landscape layout and art floor (P0).**
- Scope:
  - When height ≤ 500 px, use two columns: art and heading on the left, options and Next on the right.
  - Give art boxes a floor (`max(160px, …)`) so no formula can go negative.
  - Fix Start, Reveal and Artwork sizing.
- Accept:
  - At 667 × 375, 844 × 390 and 932 × 430, every art canvas is ≥ 160 px tall.
  - Start, Device, Reveal and Artwork are ≤ 1.0 vp with the primary button in view.
  - Trade and Feed are ≤ 1.0 vp; Footprint ≤ 1.25 vp (after WP3).
  - Next sits directly under the last option, with no spacer gap.
  - Portrait numbers unchanged.
- Test: `mobile.mjs` landscape set; screenshots before and after.

**WP2 — Short-phone fit (P0).**
- Scope:
  - Under 700 px of height, use compact rows (44 px instead of about 49).
  - Readout rows put the label above the value, and long values wrap instead of ending in "…".
  - Smaller vertical gaps.
- Accept:
  - At 360 × 640, every journey screen is ≤ 1.0 vp with Next fully in view.
  - At 320 × 568, every screen is ≤ 1.1 vp.
  - Targets stay ≥ 44 px.
- Test: `mobile.mjs`.

**WP3 — One "Why these?" per question (P1, carries v4 F10).**
- Scope: replace the per-row ⓘ buttons and "How we guessed" with one quiet "Why these?" link under the list. It opens the existing sheet with one short section per option; the sources stay inside.
- Accept:
  - Trade 9 controls (6 options + Back + Next + Why); Footprint 11 (8 options + 3; see decision D2).
  - Every option's evidence is still reachable in ≤ 2 taps.
  - The SOURCES links are unchanged.
- Test: `load.mjs` counts; e2e sheet tests ported; axe.

**WP4 — Copy trims (P1, carries v5 F11).**
- Scope:
  - Device ask ≤ 40 words; each permission card ≤ 30.
  - Readout copy ≤ 60 words outside the six data rows.
  - Remove the duplicated size text on Format.
- Accept: e2e word assertions at those limits; no claim loses its VERIFIED/INFERRED/SIMULATED label or source.
- Test: `words.mjs`, `v5.mjs`.

**WP5 — Options sheet and footer, vertical (P1).**
- Scope:
  - Options becomes one vertical, settings-style list: Format as a vertical radio list; Copy link, Copy caption and Clean view as full-width list rows; "Shared image" (device mode) as a radio list.
  - Seed, caption, Open a seed and Recent go under one "More" row.
  - The footer becomes a vertical list (Sources, Forget everything, Theme), and the duplicate Extras is removed.
- Accept:
  - On open, Options shows ≤ 12 controls and ≤ 60 words.
  - No horizontal rows of choices remain.
  - Share-mode default and Forget everything behave exactly as in v5 (privacy tests unchanged).
- Test: e2e Options tests; privacy leak scan; screenshots.

**WP6 — Safe area, keyboard and type (P1).**
- Scope:
  - `env(safe-area-inset-*)` on `.screen`, the sheet panel and the footer (all four sides in landscape).
  - Text inputs and selects at ≥ 16 px.
  - When a field inside the sheet gains focus, scroll it into view, also on `visualViewport` resize.
  - Type tokens in rem, so the browser's font-size setting applies.
- Accept:
  - With 47/34 px portrait insets and 47/47 px side insets in landscape, Back sits ≥ inset + 8 px from the top and the primary button ≥ inset + 8 px from the bottom.
  - Every input is ≥ 16 px.
  - The focused field is fully visible with the keyboard simulated at 508 px.
  - At 200 % root size there is still no horizontal overflow.
- Test: CDP inset override, viewport-shrink keyboard simulation; real iPhone in WP12.

**WP7 — Sharp, larger art on phones (P1).**
- Scope:
  - On-screen canvases size their backing store to CSS size × min(devicePixelRatio, 3) and redraw on resize, debounced.
  - On phones the question-screen preview grows into the free space, up to 34 % of the viewport height (decision D7).
  - Exported PNG sizes do not change.
- Accept:
  - Every visible art canvas ≥ 0.95 × the device pixels it needs (capped at 3 ×).
  - Preview ≥ 25 % of the viewport height at 390 × 844 while every screen stays ≤ 1.0 vp.
  - Determinism 64/64 byte-identical.
  - Per-layer stability tests unchanged.
- Test: `mobile.mjs` backing ratio; `determinism.mjs`; layer unit tests.

**WP8 — Back, history and focus (P1).**
- Scope:
  - Opening the sheet adds one history entry, so Back (including the iOS edge swipe) closes the sheet first. Closing it by button, Escape or the Android close request removes that entry.
  - Device sub-steps (ask → readout → cards) get history entries (D4). Loop and Reveal cards do not.
  - On `popstate`, focus moves to the H1.
- Accept:
  - Back with the sheet open closes the sheet and stays on the screen.
  - Back from the readout returns to the ask.
  - Focus is on the H1 after Back.
  - No duplicate or orphan entries after 20 random open/close/Back sequences.
  - Old links and aliases still work.
- Test: scripted history suite in `mobile.mjs`; real Android (system Back) and iPhone (swipe) in WP12.

**WP9 — Swipe on cards (P2).**
- Scope: horizontal swipe (pointer events, threshold 40 px, ignoring the outer 24 px so it never fights the iOS back gesture) on Loop and Reveal cards. Buttons and arrow keys stay. No motion beyond the existing card change.
- Accept: swipe left/right changes the card in emulated touch; vertical scroll is unaffected; works with reduced motion.
- Test: touch-event script in `mobile.mjs`.

**WP10 — Share and save on phones (P2).**
- Scope:
  - Keep Save image and Share.
  - Where `navigator.canShare({files})` is true, Share sends the PNG file with the caption (as now). On iOS the share sheet is how an image reaches Photos, so one short line says so (D8).
  - Check the Brave and Firefox fallbacks; no new copy unless a real device shows a failure.
- Accept:
  - The fallback works in headless.
  - The real-device matrix (WP12) records Save, Share and Photos per browser.
  - The PNG carries only what the share mode allows (privacy scan).
- Test: e2e with stubbed share; WP12 by hand.

**WP11 — Fast start and offline (P2, decision D6).**
- Scope:
  - Static Start markup in `index.html`, so Begin shows before the 27 scripts run.
  - `defer` on scripts; preload the 4 first-screen fonts.
  - Add `manifest.webmanifest`, icons rendered once from the reference seed (static PNGs), `apple-touch-icon`, and a same-origin, cache-first service worker with a versioned cache.
  - No install prompt UI and no update banner: a new version applies on the next load.
  - CSP unchanged: `worker-src` and `manifest-src` fall back to `'self'` (developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/worker-src).
- Accept:
  - Begin visible ≤ 2.5 s with Slow 4G + 4 × CPU (5.6 s now).
  - Offline reload works after one visit.
  - 0 outbound requests.
  - A unit test fails if the SW asset list misses a file `index.html` loads or if the cache version was not bumped.
- Test: throttled load, `context.setOffline(true)`, network scan.

**WP12 — Real devices, QA report and PR (P0).**
- Scope:
  - The owner runs a one-page checklist on Brave (Android and iOS, shields on), iPhone Safari and Android Chrome; Firefox if available.
  - I run every suite, update `docs/QA.md` (v6 section) and the PLAN as-built notes, take before/after screenshots and open the PR (not merged).
- Accept: every suite green; the real-device matrix filled by the owner; any failure becomes a fix commit or a documented known issue.
- Test: the checklist (section 7).

## 4. Decisions needing the owner (recommended default first)

| # | Decision | Recommended default | Alternative |
|---|---|---|---|
| D1 | Landscape on phones | Two-column layout (art left, question right) | Stacked, scrolling layout with only the art-collapse bug fixed |
| D2 | Footprint control target | Accept 11 controls (8 kinds are the plan's own content + Back + Next + Why) | Cut to 6 kinds to hit 10 |
| D3 | Back while a sheet is open | Back closes the sheet (one temporary history entry) | Leave as is (Android closes natively; iOS leaves the screen) |
| D4 | History entries for sub-steps | Device sub-steps yes; Loop/Reveal cards no | Cards too (13 more Back presses) / none |
| D5 | Swipe on cards | Yes, swipe only; no tap zones | No gestures |
| D6 | Offline and installable | Yes: manifest, icons, cache-first service worker; no install prompt or banners | Skip WP11 (keep fewer files) |
| D7 | Preview size on phones | Grow into free space, up to 34 % of viewport height | Keep 112 × 140 |
| D8 | Saving to Photos on iPhone | Keep Save image (downloads) + Share (share sheet → Save Image), with one line of help on iOS only | Make Save image open the share sheet on iOS |
| D9 | Type in rem | Yes (respects browser font-size settings) | Keep px |
| D10 | Delivery | Branch `oracle-v6` off `prod`, one commit per WP, PR open, no merge | — |

## 5. Non-goals

- New chapters, new content or new device signals; camera, passkey creation and the wallet stay out.
- Bringing back the exchange simulator (it stays hidden behind `?simulator=1`).
- Any change to the art engines, the reference seed `ORACLE-7K3F-Q9ZD` or the legacy captions inside old artworks (e.g. "exchanges surrendered"); old links stay byte-identical.
- Analytics, crash reporting, remote device clouds or anything that sends data out; CSP stays `connect-src 'none'`.
- A framework or build step; a native app; orientation lock; push notifications; install banners; anything floating over content.

## 6. Risks

| Risk | Mitigation |
|---|---|
| A stale service-worker cache serves an old version after a deploy | Versioned cache plus a unit test that fails when assets change without a version bump; an escape hatch `?nosw=1` that unregisters |
| The history entry for the sheet double-pops when Android's native close request also fires | One close path (`dialog` `close` event) owns the history clean-up; 20-sequence randomised test; real Android check |
| The landscape layout or compact rows break the 1.0-viewport targets at other sizes | `mobile.mjs` runs all nine viewports each WP; screenshots compared |
| A bigger backing store costs memory on low-end phones | Capped at 3 ×; redraws debounced; only visible canvases |
| Swipe conflicts with the iOS edge-back gesture or vertical scroll | Ignore the outer 24 px; require a mostly-horizontal gesture; real iPhone check |
| Exports or the reference seed change by accident | Exports keep fixed sizes and their own code path; determinism 64/64 on every WP |
| Brave randomises device readings (farbling), so the pattern differs between sessions | Already handled in v5 (RANDOMISED rows); WP12 records it on real Brave (github.com/brave/brave-browser/wiki/Fingerprinting-Protections) |
| Real-device testing depends on the owner | Short checklist; headless emulation covers layout; failures become follow-up commits |

## 7. QA plan

- **Every WP:** unit 64/64+, determinism 64/64 byte-identical, e2e Night/Day, axe 0, contrast ≥ 4.5 in 6 looks, device-probe, privacy leak scan, 0 outbound requests, `mobile.mjs` across the nine viewports × 2 schemes.
- **New automated checks:**
  - art canvas ≥ 160 px and backing ≥ 0.95 ×;
  - ≤ 1.0 vp per screen at the sizes in WP1/WP2;
  - safe-area gaps under CDP insets;
  - inputs ≥ 16 px; focused field visible under the simulated keyboard;
  - Back/sheet/history sequences; focus on H1 after Back;
  - swipe on cards; offline reload; throttled Begin ≤ 2.5 s;
  - Options ≤ 12 controls / ≤ 60 words on open; Trade ≤ 9, Footprint ≤ 11 controls;
  - Device ask ≤ 40, cards ≤ 30 words.
- **Real-device checklist (owner, about 10 minutes per device):** Brave Android, Brave iOS, Safari iPhone, Chrome Android (Firefox optional). Per device:
  1. Portrait and landscape: art visible, Next reachable.
  2. Notch and home bar: nothing under them.
  3. Options seed field: no zoom; stays visible with the keyboard up.
  4. Back with a sheet open closes the sheet.
  5. Swipe through the cards.
  6. Save image and Share: where the file lands (Files or Photos).
  7. Device step rows (OK / UNAVAILABLE / RANDOMISED), tilt, location and mic prompts.
  8. Forget everything.
  9. Offline reload (if D6).
  10. Any errors.
- **Targets table** (390 × 844 unless noted):

| Measure | Now | v6 target |
|---|---|---|
| Art size in landscape (844 × 390) | 2 px | ≥ 160 px tall |
| Viewports, Footprint at 360 × 640 / 844 × 390 | 1.17 / 1.92 | 1.0 / ≤ 1.25 |
| Reveal canvas backing ratio at 3 × | 0.42 × | ≥ 0.95 × |
| Preview height | 140 px (17 % vh) | ≥ 25 % vh |
| Controls Trade / Footprint | 14 / 19 | 9 / 11 |
| Options on open: controls / words | 25 / 146 | ≤ 12 / ≤ 60 |
| Device ask / card words | 42 / 48–50 | ≤ 40 / ≤ 30 |
| Input font size | 13 px | ≥ 16 px |
| Safe-area gap (Back top / Next bottom with 47/34 insets) | 8 / 16 px | ≥ 55 / ≥ 42 px |
| Back with sheet open | leaves the screen | closes the sheet |
| Begin visible, Slow 4G + 4 × CPU | 5.6 s | ≤ 2.5 s |
| Offline reload | fails | works (D6) |

## 8. Sources

- WCAG 2.2 target size: w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html (44 px, AAA) and target-size-minimum.html (24 px, AA)
- Apple HIG, sheets and grabbers: developer.apple.com/design/human-interface-guidelines/sheets
- iOS form zoom under 16 px: css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/
- Viewport units (svh/dvh): web.dev/blog/viewport-units; keyboard resize behaviour on Chrome Android: developer.chrome.com/blog/viewport-resize-behavior
- Safe-area `env()`: developer.mozilla.org/en-US/docs/Web/CSS/env
- Thumb reach: uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php
- Android Back closes `<dialog>` (CloseWatcher): developer.chrome.com/blog/new-in-chrome-120, developer.chrome.com/release-notes/126
- Web Share with files: developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare
- CSP `worker-src` fallback: developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/worker-src
- Brave fingerprinting protections: github.com/brave/brave-browser/wiki/Fingerprinting-Protections

## 9. As-built notes (2026-11-18, Asia/Yerevan; branch `oracle-v6` @ 7055c9e, PR into `prod`, not merged)

Result: final harness 46/46 targets Night and Day (prod 13/46 on the same harness). Numbers: `docs/QA.md`, v6 section.

- **WP0** `qa/mobile.mjs` as planned. Changes to counting, documented in QA.md: visible words only; Options counts the sheet only;
  the "Next under the last option" gap is the empty band above the CTA row; an edge swipe that makes Chrome go Back counts as ignored by the app.
- **WP1** `css/v6.css` (loaded after v4.css). Height ≤ 500 px → art | heading | controls columns; art floors scoped to < 900 px wide so desktop sizes do not change.
- **WP2** compact rows under 700 px height. Readout values are no longer shortened with "…" (`short()` removed); the count moved into the lead.
- **WP3** one "Why these?" link per question (`#why-offer`, `#why-fp`); the sheet lists the options, each opens its evidence (2 taps).
- **WP4** Device ask 33 words, permission cards 24–25. The card body paragraph was dropped; Format rows name the format once with the size as the sub-line.
- **WP5** Options is one vertical list; seed, look, New seed, Remember/Forget, made-from, caption, restore and recent sit under a `More` disclosure
  (open state persists while the sheet is open, resets when Options is opened again). Footer is a vertical list; the duplicate Extras is gone.
- **WP6** type tokens in rem; `--s-pt/--s-px/--s-pb` include `env(safe-area-inset-*)`; sheet panel `bottom: var(--kb)` from `visualViewport`;
  focused fields scroll into view on focus and again after the panel settles (rAF + 150 ms).
- **WP7** `sizeCanvas` = CSS × min(DPR, 3), capped at 1440 px wide; `fitArt` binary-searches the largest preview that keeps Next in view
  (portrait < 900 px, ≤ min(45 % vw, 34 % vh)). Measured elements get `transition: none` because the reduced-motion rule
  (`transition-duration: .01ms`) otherwise lags computed sizes by a frame. Exports unchanged; determinism 64/64.
- **WP8** sheet adds one `{oracleSheet:1}` entry; Close/Esc/backdrop/Android close remove it; Device sub-steps push `{dev}` entries; focus on H1 after Back.
  WP12 fix: a navigation to a different URL while a sheet is open closes the sheet and routes (it used to be swallowed as Back).
- **WP9** `UI.swipe` (pointer events, touch only, 40 px, |dx| > 1.5|dy|, outer 24 px ignored), `touch-action: pan-y` on cards.
- **WP10** one line after Save image where `navigator.canShare({files})` is true ("Share → Save Image" for Photos); feature detection only, no UA.
- **WP11** scripts `defer` in `<head>`; static Start in `index.html` (hidden on deep links by `theme-boot.js`); 3 fonts preloaded
  (the plan said 4: IBM Plex Mono 500 is not on the Start screen, so preloading it would only waste bytes); `manifest.webmanifest`,
  icons rendered once from the reference seed (`tools/make-icons.mjs`); `sw.js` same-origin cache-first, version = content hash
  (`node tools/sw-version.cjs` after any site change, enforced by `tests/sw.test.cjs`); `?nosw=1` removes it; `beforeinstallprompt`
  suppressed, no update banner. CSP unchanged. `qa/sw-origin.mjs` checks every SW request and cache entry is same-origin.
- **WP12** suites, comparisons, QA.md real-device checklist (Brave first). Real-device matrix still to be filled by the owner.
- **Not met / not targeted:** Device readout 1.33 vp at 667×375 and 1.17 at 844×390; Extras 1.07–1.26 vp in landscape. Everything
  under SIMULATED (insets, keyboard, throttling) and all of WP10's Photos path still need a real phone.
