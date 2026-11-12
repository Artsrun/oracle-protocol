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
