# ORACLE PROTOCOL v5 — The Anatomy of Attention

An interactive, local-only look at the digital-self economy that ends in a unique, reproducible generative
artwork: **ORACLE // DIGITAL REMAINS**. Four quick questions and an optional device step, about three minutes.

Zero server. No analytics. Nothing you do here leaves the tab.

## Live

https://artsrun.github.io/oracle-protocol/

## The journey (v5)

Every screen asks one thing, fits one phone screen, shows your artwork while you answer, and has Back.
Details and evidence open in a tap-to-open sheet; nothing is fixed over the content.

| Step | Screen (route) | What you do |
|---|---|---|
| — | **Start** | One promise, one button: Begin. |
| 1 of 6 | **Trade** (`#offer`) | "Which do you use?" — six plain choices. Each tick adds one red shard. ⓘ opens what you give, what you get, the documented evidence (VERIFIED + source) and our reading (INFERRED). |
| 2 of 6 | **Footprint** (`#extraction`) | "What might they know?" — eight kinds of data, **pre-ticked from your trades and labelled as our assumption**; change anything. Each kind adds edges to the lattice. |
| 3 of 6 | **Device** (`#device`) | Optional, Skip in one tap. *Show me* lists what any site can read without asking (six grouped rows, ⓘ = value, API, why sites read it, what it draws). Then one card each for tilt (live, never saved), rough location (only a 30° band + hemisphere kept) and a 2 s microphone level (only quiet/room/loud kept). Nothing is read before a tap. *How identifying is this?* gives published study figures (VERIFIED) and a count for this browser (INFERRED). |
| 4 of 6 | **Loop** (`#machine`) | Seven tap-through cards (one step each), Skip any time; each card's evidence in the sheet. |
| 5 of 6 | **Feed** (`#loop`) | "Which feed do you scroll most?" — Newest first / For you / Most engaging. "Let it run" plays 4 rounds of a SIMULATED toy ranker; Tune opens its six weights. |
| 6 of 6 | **Reveal** (`#reveal`) → **Artwork** (`#revelation`) | Six short cards light up the layer each answer drew (the sixth is the fingerprint ring), then your artwork: Save image, Share, Options (format, title, link, caption, seed, share mode, Remember this device, Forget everything, history). |
| — | **Extras** (`#extras`) | Optional, after the artwork: the **Sources**. The v1.2 sensor demo is retired; its old routes (`#sensors`, `#protocol`, `#portrait`) open the Device step. |

Every factual statement carries a provenance label — **VERIFIED** (with a source), **INFERRED**, **SIMULATED** or
**UNKNOWN**. Sources open inside the sheet; the full list is under Sources (footer, or Extras).

### Device step (v5)

Signals: browser/OS (from the UA), languages, passkey availability (a yes/no check; nothing is created), screen size and
pixel ratio, touch points, colour scheme, CPU cores, device memory, battery (Chromium), WebGL renderer, WebGPU adapter,
time zone, network type (Chromium), a 20-font probe, a canvas signature and speech voices; with permission, tilt,
rough location and a 2 s microphone level. Dropped in v5: camera, passkey creation, the crypto wallet, JS heap, storage
quota, CPU speed loop, Bluetooth. States: Read · Not shared by this browser · Randomised by your browser · Not allowed.
Brave is detected (`navigator.brave`) and its randomised values are kept out of the digest ("Brave is protecting you").

## Privacy

- A Content-Security-Policy with `connect-src 'none'` means the page cannot make fetch/XHR/beacon/WebSocket requests.
- Fonts are self-hosted (`fonts/`, SIL OFL 1.1) — no third-party requests at all.
- **Rule (v5):** Your choices, and if you allow it your device's readings, shape the artwork in this tab. Readings never leave the tab. A shared image or link carries your choices only, unless you choose to add your device pattern: a salted one-way digest and three coarse buckets that cannot be turned back into readings.
- Share mode **Choices only** (default): the URL (`#art?…`) and PNG metadata hold the seed, your answers as numbers and `v=3`. **Choices + device pattern** adds `dg=` (8 hex: the first 32 bits of SHA-256 over a per-artwork 128-bit salt and the canonical buckets) and `db=` (3 characters: GPU family, core-count band, time-zone hour). Raw readings are never written to a link, a file, a caption or storage (unit, e2e and leak-scan tests, plus a runtime guard).
- **Remember this device** (off by default) stores only the salt (`oracle.v5.salt`). **Forget everything** (footer, Device step, Options) clears readings, salt, share mode and every `oracle.*` key. Browser permissions you granted stay until you reset them in site settings.
- Recent compositions are stored in this browser's `localStorage` (choices-only links).

