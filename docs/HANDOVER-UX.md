# Oracle Protocol — UX handover: cut the cognitive load

Written 2026-11-14 against `prod` @ `4526203` (v3). For the agent doing the next UX pass.
Everything below was checked against the running site that day; numbers come from `qa/load.mjs` unless a
file is named.

## 1. The job

Visitors say the site shows too much and they do not understand what they are looking at. Make it
understandable at a glance, on a phone, without removing what makes it credible (the evidence) or what makes
it worth finishing (the artwork).

Done looks like this: a first-time visitor on a 390 px phone can say, on every screen and within a few
seconds, what this screen is for, what to do, and what their action just changed. They reach the artwork and
can tell which parts of it came from their own answers.

The owner works fast on personal projects and wants working changes, not a proposal. Ship in small commits
on a feature branch and open a PR. `prod` is the GitHub Pages source, so a push to `prod` is a deploy; do
not push there.

## 2. What the site is

A local-only, five-chapter interactive piece about the attention economy. The visitor's answers become a
deterministic generative artwork they can export and share. No server, no analytics, no build step.

| # | Route | Nav label | H1 | What the visitor does |
|---|---|---|---|---|
| 00 | (none) | APPROACH | ORACLE | Presses BEGIN |
| 01 | `#offer` | OFFER | What do you trade? | Ticks up to 6 trades |
| 02 | `#extraction` | EXTRACTION | Observed, inferred, unknown | Ticks up to 8 footprint categories; optional sensor demo (`#sensors`) |
| 03 | `#machine` | MACHINE | The loop | Steps through a 7-node diagram; reads a company directory |
| 04 | `#loop` | FEEDBACK LOOP | Attention lab | Moves 6 sliders, runs rounds on a toy feed ranker |
| 05 | `#revelation` | REVELATION | Your composition | Sees the artwork; exports, shares |

Code map (classic scripts, load order fixed in `index.html`):

- `app-shell.js`: router, shared templates (`chapterHead`, `chapterNav`, `row`, `more`, `slider`, `tally`), sources drawer, theme switch.
- `chapters/{offer,extraction,machine,loop,revelation}.js`: one file per chapter, each registers a render function that writes `innerHTML` and binds handlers.
- `data/content.js`: all chapter copy and the lab items. `data/evidence.js`: sources, labels, `badge`, `claim`, `cite`.
- `art/oracle-art.js`: pure artwork engine (`normalize`, `compose`, `render`, `compositionId`, `encode`/`decode`).
- `app-core.js`, `app-vitals.js`, `app-ui.js`: the older v1.2 sensor demo plus `PHASES`, `render()`, the approach screen.
- `theme.css` (tokens), `styles.css` (v1.2 + app bar), `chapters.css` (chapters).
- `docs/PLAN.md` §5b holds the current simplification rules and glossary. `docs/QA.md` holds every past result.

## 3. What was already tried, and why it was not enough

Three passes have already attacked this problem, so repeating them will not help.

- Iteration 3 cut visible words from 2567 to 985 (−62%), mostly by moving text into `<details>`.
- v3 turned chapters 01 and 02 into checklists, hid the exchange simulator behind `?simulator=1`, and moved
  all chrome into one in-flow app bar after the owner objected to navigation floating over content.

The complaint survived a 62% word cut. The problem is therefore not the amount of text. It is that the
visitor cannot see what the piece is building toward, each screen asks for several things at once, and the
same words mean different things in different places. Collapsing more text into disclosures will lower the
word count again and change nothing; chapter 02 already has 10 disclosure widgets.

## 4. Diagnosis

Baseline at 390 × 844, dark, nothing opened (`qa/load.mjs`):

