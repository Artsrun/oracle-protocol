# Oracle Protocol — QA report

## v5 build (branch `oracle-v5`, from 2026-11-18, Asia/Yerevan)

Plan: [docs/PLAN-v5.md](PLAN-v5.md). Branched from `oracle-v4` @ bfce77a (PR #4, still open; prod = 4526203).
Suites: `npm test` (unit), `qa/determinism.mjs` (byte-identical reference PNGs), `qa/v5.mjs` (end-to-end, renamed
from `qa/v4.mjs`; grows per WP), `qa/device-probe.mjs` (which device APIs each phase touches), `qa/contrast.mjs`,
`qa/load.mjs`. Device fixtures for mocked sensors: `qa/fixtures/devices.cjs`. Per-WP logs:
`/workspace/oracle-qa/v5/wp/<wp>/` (runner: `/workspace/oracle-qa/v5/run-suite.sh <wp>`).

### WP0. Baseline (oracle-v4 @ bfce77a, before any v5 change; Chrome 156.0.8078.47 via playwright-core)

| Suite | Night | Day |
|---|---|---|
| Unit (`npm test`) | 36/36 | – |
| `qa/determinism.mjs` v1 reference (`ORACLE-7K3F-Q9ZD`, legacy engine) | 16/16 | (both modes included) |
| `qa/determinism.mjs` v4 reference (same answers, `&v=2`, layered engine) — **new fixture, hashes recorded now** | 16/16 | (both modes included) |
| `qa/v4.mjs` → `qa/v5.mjs` end-to-end | 82/82 | 82/82 |
| Contrast, 6 looks × 11 views | 0 fails, lowest 4.50 | (both modes included) |
| `qa/device-probe.mjs` | 4/4: the journey reads no device API; rendering reads = `devicePixelRatio` only; 0 external requests | – |

v4 reference hashes (SHA-256 prefix, identical at DPR 1 and 3): Night portrait `a71362dcf4cc`, story `e61d200d0787`,
square `ca47ddb882da`, hi-res `8d60906c6cd0`; Day portrait `f60fbd13ae48`, story `8cff23afd905`, square
`700cd1aecb52`, hi-res `c1bbda452b15`.

## v5 build (branch `oracle-v5`, 2026-11-18, Asia/Yerevan)

Final run (WP10), logs in `/workspace/oracle-qa/v5/wp/10/`, Chrome 156 headless, sensors and browser APIs mocked in JS
(`qa/fixtures/devices.cjs`: pixel, iphone, windows, macff, brave, missing). No CDP sensor overrides, no real prompts.

| Suite | Result |
|---|---|
| Unit (`npm test`) | 64/64 |
| Determinism (v1, v2, v4 references + v5 ring withheld/pattern, Night/Day, DPR1/3, 4 formats) | 64/64 byte-identical |
| End-to-end `qa/v5.mjs` | Night 128/128, Day 128/128 |
| Contrast (6 looks × 14 views incl. 5 Device views) | 0 failing elements in 84 checks, lowest 4.5:1 |
| axe WCAG 2.1 A/AA | 0 violations on every screen, Device ask/readout/sheets/cards, Options, Brave readout |
| Device probe (API calls before consent) | 11/11; 0 calls to tilt/location/mic APIs before Allow |

Privacy leak scan (sentinel strings in the fixtures, plus coordinates): 0 hits in the URL, history, `localStorage`,
`sessionStorage`, PNG tEXt metadata (choices-only and pattern), caption and share payload; 0 requests leave localhost;
the pattern mode adds only `&dg=<8 hex>&db=<3 chars>`. Forget everything (Device step, Options, footer) leaves no `oracle.*`
key and strips `dg`/`db` from the address bar.

Targets (load.mjs, 390 × 844 and 1280 × 800, Night and Day identical except full-path word count ±8):

| Target | Measured | |
|---|---|---|
| Fast path ≤ 300 words | 298 (est. 80 s) | met |
| Taps to artwork ≤ 7 | 7 (e2e); load.mjs counts 10 incl. option ticks | met |
| ≤ 60 words per Device screen | ask 42, card 44–50, readout 110 incl. six data rows (≤ 60 copy excl. rows, e2e) | met with the rows-excluded reading |
| Device ask ≤ 40 words (§4 table) | 42 | missed by 2 |
| Permission cards ≤ 30 words each (§4 table) | 44–50 | missed |
| 1.0 viewport, ≤ 4 font sizes on Device screens | 1.0; 3 sizes (13/16/26 phone, 13/16/38 desktop) | met |
| Unsourced statistics 0 | every figure on the sheet links a source | met |

### Real-device matrix (to be completed by hand — not run)

| Device / browser | Rows shown on 3b (OK / UNAVAILABLE / RANDOMISED) | Tilt | Location | Mic | Forget | Errors / stuck spinners |
|---|---|---|---|---|---|---|
| iPhone, Safari | | | | | | |
| Android, Chrome | | | | | | |
| Windows, Chrome or Edge | | | | | | |
| macOS, Firefox | | | | | | |
| Any, Brave (shields on) | | | | | | |



## v4 build (branch `oracle-v4`, from 2026-11-17, Asia/Yerevan)

Plan: [docs/PLAN-v4.md](PLAN-v4.md). Branched from `ux-handover-wp0-6` @ 0aa162c (PR #3, still open; prod = 4526203).
New harnesses: `qa/determinism.mjs` (the fixed reference must stay byte-identical, 16 checks) and `qa/v4.mjs`
(the v4 end-to-end suite; it grows one section per work package).

### WP0. Baseline (before any v4 change, same machine, Chrome via playwright-core, local server)

| Suite | Dark | Light |
|---|---|---|
| Unit (`npm test`) | 14/14 | – |
| Legacy end-to-end `qa/qa.mjs` | 119/119 | 118/119 (1) |
| `qa/determinism.mjs` (portrait/story/square/hires × DPR 1 and 3) | 8/8 | 8/8 |
| `qa/v4.mjs` invariants (overlay-free, motion, axe, CSP, network, console) | 11/11 | 11/11 |
| Contrast `qa/contrast.mjs`, 6 looks × 9 views | 0 fails, lowest 5.18 | 0 fails |

(1) Pre-existing on the base branch: "preview uses the same look as the 05 canvas" reads `#dee5e5` against
`#eef1f0` in Day — the light preview background differs slightly from the look's paper colour. Not caused by v4;
the WP7 artwork stage replaces this preview.

Load at 390 px (Night; `qa/load.mjs`; Day matches): words 47 / 90 / 127 / 103 / 215 / 99 on Start, Trade,
Footprint, Loop, Feed, Artwork (681 total); page length 1 / 1.2 / 1.8 / 1.5 / 2.0 / 1.5 viewports; up to 6 font
sizes per screen; 10 px smallest text on the sensor demo. Before screenshots: `/workspace/oracle-qa/v4/before/`.

### WP1–WP10 results (final, after WP10, 2026-11-17, Asia/Yerevan; same machine and tools as WP0)

| Suite | Night | Day |
|---|---|---|
| Unit (`npm test`: core, layers, content, art, ranker) | 36/36 | – |
| `qa/determinism.mjs` (v1 reference `ORACLE-7K3F-Q9ZD`, 4 formats × DPR 1/3) | 16/16 byte-identical to WP0 | – |
| `qa/v4.mjs` end-to-end (WP3–WP10 + invariants + ported checks) | 82/82 | 82/82 |
| axe-core WCAG 2.1 A/AA, 10 screens × 390/1280 (inside `v4.mjs`) | 0 violations | 0 violations |
| Contrast `qa/contrast.mjs`, 6 looks × 11 views (incl. 3 sheet views) | 0 fails in 66 view×look checks, lowest 4.50 | (both modes included)
| Outbound requests (all runs) | 0 (only the deliberate CSP probe, blocked before sending) | 0 |

Per-WP runs are kept in `/workspace/oracle-qa/v4/wp/<wp>/` (unit, determinism, v4 Night/Day, contrast logs).
The legacy `qa/qa.mjs` ran green through WP2 (119/119 in both schemes) and was retired in WP10 (mapping below).

#### Targets (PLAN-v4 §11), measured with `qa/load.mjs` at 390×844 and 1280×860, Night and Day (identical numbers)

| Measure | Before (WP0) | v4 target | v4 result | |
|---|---|---|---|---|
| Visible words per question screen | 215 (Feed) | ≤ 60 | Trade 45 · Footprint 47 · Feed 55 (Loop cards 32–40, Reveal cards 19–24 incl. frame) | met |
| Visible words, whole path (as landed, same method as WP0) | 681 | ≤ 350 | 256 (Start 28, Trade 45, Footprint 49, Loop 33, Feed 55, Reveal 21, Artwork 25) | met |
| …reading every Loop and Reveal card too | – | – | 567 | over (frame text repeats per card) |
| Required decisions per screen | 8 + reading | ≤ 1 question | 1 fieldset on Trade, Footprint, Feed; 0 elsewhere | met |
| Options shown at once | 8 | ≤ 7 | Trade 6, Feed 3, Footprint **8** | missed on Footprint (the plan's own §7 asks for 8 kinds) |
| Controls per screen | 19 | ≤ 10 | Start 1, Loop 4, Feed 8, Reveal 3, Artwork 6, Trade **14**, Footprint **19** | missed on Trade/Footprint (rows + one ⓘ per row, as §7 specifies) |
| Page length | 2.0 viewports | 1.0 on question screens | 1.0 on every journey screen, both widths; sensor demo (optional) 1.2 | met |
| Art visible while answering | 01 only | 100% | Trade, Footprint, Loop, Feed, Reveal: in view | met |
| Preview change per single input | 43–56% of pixels | only the touched layer | v4.mjs WP4/WP6 + unit layer-stability: other layers 0 px change | met |
| Font sizes per screen | 6 | ≤ 4 | 3–4 (13/16/19/h1), nothing under 13 px on journey screens | met |
| Taps to the artwork (fast path) | 5 + scrolling | ≤ 7, no scrolling | 6 navigation taps (9 with two trades and a feed picked), 0 scrolls | met |
| Scripted time to finish (238 wpm + 1 s/decision) | ≈ 3–3.5 min | ≤ 2 min | 69 s fast path; 147 s reading every card | met on the fast path, over by ~27 s reading all 12 cards |
| axe / contrast | 0 / ≥ 4.5 | 0 / ≥ 4.5 in 6 looks | 0 / lowest 4.50 | met |
| Outbound requests | 0 | 0 | 0 | met |
| v1 reference PNG | identical | identical | 16/16 byte-identical | met |
| Touch targets under 44 px | up to 6 per screen (Artwork) | – | 0 on every screen | |

Not measured: the qualitative 5-person hallway test (needs the owner). Screenshots: before
`/workspace/oracle-qa/v4/before/{dark,light}/`, after `/workspace/oracle-qa/v4/after/{dark,light}/`, compare sheets
`/workspace/oracle-qa/v4/compare-{dark,light}-{mobile,desktop}.png`.

Not verified: real phones, Safari, Firefox; native Web Share (only a stubbed `navigator.share`); real sensor LIVE
events (headless Chrome has no motion sensors, camera or microphone). Lowest contrast fell from 5.18 to 4.50 (still AA):
secondary text on the sodium look in Day.

#### Deliberate test changes (behaviour changed on purpose)

- WP2 qa.mjs cross-engine determinism: Node id from `art/layers.js`, link must carry `v=2` (new artworks use the layered engine).
- WP2 qa.mjs shared-link determinism: the test's link includes `&v=2`, as Copy link produces it.
- WP2 qa.mjs "preview uses the same look": background read as the most common colour instead of pixel (0,0), where a line can sit (this was the pre-existing Day failure).
- WP2 tests/core.test.cjs: `parseHash('#offer')` returns `{ route }` (written to the actual contract).
- WP3 contrast.mjs: Sources view opened from Start (the footer is hidden on question screens to keep one viewport).
- WP9 contrast.mjs: Sources measured in the sheet; two sheet views added (Who is in this loop, Artwork Options).
- WP9 contrast.mjs: waits for finite CSS animations to end before measuring (the sensor demo fade-in gave a false 4.4:1).
- WP10 load.mjs: no `.appbar` in v4 (appbarPx null), Reveal and Extras measured, scripted walk added (words per card, taps, decisions, time estimate).
- WP10 qa.mjs retired; its still-relevant checks were ported into v4.mjs (table below).

#### qa.mjs → v4.mjs (WP10)

| qa.mjs check(s) | Status | Where / why |
|---|---|---|
| approach: one entry action | kept | v4 WP3 "Start has one question-free promise and Begin opens step 1" |
| handshake anonymous ID; #protocol deep link | ported | v4 WP10 "#protocol opens the optional identity step…" |
| harvest DENIED (geo, mic, cam) / OK (gpu, cpu, net, base) | kept | v4 WP9 "location without permission reads DENIED", "a passive read shows OK" |
| harvest UNAVAILABLE never LIVE (orient, shake); rows keyboard-activatable | ported | v4 WP10 (two checks) |
| granted geolocation shown locally | kept | v4 WP9 "granted location reads OK, is shown only on the page and is never stored" |
| after grant: animations settle; no replay | ported | v4 WP10 "after reading sensors every animation settles…" |
| witness portrait + hash, geo panel, continue-to-machine | replaced | v4 WP9 "portrait opens and leads back to Extras" (the demo is after the artwork now) |
| reset clears collected | replaced | v4 WP7 "Start over returns to Start with nothing chosen" |
| CSP blocks fetch | kept | v4 invariants (both widths) |
| keyboard Tab + Enter starts | ported | v4 WP10 |
| offer: simulator hidden; ?simulator=1 restores it | replaced | v4 WP9 "the hidden Exchange simulator is gone" (simulator deleted, approved default 5) |
| offer: 6-row checklist, bitmask, dials from trades, Space toggles | replaced | v4 WP4 Trade checks + unit tests (state reducer, footprint prefill) |
| offer: evidence collapsed / row disclosure / accordion | replaced | v4 WP4 "tapping ⓘ opens a modal sheet with the VERIFIED claim…" (no disclosures, approved default 4) |
| sources drawer from a citation; Esc returns focus | replaced | v4 WP4 source-in-sheet + "Esc closes the sheet and focus returns"; WP9 Sources sheet |
| extraction: explainer stack, 8-row footprint, details, sensor demo collapsed / round trip | replaced | v4 WP4 Footprint checks (pre-filled, ≤50 words, lattice-only change); demo moved to Extras (WP9) |
| machine: step disclosure + relation filter | replaced | v4 WP5 Loop cards; WP9 "Who is in this loop" in the sheet |
| loop: amplification raises / Newest lowers concentration | replaced | v4 WP6 "Most engaging: top 3 get 69% → 92%" + unit test in tests/core.test.cjs (toy ranker) |
| revelation: seed + id, URL abstract only; cross-engine id; params reflect choices | kept | v4 WP7 (link v=2, cross-engine id, metadata) |
| export dimensions (4 formats) | ported | v4 WP10 export sizes |
| PNG metadata seed + params only | kept | v4 WP7 Save image |
| share fallback / native share (stubbed) | kept | v4 WP7 (two checks) |
| clean view; new seed / restore; history local + clearable | kept | v4 WP7 |
| shared link restores id in a fresh context | ported | v4 WP10 (v=2 link) |
| same seed → byte-identical PNGs across contexts; fixed reference mobile = desktop | kept | `qa/determinism.mjs` (16 checks) |
| legacy link without look params → legacy look | ported | v4 WP10 (also asserts the legacy engine) |
| different seed → different PNG | replaced | v4 WP7 "new seed differs" (composition id) |
| mobile: no horizontal overflow | ported | v4 WP10 (every screen at 390) |
| mobile: sources drawer full-width; chapter-nav ≥ 44 px; phone nav (WP6) | removed | drawer and chapter nav no longer exist; targets: load.mjs under44 = 0 |
| perf: max-density compose+render | ported | v4 WP10 preview redraw median < 50 ms (desktop CPU) |
| reduced motion: starfield static / nothing animates / art drawn immediately | kept / ported | v4 invariants "no endless animation"; WP8 "no starfield layers"; WP10 "drawn immediately" |
| motion on: starfield animates and settles | removed | starfield is off on v4 screens (WP8) |
| chrome: app bar in flow; no fixed UI over content; one primary | kept / removed | v4 invariants "no fixed or sticky UI"; WP3 one primary; app bar gone |
| forward-only chapter nav; names match; v1.2 labelled as step 2 | removed | replaced by Back + "n of 5" (WP3); demo is now Extras |
| theme (auto, select, live, override, persist, keyboard, back to auto, unknown fallback, repaint) | ported | v4 WP10 (8 checks) |
| WP1–WP6 handover checks (ring labels, lab presets, machine list, drawer directory, revelation legend/Options, type sizes, chrome, phone nav, 02 kinds, footer Sources) | replaced / removed | their v4 equivalents: WP5 cards, WP6 Feed, WP7 Options sheet, WP8 type, WP9 Sources; screens that no longer exist removed |
| WP2 preview (seed on Begin, tick redraws in view, text alternative, same look, header on 01/02/04, footprint tick, redraw speed, reduced motion) | replaced | v4 WP3 art in view, WP4 only-shards/only-lattice change, WP10 redraw speed; seed creation is unchanged code (app-shell seed on the first chapter) and is exercised by every WP4–WP7 preview check |
| network: zero external, GET only, no leaking values; console clean | kept | v4 final section (3 checks + console) |
| axe on every screen | kept | v4 invariants (10 screens × 2 widths) |



Run on the build box, 2026-11-13 (Asia/Yerevan). **Local only — nothing was deployed.**

## Iteration 3: simplification and validation (2026-11-13, Asia/Yerevan), current results

Goal: less cognitive load and fewer mixed signals, about 40% less copy, the same five stages and evidence labels.
Server restarted; output folders wiped. Everything is local; nothing was pushed or deployed.

**Consistency fixes**
* **One meaning per colour.** signal = interactive / observed / VERIFIED · amber (trace) = INFERRED only · alert = DENIED ·
  sim = SIMULATED · dashed ink = UNKNOWN / UNAVAILABLE · focus ring = ink-hi. Amber was removed from selected states, buttons, HUD and seed.
* **One primary action per screen.** It is the only filled button: BEGIN, RUN A ROUND, DOWNLOAD PNG, PORTRAIT →, Next · 03 MACHINE →.
* **One navigation pattern.** The phase rail goes anywhere, plus a forward-only "Next · NN LABEL →" button. The per-chapter Back buttons and
  the Machine prev/next are gone. The HUD and chapter kicker read the same "NN LABEL", taken from `PHASES`.
* **One entry.** The approach has a single BEGIN. The v1.2 demo now sits inside 02 ("02 · LIVE DEMO · …"). Identity is optional;
  the 02 button and `#sensors` open the tiles directly, so there are two fewer steps.
* **One vocabulary.** "Derived" is now INFERRED everywhere. Dial names match between 01 and 05. Wording follows the evidence labels.
* **Honest badges.** LIVE appears only after a real sensor event. No event within 1.2 s gives UNAVAILABLE (dashed). A refusal gives DENIED.
  A missing device (for example "Requested device not found") gives UNAVAILABLE.
  The portrait's BIO row now says PASSKEY CREATED/NONE; it no longer says VERIFIED.
* **One sigil.** The v1.2 circular ring is replaced by the triangular sigil used by the artwork (static under reduced motion).
* **Bug found by the new checks:** link-style buttons sharing the `.cite` class (edit, history restore, identity) opened an empty
  sources drawer that then blocked clicks. The drawer now opens only for `.cite[data-source]`.

**Shortening** (`qa/words.mjs`: visible words in `#app`, desktop, expanders closed; before = `ff86a74`)

| Screen | Words before → after | Change | Incl. expanders | Page height |
|---|---|---|---|---|
| 00 Approach | 60 → 27 | −55% | 60 → 27 | 860 → 860 |
| 01 Offer | 663 → 191 | −71% | 663 → 459 | 2270 → 1531 |
| 02 Extraction | 313 → 183 | −42% | 313 → 237 | 1394 → 1132 |
| 03 Machine | 495 → 236 | −52% | 495 → 463 (relations table is data) | 2603 → 1657 |
| 04 Feedback loop | 616 → 200 | −68% | 616 → 328 | 1824 → 1386 |
| 05 Revelation | 322 → 96 | −70% | 322 → 276 (caption + history are data) | 1870 → 1044 |
| v1.2 sensors | 98 → 52 | −47% | 354 → 304 | 860 → 860 |
| **All** | **2567 → 985** | **−62%** | 2823 → 2094 (−26%) | |

Detail moved into `<details>` expanders. Each expander summary still shows its evidence badges, so labels stay visible when
collapsed. Fewer controls: the loop "×5" button is gone; the Machine prev/next buttons are gone; the seed, caption and history tools sit behind "Seed, caption & history".
Screenshots are in `/workspace/oracle-qa/simplify/{before,after}/`, with the sheet at `simplify/compare-before-after.png` (made by `qa/simplify-sheet.mjs`).

**Validation**
| Check | Tool | Result |
|---|---|---|
| HTML | html-validate 9 (`recommended`, stylistic rules off) on `index.html` plus the rendered DOM of 10 screens with expanders open (`qa/dom-dump.mjs`) | **0 errors** after fixes: `type="button"` on v1.2 buttons; slider `<output>` moved out of `<label>`; history list labelled with `aria-labelledby`; sensor tiles changed from `div[role=button]` to native `<button>` |
| CSS syntax | css-tree 3 lexer, all 3 stylesheets | 0 errors. Declarations using `var()`/`color-mix()`/`calc()` are checked only by the browser |
| CSS lint | stylelint 16 + `stylelint-config-recommended` | 0 errors except `no-duplicate-selectors` (15): v1.2 base rules plus v2 contrast overrides on purpose. Dead `.perm-hint` rules and a triple `.perm-item.denied` were merged |
| JS | `node --check` on every file; eslint 9 on the 13 classic scripts concatenated in load order (shared global scope) | 0 syntax errors, **0 lint errors**. 14 warnings: unused `catch (e)` and two unused legacy constants |
| Links | curl (browser UA, follow redirects) on all 18 URLs in data, chapters and docs | 14 × 200. PNAS (3) returns 403 to bots: the DOIs resolve and Crossref returns the matching titles. openai.com returns 403 to curl: fetched with a reader instead and re-checked against the claims (training on Content with opt-out; "establish your identity or age"; "estimate your age") |
| CSP | e2e probe | `fetch('https://example.com')` blocked (connect-src 'none'). Zero non-localhost requests in every run |

**QA in both schemes** (`COLOR_SCHEME=dark|light node qa.mjs`)
| Scheme | e2e | axe WCAG 2.1 A/AA (15 screens) | App console errors | External requests |
|---|---|---|---|---|
| dark | **69/69** | 0 violations | 0 | 0 |
| light | **69/69** | 0 violations | 0 | 0 |

New checks:
* There is exactly one entry action on the approach.
* There is at most one filled action per screen.
* The chapter nav is forward-only.
* The kicker matches the HUD.
* The v1.2 screens are numbered as 02.
* The sensor demo opens straight on the tiles.
* Missing sensors (orientation, shake) show UNAVAILABLE and never LIVE.
* A refused geo or mic shows DENIED. The camera shows DENIED or UNAVAILABLE (headless Chrome has no camera device).
* Evidence expanders show their labels while collapsed.
* The tiles are native buttons.

Flows were updated for the new controls: details are opened, and RUN A ROUND is clicked 5 times.
* Unit `npm test`: **10/10**.
* Determinism: Node id === browser id. Same seed gives byte-identical PNGs across DPR 1/2 and mobile DPR 3. Default exports are unchanged from
  iteration 2 (Night `d17be765…`, Day `fb15f959…`). `qa/theme.mjs` gives all 12 look hashes identical to iteration 2, 0 errors, 0 requests.
* Exports: 1080×1350 / 1080×1920 / 1080×1080 / 2160×2700 (fixed reference 1.36 / 1.62 / 1.12 / 3.73 MB in Night).
* Mobile 390px: no horizontal overflow in any chapter; drawer full width; rail targets 28px tall. Reduced motion: static starfield, artwork drawn at once.
* Contrast (`qa/contrast.mjs`; now also measures text inside opened expanders and the identity screen; the ORACLE-title exception is removed because the title is now solid):
  **0 failures in all 6 palette × mode looks, 597 text elements each.** Minimums: observatory 6.20/5.23, sodium 5.66/5.21, spectral 5.09/5.32 (Night/Day).

## Iteration 2 — theme system (2026-11-13, Asia/Yerevan)

Clean start: server restarted, `qa/node_modules` reused, output folders wiped. All runs are on commit
`b0e2f84` (code) — docs committed after.

**0. Re-check before any theme work** (commit `1031124`, server restarted): unit 8/8, e2e **51/51** — no regressions.

**1. Unit** `npm test`: **10/10** (adds: every palette × mode complete and mirrored in theme.css; legacy palette kept;
scene stores colour roles, so composition is theme-independent).

**2. End-to-end in both colour schemes** — `COLOR_SCHEME=dark|light node qa.mjs` emulates `prefers-color-scheme`
in *every* browser context (desktop, DPR 2, mobile DPR 3 + touch, reduced motion, permissions denied/granted):

| Scheme | Checks | axe WCAG 2.1 A/AA (14 screens) | Console app errors | Non-localhost requests |
|---|---|---|---|---|
| dark (Night) | **62/62 pass** | 0 violations | 0 (only the 2 deliberate CSP probes) | 0 |
| light (Day) | **62/62 pass** | 0 violations | 0 (only the 2 deliberate CSP probes) | 0 |

New checks (11): auto mode follows the emulated scheme; default look = Observatory + Instrument; switch is a labelled
native `<select>` (Auto/Night/Day); auto reacts live when the OS scheme flips; manual override applies and is stored
in `localStorage['oracle.theme']`; override persists across reload; keyboard can change it; back to Auto clears the
key and follows the device; unknown `?palette/?type` fall back; switching theme repaints the artwork with the same
composition id; legacy links (no look params) render with the legacy look. The reduced-motion "artwork drawn" check
is now theme-aware (counts pixels that differ from the palette background).
axe "incomplete" is only `color-contrast` (text over the starfield canvas), covered by the audit below.

**3. Contrast audit** `qa/contrast.mjs` — every visible text element on 8 screens (approach, 01–05, sources drawer,
v1.2 harvest), blended over its real backdrop (opaque ancestor background, else `--bg` and `--signal` 8% tint; worst
wins), for **all 3 palettes × Night/Day** (`/workspace/oracle-qa/theme/contrast-themes.json`):

| Palette | Night min ratio | Day min ratio | Elements checked (each) | Failing |
|---|---|---|---|---|
| Observatory (default) | 6.20 | 5.40 | 602 | 0 |
| Sodium | 5.66 | 5.38 | 602 | 0 |
| Spectral | 5.22 | 5.32 | 602 | 0 |

The first Day pass failed on the approach screen (signal/trace 4.0–4.3:1 for 11–12 px uppercase labels and the
primary buttons); Day signal and trace colours were darkened one step in all palettes, then everything passed.
Exception still excluded and documented: the v1.2 `ORACLE` title uses `background-clip:text`.

**4. Determinism per theme** (`qa/theme.mjs`, `/workspace/oracle-qa/theme/theme-results.json`). Fixed reference
`ORACLE-7K3F-Q9ZD` (composition `C-3DEA15B5A8` in every look), portrait 1080×1350, exported twice: context A =
desktop DPR 1 with the mode from emulated `prefers-color-scheme`; context B = mobile DPR 3 with `?theme=` forced.
**All 12 looks: A === B byte-identical; 12 distinct hashes; one composition id.**

| Look (palette-mode-type) | SHA-256 (PNG file) |
|---|---|
| observatory-dark-instrument (**default, Night**) | `d17be765a17cb7f34872dec6f268b4ff6f85c0ca42f3a27c2514bbcba3c0d6ce` |
| observatory-light-instrument (**default, Day**) | `fb15f959170197ab308cacc1e23e337e4e6ebf048d07a64ee37cd904ff3796b4` |
| observatory-dark-signal (legacy look) | `a3eaef2e1a8994667517cb49aa7037f42fe804367bbf3fc4e468f4956bcb633a` |
| observatory-light-signal | `66fee4df412a0f9b5c5604f5be87b4d110be610495d8157b511b5a6b5bcd809a` |
| sodium-dark-instrument | `e5e7be16f34899f8ff7ceb440bbd39f1df6736a47786e9fb3c0328e28932f3f1` |
| sodium-light-instrument | `5a91417336bee36be55daa473539c961caad043784b2b2908f95072ccffb044d` |
| sodium-dark-signal | `1768ebe3e9462f5ae1b9a10bba6e10e45bfafc4263a58936d51afc810bbe0aec` |
| sodium-light-signal | `4b4abd50a6fd5142aa34ebb09eac9067d1d101edb082c9532aa947440f13b5e0` |
| spectral-dark-instrument | `2a9cb1a437dc2fc4e520e9e91b37ea8efb4ec6ce5abd3c0539c924e589cf2363` |
| spectral-light-instrument | `d49b2749ef1107aa4caa1fb44c874e3775dd15b2ae76109cf3343fc4f97ae476` |
| spectral-dark-signal | `33d41bc00e1f0481d1cc27549836a217b666ab55aa879d62e6ae938aeaddae2b` |
| spectral-light-signal | `db2b8fddb8d006b10d1e5c15b88f0d68bfda7cb62b671d6ff9fcfd01a5fdfd76` |

Cross-checks: the e2e `fixed-desktop-portrait` export (downloaded through the UI) equals the table for the default
look in both schemes; story 1080×1920 desktop === mobile DPR 3 (Night `df332b67…`, Day `ed1d0299…`); a pinned link
(`&pal=sodium&th=light&ty=signal`) opened on a Night device renders sodium-light-signal (hash equals the table)
while the site itself stays Night. **Legacy:** a v2.0 link without look params renders pixel-identical to the
v2.0 release (RGBA SHA-256 portrait `a50aedde…`, story `de7520c1…`, same as the earlier QA run); the PNG file bytes
differ only by the added `look=` metadata.

**5. Theme screenshots** (`/workspace/oracle-qa/theme/`, auto mode via emulated scheme, reduced motion for stable frames):
- `palette/{observatory,sodium,spectral}-{dark,light}-{desktop,mobile}-{offer,revelation}.png` (24)
- `type/{instrument,signal,almanac}-{dark,light}-{desktop,mobile}-{extraction,loop}.png` (24)
- `compare-palettes.png` (chapter 01), `compare-palettes-artwork.png` (chapter 05), `compare-typefaces.png`,
  `compare-typefaces-detail.png` (1:1 crops) — each with its `.html` source
- `pinned-link-sodium-light-on-dark-device.png`
- e2e screenshots per scheme: `/workspace/oracle-qa/scheme-dark/shots/`, `/workspace/oracle-qa/scheme-light/shots/`

**Theme limits.** Alternative palettes/types were contrast-audited and screenshotted but axe ran only on the default
look (both schemes). Chrome headless only — `color-mix()` needs Safari ≥ 16.2 / Firefox ≥ 113 (older browsers ignore
those declarations and fall back to inherited colours). Windows High Contrast / `forced-colors` not tested. The
comparison sheets are scaled overviews; judge type from the 1:1 detail sheet or the individual shots.

## Environment

- Static server: `python3 -m http.server 8765` serving a directory that contains the repo at `/oracle-protocol/`, i.e. the
  app was loaded from `http://127.0.0.1:8765/oracle-protocol/` to mimic the GitHub Pages project path.
- Browser: Google Chrome 156.0.8078.47, headless, driven by playwright-core 1.65.0. axe-core 4.14.0. pngjs 7.0.0. Node 24.22.1.
- Viewports: desktop 1280×800 (DPR 1), desktop 1440×900 (DPR 2), mobile emulation 390×844 (DPR 3, touch, Android UA).
- **Not tested:** real iOS Safari, real Android devices, Firefox, desktop Safari, real Web Share sheets, real wallets/passkeys.

Reproduce:

```
npm test                                     # unit: art module determinism (node --test, no deps)
cd qa && npm i && node qa.mjs                # end-to-end (needs Chrome; BASE/CHROME/QA_DIR env vars)
COLOR_SCHEME=light QA_DIR=… node qa.mjs     # same suite with prefers-color-scheme: light
node contrast.mjs                            # contrast audit, all palettes × Night/Day
node theme.mjs                               # theme screenshots, comparison sheets, per-look export hashes
```

## Baseline (v1.2, branch `prod` @ 7f1f3a6)

Same harness against the untouched `prod` worktree: approach → handshake (anonymous identity) → harvest (GPU/CPU/NET/
DEVICE OK, Bluetooth + geo DENIED) → portrait with `ORACLE_HASH`. Console: one 404 (favicon). **Six requests to
fonts.googleapis.com / fonts.gstatic.com** on every load. Screenshots: `/workspace/oracle-qa/shots/baseline/`.

## Unit tests — `tests/art.test.cjs` (iteration 1: 8/8; now 10/10)

Same seed+params → deep-equal scene for portrait/story/square · different seed → different hash · **every one of the 14
parameters changes the composition** · unknown keys (`lat`, `lng`, `ua`, `geo`, `gpu`) dropped, ranges clamped ·
encode/decode round-trip · seed format · max-density story compose < 150 ms (≈7–9 ms, 7,850 primitives) ·
interpretation contains no raw readings.

## End-to-end — `qa/qa.mjs` (iteration 1: 51/51 checks pass; see iteration 2 above for the current 62/62 × 2 schemes)

| Result | Check |
|---|---|
| PASS | approach renders v1.2 entry + new investigation entry |
| PASS | handshake: anonymous ephemeral identity without wallet |
| PASS | harvest: denied sensors show DENIED (geo, cam, mic) |
| PASS | harvest: no-prompt tiles show OK (gpu, cpu, net, base) |
| PASS | harvest: tiles keyboard-activatable (role=button + Enter) |
| PASS | witness: portrait + ORACLE_HASH render |
| PASS | witness: geo panel shows withheld/denied text |
| PASS | witness: continue-to-machine button present |
| PASS | reset returns to approach and clears collected |
| PASS | #protocol deep link opens handshake |
| PASS | harvest: granted geolocation shows coordinates locally |
| PASS | CSP connect-src none blocks outbound fetch |
| PASS | keyboard: Tab + Enter starts the investigation |
| PASS | offer: toggles + exchange simulator respond |
| PASS | offer: simulator labelled SIMULATED |
| PASS | sources drawer opens from a citation and highlights the source |
| PASS | drawer: Esc closes and returns focus to the citation |
| PASS | extraction: footprint toggles + arrow-key tabs |
| PASS | extraction ↔ live harvest round trip (denied camera recorded) |
| PASS | machine: node stepping + relation filter |
| PASS | loop: amplification + feedback rounds raise top-3 concentration |
| PASS | loop: chronological baseline lowers concentration |
| PASS | revelation: seed + composition id shown; URL holds only abstract params |
| PASS | cross-engine determinism: Node compositionId === browser compositionId |
| PASS | artwork params reflect visitor choices (offers/footprint/dials/rounds) |
| PASS | export dimensions |
| PASS | PNG tEXt metadata holds seed + abstract params only |
| PASS | share fallback: no Web Share → PNG downloaded + caption copy attempted |
| PASS | share native path (stubbed navigator.share) receives PNG file + caption |
| PASS | clean view hides app chrome |
| PASS | new seed differs; restore by seed returns the original composition id |
| PASS | history can be cleared (revocable) |
| PASS | history stored locally, parameters only |
| PASS | shared link restores the same composition id in a fresh browser context |
| PASS | same seed + params → byte-identical PNGs across contexts (DPR 1 vs 2, different viewport) |
| PASS | different seed → different PNG |
| PASS | mobile: no horizontal overflow in any chapter |
| PASS | mobile: sources drawer usable full-width |
| PASS | fixed reference: mobile emulation (DPR 3, touch) export === desktop export (story) |
| PASS | mobile: story export 1080×1920 works |
| PASS | perf (desktop CPU, mobile emulation – not a real phone): max-density story compose+render |
| PASS | mobile: phase-rail targets ≥ 24px tall |
| PASS | reduced motion: starfield loop not running (static frame) |
| PASS | reduced motion: PLAY THE LOOP disabled |
| PASS | reduced motion: artwork drawn immediately (no draw-in) |
| PASS | control: without reduced motion the starfield animates |
| PASS | network: zero non-localhost requests across all runs |
| PASS | network: no request carries geolocation, UA, GPU or hash values |
| PASS | network: only GET requests for static files |
| PASS | console: only the deliberate CSP probe errors (2 expected), zero app errors |
| PASS | axe-core WCAG 2.1 A/AA: zero violations on every screen tested |

Full machine-readable output (incl. every request URL, axe results, export metadata): `/workspace/oracle-qa/results.json`.

### Determinism and export evidence (SHA-256 of downloaded PNG files)

Fixed reference composition `s=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4`
(composition id `C-3DEA15B5A8`). The `fixed-desktop-story` hash below was also produced by an earlier, separate QA
process on the same box — byte-identical across processes.

| Export | Pixels | Bytes | SHA-256 |
|---|---|---|---|
| `fixed-desktop-portrait` | 1080×1350 | 1,358,135 | `94ffe3367fa7c8d5dc6e283e54ae30a78970afae78f4ec1cbd555a1d96d7b7f3` |
| `fixed-desktop-story` | 1080×1920 | 1,621,895 | `2a937313fc6c641d3fa78f8c8a30b088a90a4880dc0f2b962cefa53f949cd62f` |
| `fixed-desktop-square` | 1080×1080 | 1,120,939 | `a8a22767185ed909f6a19a72cdbcba15bec857de078b8ff059c4353eb9825909` |
| `fixed-desktop-hires` | 2160×2700 | 3,725,515 | `5fd7723c5efefaec22deaffcd2d7e15659e679e450745713639deae933599d59` |
| `fixed-mobile-story` | 1080×1920 | 1,621,895 | `2a937313fc6c641d3fa78f8c8a30b088a90a4880dc0f2b962cefa53f949cd62f` |
| `run1-portrait` | 1080×1350 | 1,116,701 | `e6836ce059bf38698fb58573a629fe072d224849a75a012a4eca657781ef3db9` |
| `run2-portrait` | 1080×1350 | 1,116,701 | `e6836ce059bf38698fb58573a629fe072d224849a75a012a4eca657781ef3db9` |
| `run1-story` | 1080×1920 | 1,333,911 | `7cbee1c9e08006b71c44d7b847b132f35ddfb4f0b2dba756c3aecd049c4d2c6f` |
| `run2-story` | 1080×1920 | 1,333,911 | `7cbee1c9e08006b71c44d7b847b132f35ddfb4f0b2dba756c3aecd049c4d2c6f` |
| `run1-square` | 1080×1080 | 861,982 | `521e6fd723f60df3173c9df05fc77a57680243e97e8d7e9da806d00a7b307c3f` |
| `run2-square` | 1080×1080 | 861,982 | `521e6fd723f60df3173c9df05fc77a57680243e97e8d7e9da806d00a7b307c3f` |
| `run1-hires` | 2160×2700 | 3,020,168 | `e25140e6805eeb8dcdc033c26794ea4f5b327110ea27a5228352a1e047268c0e` |
| `run2-hires` | 2160×2700 | 3,020,168 | `e25140e6805eeb8dcdc033c26794ea4f5b327110ea27a5228352a1e047268c0e` |

`run1-*` = visitor journey in context A (DPR 1); `run2-*` = the shared link opened in a fresh context B (DPR 2,
1440×900). PNG `tEXt` metadata example: `oracle:s=ORACLE-3V5J-SXD0&o=37&f=10&d=82&c=50&p=50&y=50&x=50&i=70&e=70&r=0&t=0&k=55&a=60&n=5;id=C-57DF74F912`.

**Scope of the determinism claim:** the *composition* (scene graph → composition id) matched between Node 24 (V8) and
Chrome 156. *Pixel* identity was verified only within Chrome 156 on this machine. Other browsers/GPUs may anti-alias
lines differently, so PNG bytes may differ there even though the geometry is identical.

### Accessibility

- axe-core (WCAG 2.0/2.1 A+AA rules): **0 violations** on approach, v1.2 harvest, v1.2 witness, all five chapters
  (desktop), clean view, and all five chapters at 390 px. Two issues axe found during development were fixed
  (citation buttons' accessible name ≠ visible label; harvest tiles' aria-label ≠ visible text).
- axe reports `color-contrast` as **incomplete** almost everywhere because text sits over a fixed canvas. A separate
  approximate audit (`qa/contrast.mjs`) blends each text colour (incl. opacity chain) over the page black and over the
  lightest panel tint and takes the worse ratio:

| Screen | Text elements | Min ratio | Below AA |
|---|---|---|---|
| approach | 7 | 1 | 1 |
| offer | 124 | 6.93 | 0 |
| extraction | 49 | 7.67 | 0 |
| machine | 128 | 7.67 | 0 |
| loop | 101 | 6.93 | 0 |
| revelation | 42 | 6.93 | 0 |
| harvest | 74 | 7.17 | 0 |

  The one "failure" is the v1.2 `ORACLE` title, which uses transparent text + a background-clip gradient; the method
  cannot see the gradient (cyan→white→amber on black, visually high contrast). Not a real failure, but not machine-verified either.
- Keyboard: Tab+Enter starts the journey; v1.2 tiles activate with Enter; footprint tabs use arrow keys; drawer is
  focus-trapped, Esc closes, focus returns to the citation.
- Reduced motion: starfield loop never starts (static frame), PLAY THE LOOP disabled, artwork drawn without draw-in,
  CSS glitch layers hidden. Control run without the preference confirms the loop animates.

### Privacy

- 144 requests across all runs — all `GET` to `127.0.0.1:8765/oracle-protocol/…` static files (HTML, CSS, JS, self-hosted
  WOFF2). **Zero third-party requests** (v1.2 baseline made 6 to Google Fonts).
- No request URL or body contained the fake geolocation (51.50135, -0.14189), the user-agent, GPU strings or the hash.
- CSP `connect-src 'none'` verified: an in-page `fetch('https://example.com/?probe=1')` was refused (the only two
  console errors in the whole run are that deliberate probe).
- Exports are produced from `blob:` URLs in the page; artwork URL/metadata contain only seed + abstract parameters.

### Performance (indicative only)

Max-density 1080×1920 composition: compose ≈5 ms + Canvas 2D render ≈11 ms (7,850 primitives) in Chrome on this box's
desktop CPU under mobile *emulation*. Story export incl. PNG encoding ≈0.8 s. **No real phone was measured.**

## Screenshots (`/workspace/oracle-qa/shots/`)

- `baseline/` — v1.2 before changes
- `denied/` — v1.2 protocol with permissions denied (approach, handshake, harvest with DENIED tiles + explanations,
  witness) and `04-harvest-geo-granted.png` (granted path with fake coordinates)
- `desktop/` — 01 offer, 01b sources drawer, 02 extraction, 03 machine, 04 loop, 05 revelation, 06 clean view,
  07 shared link opened in a fresh context
- `mobile/` — 390×844 approach, each chapter full-page and viewport, sources drawer
- `reduced/` — revelation with reduced motion
- Exported PNGs: `/workspace/oracle-qa/exports/{run1,run2,fixed,mobile}/`

## Known limitations / not done

1. **Not deployed.** Pages behaviour mimicked locally only; the live URL still serves v1.2.
2. Real-device testing (iOS Safari, Android Chrome), Firefox and Safari: not done.
3. Native Web Share was exercised only with a stubbed `navigator.share`; the real share sheet was not tested. Clipboard
   copy reported success in headless Chrome but the clipboard contents were not read back.
4. Optional animated export (GIF/WebM) not implemented.
5. v1.2: the wallet path's balance query goes through the wallet's own RPC node; that part is unchanged. Fixed in iteration 3:
   orientation and shake now show UNAVAILABLE without real events, and the sigil is triangular. A real sensor that is merely still for 1.2 s also reads UNAVAILABLE;
   tapping again re-reads it.
8. Word counts are by script (visible text with expanders closed). Including expanders, total copy is down 26%; the
   rest is reference data (relations table, caption, history) and the evidence text, which was kept on purpose.
9. Validation tools (html-validate, css-tree, stylelint, eslint) were run from `/tmp`. They are not added to the repo, so the
   site stays dependency-free. `no-duplicate-selectors` warnings remain (intentional override layers).
6. Evidence: 12 sources. Three PNAS papers were read via their Europe PMC records (PNAS and PMC blocked the fetcher);
   the DSA text via digitalacts.eu (EUR-Lex returned an empty 202). Court complaints are presented as allegations.
7. The phase rail is navigation, not a progress gate — visitors can jump to any chapter (intentional: nothing is
   gated on permissions), so "journey completion" is not tracked.

## v3 UX pass (branch `oracle-v3-ux`, 2026-11-13) — awaiting design approval

Feedback addressed: floating chapter nav / header over content, stray frame lines, animation that never
stopped after granting a sensor, too much on 01 Offer, horizontal controls on 02 Extraction.

| Bug | Cause | Fix |
|---|---|---|
| Chapter nav floats mid-screen over cards and buttons | `.phase-rail` was `position:fixed` at the bottom with a translucent background; full-page captures paint it mid-page | Nav moved into one opaque `<header class="appbar">` in normal page flow at the top |
| Header drawn mid-page / over the chapter header | `.hud-bar` was `position:fixed` and transparent; content scrolled underneath it | Same app bar; `html,body{overflow-x:clip}` (`hidden` turned `<body>` into a scroll container) |
| Stray lines and frame edges across the page | Decorative `position:fixed` `.hud-frame` border and corner marks | Removed (`display:none`) |
| Animation never stops after a grant | Every sensor re-render replayed `grantPulse` on all granted tiles; the LIVE badge pulsed `infinite`; the starfield rAF ran forever | Grant animation only on the tile that just changed (`.just`, once); LIVE pulses twice then rests; starfield plays 6 s on Approach only, stops on entering a chapter or when the tab is hidden; no `infinite` CSS animation left except the loading bar while it is shown |

**Results** (both emulated colour schemes): `qa.mjs` **85/85** dark, **85/85** light (new checks: checklist
structure, tally, derived dials, keyboard, accordion, collapsed evidence and demo, `?simulator=1`, in-flow chrome
at 1024/1280/1440/390 with nothing fixed or sticky over content, motion settles, nothing left running after a grant).
Unit tests **14/14** (`tests/content.test.cjs` adds `deriveEx`: pure, in range for all 64 combinations, monotonic,
changes the composition). axe-core WCAG 2.1 A/AA **0 violations on 15 screens** per scheme. Contrast: **0 failing of
4,446 text elements**, minimum **5.12** across all palettes × modes (default Observatory **5.28**), now including
the app bar and expanded rows. Fixed-reference exports (portrait, story, square, hi-res, mobile story) are
**byte-identical to v2** in both schemes, so existing shared links render the same.

Screenshots: `/workspace/oracle-qa/v3/{before,after}/` (`offer|extraction-{1024,1280,1440,390}-{dark,light}[-full|-mid].png`,
`after/*-interact.png`), side-by-side `/workspace/oracle-qa/v3/compare-before-after.png` (also `compare-1024.png`,
`compare-390.png`). Scripts: `qa/v3-shots.mjs`, `qa/v3-interact.mjs`.

Not tested: real devices, Safari, Firefox, Brave itself (Chromium headless only).

## Handover UX pass (branch `ux-handover-wp0-6`, 2026-11-14, Asia/Yerevan)

Work packages from `docs/HANDOVER-UX.md` §6, one commit each. WP7 (footprint derived from trades) not done:
it needs the owner's go-ahead (§10.4).

### WP0. Baseline (before any change, `claude/dreamy-hawking-n9hjce` @ 523ea6b = prod 4526203 + docs)

Environment: headless Google Chrome (`/usr/bin/google-chrome`), Playwright-core, axe-core 4.x, Node.

- Unit tests: **14/14**.
- `qa.mjs`: **85/85** dark, **85/85** light. (The handover expected 84/85 on a container with no audio device;
  this machine has Chrome and the mic tile reads DENIED, so the check passes.)
- Contrast (`contrast.mjs`, 3 palettes × 2 modes × 9 screens): **0 failing of 4,446** text elements, minimum **5.09**.
- axe-core WCAG 2.1 A/AA: **0 violations on 15 screens** per scheme.
- Fixed reference `ORACLE-7K3F-Q9ZD` PNG SHA-256 (first 12): dark portrait `d17be765a17c`, story `df332b679c8d`,
  square `60b9ade83a84`, hi-res `e69f044a2595`; light portrait `fb15f9591701`, story `ed1d0299297d`, square
  `714d95327a57`, hi-res `b263c13cec22`. Every later WP must reproduce these.

`load.mjs` at 390 × 844, Night (`qa/load-table.mjs` prints it):

| Screen | Words | Controls | App-bar controls | Disclosures | Targets < 44 px | Font sizes (px) | Smallest px | Uppercase labels | App bar px | Page length (viewports) |
|---|---|---|---|---|---|---|---|---|---|---|
| 00-approach mobile | 27 | 1 | 8 | 0 | 8 | 11/13/16/43 | 11 | 3 | 87 | 1.1 |
| 01-offer mobile | 80 | 13 | 8 | 6 | 13 | 11/13/14/16/30 | 11 | 2 | 87 | 1.1 |
| 02-extraction mobile | 114 | 19 | 8 | 10 | 18 | 10/11/12/13/14/16/18/30 | 10 | 7 | 87 | 1.6 |
| 03-machine mobile | 236 | 31 | 8 | 1 | 30 | 9/10/11/12/13/14/16/18/30 | 9 | 7 | 87 | 2.7 |
| 04-loop mobile | 200 | 14 | 8 | 2 | 18 | 10/11/12/13/14/16/18/24/30 | 10 | 17 | 91 | 2.5 |
| 05-revelation mobile | 96 | 11 | 8 | 2 | 15 | 11/12/13/14/16/30 | 11 | 10 | 87 | 1.7 |
| 02b-sensors mobile | 52 | 16 | 8 | 1 | 11 | 10/11/12/13/25 | 10 | 26 | 87 | 1.4 |

Outputs: `/workspace/oracle-qa/handover-ux/before/` (`load-{dark,light}/` screenshots + `load.json`,
`qa-{dark,light}/`, `contrast.json`).

### WP1–WP6 results (after WP6, same machine and tools as WP0)

- Unit tests: **14/14** (unchanged; no engine or content-model change).
- `qa.mjs`: **119/119** dark, **119/119** light (85 → 119: 40 checks added, 6 replaced, listed below).
- Contrast: **0 failing of 4,476** text elements (now also the footer and the drawer's opened directory/relations),
  minimum **5.09** (unchanged).
- axe-core WCAG 2.1 A/AA: **0 violations on 15 screens** per scheme.
- Determinism: all fixed-reference PNGs (portrait, story, square, hi-res, mobile story) are **byte-identical to WP0** in
  both schemes. `art/oracle-art.js` untouched. Zero non-localhost requests in every run.
- Preview redraw at 216 × 270, every parameter at maximum (25 draws, headless desktop CPU): median **7.6 ms**, worst
  **28.9 ms** (dark); **8.4 / 34.5 ms** (light).

`load.mjs` before → after, 390 × 844, Night:

| Screen | Words | Controls | App-bar controls | Disclosures | Targets < 44 px | Font sizes (px) | Smallest px | Uppercase labels | App bar px | Page length (viewports) |
|---|---|---|---|---|---|---|---|---|---|---|
| 00-approach mobile | 27 → **47** | 1 | 8 → **1** | 0 | 8 → **0** | 11/13/16/43 → **12/13/14/16/43** | 11 → **12** | 3 → **2** | 87 → **56** | 1.1 → **1** |
| 01-offer mobile | 80 → **90** | 13 | 8 → **1** | 6 | 13 → **0** | 11/13/14/16/30 → **12/13/14/16/30** | 11 → **12** | 2 → **1** | 87 → **56** | 1.1 → **1.2** |
| 02-extraction mobile | 114 → **127** | 19 | 8 → **1** | 10 | 18 → **0** | 10/11/12/13/14/16/18/30 → **12/13/14/16/18/30** | 10 → **12** | 7 → **1** | 87 → **56** | 1.6 → **1.8** |
| 03-machine mobile | 236 → **103** | 31 → **9** | 8 → **1** | 1 → **7** | 30 → **1** | 9/10/11/12/13/14/16/18/30 → **12/13/14/16/19/30** | 9 → **12** | 7 → **1** | 87 → **56** | 2.7 → **1.5** |
| 04-loop mobile | 200 → **215** | 14 → **11** | 8 → **1** | 2 → **3** | 18 → **2** | 10/11/12/13/14/16/18/24/30 → **12/13/14/16/18/30** | 10 → **12** | 17 → **4** | 91 → **56** | 2.5 → **2** |
| 05-revelation mobile | 96 → **99** | 11 → **9** | 8 → **1** | 2 → **1** | 15 → **6** | 11/12/13/14/16/30 → **12/13/16/18/30** | 11 → **12** | 10 → **1** | 87 → **56** | 1.7 → **1.5** |
| 02b-sensors mobile | 52 → **56** | 16 | 8 → **1** | 1 | 11 → **3** | 10/11/12/13/25 | 10 | 26 → **25** | 87 → **56** | 1.4 |

1280 × 860, Night:

| Screen | Words | Controls | App-bar controls | Disclosures | Targets < 44 px | Font sizes (px) | Smallest px | Uppercase labels | App bar px | Page length (viewports) |
|---|---|---|---|---|---|---|---|---|---|---|
| 00-approach desktop | 27 → **47** | 1 | 8 → **6** | 0 | 8 → **0** | 11/12/13/18/67 → **12/13/16/18/67** | 11 → **12** | 3 → **2** | 49 → **56** | 1.1 → **1** |
| 01-offer desktop | 80 → **90** | 13 | 8 → **6** | 6 | 14 → **0** | 11/12/13/16/18/48 → **12/13/16/18/48** | 11 → **12** | 2 → **1** | 49 → **56** | 1.1 → **1.3** |
| 02-extraction desktop | 114 → **127** | 19 | 8 → **6** | 10 | 18 → **0** | 10/11/12/13/16/18/20/48 → **12/13/16/18/20/48** | 10 → **12** | 7 → **1** | 49 → **56** | 1.4 → **1.7** |
| 03-machine desktop | 236 → **103** | 31 → **9** | 8 → **6** | 1 → **7** | 31 → **1** | 9/10/11/12/13/16/18/20/48 → **12/13/16/18/19/48** | 9 → **12** | 7 → **1** | 49 → **56** | 1.9 → **1.1** |
| 04-loop desktop | 200 → **215** | 14 → **11** | 8 → **6** | 2 → **3** | 18 → **2** | 10/11/12/13/16/18/20/24/48 → **12/13/16/18/20/48** | 10 → **12** | 17 → **4** | 49 → **56** | 1.6 → **2** |
| 05-revelation desktop | 96 → **99** | 11 → **9** | 8 → **6** | 2 → **1** | 15 → **6** | 11/12/13/16/18/48 → **12/13/18/20/48** | 11 → **12** | 10 → **1** | 49 → **56** | 1.2 |
| 02b-sensors desktop | 52 → **56** | 16 | 8 → **6** | 1 | 11 → **3** | 10/11/12/13/25 | 10 | 26 → **25** | 49 → **56** | 1.1 → **1** |

Targets under 44 px after WP6 are inline citation links only (`.cite`: "edit", "Who is in this loop? →", citations);
none is under 24 px. Against the §9 aims (worst chapter): font sizes 9 → **6** (aim 6), smallest text 9 → **12 px**
(aim 12), uppercase labels 17 → **4** (aim 6), app bar 87 → **56 px** (aim 56), controls 31 → **19** (aim 12; 02 has
8 checkboxes + 8 chevrons), page length 2.7 → **2.0** (Feed; aim 2.0 for the lab), but 02 Footprint grew 1.6 → **1.8**
(aim 1.5) because of the preview and the footer, and visible words 236 → **215** (aim 100; Feed: ten feed rows with
shares, the result sentence and the two headline claims).

Checks replaced (design changed on purpose; none is a privacy, determinism, contrast or axe check):

| Old check | New check | Why |
|---|---|---|
| machine: node stepping + relation filter | machine: step disclosure shows its sourced claim and marks the ring; relation filter (now in the drawer) | WP4 replaced the button list + detail panel with a stepper; relations moved to the drawer |
| loop: chronological baseline lowers concentration | loop: Newest first preset (the chronological baseline) lowers concentration | WP3: the CHRONOLOGICAL button became the Newest first preset |
| reduced motion: PLAY THE LOOP disabled | reduced motion: nothing animates on 03 Machine | WP4 removed PLAY THE LOOP |
| mobile: phase-rail targets ≥ 24px tall | mobile: chapter-nav target ≥ 44px tall | WP6 raised the target size |
| names match: chapter kicker "NN · LABEL" equals HUD "NN LABEL" | names match: nav label = H1; kicker "Step N of 5"; HUD "Step N of 5 · Name" | WP6: one plain name per chapter |
| v1.2 demo screens are labelled as part of 02 | … labelled as part of step 2 | WP6 rename |

Changed in place: the lab flow reads the top-3 share from the result sentence (`data-top3`) instead of the removed
metric tiles; export/format/clean-view steps open Options first (WP5); the mobile journey opens the phone nav before
tapping a chapter (WP6); the extraction accordion check looks for "Recorded" instead of "OBSERVED" (WP6); the WP1 ring
label check measures rendered font size (SVG font-size × scale) rather than bounding-box height (stricter).
`contrast.mjs` now also measures the footer and opens the drawer's disclosures.

Screenshots: `/workspace/oracle-qa/handover-ux/{before,after}/load-{dark,light}/` (every chapter, 390 and 1280,
first viewport `*-fold.png` and full page), side-by-side sheets `/workspace/oracle-qa/handover-ux/compare/{mobile,desktop}-{dark,light}-{fold,full}.png`.

Not done / not verified: WP7 (needs the owner's go-ahead). Real phones, Safari, Firefox and Brave are still untested
(headless Chromium only). Native share is still only exercised with a stubbed `navigator.share`. The v1.2 sensor
screens (`#sensors`, `#protocol`) were only renamed; their 10–11 px uppercase labels remain (out of scope).

## v6 mobile pass (branch `oracle-v6`, 2026-11-18, Asia/Yerevan) — PR into prod, not merged

Plan: `docs/PLAN-v6.md` (approved with defaults D1–D10). Harness: `qa/mobile.mjs` — 13 screen states × 9 sizes
(320×568, 360×640, 390×844, 430×932, 667×375, 844×390, 932×430, 768×1024, 1280×800), Night and Day, plus behaviours
(safe-area insets via CDP, simulated keyboard, Back/history, swipe, 200 % text, offline, throttled load). It prints every
PLAN-v6 target as MET/MISSED. Run: `cd qa && COLOR_SCHEME=dark OUT=/tmp/m node mobile.mjs` (`STRICT=1` fails on a miss).

### WP0. Baseline (`prod` @ 35d33d5, before any v6 change)
- Existing suites green: unit 64/64, determinism 64/64, e2e 128/128 Night and 128/128 Day, contrast 0 failing (lowest 4.5),
  device-probe 11/11.
- `qa/mobile.mjs`: **9/45 targets met** (Night and Day identical). Main misses: landscape art 2 px tall; Footprint 1.92–1.99 vp
  in landscape; 360×640 Footprint 1.17 vp and Readout 1.27 vp; Trade 14 / Footprint 19 controls; Options 15–26 controls and
  208–301 words on open; safe area 8 px top / 16 px bottom; inputs 13 px; type does not scale at 200 %; Reveal preview
  backing 0.36× at 430; Back with the sheet open leaves the screen; no swipe; no manifest/offline; Begin visible 6.1 s on
  Slow 4G + 4× CPU.
- Word counts now skip visually hidden text (the audit counted the hidden figcaption: Device ask 42 → 38 visible words) and
  Options counts the sheet only (the audit's 146 included the page behind it).

### WP1–WP11 results (final harness, same machine; before = `prod` @ 35d33d5, after = `oracle-v6` @ 7055c9e)
The WP0 baseline above (9/45) used the first harness. The final `qa/mobile.mjs` (46 targets; it also counts the permission
cards and words outside the readout rows) was rerun on a `git archive` of prod for honest before/after numbers:
**prod 13/46 → oracle-v6 46/46, Night and Day.** All VERIFIED in Chrome 156 mobile emulation unless labelled SIMULATED.

| WP | Measure | Before (prod) | After (v6) | Target |
|---|---|---|---|---|
| 1 | Smallest art canvas, 667×375 / 844×390 / 932×430 | 2 / 2 / 192 px | 200 / 295 / 326 px | ≥ 160 px |
| 1 | Trade / Feed viewports at 844×390 | 1.52 / 1.48 | 1.0 / 1.0 | ≤ 1.0 |
| 1 | Footprint viewports at 667×375 / 844×390 | 1.99 / 1.92 | 1.0 / 1.0 | ≤ 1.25 |
| 2 | 360×640 journey screens (worst) | Readout 1.27, Footprint 1.17 | all 1.0 | ≤ 1.0 |
| 2 | 320×568 worst screen | Readout 1.75 | Readout 1.08 | ≤ 1.1 |
| 3 | Controls Trade / Footprint | 14 / 19 | 9 / 11 | ≤ 9 / ≤ 11 |
| 4 | Device ask words; permission cards | 38; 35 / 31 / 32 | 33; 24 / 24 / 25 | ≤ 40; ≤ 30 |
| 5 | Options on open, controls / words (choices-only; device mode) | 15 / 208; 26 / 301 | 10 / 24; 12 / 52 | ≤ 12 / ≤ 60 |
| 6 | Back from top / primary from bottom, 47/34 insets (SIMULATED via CDP) | 8 / 16 px | 55 / 50 px | ≥ 55 / ≥ 42 |
| 6 | Sheet bottom padding with 34 px inset | 24 px | 58 px | ≥ 42 |
| 6 | Smallest input font | 13 px | 16 px | ≥ 16 |
| 6 | Seed field with keyboard (SIMULATED 508 px viewport) | bottom at 583 → hidden | 298–342 → visible | visible |
| 6 | H1 at 200 % root font size | 26 → 26 px | 26 → 52 px, no overflow | scales |
| 7 | Lowest on-screen backing ratio (cap 3×) | 0.36 (Reveal 430×932) | 0.97 (Artwork 430×932) | ≥ 0.95 |
| 7 | Question preview at 390×844 | 140 px (17 % vh) | 220 px (26 % vh) | ≥ 25 % vh |
| 8 | Back with a sheet open | leaves to Start | closes the sheet, stays | closes |
| 8 | Back from Device readout | Trade | Device ask, focus on H1 | ask |
| 8 | Orphan entries after 20 random sheet sequences | 15 | 0 | 0 |
| 9 | Swipe next / prev on Loop and Reveal cards | no / (browser Back) | yes / yes; vertical and edge ignored | works |
| 10 | Save image line where `canShare({files})` | — | "Share → Save Image" line; fallback unchanged (e2e 2 checks) | e2e |
| 11 | Begin visible, Slow 4G + 4× CPU (SIMULATED) | 6065 ms | 1533 ms | ≤ 2.5 s |
| 11 | Offline reload after one visit; manifest, touch icon, favicon | none | works; all present | works |
| all | Requests leaving localhost; horizontal overflow (13 screens × 9 sizes) | 0; 0 | 0; 0 | 0 |

Not targeted, still over one screen (honest numbers, Night): Device readout 1.33 vp at 667×375 and 1.17 at 844×390
(the six rows plus Next do not fit 375 px of height; Next is reached by a short scroll); Extras 1.26 / 1.15 / 1.07 in
landscape and 1.05 at 320×568 (a reading page); Footprint 1.06 and Readout 1.08 at 320×568 (inside the 1.1 target).

**Suites at 7055c9e:** unit 69/69 (incl. privacy property tests and the new `tests/sw.test.cjs`), determinism 64/64 byte-identical (ORACLE-7K3F-Q9ZD and old links unchanged), e2e `v5.mjs` 130/130 Night and 130/130 Day (incl. axe-core WCAG 2.1 A/AA 0 violations on every screen, privacy/Forget everything, 0 requests leaving localhost), contrast 0 failing in 84 view×look checks (lowest 4.5), device-probe 11/11, `mobile.mjs` 46/46 Night and 46/46 Day (Begin visible 1535 / 1531 ms). Logs: `/workspace/oracle-qa/v6/wp/final/`.

**Service worker origin check** (`qa/sw-origin.mjs`, first visit + offline reload + Artwork link): PASS — 131 requests (52 from the service worker), 51 cache entries, all same-origin, all GET; offline reload and Artwork render work.

**Fix found in WP12:** with a sheet open, navigating to a new URL (the contrast suite's `goto(#revelation)`, or a hash link)
closed the sheet but did not route — the WP8 Back handler treated it as Back. `core/sheet.js` now routes when the URL
differs from the one under the sheet (7055c9e). Back with a sheet open is unchanged (WP8 targets still met).

Harness notes: an edge swipe in Chrome emulation is treated as history Back, so "edge swipe ignored" also accepts
"the browser left the page" (the app itself ignored it). Word counts skip visually hidden text; Options counts the sheet only.

Comparisons (before | after, Night): `/workspace/oracle-qa/v6/compare/` — 1 landscape Artwork 844×390, 2 short phone
Footprint 360×640, 3 art preview Trade 390×844, 4 Options 390×844, 5 landscape Trade 844×390. Full shots:
`/workspace/oracle-qa/v6/{before,after}/{dark,light}/shots/`.

### Real-device checklist (owner; about 10 minutes per device; not run yet)
Open https://artsrun.github.io/oracle-protocol/ after the merge (or a local copy of the branch before it). Mark each
✓ / ✗ / note. Brave first, with Shields on (default), then the rest.

| # | Check | Brave Android | Brave iOS | Safari iPhone | Chrome Android | Firefox (optional) |
|---|---|---|---|---|---|---|
| 1 | Portrait and landscape: art visible on every screen, Next reachable without scrolling (except Device readout in landscape) | | | | | |
| 2 | Notch, home bar, rounded corners: nothing under them, portrait and landscape | | | | | |
| 3 | Options → More → seed field: page does not zoom; field stays visible with the keyboard up | | | | | |
| 4 | Open a sheet (Why these? or Options), press Back / swipe back: the sheet closes, the screen stays | | | | | |
| 5 | Device step: readout → Back returns to the ask | | | | | |
| 6 | Swipe left/right through the Loop and Reveal cards; vertical scroll still works | | | | | |
| 7 | Save image: where the file lands (Downloads / Files / Photos); Share: share sheet opens with the PNG; on iOS Share → Save Image reaches Photos | | | | | |
| 8 | Device rows show OK / UNAVAILABLE / RANDOMISED sensibly (Brave: RANDOMISED expected); tilt, location and mic prompts appear only after their buttons | | | | | |
| 9 | Forget everything clears the readings and Options | | | | | |
| 10 | Offline: visit once, turn on airplane mode, reload — the site opens and an artwork renders | | | | | |
| 11 | No install banner or prompt appears at any point | | | | | |
| 12 | Any error, glitch or text that does not fit | | | | | |

Brave note: Shields' fingerprinting protection randomises canvas/audio readings, so the Device readout should say
RANDOMISED for those rows; the artwork from choices only must still match the same link on another browser.

## v7 build (branch `oracle-v7`, 2026-11-19, Asia/Yerevan) — PR into prod, not merged

Plan: `docs/PLAN-v7.md` (approved with defaults D1–D14). Features: Save the build (GIF), sound signature, honest
masking labels, draggable sheet. Not chosen: QR code, engine 4.

### WP0. Baseline (`prod` @ 6718795, before any v7 change)
All suites green on the box (Chrome 156, headless, local server): unit 69/69, determinism 64/64 byte-identical,
e2e `v5.mjs` 130/130 Night and 130/130 Day, contrast 0 failing, device-probe 11/11, sw-origin PASS,
`mobile.mjs` 46/46 Night and 46/46 Day. Logs: `/workspace/oracle-qa/v7/wp0/`.
Spike (outside the repo, PLAN-v7 §4): an 8-frame draw-in GIF of ORACLE-7K3F-Q9ZD was byte-identical across two Chromium
contexts (613,247 B at 540×675); ZzFX samples with randomness 0 were identical run to run.

### WP1–WP9 results (after WP9 = `oracle-v7` @ 97b08a9; same machine and tools as WP0)
Chrome 156 headless, local server, 2026-11-19 (Asia/Yerevan). Logs: `/workspace/oracle-qa/v7/wp9/` (final full run),
earlier per-WP runs in `wp4/`, `wp6/`, `wp7/`, `wp8/`.

| Suite | WP0 (prod 6718795) | After WP9 |
|---|---|---|
| Unit (`npm test`) | 69/69 | 102/102 (new: vendor, build, gif, sound, masking) |
| Determinism, 64 PNG hashes | 64/64 | 64/64 (unchanged; ORACLE-7K3F-Q9ZD untouched) |
| e2e `v5.mjs` Night / Day (incl. axe on every screen, privacy leak scan, CSP) | 130/130 · 130/130 | 133/133 · 133/133 (new: GIF row, Play sound row) |
| `mobile.mjs` 9 sizes, Night / Day | 46/46 · 46/46 | 46/46 · 46/46 (Night first run 45/46: the timing-based "no orphan history entries after 20 random sheet sequences" missed once; two reruns 46/46 — a flaky check, noted) |
| Contrast | 0 failing | 0 failing |
| device-probe (consent gate) | 11/11 | 11/11 |
| sw-origin | PASS | PASS |
| new `qa/gif.mjs` (8 fixed GIF hashes, size, plays once, comment, 0 outbound) | — | 65/65 |
| new `qa/sound.mjs` (AudioContext spy, Chromium PCM = Node PCM) | — | 28/28 |
| new `qa/masking.mjs` (clean configs, simulated protections, axe) | — | 61/61 Night · 61/61 Day |
| new `qa/sheet.mjs` (CDP touch drags, snap, reduced motion, Back) | — | 15/15 Night · 15/15 Day |

Measured (SIMULATED = headless Chromium on the box, desktop CPU):
- **GIF** (540×675, plays once, one global palette): 395–658 KB for the eight fixtures (v1 legacy 8 frames 599 KB Night;
  v=2 6 frames 395 KB; v=3 7 frames 510–564 KB). Build time 232–414 ms; 631–722 ms with 4× CPU throttle (SIMULATED).
  Byte-identical at DPR 1 and 3 and run to run (VERIFIED in Chromium). Pinned hashes, Night: v1 `fbdcfca79b84`,
  v=2 `425c97031ee6`, v=3 withheld `0eee6658f91a`, v=3 pattern `8f23ad6a304d`; Day: `327bca72cb36`, `b010c7ad3a33`,
  `ff1179f0d0d9`, `12da15d90ce5`. Comment extension = the PNG comment (`oracle:<link>;id=…;look=…`), 0 raw readings.
- **Sound**: 21 ZzFX parameters from the link only; randomness 0; volume 0.4 (cap 0.5); 0.65 s for the reference (cap 1.2 s,
  2000-link fuzz). PCM hashes `913c8577072bf4ef` (choices) and `40a7f299d33b30a9` (with the pattern) are identical in Node
  and in Chromium (both V8, VERIFIED). Other engines may differ in the last bits of `Math.sin` (INFERRED; Firefox's
  fingerprinting protection switches to fdlibm).
- **Masking**: 0 false positives — 0 flags in 5 clean Chromium configs (390×844@3 UTC, 360×640@2 Etc/GMT, 1280×860@1
  Asia/Yerevan, 1440×900@1.25 Asia/Kathmandu, 820×1180@2 New York) and in the clean / UTC / +05:45 unit fixtures; a single
  screen mismatch (zoom, second monitor) does not flag. Simulated Firefox XOR noise, Safari painted-pixel noise, a JS
  spoofing extension and a spoofed time zone are each flagged exactly (SIMULATED; real browsers still to check).
- **Sheet**: 40 % slow drag closes, 10 % springs back, a ~2 px/ms flick closes, half/full snap on long sheets, tap on the
  handle toggles, no transition at all under reduced motion, no drag at ≥900 px; Back/Esc/Close unchanged.

Deliberate changes and targets missed (honest list):
- Options keeps ≤12 controls on open (mobile target): **Copy caption** moved under More beside the caption and **Clean
  view** under More beside New seed. The plan's sub-lines under the two new rows were dropped for the same budget.
- The grab handle is a pointer target (tap toggles half/full), not a keyboard **Expand/Collapse button** as planned: a
  focusable handle would be a 13th control. Keyboard and screen-reader users always get the full-height sheet.
- GIF saving downloads (with the Photos tip where files can be shared), like Save image; it does not open the share
  sheet directly (the plan said download or share).
- `device-probe.mjs` was not extended (still 11 checks); the masking coverage lives in the new `qa/masking.mjs` (no check
  runs before Show me, verified there). GIF and sound hashes are pinned in `qa/gif.mjs`, `qa/sound.mjs` and the unit
  tests rather than inside `determinism.mjs`.
- ZzFX makes its own AudioContext when its module loads (after the tap); we close it at once and play on ours. Whether
  iOS minds that short-lived second context is unverified (real device).
- M3 (native integrity) cannot see spoofers that wrap functions in a Proxy; M4's screen check relies on the deprecated
  `device-width` media feature (skipped where unsupported). Rounding that browsers do silently (Firefox core tiers,
  Safari fixed screen) cannot be detected; a note says so in "How identifying is this?".
- `qa/load.mjs` was not re-run. The service worker precaches the two vendor files on install (same origin, for offline);
  the pages themselves import them only on the tap (VERIFIED with `OracleVendor.loaded`).

### Real-device checklist v7 (owner; Brave first, Shields on; about 10 minutes per device; not run yet)
| # | Check | Brave Android | Brave iOS | Safari iPhone | Chrome Android | Firefox (optional) |
|---|---|---|---|---|---|---|
| 1 | Options → **Save the build (GIF)**: the row counts frames, a GIF under 1 MB lands (Downloads/Files); it plays once in the gallery/Photos | | | | | |
| 2 | iOS: open the GIF from Files → Share → Save Image; it stays animated in Photos | | | | | |
| 3 | **Play sound**: about one second, only on the tap; tap again stops; with the silent switch on, the hint appears | | | | | |
| 4 | Same link on two devices: the sound is the same (by ear) | | | | | |
| 5 | Device step → Show me: Brave shows RANDOMISED rows and its own note; Firefox/Safari private shows "Your browser changes N of M readings…" or nothing — note which | | | | | |
| 6 | Chrome without extensions: **no** masking line (false-positive check); with a spoofing extension: the affected rows say so | | | | | |
| 7 | ⓘ on a randomised row names the check and its label | | | | | |
| 8 | Drag Options down by the handle or title: it follows the finger; a short drag springs back; a longer one or a flick closes; on Options it can rest at half height; Back still closes | | | | | |
| 9 | Reduced motion on: the sheet snaps with no glide | | | | | |
| 10 | Brave: the GIF and PNG look the same as in Chrome (bytes differ because of canvas noise; that is expected) | | | | | |
| 11 | All v6 checks above still hold (notch, keyboard, Back, offline) | | | | | |

Comparison images and a sample GIF: `/workspace/oracle-qa/v7/compare/` — `1-options-rows.png`, `2a-gif-progress.png`,
`2b-gif-done.png`, `3a-masking-line.png` (simulated Firefox-style canvas noise), `3b-masking-info.png`, `sheet-mid-drag.png`
(Day), `oracle-7k3f-q9zd-build-540x675.gif` (v=3, Night, 510 KB, 7 frames) and `sample-build-v3-pattern-night.gif` (537 KB).
