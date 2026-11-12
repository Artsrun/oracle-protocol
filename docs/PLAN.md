# Oracle Protocol v2 — Plan (architecture + UX decisions)

Source of truth: `ORACLE_PROTOCOL_HANDOVER.md` (334 lines). This plan maps each handover section to a concrete decision.

## 1. Information architecture

```
00 APPROACH ─▶ 01 OFFER ─▶ 02 EXTRACTION ─▶ 03 MACHINE ─▶ 04 FEEDBACK LOOP ─▶ 05 REVELATION ─▶ [clean artwork view]
                              │  (optional, local)                                        ▲
                              └▶ v1.2 protocol: HANDSHAKE ─▶ HARVEST ─▶ WITNESS ─▶ back ─┘
```

* The v1.2 protocol is **preserved intact** and becomes the optional "live" part of Extraction: *what does this
  browser expose right now?* Every tile stays a separate, optional grant. The Witness portrait gains one button,
  "Continue to The Machine →". The approach screen offers both "Begin the investigation" and "Run the v1.2 protocol".
* The phase rail becomes real navigation (buttons, keyboard accessible, `aria-current`). Chapters can be visited in
  any order; nothing is gated on permissions. The journey is completable with **zero** sensor grants.
* A **SOURCES** button in the HUD opens a full-height evidence drawer (mobile usable, `Esc` closes, focus-trapped).
* Routing: `location.hash` (`#offer`, `#machine`, `#art?…`). Hash fragments are never sent in HTTP requests, which
  also keeps shareable artwork state off any server log.

## 2. Chapters → modules (handover §4, §6)

| Chapter | Module | Interaction | Feeds artwork |
|---|---|---|---|
| 01 Offer | Six everyday exchanges (social, free services, AI assistants, smart devices, identity checks, entertainment): *you give / you get*, documented example vs general pattern. **Exchange simulator**: 6 sliders (disclosure, convenience, personalization, dependency, exposure, attention influence) → illustrative outputs with formulas shown. | toggle "I make this exchange"; sliders | offers bitmask; 6 slider values |
| 02 Extraction | **Digital footprint explorer**: 8 categories (identity, location, relationships, interests, purchases, conversations, visual surroundings, attention patterns). Each: observed signal · derived inference · unknown · how it may be used · documented vs hypothetical · known control. Entry to the optional live harvest. | select category; mark as disclosed | categories bitmask |
| 03 Machine | **Systems map** (SVG): Human activity → Collection → Processing/combination → Inference/profile → Recommendation → Attention allocation → Further activity (loop). **Ecosystem map**: roles (collectors, processors, ad intermediaries, identity providers, platforms, AI/cloud) with only documented relationships, typed (ownership / data purchase / processing / unknown). | step through nodes; filter by relation type | — |
| 04 Feedback loop | **Attention laboratory**: 10 fictional feed items; editable weights for emotional intensity, relevance, repetition, social reinforcement, recency and an amplification exponent; "run N feedback rounds" shows attention concentrating (top-3 share, Gini). All formulas visible. | sliders, step/reset | 5 weights + amplification + rounds |
| 05 Revelation | Deterministic artwork, seed, regenerate/vary/restore, formats, export, share, caption. | buttons, seed input | — |

## 3. Evidence layer (handover §7)

* `data/evidence.js`: `SOURCES` (id, title, publisher, date, url, `verifiedVia`, `accessed`, `supports`) and every
  factual claim references source ids. Each claim carries one of **VERIFIED / INFERRED / SIMULATED**.
* Only sources actually fetched on 2026-11-13 are included. Where a publisher blocks automated fetching, the
  canonical URL (DOI) is cited and `verifiedVia` records the URL actually fetched (e.g. the Europe PMC record).
* Allegations stay allegations (FTC complaints are labelled "FTC alleged", not "company did").
* Simulations are badged SIMULATED with the text "illustrative model — not a measurement of you".

## 4. Generative artwork (handover §8) — `art/oracle-art.js`

Isolated UMD-style module (`window.OracleArt`, also `module.exports` for Node tests). No DOM access except the
canvas context it is given. Pure pipeline:

