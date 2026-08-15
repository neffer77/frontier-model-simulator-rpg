# Item 13.17 — Reviewed Baseline Promotion + Release Sign-off

## Why Item 13.17 exists

Item 13.16 completed the Item 13 release-policy layer and deliberately stopped short of silently activating the Item 13.14 screenshot baseline.

That leaves one operational gap between a correct release policy and an actually releasable build:

1. CI must generate the deterministic 255-capture screenshot candidate.
2. A reviewer must inspect the candidate evidence.
3. The candidate must be promoted into the committed active baseline without losing provenance or accepting a partial/corrupt manifest.
4. The complete Item 13.16 gate must run again against that active baseline.
5. The resulting release decision needs a durable receipt tied to the exact policy, baseline, build, and gate report.

Item 13.17 closes that gap. It is an operational extension after the original Item 13.16 policy endpoint; it does not add another visual styling layer or weaken any release blocker.

## Definition of done

13.17 is complete when:

- screenshot baseline promotion requires an explicit review acknowledgement
- candidate promotion validates all 255 expected capture keys
- every promoted capture has a valid SHA-256 and positive PNG dimensions/byte count
- inventory, responsive-matrix, and Playwright versions match the repository contracts
- candidate provenance is recorded in the committed baseline
- the release workflow always generates an Item 13.17 READY/BLOCK receipt
- a READY receipt is impossible unless the Item 13.16 release decision is PASS
- the receipt fingerprints the release-gate report, release policy, screenshot baseline, and production build info
- the receipt preserves route/screenshot evidence expectations
- blocked runs still upload the sign-off report for diagnosis

## Reviewed baseline promotion

The controlled promotion utility is:

```bash
npm run visual:promote-screenshot-baseline -- \
  artifacts/screenshot-regression/candidate-baseline.json \
  --reviewed \
  --reviewed-by=<reviewer>
```

A validation-only pass is available with:

```bash
npm run visual:promote-screenshot-baseline -- \
  artifacts/screenshot-regression/candidate-baseline.json \
  --reviewed \
  --dry-run
```

The command intentionally refuses to run without either:

- `--reviewed`, or
- `SCREENSHOT_BASELINE_REVIEWED=1`

This is not a cosmetic flag. It is the boundary between CI-generated evidence and a human-approved visual contract.

## Promotion validation

Before writing `visual-qa/screenshot-baseline.json`, the promotion script verifies:

- candidate schema version is 1
- candidate belongs to Item 13.14
- candidate status is `active`
- candidate inventory version matches `visual-qa/inventory.json`
- candidate responsive-matrix version matches `visual-qa/responsive-matrix.json`
- candidate Playwright version matches the pinned repository dependency
- candidate expected capture count is exactly 255
- candidate contains exactly the canonical expected keys
- there are no missing capture keys
- there are no unexpected capture keys
- every capture contains a 64-character lowercase SHA-256
- every capture has positive width, height, and byte count

The canonical key set is derived rather than hard-coded:

- every Item 13.1 route screenshot
- every non-manual Item 13.1 special capture
- every Item 13.13 canonical viewport

This retains the existing 38-route + 13-special × 5-viewport contract.

## Promotion provenance

A promoted baseline records an Item 13.17 `promotion` object containing:

- `reviewed: true`
- reviewer identity supplied by CLI/environment
- SHA-256 of the exact candidate baseline file that was reviewed
- candidate file path

It also records the promotion timestamp while preserving the candidate generation timestamp and capture policy.

The candidate SHA means a later reviewer can determine exactly which candidate manifest became the committed baseline.

## What promotion does not do

Promotion does not:

- automatically approve screenshots because CI generated them
- accept a partial candidate
- regenerate screenshots itself
- suppress changed screenshots
- waive route failures
- waive accessibility failures
- waive responsive failures
- change the Item 13.16 blocker/advisory policy
- automatically commit or push the promoted baseline

After promotion, the baseline file still goes through normal code review and the complete release gate.

## Release sign-off receipt

The command:

```bash
npm run test:signoff
```

