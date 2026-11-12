# ORACLE PROTOCOL v2 — The Anatomy of Attention

An interactive, local-only investigation of the digital-self economy, ending in a unique, reproducible
generative artwork: **ORACLE // DIGITAL REMAINS**.

Zero server. No analytics. Nothing you do here leaves the tab.

## Live

https://artsrun.github.io/oracle-protocol/

## The journey

| | Chapter | What you do |
|---|---|---|
| 00 | **Approach** | One button: BEGIN. |
| 01 | **The Offer** | Six everyday exchanges (social, free services, AI assistants, smart devices, identity checks, entertainment) with a documented example and a general pattern each. **Exchange simulator** with six dials. |
| 02 | **The Extraction** | Observed vs inferred vs unknown. **Digital footprint explorer** (8 categories). Optional **live sensor demo**, the v1.2 protocol (`#sensors`). |
| 03 | **The Machine** | Transparent systems map (activity → collection → combination → inference → recommendation → attention → activity) and an ecosystem map of documented roles and typed relations. |
| 04 | **The Feedback Loop** | **Attention laboratory**: a toy ranker over ten fictional posts; edit what it rewards and watch attention concentrate. |
| 05 | **The Revelation** | Your abstract choices become a deterministic artwork. Export 1080×1350 / 1080×1920 / 1080×1080 / 2160×2700 PNG, share, copy caption, restore by seed or link. |

Every factual statement carries a provenance label — **VERIFIED** (with a source), **INFERRED**, **SIMULATED** or
**UNKNOWN** — and the **SOURCES** drawer lists every source with publisher, date, URL and what it supports.

### v1.2 protocol (preserved, inside 02)

Open it from 02 or go to `#sensors`. Identity (`#protocol`) is optional.

1. **Handshake** — wallet and/or WebAuthn (optional; spectral if denied). A connected wallet queries its own RPC node for the balance.
2. **Harvest** — per-tile grant: geo · orientation · shake/g · GPU · CPU/memory · Bluetooth availability · camera meta · mic energy · battery · network · device profile. Each tile explains what it reads, where it is processed, and when it stops.
3. **Witness** — local portrait + hash.

Camera and mic are used only to read device metadata / energy, then tracks are stopped. No frames or audio leave the device.

iOS: geolocation and DeviceMotion/Orientation only prompt from a user tap. If geo is denied at OS level: Settings → Safari → Location → Allow, then tap the tile again.
Safari withholds Battery API, `deviceMemory`, and Web Bluetooth. Those tiles report UNAVAILABLE instead of looking empty. LIVE is shown only after a real sensor event, DENIED only when you or the browser refused.

## Privacy

- A Content-Security-Policy with `connect-src 'none'` means the page cannot make fetch/XHR/beacon/WebSocket requests.
- Fonts are self-hosted (`fonts/`, SIL OFL 1.1) — no third-party requests at all.
- The artwork never uses sensor readings. Its URL (`#art?…`) and PNG metadata contain only the seed and abstract dial values.
- Recent compositions are stored in this browser's `localStorage` (parameters only).

## Artwork engine

`art/oracle-art.js` — isolated, dependency-free module. Seeded (cyrb128 → sfc32), parameters whitelisted and clamped,
scene quantized and hashed into a composition id. Identity → recursive triangle; disclosure → lattice density;
relationships → hub network; attention → vector-field flow lines; feedback → recursion and echoes;
influence → swirl distortion; each surrendered exchange → a crimson shard.

## Theme

Colour mode follows the device (`prefers-color-scheme`) — **Night** (dark) or **Day** (light) — and the
**Auto / Night / Day** switch in the top bar overrides it (stored in `localStorage` as `oracle.theme`, nothing else).
Tokens live in `theme.css`; `theme-boot.js` applies them before first paint. Default look: **Observatory** palette +
**Instrument** type (Space Grotesk / IBM Plex Sans / IBM Plex Mono). Alternatives for comparison:
`?palette=observatory|sodium|spectral`, `?type=instrument|signal|almanac`, `?theme=dark|light` (one view, not stored),
`?themelab` shows a small switcher. The artwork uses the same palette at render time; the composition id never changes
with the theme, and shared links carry `pal/th/ty` so the PNG reproduces exactly.

## Stack

Vanilla HTML / CSS / JS. No build. Classic scripts, load order in `index.html`.

```
index.html  theme.css  theme-boot.js  styles.css  chapters.css  fonts/
app-core.js  app-vitals.js  app-ui.js        v1.2 core (kept) + small v2 hooks
app-shell.js                                 router, nav, sources drawer
data/evidence.js  data/content.js            sources + labelled claims
chapters/{offer,extraction,machine,loop,revelation}.js
art/oracle-art.js                            generative module
tests/art.test.cjs                           node --test tests/*.test.cjs
qa/                                          Playwright + axe harness: qa.mjs (COLOR_SCHEME=dark|light), contrast.mjs, theme.mjs (dev only)
docs/AUDIT.md  docs/PLAN.md  docs/QA.md  docs/SOURCES.md
```

Settings → Pages → Source: Deploy from a branch → prod / root.
