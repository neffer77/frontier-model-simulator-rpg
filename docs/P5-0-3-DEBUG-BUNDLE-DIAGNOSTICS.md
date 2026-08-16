# P5.0.3 — Debug Bundle + Diagnostics

## Purpose

P5.0.3 converts the P5.0.1 runtime identity and P5.0.2 command/event journal into a support artifact that can be inspected after a failure instead of reconstructing the failure from screenshots and memory.

The primary rule is:

> Reproduce first. Capture evidence from the exact failing build/session/state. Diagnose from the bundle and trace. Change the owning layer. Add the reproduction to regression coverage before merging.

## Runtime APIs

```js
await frontierCreateDebugBundle({reason:'manual'})
frontierDebugBundleSummary(bundle)
await frontierDownloadDebugBundle({reason:'user-report'})
await frontierCopyDebugSummary()
await frontierOpenDiagnostics()
frontierCloseDiagnostics()
```

Keyboard shortcut:

- Windows/Linux: `Ctrl+Shift+D`
- macOS/iPad keyboard: `Cmd+Shift+D`

The command bus also exposes:

- `diagnostics.open`
- `diagnostics.bundle`

## Bundle contents

A bundle has schema version 1 and includes:

### Identity

From P5.0.1:

- build ID
- full Git SHA
- build timestamp/ref
- session ID
- state revision
- save format version
- route
- device mode
- display mode
- viewport
- online status

### State

A sanitized snapshot of current simulator state. Sensitive field names are redacted recursively. Arrays, object keys, string lengths, recursion depth and event history are bounded so a pathological state cannot create an unbounded artifact.

### Command/event evidence

From P5.0.2:

- last 240 journal events
- command IDs
- correlation IDs
- state revisions
- sources
- severities
- command lifecycle events
- state saves
- observed legacy clicks
- runtime errors
- network transitions

### Action trail

A compact sequence of the most useful diagnostic events:

- `ui.click`
- `command.started`
- `command.completed`
- `command.failed`
- `state.saved`
- `runtime.error`
- `runtime.unhandledrejection`
- `runtime.network`

This is the first place to look when a user says “I tapped this and nothing happened.”

### Reproduction recipe

The bundle derives a candidate reproduction sequence from recent commands and observed clicks. Explicit commands include their sanitized payload, route, state revision and correlation ID.

Only commands marked replayable by the P5.0.2 registry should eventually be auto-replayed. A redacted payload requires manual replacement.

### DOM context

The bundle does **not** dump the full DOM. It captures bounded structural context:

- app root existence and size signals
- current focus target
- scroll position
- visible dialogs/overlays
- button/link/input counts
- document title/ready state/visibility state

### Browser/environment

- sanitized URL origin + pathname only
- user agent/platform/language
- hardware concurrency/device memory when available
- touch capability
- screen and viewport dimensions
- timezone
- online state

### Performance

- navigation duration
- DOMContentLoaded/load timing
- transfer size
- resource count
- slowest resource paths and durations
- JS heap statistics when the browser exposes them

### Storage/PWA

- local/session storage **key names only** and approximate total byte counts
- Storage API usage/quota estimate
- service-worker controller/registration state
- cache names, entry counts and a bounded list of cached paths

This is particularly useful for diagnosing iOS/PWA stale-asset failures.

## Privacy/safety contract

The bundle must never capture:

- cookies
- Authorization headers
- URL query strings
- URL fragments
- arbitrary localStorage/sessionStorage values
- password/secret/token/auth/API-key/credential/private-key fields

Sensitive values in state and event payloads are replaced by `[REDACTED]`.

The CI regression deliberately plants fake secrets in state, event payloads and the URL. The test fails if any plaintext secret reaches the bundle.

## In-app diagnostics inspector

`frontierOpenDiagnostics()` presents a responsive dialog showing:

- exact build/session/state identity
- route/device/viewport
- event/error counts
- recent action trail
- Download Debug Bundle
- Copy Summary
- Refresh

The inspector supports Escape dismissal and canonical phone portrait layout.

This is a support utility, not the final FrontierOS visual shell. P5.1+ can surface it from Settings/System without changing the bundle contract.

## CI evidence

`npm run test:debug-bundle` writes:

```text
artifacts/debug-bundle/
├── report.json
├── REPORT.md
├── bundle.json
├── reproduction.json
├── page-errors.json
├── diagnostics-desktop.png
├── diagnostics-phone.png
└── trace.zip
```

The Cross-device browser QA workflow retains this directory for 30 days and publishes the Markdown summary into the GitHub Actions job summary.

`trace.zip` is a Playwright trace with screenshots, DOM snapshots and source context. It is intended to answer questions that a static screenshot cannot answer, such as which element received a click or which DOM state existed immediately before a failure.

## Release gate

`debug-bundle` is release-blocking. The gate fails if:

- the browser regression fails;
- `artifacts/debug-bundle/report.json` is missing;
- the production runtime omits the debug assets;
- PWA cache coverage drifts;
- privacy/static contracts drift;
- desktop/phone diagnostics regress.

## Troubleshooting procedure

When a failure is reported:

1. Confirm the exact deployed build ID/Git SHA.
2. Reproduce the failure without changing state unnecessarily.
3. Open diagnostics (`Ctrl/Cmd+Shift+D`) and create a bundle.
4. Record the bundle ID and current state revision.
5. Inspect `errors` first.
6. Inspect `actionTrail` around the failed interaction.
7. Use command/correlation IDs to group lifecycle events.
8. Compare state revisions before/after the action.
9. Check service worker and cache evidence if deployed/mobile behavior differs from source/CI.
10. Check DOM focus/dialog evidence for overlay or event-interception failures.
11. In CI, open `trace.zip` if the browser test reproduces the issue.
12. Identify the owning runtime/module rather than adding another compatibility wrapper.
13. Add the exact reproduction to a browser regression.
14. Only merge after that reproduction passes on the PR head.

## Example summary

```text
FrontierOS Debug Bundle
Bundle      dbg_...
Build       06cc38d48265
Git SHA     06cc38d482658100...
Session     sess_...
State rev   184
Route       training/incident/nan
Device      phone-portrait / browser
Viewport    390×844 @ 3x
Events      173
Errors      1
Online      true
Captured    2026-08-15T...
```

## Acceptance criteria

P5.0.3 is complete when:

- browser-created support bundles include identity, state, event, action, error, environment, DOM, performance and PWA evidence;
- privacy contracts prevent common secret leakage;
- diagnostics work on desktop and phone;
- CI emits JSON, screenshots and Playwright trace evidence;
- the artifact is retained and linked through the Actions summary;
- the release gate treats missing/broken diagnostics evidence as a blocker;
- gameplay remains unchanged when diagnostics are never opened.

## Next dependency

P5.0.4 / the next foundation slice can build deterministic state hashing/checkpoint/replay on top of:

1. P5.0.1 identity + revisions,
2. P5.0.2 commands + correlated events,
3. P5.0.3 support bundles + reproduction evidence.