1. `normalize(params)` — whitelist + clamp (pattern from ascii-principal-motion's hash state).
2. `compose(params, aspect)` → scene graph in unit space (pure, seeded `sfc32` PRNG from a `cyrb128` hash of
   seed + canonical params). Quantized to 1e-4 so output is platform independent.
3. `sceneHash(scene)` — FNV-1a over the quantized scene → `COMPOSITION ID`.
4. `render(ctx, scene, w, h, {title, overlay, progress})` — Canvas 2D drawing.

Mapping (handover §8 table):

| Concept | Parameter source | Visual treatment |
|---|---|---|
| Identity | seed + offers | central recursive triangle (Sierpiński-style subdivision), orientation from seed |
| Disclosure | disclosure slider + #categories | triangular-lattice node density and edge count |
| Relationships | relationships category, personalization, social weight | long-range network edges between hub nodes |
| Attention | relevance/emotion weights | seeded vector field; flow lines advected through it |
| Feedback | repetition + feedback rounds | recursion depth / echoed nested triangles |
| Influence | amplification + attention influence | controlled radial-swirl distortion toward an attractor |

* **Seed**: `ORACLE-XXXX-XXXX` from `crypto.getRandomValues` (Crockford base32). Never derived from device data.
* **URL / metadata** contain only seed + abstract parameters. Raw sensor readings, location, device ids: never.
* **Exports**: 1080×1350 portrait, 1080×1920 story, 1080×1080 square, 2160×2700 high-res PNG. Optional animated
  export: **not implemented** (limitation, see QA).
* Overlay: optional editorial title, small "ORACLE PROTOCOL" signature, seed + composition id, 1–2 line interpretation
  generated only from the abstract parameters.
* Sharing cascade (concept from speedy): `navigator.canShare({files})` → `navigator.share({files,text})` →
  `navigator.share({text,url})` → download PNG + copy caption. Copy caption and copy link are always available.
* Clean view `#art?…`: only the canvas, a close control, and the format switch.
* Restore: last 12 compositions (parameters only) in `localStorage` under `oracle.v2.history`; seed field accepts a
  pasted seed or full link.

## 5. Design system (handover §5)

* Keep v1.2 identity (void black, cyan, amber, crimson; IBM Plex Mono + Syne), now self-hosted.
* New chapter surfaces: editorial column (max 68ch), 1px hairlines, triangular corner cuts, no new gradients,
  no decorative circles. Body copy ≥ 14px at ≥ 4.5:1 contrast. Provenance badges: VERIFIED cyan, INFERRED amber,
  SIMULATED violet-grey, UNKNOWN outline.
* Motion: chapter fade 300ms; systems-map pulse travels the loop to explain direction; artwork lines draw in over
  ~1.2s. `prefers-reduced-motion`: all of that off, starfield rendered once, artwork drawn instantly.
* Performance: DPR capped at 2 for the background; artwork preview rendered at ≤ 1.5× display size; export renders to
  an offscreen canvas once; no per-frame allocation in the starfield loop; loop paused while the tab is hidden.

## 5a. Theme system — palettes, Night/Day, type (iteration 2)

**Mechanics.** `theme.css` holds every colour and type decision as custom properties; `styles.css` and
`chapters.css` contain no literal colours any more (a script converted each `rgba()`/hex to a role token with
`color-mix()`). Roles: `--bg --bg-2 --surface --ink --ink-hi --signal --trace --alert --sim --slate --link`
(legacy names `--void --cyan --amber --crimson --violet` are aliases). Translucent text uses
`color-mix(… calc(100% - (100% - a) * var(--tf)))`: `--tf` is 1 at Night (same alphas as v2.0) and 0.2 by Day,
so dim-on-paper text keeps ≥ 4.5:1. Glows scale with `--glow-k` (0.25 by Day: no smudgy halos on paper).

* `theme-boot.js` (sync, in `<head>`, CSP-safe external file) sets `data-palette`, `data-type`, `data-theme`
  before first paint. Mode = `prefers-color-scheme` unless the visitor picked one: **Auto / Night / Day** native
  `<select>` (labelled "Colour theme", keyboard-operable, live region announces the result) in the HUD, persisted
  as `localStorage['oracle.theme']` (`auto` removes the key). Auto reacts live to OS changes. No-JS fallback:
  a `prefers-color-scheme` media block for the default palette.
* Comparison switches (not persisted): `?palette=`, `?type=`, `?theme=dark|light` (one view), `?themelab`
  (small dev switcher). Unknown values fall back to the default.
* **Artwork.** Scene items store a colour *role* index, never a colour, so `compose()` and the Composition ID are
  theme-independent. `render(…, { palette: 'sodium-light', fonts })` applies `PALETTES[...]` (mirrored from
  theme.css — QA asserts equality). Light palettes get ×1.35 line alpha (dark ink on paper reads thinner).
  The artwork follows the site theme; share/clean-view links add `&pal=&th=&ty=` and the PNG `Comment` chunk adds
  `look=pal-mode-type`, so the same seed + same look reproduces byte-identically anywhere. Links without look
  params (v2.0) render with the legacy look (Observatory · Night · Signal) — pixel-identical to the v2.0 export.

**Palette directions** (all: one signal colour, one trace colour, one alert; flat fields, hairlines, no gradients).

| | Night | Day | Idea |
|---|---|---|---|
| **A · Observatory** (default) | void `#020408`, signal cyan `#00e5ff`, trace amber `#ffab00`, alert `#ff1744` | survey paper `#eef1f0`, ink `#0b1a22`, signal teal `#005c6b`, trace `#7d4900`, alert `#b01030` | the v1.2 instrument panel, refined: cold signal vs warm inference |
| **B · Sodium** | warm black `#0b0a09`, sodium `#ffb54a`, steel `#9cc3d3`, alert `#ff6a55` | newsprint `#f3eee4`, `#7a4600` / `#1d4f63` | streetlight sodium-vapour at night; most "analogue" |
| **C · Spectral** | violet-black `#07060d`, UV `#b0a4ff`, emission mint `#74e3c4`, rose `#ff7a95` | lilac plate `#f2f1f7`, `#4231b8` / `#00634f` | spectroscopy plates; most "scientific" |

**Type pairings** (all SIL OFL 1.1, self-hosted latin subsets; a face downloads only when used).

| | Display | Reading | Data / HUD |
|---|---|---|---|
| **Instrument** (default) | Space Grotesk 700 | IBM Plex Sans | IBM Plex Mono |
| **Signal** (v1.2 voice) | Syne 800 | IBM Plex Mono | IBM Plex Mono |
| **Almanac** | Fraunces 600 | IBM Plex Sans | IBM Plex Mono |

Type scale (tokens): micro 10 · label 11 · xs 12 · sm 13 · body 14→15.5 · lead 15.5→18 · h3 17→20 · h2 21→26 ·
h1 30→48 · hero 34→67 px (fluid `clamp()`); v2.0 had 8–9 px HUD text, now ≥ 10 px. Roles: display = headings,
body = reading text, mono = HUD, labels, badges, data, controls.

**Chosen default: Observatory + Instrument.** Observatory keeps the brand equity of v1.2 and its semantics
(cyan = observed/verified, amber = inferred) — Sodium inverts that colour meaning (amber becomes VERIFIED) and Spectral moves
VERIFIED onto violet, the hue SIMULATED uses in A. It also has the highest Night contrast (min 6.93:1 measured) and keeps old links
pixel-identical. Instrument because long evidence text in Plex Sans is markedly easier to read than monospace on a
390 px screen (measured: chapter 01's reading text is 1354 px tall vs 1808 px in Signal — 25% less scrolling), while Space Grotesk keeps the technical/observatory voice
without Syne 800's loudness; Plex Mono stays for data so the "instrument" texture survives. Almanac is the runner-up
(beautiful, but a serif pulls the piece toward an editorial magazine rather than an observatory).

## 6. Privacy guarantees (handover §2, §9)

* CSP meta: `default-src 'self'; connect-src 'none'; img-src 'self' data: blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`.
* No analytics, no third-party requests (fonts self-hosted). QA asserts zero non-localhost requests.
* Each sensor tile states what is read, why, where it is processed (this tab) and when it stops.

## 7. Increments (one commit each)

1. docs: audit + plan
2. foundation: self-hosted fonts, CSP, reduced-motion background, DPR cap, keyboard-accessible tiles, contrast
3. evidence data + sources drawer + provenance badges
4. chapter shell + navigation + 01 Offer (+ exchange simulator)
5. 02 Extraction (footprint explorer, link into v1.2 harvest, return path)
6. 03 Machine (systems map + ecosystem map)
7. 04 Feedback loop (attention laboratory)
8. art module (pure) + Node determinism tests
9. 05 Revelation: preview, seed/restore, URL state, exports, share fallback, clean view
10. QA harness + `docs/QA.md`
