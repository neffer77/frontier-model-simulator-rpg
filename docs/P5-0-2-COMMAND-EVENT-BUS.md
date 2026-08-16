# P5.0.2 — FrontierOS Command + Event Bus

## Purpose

P5.0.2 establishes one observable action/event spine between the simulation and the future FrontierOS application layer. It does not redesign the UI. It creates the contract that future apps use so user actions are diagnosable instead of being opaque calls to unrelated global functions.

## Runtime APIs

```js
frontierRegisterCommand(name, handler, options)
frontierDispatchCommand(name, payload, meta)
frontierEmitEvent(type, data, meta)
frontierSubscribeEvent(pattern, handler)
frontierEventJournal(filter)
frontierCommandRegistry()
frontierCommandEventSnapshot()
```

`frontierCommandBus` exposes the same operations as a namespaced object.

## Command lifecycle

Every dispatch emits a correlated lifecycle:

```text
command.started
  ↓
handler executes
  ↓
state.saved / domain events
  ↓
command.completed
```

Failure uses:

```text
command.started
  ↓
handler throws / rejects
  ↓
command.failed
```

Each lifecycle carries a `commandId` and `correlationId`. The completion/failure record includes `stateRevisionBefore`, `stateRevisionAfter`, `stateChanged`, and duration.

## Event envelope

Every event contains:

- schema version
- monotonic sequence
- unique event ID
- event type
- timestamp
- build ID
- session ID
- route
- state revision
- correlation ID
- command ID
- source
- severity
- redacted structured data

This is the core data model that P5.0.3 Debug Bundles will collect.

## Safety / evidence rules

Observability may not alter command semantics. Handlers receive the original payload, while the recorded payload is separately sanitized. Keys matching password, secret, token, cookie, authorization/auth, or API-key patterns are replaced with `[REDACTED]` in evidence.

The journal is bounded to 600 events so long play sessions cannot grow memory without limit. Objects are depth/size bounded before entering evidence.

## Legacy bridge

The existing simulator is not yet command-driven. During migration P5.0.2 still captures useful history:

- `frontier:state-saved` → `state.saved`
- button/link activation → `ui.click`
- window errors → `runtime.error`
- unhandled promise rejections → `runtime.unhandledrejection`
- online/offline changes → `runtime.network`
- visibility changes → `runtime.visibility`

This bridge is observational. New FrontierOS apps should dispatch named commands rather than relying on click observation.

## Command naming convention

Use domain-first dotted names:

```text
navigation.home.open
training.run.launch
training.incident.open
training.diagnostic.run
training.hypothesis.commit
npc.advice.request
mail.message.open
evals.run.start
company.project.approve
```

Events use the same vocabulary but describe what happened rather than what was requested:

```text
training.run.launched
training.incident.opened
training.diagnostic.completed
npc.advice.received
```

## Registration metadata

A command registration records:

- name
- description
- source
- replayable flag
- idempotent flag
- registration timestamp

Executable handler functions are deliberately excluded from exported registry snapshots.

## Debugging workflow

When a bug occurs, P5.0.2 makes the basic sequence inspectable:

1. identify build/session from P5.0.1;
2. read recent events;
3. find the triggering command or legacy click;
4. follow its correlation ID;
5. compare state revision before/after;
6. inspect domain events and `state.saved` entries;
7. look for `command.failed`, `runtime.error`, or `runtime.unhandledrejection`;
8. reproduce with the same command payload where the command is replayable.

P5.0.3 will package this information with screenshots, state snapshots, console logs and environment data.

## CI evidence

`npm run test:command-bus` emits:

```text
artifacts/command-event-bus/report.json
artifacts/command-event-bus/REPORT.md
```

The browser regression proves:

- bus boot and identity linkage;
- wildcard/prefix subscription;
- successful correlated command lifecycle;
- P5.0.1 state revision linkage;
- handler-emitted correlated domain events;
- payload redaction;
- failed-command evidence;
- unknown-command evidence;
- legacy click observation;
- exportable command registry;
- zero runtime errors.

CI retains the evidence for 30 days and publishes the Markdown summary in the Actions job summary.

## Release contract

`command-event-bus` is a release-blocking gate. A release cannot pass if the bus test fails or its required evidence artifact is absent.

## P5.0.2 completion criteria

P5.0.2 is complete when:

- command registration/dispatch works;
- lifecycle correlation is stable;
- event journal is bounded and exportable;
- event evidence carries build/session/route/revision identity;
- sensitive recorded values are redacted without changing handler inputs;
- legacy saves/clicks/errors are observable;
- CI produces retained machine-readable evidence;
- PWA contains the bus runtime;
- cumulative release QA treats the bus as blocking;
- no gameplay or visual behavior is intentionally changed.

## Next item

P5.0.3 — Debug Bundle + Diagnostics uses the P5.0.1 identity envelope and this event journal to create a one-action support bundle containing everything needed to investigate a reported problem.