## Artwork engine

Three engines share one renderer, palette set and link format (`art/oracle-art.js`):

- **Engine 3** (`art/fingerprint.js`, v5, links carry `v=3`) — every artwork made from v5 on: the layered scene, unchanged, plus a fingerprint ring on its own random stream (`seed|v3|device|<digest>`), drawn from buckets and the digest only (withheld style when there is no pattern). The five v4 layers are byte-identical to engine 2.

- **Layered engine** (`art/layers.js`, v4, links carry `v=2`) — artworks made with v4. Each layer has its own
  seeded random stream and reads one screen only: Trade → red shards; Footprint → lattice (+ network for
  relationships); Feed → flow lines and core echoes; rounds → echoes. Candidates are generated in a fixed order and
  revealed by threshold, so a tick adds or removes marks in its own layer and nothing else moves.
- **Legacy engine** (`art/oracle-art.js`, unchanged) — every link made before v4 (no `v=2`) renders byte-identically;
  the fixed reference `ORACLE-7K3F-Q9ZD` is checked by `qa/determinism.mjs` (with the v4 and v5 fixtures: 64 PNG hashes).

`art/engine.js` picks the engine from the link.

## Theme

Colour mode follows the device (`prefers-color-scheme`) — **Night** (dark) or **Day** (light) — and the
**Auto / Night / Day** switch in the footer (Start, Artwork, Extras) overrides it (stored in `localStorage` as `oracle.theme`, nothing else).
Tokens live in `theme.css`; `theme-boot.js` applies them before first paint. Default look: **Observatory** palette +
**Instrument** type (Space Grotesk / IBM Plex Sans / IBM Plex Mono). Alternatives for comparison:
`?palette=observatory|sodium|spectral`, `?type=instrument|signal|almanac`, `?theme=dark|light` (one view, not stored),
`?themelab` shows a small switcher. The artwork uses the same palette at render time; the composition id never changes
with the theme, and shared links carry `pal/th/ty` so the PNG reproduces exactly.

## Stack

Vanilla HTML / CSS / JS. No build. Classic scripts, load order in `index.html`.

```
index.html  theme.css  theme-boot.js  styles.css  chapters.css  css/v4.css  fonts/
core/state.js  core/router.js  core/sheet.js  core/ranker.js   answers (pure reducer), screen list, <dialog> sheet, toy ranker
ui/components.js                             check rows, radio cards, progress, buttons, badges
app-shell.js                                 router glue, screen frame, footer
core/device.js  core/privacy.js              consent-gated readers; buckets, salted digest, share modes, Forget
screens/{start,evidence,trade,footprint,device,loop-cards,feed,reveal,artwork,extras}.js
app-core.js  app-ui.js                    background, HUD + render loop
data/evidence.js  data/content.js            sources + labelled claims
art/oracle-art.js  art/layers.js  art/fingerprint.js  art/engine.js
tests/*.test.cjs                             node --test tests/*.test.cjs (art, layers, fingerprint, device, privacy, core, content)
qa/                                          v5.mjs (end-to-end, COLOR_SCHEME=dark|light), device-probe.mjs, fixtures/devices.cjs, determinism.mjs, contrast.mjs, load.mjs, theme.mjs
docs/PLAN-v5.md  docs/PLAN-v4.md  docs/QA.md  docs/SOURCES.md  (history: AUDIT.md, PLAN.md, HANDOVER-UX.md)
```

Settings → Pages → Source: Deploy from a branch → prod / root.