| Screen | Words | Controls | Disclosures | Targets under 44 px | Font sizes | Smallest text | Uppercase labels | Page length (viewports) |
|---|---|---|---|---|---|---|---|---|
| 00 Approach | 27 | 1 | 0 | 8 | 4 | 11 px | 3 | 1.1 |
| 01 Offer | 80 | 13 | 6 | 13 | 5 | 11 px | 2 | 1.1 |
| 02 Extraction | 114 | 19 | 10 | 18 | 8 | 10 px | 7 | 1.6 |
| 03 Machine | 236 | 31 | 1 | 30 | 9 | 9 px | 7 | 2.7 |
| 04 Feedback loop | 200 | 14 | 2 | 18 | 9 | 10 px | 17 | 2.5 |
| 05 Revelation | 96 | 11 | 2 | 15 | 6 | 11 px | 10 | 1.7 |

Every screen also carries 8 app-bar controls in an 87 px bar, all 30–32 px tall. "Controls" counts `#app`
only; "Targets under 44 px" includes the app bar. "Disclosures" counts `<details>` and checklist row chevrons.

**A. The reward is deferred and the cause is invisible.** The visitor makes 20 inputs (6 ticks, 8 ticks,
6 sliders) before seeing anything they made. Chapter 01 promises "each one shapes your artwork", and the
only thing that changes on screen is a counter reading "1 of 6". The seed is not even created until chapter
05 (`state.v2.seed` is `null` before that). People are filling in a form with no idea what it produces.

**B. Each screen has more than one job.** 02 teaches a three-part taxonomy, then asks for a checklist, then
offers a sensor demo. 03 is a diagram, a duplicate list of the same seven steps, a directory of 18 company
entries with 30 citation links, and a relations table. 04 is six parameters, four metric tiles, a ranked
list of ten, and an evidence panel. 05 is the artwork, four format buttons with pixel dimensions, a
checkbox, a "Look" line, four export buttons and two disclosures.

**C. Words collide.**
- Each chapter has two names, and they cross: chapter 03's H1 is "The loop" while chapter 04's nav label is
  "FEEDBACK LOOP" and its H1 is "Attention lab".
- INFERRED and UNKNOWN each mean two things. In 02 they are kinds of information (what a system guesses
  about you). Everywhere they are also provenance labels (how sure the authors are of a claim). An expanded
  footprint row shows both uses a few lines apart: a `dt` reading INFERRED, then a badge reading INFERRED
  (`chapters/extraction.js`, `detail()`). Iteration 3 created this by renaming "Derived" to INFERRED for
  consistency.
- There are three label systems in total: 4 provenance labels, 3 information kinds, 5 sensor states.
- Unexplained terms sit on primary surfaces: Gini, Top-3 share, Emotional load, Amplification, Oracle seed,
  composition `C-…`, "Look: Observatory · Night · Instrument · follows site theme".

**D. Controls and their results are apart.** In the lab on a phone the sliders sit at y 425–770 and the
first feed row at y 1138, in an 844 px viewport. Moving a slider changes something the visitor cannot see.
The Next button on Machine is at y 2199.

**E. Nothing looks more important than anything else.** 9 font sizes on two chapters, 9–11 px uppercase
tracked mono on most labels, and every group in the same hairline box. On a phone the nav reads
"00 01 02 03 04 05" with only the current chapter named, and it shows no progress.

**F. Defects found on the way.**
- The diagram label "06 Attention allocation" is clipped to "tion allocation" at both widths
  (`chapters/machine.js`, `loopSvg`; labels are 9 px).
- The Next button is filled on 01 and 02 and outlined on 03 and 04 (`chapterNav(next, quiet)`), so the way
  forward looks different halfway through.
- The approach screen says "Let the machine witness you — willingly" and never says what the visitor will
  do, what they get, or how long it takes.
- `README.md` still titles the project v2.

## 5. Direction: the artwork is the interface

Treat the piece as a three-minute guided build of an artwork. The investigation stays, as depth for people
who want it. Five principles follow from the diagnosis; where a work package below is silent, decide by
these.

1. **Show the result from the first tick.** Every choice visibly changes the artwork, and the screen says
   what changed in one short line.
2. **One job per screen, stated in one sentence.** Anything that is not that job is either removed from the
   journey or moved to the Sources drawer. Prefer removing or relocating over collapsing.
