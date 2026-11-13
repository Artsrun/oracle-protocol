# Oracle Protocol — Audit (v1.2 → v2)

Audited: 2026-11-13, branch `prod` @ `7f1f3a6` ("v1.2 harvest UI: 11 vital tiles…").
Method: read every file in full, ran the app locally under `/oracle-protocol/` with headless Chrome 156
(see `docs/QA.md` → *Baseline*), inspected the four reference repositories read-only.

## 1. Repository inventory

| File | Lines | Role |
|---|---|---|
| `index.html` | 30 | Shell: background canvas, HUD bar, phase rail, `#app` mount; loads Google Fonts + 3 classic scripts in order `app-core.js → app-vitals.js → app-ui.js`. |
| `styles.css` | 121 | Whole design system in minified rules: HUD frame, scanlines/noise/vignette overlays, buttons, auth cards, permission tiles, portrait panels, keyframes, one `prefers-reduced-motion` rule. |
| `app-core.js` | 304 | Global `state`, phase rail (`PHASES`, `syncHud`), "cosmos" particle canvas (rAF loop), HUD clock, collectors: canvas fingerprint, WebGL info, font probing, `harvestBase()` (≈50 navigator/screen fields), `generateHash()` (32-bit string hash), wallet handshake (`connectCrypto`), WebAuthn (`doBioAuth`), geo, battery, camera metadata, mic energy. |
| `app-vitals.js` | 173 | `vitals` event bus, `harvestGeo` (high-accuracy, permission-aware hints), iOS motion permission, live orientation/shake listeners, GPU (WebGL + WebGPU adapter), CPU/mem micro-benchmark + heap + storage quota, Bluetooth availability, network info. |
| `app-ui.js` | 216 | Stage renderer: `approach → handshake → permissions (harvest) → portrait (witness)`; 11 permission tiles with TAP/OK/LIVE/DENIED badges; "Harvest all"; portrait panels; copy hash; reset. |
| `README.md`, `NOTE.md` | 30 | Protocol description, iOS/Safari caveats, Pages config (deploy from branch `prod` / root). |

No build, no package.json, no tests, no CI workflow, no LICENSE file. GitHub Pages serves the branch root, so
all asset paths must stay **relative** (they are) to work under `/oracle-protocol/`.

## 2. Architecture as found

* Classic (non-module) scripts sharing globals (`state`, `vitals`, `render`, collectors). Load order matters:
  `app-vitals.js` reads `state`; `app-ui.js` picks `harvestGeo` over `getGeo` if defined.
* Rendering is `innerHTML` templating per stage + direct `onclick` assignment. Re-render on every tile tap.
* State is in-memory only. Nothing is written to storage; nothing is sent anywhere by app code.
* Background: 90-particle 2D starfield, full-DPR canvas (DPR not capped), runs forever, ignores reduced-motion.

## 3. Behaviour baseline (regression checklist)

Verified in headless Chrome, permissions not granted (= denied path):

1. Approach renders title, verse, **INITIATE PROTOCOL**.
2. Handshake: **CONNECT CHAIN** without wallet → "Anonymous" ephemeral address; **PROCEED** appears.
3. Harvest: 11 tiles; tapping GPU/CPU/NET/DEVICE PROFILE → OK; BLUETOOTH → DENIED "Web Bluetooth absent"; GEO denied → DENIED with Safari hint.
4. **VIEW PORTRAIT** → WITNESSED + `ORACLE_HASH // XXXXXXXX`, panels show withheld/N/A values instead of blanks.
5. **COPY HASH** / **RESET** return to approach and clear state.
6. Phase rail and HUD phase label follow the stage.

These six items are re-run against v2 (see QA.md).

## 4. Privacy findings

