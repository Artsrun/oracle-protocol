# Oracle Protocol v2 — QA report

Run on the build box, 2026-11-13 (Asia/Yerevan). **Local only — nothing was deployed.**

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
node contrast.mjs                            # approximate contrast audit
```

## Baseline (v1.2, branch `prod` @ 7f1f3a6)

Same harness against the untouched `prod` worktree: approach → handshake (anonymous identity) → harvest (GPU/CPU/NET/
DEVICE OK, Bluetooth + geo DENIED) → portrait with `ORACLE_HASH`. Console: one 404 (favicon). **Six requests to
fonts.googleapis.com / fonts.gstatic.com** on every load. Screenshots: `/workspace/oracle-qa/shots/baseline/`.

## Unit tests — `tests/art.test.cjs` (8/8 pass)

Same seed+params → deep-equal scene for portrait/story/square · different seed → different hash · **every one of the 14
parameters changes the composition** · unknown keys (`lat`, `lng`, `ua`, `geo`, `gpu`) dropped, ranges clamped ·
encode/decode round-trip · seed format · max-density story compose < 150 ms (≈7–9 ms, 7,850 primitives) ·
interpretation contains no raw readings.

## End-to-end — `qa/qa.mjs` (51/51 checks pass)

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
5. v1.2 behaviour kept as-is: orientation/shake tiles report LIVE on devices with no such sensors (seen in headless
   desktop); the wallet path's balance query goes through the wallet's own RPC node; the approach sigil uses circles.
6. Evidence: 12 sources. Three PNAS papers were read via their Europe PMC records (PNAS and PMC blocked the fetcher);
   the DSA text via digitalacts.eu (EUR-Lex returned an empty 202). Court complaints are presented as allegations.
7. The phase rail is navigation, not a progress gate — visitors can jump to any chapter (intentional: nothing is
   gated on permissions), so "journey completion" is not tracked.