3. **One name per thing.** The nav label and the H1 agree. A word has one meaning across the whole site.
4. **Defaults teach; controls are for the curious.** Offer a few meaningful presets first and the raw
   parameters second.
5. **The control and its result share a viewport** at 390 × 844.

Keep chrome in the page flow. The owner rejected fixed and sticky UI over content in v3 and a QA check
enforces it, so do not solve principle 5 with a sticky panel.

## 6. Work packages

In priority order. One commit each. WP1 and WP2 give most of the benefit; if time runs out, stop after a
complete package rather than leaving one half done.

### WP0. Baseline
Run the unit tests, `qa.mjs` in both schemes, and `load.mjs`; keep the outputs as "before". Section 8 has
the commands and the one failure to expect.

### WP1. Fix the defects
- Diagram labels legible and unclipped at 390 and 1280 px. Numbers alone on the diagram are enough if the
  step names appear beside it.
- One Next-button style in all four chapters.
- Approach says, in plain words: answer a few questions about your digital life, get a one-of-a-kind artwork
  made from your answers, about three minutes, nothing leaves this tab. The verse can stay as a secondary
  line.
- README title to v3.

### WP2. Live artwork preview
This is the change that answers "what am I doing here".
- Create the seed when the visitor presses BEGIN (or on first chapter render) instead of on arriving at 05.
  Use `OracleArt.newSeed()`; it must stay random and never derive from device data.
- Show a small in-flow preview of the current artwork in the chapter header of 01, 02 and 04, redrawn on
  every input with `OracleChapters.artParams()` → `OracleArt.compose` → `OracleArt.render`. Measured cost
  at 216 × 270 with every parameter at maximum: median 19 ms, worst 46 ms, so it can run on each `input`
  event. No overlay text at that size. Draw instantly under `prefers-reduced-motion`.
- Beside it, one line that names the last change in visual terms, using the mapping the engine already
  has: each trade adds a red shard; footprint categories thicken the lattice; relationships add network
  links; lab weights shape the flow lines; rounds add echoes; amplification adds swirl. Give the line
  `aria-live="polite"` and the canvas a text alternative.
- The preview must use the same look (palette, mode) as the chapter 05 canvas.
- Acceptance: tick a trade on a phone and the preview and its caption change without scrolling.