| # | Finding | Severity | v2 action |
|---|---|---|---|
| P1 | Google Fonts loaded from `fonts.googleapis.com`/`fonts.gstatic.com` — 6 third-party requests on every load (baseline run). Exposes visitor IP + Referer to a third party. Not a personal *sensor* signal, but it contradicts "zero server". | Medium | Self-host the latin subsets (OFL 1.1) under `fonts/`. |
| P2 | Wallet handshake calls `eth_getBalance` through the injected wallet; the wallet's own RPC node receives the address. User-initiated, handled by the extension, not by app code. | Low | Preserve; disclose in the handshake card. |
| P3 | Collected values (geo to 5 decimals, GPU renderer, fonts, canvas fingerprint) are kept in memory and rendered; never persisted or transmitted. | OK | Keep. v2 artwork **must not** consume any of them (handover §4E, §8). |
| P4 | Camera/mic tracks are stopped after reading; `AudioContext` closed. | OK | Keep. |
| P5 | No CSP. | Low | Add a `<meta>` CSP with `connect-src 'none'` so the page *cannot* make fetch/XHR/beacon/WebSocket calls. |
| P6 | Device motion/orientation listeners are never removed once attached. | Low | Leave (live tiles depend on it); document. |

## 5. Accessibility / UX findings

* Permission tiles and auth cards are `div`s with `onclick` — not focusable, no keyboard activation. → add `role=button`, `tabindex=0`, Enter/Space.
* Much text uses `rgba(0,229,255,.35–.48)` on near-black — below WCAG AA 4.5:1 for small text. → raise contrast in new UI; bump the worst legacy labels.
* `prefers-reduced-motion` only shortens CSS animations; the JS particle loop and glitch remain. → static background frame under reduced motion.
* Phase rail is decorative (`pointer-events:none`); no navigation between chapters. → v2 makes it a real nav.
* No `<main>`/landmarks, no live region for status messages.

## 6. Browser-support constraints

* Already relies on: optional chaining, `async/await`, `Set`, `clip-path`, `backdrop-filter`, `dvh`. ⇒ Evergreen browsers are already the floor (approximate versions from general knowledge, not re-verified in this session); v2 uses no newer features than these.
* Canvas 2D and `canvas.toBlob` are universally available. Web Share with files is **not** available everywhere (e.g. headless Chrome on Linux used for QA has no `navigator.share`) ⇒ a download + copy fallback is mandatory.

## 7. Reference repositories (read-only, `/workspace/refs`)

| Repo | What is actually there | License | Extracted |
|---|---|---|---|
| `lattice` | React + Vite + R3F/Three.js 0.185 + postprocessing, Shadertoy port, TanStack routes, server/auth code. ~1 MB. | No LICENSE file | **Concepts only**: restrained cinematic palette, "render on demand", drawing-buffer-resolution discipline, section anchors. No code (unlicensed, and Three.js+React would force a build step for a 2D composition). |
| `ascii-principal-motion` | Single-file HTML demos: parametric samplers (`solid/hull`, `lathe`, `tube`, `param`), shading models, **URL-hash state** with whitelisted keys, clamped ranges and debounced `history.replaceState`. | MIT © Artsrun Hakobyan | **Pattern re-implemented**: whitelisted/clamped hash state; parametric thinking (barycentric lattice per face → triangular lattice). ASCII output not used. |
| `max-perf-webgl` | WebGL2 instanced-quad renderer (one draw call, 8 floats/instance). | No LICENSE file | Not needed: profiling target is ≤ ~4k primitives, Canvas 2D draws a 1080×1920 frame in well under a second (measured in QA). Kept as the escalation path. |
| `speedy` | React/Vite LinkedIn post engine; `src/lib/share.js` (pure share builders, `canShare({files})` → `share` → text fallback, copy helper). Editorial dark palette, mono type, generous spacing. | No LICENSE file | **Concepts only**: share cascade (files → text → download + copy), pure builders separated from side effects, editorial restraint. No code copied. |

## 8. Decision: stay vanilla, no build

Nothing in the handover requires a framework. The artwork is 2D line/mesh geometry; Canvas 2D gives deterministic
output, trivial PNG export at arbitrary sizes, works without WebGL, and adds zero dependencies. Migrating to
React/Three.js would add a build step, change the Pages deployment, and risk the working v1.2 flow for no user-visible
gain. ⇒ **Keep classic scripts + one isolated art module** (`art/oracle-art.js`, no DOM access except the canvas it is handed).
