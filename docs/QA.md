# Oracle Protocol v2 — QA report

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