### WP3. Attention lab: presets first
- Primary control: three presets as a segmented control. Starting values, measured on the current model
  (top-3 share at round 0 → round 4, and the #1 post):

  | Preset | e / r / w / t / k / a | Top-3 share | #1 post |
  |---|---|---|---|
  | Newest first (the existing CHRONOLOGICAL) | 0 / 0 / 100 / 0 / 0 / 0 | 46% → 46% | Breaking rumour, unverified |
  | For you | 20 / 90 / 30 / 20 / 30 / 30 | 42% → 48% | Meme in your niche |
  | Most engaging | 90 / 30 / 30 / 60 / 80 / 80 | 69% → 92% | Outraged thread about a rival group |

  Top-3 share alone does not separate the first two; the #1 post and the change across rounds do. Tune the
  values if you find a clearer contrast, and re-measure with `window.OracleLab`.
- Replace the four metric tiles with one sentence, for example "After 4 rounds the top 3 posts take 92% of
  all attention." Gini and emotional load move into "Model rules".
- The six sliders move into one disclosure ("Adjust the ranker yourself"). They keep working and keep
  feeding the artwork.
- Order on a phone: presets, sentence, feed, Run a round. Acceptance: after tapping a preset at 390 × 844
  the sentence and at least the top five feed rows are in view without scrolling.
- The evidence panel keeps its two visible claims.

### WP4. Machine: one stepper, directory out
- One vertical list of the seven steps, each with its name and its one-line description always visible
  (`MACHINE[i].name`, `.text`), and its sourced claim behind the existing chevron. Reuse the `row` pattern
  without the checkbox. The ring diagram stays as an illustration of the cycle; drop the duplicate button
  list and the separate detail panel.
- "Who does what" (roles, 18 entities, 30 citation links) and "Documented relations" move into the Sources
  drawer as their own section, with one link from the chapter ("Who is in this loop? →"). Nothing is
  deleted.
- Acceptance: the chapter is at most 1.5 viewports long on a phone and every claim that was reachable
  before is still reachable.

### WP5. Revelation: two actions and a personal legend
- Artwork first, then exactly two visible actions: save the image (primary) and share. Format defaults to
  portrait. Format, title toggle, copy link, clean view, seed, caption and history go into one "Options"
  disclosure. The "Look" line leaves the default view.
- Replace the collapsed "What made this composition" with a short visible legend written from the
  visitor's own answers, for example "3 red shards: the 3 trades you ticked" and "Dense lattice: 5 of 8
  footprint categories", each with an edit link back to its chapter. `paramSummary()` already has the data.
  This is the payoff of the piece and it is currently hidden.

### WP6. Names, chrome, type
- One name per chapter in the nav, the kicker and the H1. Recommended plain set: Trade, Footprint, Loop,
  Feed, Artwork. Route ids (`#offer`, `#extraction`, …) do not change. See section 10.
- In chapter 02, information kinds become plain sentence-case words that are not provenance labels, for
  example Recorded, Guessed, Hidden. Provenance badges (VERIFIED, INFERRED, SIMULATED, UNKNOWN) keep their
  names and appear only inside evidence disclosures. Update the glossary in `docs/PLAN.md` §5b.
- Phone nav shows progress in words ("Step 2 of 5 · Footprint") with visited chapters marked, in place of
  bare numbers. It stays in the page flow and stays keyboard-operable with `aria-current`.
- Move the theme switch and the SOURCES button out of the top bar into an in-flow footer. Every citation
  still opens the drawer.
- Type: at most 6 sizes per screen, no text under 12 px except badges, uppercase tracked mono for badges
  and the chapter kicker only. Use the existing tokens in `theme.css`; do not add sizes.
- Touch targets: 44 px minimum for buttons, selects, nav items and row controls; 24 px minimum for inline
  citation links.

### WP7. Optional: footprint follows trades
Chapters 01 and 02 are two checklists in a row, 14 ticks. Chapter 02 could arrive pre-ticked from the
trades made in 01 ("those trades give away these kinds of data") and let the visitor correct it. That
removes most of the decisions and links the two chapters. It needs an authored trade-to-category mapping
(a design assumption, like `OFFER_WEIGHTS`, and labelled as such) and it changes which artwork a given set
of ticks produces. Old links are unaffected because they carry `f` explicitly. Do this only if the owner
says yes.

### Out of scope
The v1.2 sensor demo (`#sensors`, `#protocol`, portrait) beyond renames that fall out of WP6. The artwork
engine. The evidence content. New dependencies or a build step.

## 7. What must not break

- **No build, no dependencies.** Vanilla classic scripts, relative paths (the site is served under
  `/oracle-protocol/`), load order as in `index.html`.
- **CSP.** `script-src 'self'` means no inline scripts and no inline event-handler attributes.
  `connect-src 'none'` means no network calls of any kind. Fonts stay self-hosted. Zero third-party
  requests.
- **Artwork determinism.** Do not change `compose()`, parameter names, clamping or the encoding in
  `art/oracle-art.js`. The fixed reference `ORACLE-7K3F-Q9ZD` must export byte-identical PNGs, and old
  `#art?…` and `#revelation?…` links must render as before. `deriveEx` stays pure. The artwork never reads
  sensor data.
- **Evidence integrity.** Every factual statement keeps its label and its source. Allegations stay worded
  as allegations. You may move, shorten the framing around, or relocate a claim; do not reword what a
  source is said to support, and do not add facts.
- **Accessibility.** axe-core WCAG 2.1 A/AA at zero violations, text contrast at 4.5:1 or better in all six
  looks, full keyboard operation, native controls, `prefers-reduced-motion` honoured, focus moved to the
  heading on chapter change.
- **Theme.** No literal colours in `styles.css` or `chapters.css`; use the role tokens. One colour, one
  meaning (PLAN §5b). Both Night and Day must be checked for every change.
- **One filled primary action per screen**, and no fixed or sticky UI over content.
- **Motion settles.** No animation left running.

`qa/qa.mjs` encodes the current structure in 85 checks. Some will legitimately change with this work (for
example the lab flow that drags sliders, the Machine node stepping, the kicker-equals-HUD check). Update a
check when the design it describes has changed on purpose, and list each one with the reason in the PR.
Never weaken or remove a privacy, determinism, contrast or axe check to get to green.

## 8. Run and verify

```bash
# serve under the same sub-path as GitHub Pages (run from the directory that contains the repo folder)
python3 -m http.server 8765 --bind 127.0.0.1
```

```bash
npm test
```

```bash
cd qa && npm i
```

```bash
COLOR_SCHEME=dark QA_DIR=/tmp/oracle-qa/dark CHROME=/path/to/chrome node qa.mjs
```

```bash
COLOR_SCHEME=light QA_DIR=/tmp/oracle-qa/light CHROME=/path/to/chrome node qa.mjs
```

```bash
OUT=/tmp/oracle-load/before CHROME=/path/to/chrome node load.mjs
```

`contrast.mjs` and `theme.mjs` run the same way, with `CONTRAST_OUT` (a file) and `THEME_DIR` as their
output variables. All the scripts default to `/usr/bin/google-chrome` and to `/workspace/oracle-qa`, so set
`CHROME` and the output path wherever those do not exist.

State on 2026-11-14: unit tests 14/14. `qa.mjs` 84/85 in both schemes on a container with no audio device;
the one failure is "refused sensors show DENIED (geo, mic)", where the mic tile reads UNAVAILABLE because
there is no microphone at all. `docs/QA.md` records 85/85 on a machine with Google Chrome. Take your own
baseline before changing anything and compare against that.

Only headless Chromium has ever been used. Real phones, Safari, Firefox and Brave are untested; say so
again if that is still true when you finish.

## 9. Targets

Report these from `load.mjs` at 390 × 844 for chapters 01–05. They are a way to see whether the change
worked, not a score to hit: hiding content in disclosures improves the numbers and makes the site no
clearer, so judge each screen against section 1 first.

| Measure | Now (worst chapter) | Aim |
|---|---|---|
| Visible words | 236 | 100 or fewer |
| Visible controls in `#app` | 31 | 12 or fewer |
| Page length | 2.7 viewports | 1.5 or less (2.0 for the lab) |
| Font sizes | 9 | 6 or fewer |
| Smallest text | 9 px | 12 px (badges may be 11 px) |
| Uppercase labels | 17 | 6 or fewer |
| Targets under 44 px | 30 | 0, apart from inline citation links (24 px minimum) |
| App-bar height | 87 px | 56 px or less |

## 10. Decisions that belong to the owner

Proceed on the recommended default for each and flag it in the PR; none of them blocks WP0–WP5.

1. **Chapter names.** Recommended: plain names in nav and H1 (Trade, Footprint, Loop, Feed, Artwork). The
   alternative keeps the current poetic labels (OFFER, EXTRACTION, MACHINE, FEEDBACK LOOP, REVELATION) as
   the only name and turns each H1 into the instruction. Either works; two names per chapter does not.
2. **Theme switch and Sources leave the top bar** for a footer. Recommended: yes.
3. **Company directory moves from chapter 03 to the Sources drawer.** Recommended: yes.
4. **WP7, footprint derived from trades.** Recommended: yes, but only with the owner's go-ahead because it
   changes what the ticks mean.

## 11. What to hand back

- A feature branch with one commit per work package, and a PR into `prod` that the owner merges.
- Before and after screenshots at 390 and 1280 px, Night and Day, for every chapter (`load.mjs` writes
  them).
- The `load.mjs` table before and after.
- Unit, `qa.mjs` (both schemes), contrast and axe results, with every changed or removed check listed and
  justified.
- `docs/QA.md` and `docs/PLAN.md` §5b updated to match what shipped.
- A short list of what you did not do or could not verify.
