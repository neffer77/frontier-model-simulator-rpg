# P5.0.1 — State revision + build/session identity

## Goal

Create the first FrontierOS observability primitive without changing gameplay or visual presentation.

Every later command, event, replay, screenshot, trace, debug bundle, and bug report needs a stable answer to five questions:

1. Which build produced this behavior?
2. Which runtime session was active?
3. Which persisted simulation-state revision was active?
4. Which device/display mode and viewport were active?
5. Which game route/context was active?

P5.0.1 makes those answers machine-readable.

## Runtime files

### `frontier-build.js`

Source/local fallback. It identifies a direct source-tree server as `local`.

`scripts/build-site.mjs` replaces the `_site/frontier-build.js` copy with immutable build metadata derived from `GITHUB_SHA`:

- identity schema version
- 12-character build ID
- full Git SHA
- build timestamp
- GitHub ref

The source file is never rewritten during a build; only the release artifact receives generated metadata.

### `state-identity.js`

Loads before `frontier-lab.js` and instruments only the existing `frontier-lab-v3` localStorage persistence boundary.

The simulator's domain state remains owned by existing gameplay modules. P5 identity metadata is stored under the additive `_frontier` property of the serialized save:

```json
{
  "_frontier": {
    "schemaVersion": 1,
    "stateRevision": 184,
    "saveFormatVersion": 3,
    "lastMutationAt": "2026-08-16T00:00:00.000Z",
    "lastMutation": "advanceRun"
  }
}
```

Older v3 saves do not need a migration before loading because the existing game ignores unknown/additive properties and P5 accepts saves with no `_frontier` metadata.

## Semantic state revisions

A state revision is **not** a count of `save()` calls.

The existing simulator can call `save()` during module initialization and can write the same domain state more than once. P5 compares the candidate domain snapshot with the previous persisted domain snapshot, excluding `_frontier` metadata.

- same domain state → revision does not change
- changed domain state → revision advances exactly once
- first persisted state → first revision is established
- page reload → revision persists
- page reload → runtime session ID changes

This makes the revision meaningful for later deterministic replay and state-diff tooling.

## Session identity

A session ID is generated per page runtime and intentionally is not persisted to localStorage or sessionStorage.

Reloading creates a new `sess_*` ID while preserving the simulation state revision.

This cleanly separates persistent game state from transient runtime/session diagnostics.

## Canonical device modes

P5.0.1 exposes the same five conceptual display classes used by the visual QA system:

- `phone-portrait`
- `phone-landscape`
- `tablet`
- `desktop`
- `wide-desktop`

Diagnostics also include exact viewport width/height, device-pixel ratio, and whether the app is running in browser or standalone display mode.

## Route identity

The first route resolver intentionally stays simple and compatible with the current simulator:

- selected incident → `training/incident/<id>`
- explicit `state.view` → that view
- started company → `company/home`
- fresh game → `founder/setup`

P5.0.2/P5.1 will replace this with formal command/app/route identity while preserving the P5.0.1 diagnostics API.

## Public diagnostics API

The runtime exposes:

```js
frontierDiagnostics()
frontierIdentity()
frontierDiagnosticsText()
frontierStateEnvelope()
frontierSessionIdentity()
frontierDeviceMode()
```

Example:

```text
FrontierOS Diagnostics
Build       64bc72818407
Git SHA     64bc7281840729d...
Session     sess_...
State rev   184
Schema      1
Device      phone-portrait
Viewport    390×844
Route       training/incident/nan
Last action advanceRun
```

A `frontier:state-saved` browser event is also emitted after simulator persistence. Its detail includes the state envelope plus a `changed` boolean so later telemetry can distinguish semantic mutations from no-op persistence.

## CI evidence

`npm run test:identity` executes real Chromium coverage for:

- build identity
- new session on reload
- persistent state revision
- no revision on no-op saves
- one revision for one real mutation
- legacy v3 save compatibility
- phone portrait
- phone landscape
- tablet
- desktop
- wide desktop

It produces:

- `artifacts/state-identity/report.json`
- `artifacts/state-identity/REPORT.md`

Cross-device browser QA uploads the artifact for 30 days and publishes the summary into the Actions job summary.

## Release policy

`runtime-identity` is a release-blocking browser gate.

The GitHub Pages pipeline additionally verifies that:

- `_site/frontier-build.js` exists
- `_site/state-identity.js` exists
- the generated runtime `buildId` equals the current GitHub SHA prefix
- the live deployed `frontier-build.js` reports the exact deployed commit

Therefore a release cannot silently deploy while reporting the wrong build identity.

## Scope boundary

P5.0.1 does not add:

- app launcher UI
- command bus
- event journal
- state diffs
- deterministic replay
- debug bundle export
- telemetry timeline

Those depend on this identity layer and begin in P5.0.2/P5.0.3.
