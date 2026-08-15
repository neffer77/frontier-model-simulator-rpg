# Item 13.14 — Screenshot Regression

## Goal

Turn the Item 13.1 visual inventory and Item 13.13 responsive matrix into a deterministic screenshot regression gate without committing hundreds of PNG files to Git history.

## Canonical capture matrix

Item 13.14 consumes the existing sources of truth instead of defining new viewport or route lists:

- `visual-qa/inventory.json`
  - 38 canonical screens
  - 13 automated special captures
  - the manual PWA-install capture is intentionally excluded from automated regression
- `visual-qa/responsive-matrix.json`
  - phone portrait — 390×844
  - phone landscape — 844×390
  - tablet — 834×1112
  - desktop — 1440×1000
  - wide desktop — 1920×1080

That produces **51 captures per viewport × 5 viewports = 255 screenshots**.

## What is captured

Every canonical route is opened in a graduated, empty campaign state. The automated special-capture set covers:

- Founder setup
- Intro story overlay
- Company / Home — early campaign
- More sheet — early locks
- Training Operations — no active run
- More sheet — graduated campaign
- Company / Home — representative populated state
- Training incident investigation
- Technical explainer modal
- Milestone celebration overlay
- Company priority decision
- Technical Realism Audit
- Run Archive / New Game+

The harness fails if an expected route or automated special capture cannot be produced. Coverage is not allowed to silently shrink.

## Determinism controls

`tests/screenshot-regression.mjs` uses the pinned Playwright/Chromium toolchain and normalizes the runtime before each capture:

- device scale factor fixed to 1
- locale fixed to `en-US`
- timezone fixed to `UTC`
- dark color scheme
- reduced motion
- animations and CSS transitions disabled
- caret hidden
- page scrolled to the top and active focus blurred
- fixed `Date`
- seeded `Math.random`
- full-page PNG capture

Each PNG is represented in the committed baseline by:

- SHA-256
- PNG width
- PNG height
- byte size and capture metadata for review

The exact PNG files are not committed. This keeps the repository small while preserving a strict visual gate under the pinned browser toolchain.

## Baseline lifecycle

The committed baseline lives at `visual-qa/screenshot-baseline.json`.

### Bootstrap

The first Item 13.14 run starts with `status: bootstrap-pending` and intentionally fails closed after producing:

- `artifacts/screenshot-regression/candidate-baseline.json`
- `artifacts/screenshot-regression/report.json`
- `artifacts/screenshot-regression/REPORT.md`
- the candidate PNGs under `artifacts/screenshot-regression/changed/<viewport>/`

After visually reviewing the candidate PNGs, run:

```bash
npm run visual:screenshot-baseline
```

That rewrites `visual-qa/screenshot-baseline.json` with `status: active` and all 255 hashes. Commit the reviewed manifest. The same command is also the explicit workflow for intentionally accepting future visual changes.

### Normal regression run

Run:

```bash
npm run test:screenshots
```

With an active baseline, matching screenshots remain memory-only. Only changed screenshots are written to the artifact directory. The run fails on:

- pixel/hash mismatch
- changed PNG dimensions
- missing baseline entry
- obsolete extra baseline entry
- missing expected capture
- runtime page error
- capture-count drift

This makes failures small and inspectable while keeping successful runs inexpensive in artifact storage.

## Static guard

`tests/screenshot-regression-static.mjs` verifies that:

- the route inventory is still 38 screens
- the responsive matrix still contains five canonical viewports
- all 13 non-manual special captures remain covered
- the expected matrix size is 255
- the harness contains the deterministic capture controls
- package scripts remain wired correctly
- the cumulative RC command includes screenshot regression
- GitHub Actions runs the screenshot gate and uploads evidence
- an active baseline contains exactly the required keys and valid SHA-256 values

## GitHub Actions behavior

`.github/workflows/browser-qa.yml` now runs three browser-level evidence layers against the assembled `_site` artifact:

1. cumulative functional/browser QA
2. Item 13.1 visual inventory
3. Item 13.14 screenshot regression

The screenshot evidence artifact is uploaded with `if: always()` so a failed visual gate still leaves the candidate or changed PNGs and machine-readable report available for diagnosis.

The job timeout is raised from 18 to 24 minutes to accommodate the additional 255 screenshots without weakening any existing QA coverage.

## Relationship to Item 13.15

Item 13.14 intentionally limits itself to the routes already declared in the Item 13.1 inventory. Item 13.15 can reuse the same responsive matrix to crawl route/open-function discovery and detect newly reachable screens that have not yet been added to the inventory. Once a new screen is added to the inventory, Item 13.14 automatically requires a baseline for all five responsive modes.
