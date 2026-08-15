# Item 13.16 — Final Release Gate Policy

## Goal

Turn the Item 13 QA layers into one explicit release decision instead of a loose collection of scripts.

Item 13.16 defines:

- which signals are release blockers
- which signals are advisories
- how all blocker checks execute even after an earlier failure
- which evidence must exist for a valid decision
- how screenshot and route reports are interpreted semantically
- how GitHub Actions preserves diagnostics from a blocked release

The machine-readable source of truth is `release-gate-policy.json`.

## Why this item exists

Before 13.16, `test:rc` was an `&&` chain and GitHub Actions also ran a separate static step before browser work.

That created an important failure mode: one early static assertion could stop the workflow before the browser suite, route crawler, screenshot regression, or visual inventory executed. A red build therefore did not necessarily contain enough evidence to understand the release state.

Item 13.16 replaces that behavior with an orchestrator that records every gate independently and makes one final decision after all executable evidence has been collected.

## Canonical command

The final release command is:

```bash
npm run test:rc
```

`test:rc` and `test:release-gate` both resolve to:

```bash
node tests/release-gate.mjs
```

The runner:

1. runs static contracts
2. builds `_site`
3. starts the production artifact on localhost
4. executes each browser blocker independently
5. runs route crawling
6. runs release-candidate performance/migration/offline-PWA checks
7. runs screenshot regression
8. generates the visual inventory as advisory evidence
9. interprets route/screenshot/visual reports
10. writes the final decision
11. exits non-zero only after the evidence report has been written

## Blockers

The policy treats the following as release blockers:

- static contracts and release integrity
- production artifact build
- browser smoke
- balance and pacing
- technical realism
- replayability
- browser-default firewall
- shared surface system
- progressive disclosure
- shared controls
- Company dashboard
- page visual sweep
- empty-state system
- locked-state system
- overlay system
- accessibility system
- responsive visual sweep
- route/page crawler
- release-candidate performance, save migration, and offline PWA behavior
- screenshot regression

A blocker can fail in three ways:

1. its command returns non-zero
2. required evidence is missing
3. its evidence exists but violates the semantic release policy

## Advisories

The following do not independently block release:

- visual-inventory unresolved observations that are not already captured by a blocker
- visual-inventory bright-surface suspects
- route-crawler warnings
- the manual PWA-install affordance review

Offline PWA behavior itself is not advisory. It remains blocker-tested by `tests/release-candidate.mjs`.

## Screenshot policy

Screenshot regression is a blocker only when it has a reviewed, active baseline.

The final policy requires:

- baseline status: `active`
- expected captures: 255
- produced captures: 255
- zero mismatches
- zero missing baseline entries
- zero extra baseline entries
- zero missing captures
- zero page errors

The 255-capture contract is:

- 38 canonical routes
- 13 automated special states
- 5 canonical viewports

### Bootstrap lifecycle

The repository currently uses the deliberate Item 13.14 lifecycle state `bootstrap-pending` until the first real Chromium render is reviewed.

`bootstrap-pending` is **not release-ready**. Item 13.16 reports it as a blocker.

The intended bootstrap process is:

1. run the release gate in GitHub Actions
2. allow screenshot regression to produce all current PNG evidence plus `candidate-baseline.json`
3. review the candidate screenshots
4. activate the reviewed candidate as `visual-qa/screenshot-baseline.json`, or run `npm run visual:screenshot-baseline` under the pinned toolchain
5. commit the active baseline
6. rerun the release gate

CI never silently blesses the first screenshot render.

## Route policy

The route crawler remains a hard release signal.

The final policy requires:

- expected visits: 190
- actual visits: 190
- zero route-crawler failures

The 190-visit contract is:

- 38 canonical routes
- 5 canonical viewports

Route warnings remain advisories and are surfaced in the final report.

## Evidence-preserving execution

Each policy gate executes independently.

If the static suite fails, the build and browser gates can still run when possible.

If one browser check fails, later blocker checks still execute.

If the production build or release server cannot be created, browser gates are recorded as `blocked` rather than disappearing from the report.

This makes the release decision auditable: a missing test is itself visible as a blocker.

## Generated release decision

Every run writes:

- `artifacts/release-gate/report.json`
- `artifacts/release-gate/REPORT.md`
- one log file per executed gate
- `artifacts/release-gate/server.log` for the local production server

The JSON report contains:

- policy version
- every gate and exit status
- gate durations
- blockers
- advisories
- semantic evidence summaries
- final decision: `pass` or `block`

## GitHub Actions

The Cross-device browser QA workflow now has one canonical test step:

```bash
npm run test:rc
```

The workflow no longer has a standalone early static step that can hide later evidence.

After the release gate runs, Actions uploads with `if: always()`:

- Item 13.16 final release decision
- Item 13.15 route-crawl evidence
- Item 13.14 screenshot-regression evidence
- Item 13.1 visual inventory

The workflow timeout is 40 minutes to give the complete five-viewport route/screenshot matrix enough room to finish.

## Static policy protection

`tests/release-gate-static.mjs` protects the policy itself.

It verifies:

- canonical 38-screen inventory
- canonical five-viewport matrix
- 190-route contract
- 255-screenshot contract
- all required blocker gate IDs
- all blocker npm scripts exist
- route and screenshot evidence paths
- visual inventory remains advisory
- `test:rc` resolves to the Item 13.16 orchestrator
- the workflow invokes the canonical release gate
- required artifacts are preserved
- the workflow does not reintroduce the old standalone early static step

It is part of `test:static`.

## Prerequisite repair included in 13.16

The most recent pre-13.16 Actions run stopped during static validation because `progressive-disclosure-static.mjs` expected the runtime-generated `.pd-toggle-meta` selector but the stylesheet no longer declared it explicitly.

The runtime still creates `.pd-toggle-meta`, so 13.16 restores an explicit style for that class. This removes the stale contract failure and allows the complete release evidence pipeline to execute.

## Release interpretation

A release is **PASS** only when:

- every blocker gate passes
- every required blocker artifact exists
- screenshot baseline is active and complete
- screenshot semantic checks are clean
- route semantic checks are clean
- the orchestrator itself completes without error

A release is **BLOCK** when any of those conditions fail.

Advisories remain visible in the report but do not alter PASS/BLOCK.

## Scope boundary

Item 13.16 completes the Item 13 release-policy layer.

It does not silently activate screenshot baselines, waive route failures, or convert accessibility/responsive failures into warnings. Those remain explicit release decisions backed by machine-readable policy.