reads the evidence produced by Item 13.16 and writes:

- `artifacts/release-signoff/signoff.json`
- `artifacts/release-signoff/REPORT.md`

The receipt decision is one of:

- `ready`
- `block`

`ready` is fail-closed: any blocking inconsistency changes the receipt to `block` and returns a non-zero process status.

## READY requirements

The sign-off runner requires:

1. `artifacts/release-gate/report.json` exists.
2. The report belongs to Item 13.16.
3. The Item 13.16 release decision is `pass`.
4. The report contains zero blockers.
5. Every blocker defined in `release-gate-policy.json` exists in gate execution and has status `pass`.
6. The screenshot baseline is active.
7. The screenshot baseline contains the full 255-capture contract.
8. Route evidence contains the full 190 visits with zero route failures.
9. Screenshot evidence contains all 255 captures with zero mismatches, missing baseline entries, extra baseline entries, missing captures, or page errors.
10. `_site/build-info.json` exists.

The sign-off does not reinterpret or downgrade Item 13.16. It independently verifies that the evidence necessary to call the build ready is present and internally consistent.

## Tamper-evident fingerprints

The sign-off receipt records SHA-256 fingerprints for:

- `artifacts/release-gate/report.json`
- `release-gate-policy.json`
- `visual-qa/screenshot-baseline.json`
- `_site/build-info.json`

It also records the current Git SHA and GitHub Actions run metadata when available.

This is not cryptographic signing with a private key; it is a tamper-evident evidence receipt. If any of those inputs change, its fingerprint changes and the old receipt no longer describes the new release candidate.

## Advisory handling

Item 13.16 advisories remain advisories.

The sign-off receipt copies them into its warning section but does not turn them into blockers. This preserves the blocker/advisory policy rather than creating a second policy layer.

Missing Item 13.17 promotion provenance on an otherwise active legacy baseline is also reported as a warning rather than retroactively invalidating a baseline that may have been approved before 13.17 existed.

## GitHub Actions integration

The Cross-device browser QA workflow now runs:

1. Item 13.16 `npm run test:rc`
2. Item 13.17 `npm run test:signoff` with `if: always()`

That means a blocked release still receives a sign-off receipt describing why it is blocked.

Actions publishes both the Item 13.16 release decision and the Item 13.17 sign-off into `$GITHUB_STEP_SUMMARY`.

It uploads `artifacts/release-signoff` with 30-day retention so the final release receipt lasts longer than the 14-day debugging artifacts.

## Static protection

`tests/release-signoff-static.mjs` verifies:

- the canonical 255-screenshot contract
- the canonical 190-route contract
- explicit review acknowledgement is required
- candidate validation is fail-closed
- partial baseline candidates are rejected
- candidate SHA provenance is retained
- the release receipt depends on the Item 13.16 report
- active baseline is required
- route evidence is checked
- screenshot evidence is checked
- all four evidence fingerprints are recorded
- READY/BLOCK is fail-closed
- package scripts are wired
- the static contract is in cumulative `test:static`
- Actions always executes sign-off
- Actions publishes and uploads the Item 13.17 receipt

## Bootstrap workflow

The intended first-time sequence is:

1. Open a PR that contains Items 13.14–13.17 infrastructure.
2. Allow Cross-device browser QA to render the deterministic screenshot candidate.
3. Download the Item 13.14 screenshot-regression artifact.
4. Review the changed/current PNG evidence across the five canonical viewports.
5. Run the promotion command with explicit `--reviewed` acknowledgement.
6. Commit the resulting active `visual-qa/screenshot-baseline.json`.
7. Run/open CI again.
8. Item 13.16 must become PASS.
9. Item 13.17 must become READY.

The repository should not be considered visually release-ready before steps 8 and 9 are true.

## Scope boundary

13.17 is release evidence and approval infrastructure.

It does not introduce a new gameplay feature, redesign screens, or create a new visual baseline automatically. Any visual difference discovered during screenshot review must be either fixed in the simulator or consciously approved through a reviewed baseline update.
