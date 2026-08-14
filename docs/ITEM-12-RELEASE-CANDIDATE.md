# Item 12 — Release Candidate / Regression / Performance

## Goal
Turn Frontier Lab from a feature-complete simulator into a release candidate with objective ship/no-ship gates.

A release must now prove four things before GitHub Pages deploys:

1. the repository/runtime package is internally consistent,
2. the full automated gameplay regression suite passes against the production artifact,
3. old saves and offline/PWA launch remain compatible,
4. startup/render size and timing stay inside explicit budgets.

## Release architecture

### Source tree
The repository contains runtime code, tests, documentation, workflows, and development metadata.

### `_site` production artifact
`scripts/build-site.mjs` parses `index.html` and copies only:

- `index.html`
- `sw.js`
- local CSS/JS/manifest/icon assets actually referenced by `index.html`
- `.nojekyll`
- generated `build-info.json`

Tests, docs, phase notes, package metadata, GitHub workflow files, and other repo-only tooling are not deployed.

This closes the previous gap where the Pages `rsync` copied most of the repository despite describing the result as a runtime-only site.

## Static release gate

`npm run test:static` / `tests/release-static.mjs` checks:

- all local assets referenced by `index.html` exist,
- runtime paths remain GitHub-Pages-subpath safe,
- scripts/styles are not duplicated,
- JavaScript/CSS byte budgets are respected,
- individual runtime files stay below the single-file budget,
- browser/test JS and MJS parse with Node,
- the Scriptable top-level-await launcher parses using module grammar,
- service-worker cache parity is two-way: every runtime asset is cached and stale cache-only files are rejected,
- PWA `start_url` and `scope` remain `./`,
- standalone PWA display and manifest icons remain valid,
- Scriptable CSS/JS lists exactly match browser load order,
- the Scriptable launcher points at `main`,
- Playwright is exactly pinned,
- release build/test commands remain available.

## Browser release gate

`tests/release-candidate.mjs` runs in Chromium against `_site`, not the source tree.

It verifies:

### Production identity
- `_site/build-info.json` exists,
- it contains release/build metadata,
- the browser is exercising the assembled production artifact rather than accidentally falling back to source-tree files.

### Startup
- app root renders,
- fresh-run configuration renders,
- navigation duration and wall-clock startup stay inside budget,
- initial transfer stays inside budget,
- DOM size stays inside budget,
- initial asset requests do not fail.

### Render-chain stability
The test executes repeated shared `render()` calls to reproduce the class of repaint failures that previously broke navigation after state mutation.

After churn, these UI layers must each exist exactly once:

- campaign progress,
- balance tempo,
- replay HUD,
- realism launcher,
- responsive gameplay navigation.

DOM size and synchronous render-loop time are budgeted.

### Save migration
The test removes Item 7/9/10/11 state from an already-started company and reloads it. The release must reconstruct:

- campaign state,
- balance/pacing telemetry,
- technical-realism state,
- replay compatibility state,

without changing the company name, simulated day, or technical progress.

Legacy replay migration must remain Standard + Legacy archetype + untimed Legacy challenge, with no fresh-run resource modifier.

### Offline PWA
The test waits for an active service worker, verifies the versioned cache exists, ensures the page is controlled, disables browser networking, and cold-reloads the existing company.

The release fails if the offline app cannot restore the same company from cached runtime assets and local save state.

## Existing regression suites

The RC gate also runs the existing suites:

- `tests/browser-smoke.mjs` — mobile/desktop gameplay shell and navigation,
- `tests/balance-pacing.mjs` — canonical economy/pacing,
- `tests/technical-realism.mjs` — realism classifications and corrected model math,
- `tests/replayability.mjs` — difficulty/archetype/challenge/New Game+ behavior.

`npm run test:qa` now includes the Item 12 RC browser test after those suites.

## RC blocker fixed during Item 12

The Item 11 pull-request browser run was already red before Item 12 began: the mobile smoke test reported that navigation preserved stale scroll position.

The original assertion also conflated two different navigation intents:

- **Train** should navigate to the training section,
- **Home** should return to page top.

`responsive-gameplay-shell.js` now makes same-view navigation deterministic after rendering. Anchored destinations scroll to their requested section, while unanchored Home navigation explicitly returns to top even when `state.view` was already `company` and the global view-change watcher therefore had nothing to observe.

The smoke regression now starts from an unambiguous bottom-of-page stale position, verifies Train brings `.run` into the viewport, then verifies Home returns to the top.

## Performance budgets

`release-budgets.json` is the versioned source of truth.

Current budgets are intentionally regression budgets rather than claims about production Core Web Vitals:

| Budget | Limit |
| --- | ---: |
| Runtime JavaScript | 1.5 MB |
| Runtime CSS | 600 KB |
| Runtime asset count | 130 |
| Largest JS/CSS asset | 300 KB |
| Initial browser load | 5,000 ms on local CI server |
| Initial transfer | 2.5 MB |
| DOM nodes | 3,500 |
| 40 synchronous renders | 1,800 ms |
| Offline cached reload | 5,000 ms |

The browser timings run on GitHub-hosted CI against a local static server, so they are designed to detect major regressions. They should not be interpreted as real-user network latency measurements.

## CI / deployment behavior

### Pull requests
`.github/workflows/browser-qa.yml` now:

1. installs the exact Playwright version,
2. runs static release integrity,
3. builds `_site`,
4. installs Chromium,
5. serves `_site`,
6. runs the complete browser/regression/RC suite.

### `main` / GitHub Pages
The Pages workflow repeats the release gate after merge. Deployment cannot proceed directly from an untested `main` commit:

`validate → release-candidate → build → deploy → verify-live`

The browser stage again tests `_site`. The final build recreates the artifact from the exact deployment commit and verifies repo-only paths are absent before upload.

After deployment, `verify-live` polls the published `build-info.json` and fails unless the live Pages site reports the exact 12-character SHA of the commit that triggered the workflow. This detects stale or mismatched production content after an otherwise successful Pages deployment.

## Local RC commands

Install dependencies and Chromium once:

```bash
npm install --no-audit --no-fund
npm run setup:browser
```

Then, in one terminal:

```bash
npm run build:site
python3 -m http.server 4173 --directory _site
```

In another terminal:

```bash
npm run test:rc
```

## Manual release checklist

Automated green checks are necessary but not sufficient for the first RC. Before calling a build stable, manually confirm:

- iPhone Safari fresh game, story sequence, navigation, rotation, and safe areas,
- iPhone Add to Home Screen install and offline relaunch,
- existing real save opens without reset,
- Scriptable launcher opens the merged `main` build,
- desktop Chromium plus one non-Chromium browser can complete the early guided campaign,
- no visible duplicate HUD/overlay layers after prolonged navigation,
- Run Archive/New Game+ reset warning is understandable,
- Realism Audit links and classifications remain readable on mobile.

## Ship criteria

A release candidate is shippable when:

- static integrity passes,
- all browser regression suites pass,
- Item 12 performance budgets pass,
- save migration passes,
- offline PWA reload passes,
- the minimal `_site` artifact contains no repo-only tooling,
- the live site serves the exact deployed commit,
- no P0/P1 issue remains from the manual mobile/desktop checklist.

Performance thresholds should be tightened over time after collecting stable CI measurements rather than loosened simply to make a failing build green.
