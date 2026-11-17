# ORACLE PROTOCOL v4 — The Anatomy of Attention

An interactive, local-only look at the digital-self economy that ends in a unique, reproducible generative
artwork: **ORACLE // DIGITAL REMAINS**. Four quick questions, about two minutes.

Zero server. No analytics. Nothing you do here leaves the tab.

## Live

https://artsrun.github.io/oracle-protocol/

## The journey (v4)

Every screen asks one thing, fits one phone screen, shows your artwork while you answer, and has Back.
Details and evidence open in a tap-to-open sheet; nothing is fixed over the content.

| Step | Screen (route) | What you do |
|---|---|---|
| — | **Start** | One promise, one button: Begin. |
| 1 of 5 | **Trade** (`#offer`) | "Which do you use?" — six plain choices. Each tick adds one red shard. ⓘ opens what you give, what you get, the documented evidence (VERIFIED + source) and our reading (INFERRED). |
| 2 of 5 | **Footprint** (`#extraction`) | "What might they know?" — eight kinds of data, **pre-ticked from your trades and labelled as our assumption**; change anything. Each kind adds edges to the lattice. |
| 3 of 5 | **Loop** (`#machine`) | Seven tap-through cards (one step each), Skip any time; each card's evidence in the sheet. |
| 4 of 5 | **Feed** (`#loop`) | "Which feed do you scroll most?" — Newest first / For you / Most engaging. "Let it run" plays 4 rounds of a SIMULATED toy ranker; Tune opens its six weights. |
| 5 of 5 | **Reveal** (`#reveal`) → **Artwork** (`#revelation`) | Five short cards light up the layer each answer drew, then your artwork: Save image, Share, Options (format, title, link, caption, seed, history). |
| — | **Extras** (`#extras`) | Optional, after the artwork: the v1.2 **sensor demo** (`#sensors`, identity at `#protocol`) and the **Sources**. Nothing here feeds the artwork. |

Every factual statement carries a provenance label — **VERIFIED** (with a source), **INFERRED**, **SIMULATED** or
**UNKNOWN**. Sources open inside the sheet; the full list is under Sources (footer, or Extras).

### Sensor demo (v1.2, in Extras)

One row per reading: location · orientation · shake/g · graphics chip · processor/memory · Bluetooth availability ·
camera details · microphone level · battery · network · device profile. Each row asks once and explains what it reads,
where it is processed and when it stops. TAP = not asked; OK = read once; LIVE only after a real sensor event;
DENIED only when you or the browser refused; UNAVAILABLE = no such sensor or API. Identity (wallet / passkey) is optional.

Camera and mic are used only to read device metadata / energy, then tracks are stopped. No frames or audio leave the device.
iOS: geolocation and DeviceMotion/Orientation only prompt from a user tap. Safari withholds Battery API, `deviceMemory`
and Web Bluetooth; those rows report UNAVAILABLE.

## Privacy

- A Content-Security-Policy with `connect-src 'none'` means the page cannot make fetch/XHR/beacon/WebSocket requests.
- Fonts are self-hosted (`fonts/`, SIL OFL 1.1) — no third-party requests at all.
- The artwork never uses sensor readings. Its URL (`#art?…`) and PNG metadata contain only the seed, your answers as numbers and the engine version (`v=2`).
- Recent compositions are stored in this browser's `localStorage` (parameters only).

## Artwork engine

Two engines share one renderer, palette set and link format (`art/oracle-art.js`):

- **Layered engine** (`art/layers.js`, v4, links carry `v=2`) — every artwork made from v4 on. Each layer has its own
  seeded random stream and reads one screen only: Trade → red shards; Footprint → lattice (+ network for
  relationships); Feed → flow lines and core echoes; rounds → echoes. Candidates are generated in a fixed order and
  revealed by threshold, so a tick adds or removes marks in its own layer and nothing else moves.
- **Legacy engine** (`art/oracle-art.js`, unchanged) — every link made before v4 (no `v=2`) renders byte-identically;
  the fixed reference `ORACLE-7K3F-Q9ZD` is checked by `qa/determinism.mjs` (16 PNG hashes).

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
screens/{start,evidence,trade,footprint,loop-cards,feed,reveal,artwork,extras}.js
app-core.js  app-vitals.js  app-ui.js        v1.2 sensor demo (restyled) + render loop
data/evidence.js  data/content.js            sources + labelled claims
art/oracle-art.js  art/layers.js  art/engine.js
tests/*.test.cjs                             node --test tests/*.test.cjs (art, layers, core, content)
qa/                                          v4.mjs (end-to-end, COLOR_SCHEME=dark|light), determinism.mjs, contrast.mjs, load.mjs, theme.mjs
docs/PLAN-v4.md  docs/QA.md  docs/SOURCES.md  (history: AUDIT.md, PLAN.md, HANDOVER-UX.md)
```

Settings → Pages → Source: Deploy from a branch → prod / root.
