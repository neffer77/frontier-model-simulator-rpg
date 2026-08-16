# P5.1.1 — FrontierOS App Registry

## Purpose

P5.1.1 creates one canonical source of truth for every application that the mobile and desktop FrontierOS shells will expose. UI code must not maintain its own app lists, route aliases, unlock rules, badges, or launch handlers.

The registry is intentionally implemented before the visual launcher. P5.1.2 and P5.1.3 should render this data rather than hard-code icons.

## Canonical apps

| ID | App | Category | State at launch | Primary responsibility |
| --- | --- | --- | --- | --- |
| `mail` | Frontier Mail | communication | planned | NPC/executive/research communication |
| `pager` | Pager | operations | ready | incident alerts and investigations |
| `training` | Run Monitor | engineering | ready | training runs and production diagnostics |
| `evals` | EvalBench | engineering | ready | model/data evaluations |
| `model-lab` | Model Lab | research | ready | experiments and ablations |
| `terminal` | Terminal | engineering | planned | command-line workflows |
| `data` | Data Explorer | engineering | ready | datasets, shards and provenance |
| `team` | People | company | ready | employees, hiring and expertise |
| `projects` | Projects | company | locked until company start | programs and portfolio |
| `company` | Company | company | locked until company start | dashboard and company status |
| `finance` | Finance | company | locked until company start | runway/funding/economics |
| `knowledge` | Knowledge | learning | ready | curriculum and mastery |
| `artifacts` | Artifacts | engineering | locked until company start | technical records and reports |
| `settings` | System | system | ready | diagnostics/support/settings |

## Runtime API

```js
frontierAppRegistry()
frontierApps({surface:'phone'})
frontierApp('training')
frontierResolveApp('run-monitor')
await frontierLaunchApp('settings')
frontierParseDeepLink('frontieros://training/run-1842')
await frontierOpenDeepLink('os/model-lab/experiment/alpha')
```

Every resolved application provides stable metadata for label, short label, icon, category, canonical `os/*` route, aliases, phone/desktop surfaces, desktop window geometry, launch state, lock reason and current badge.

## Launch states

The registry has three explicit states:

- `ready`: the app has a working command or legacy adapter and may launch.
- `locked`: the app exists but the current simulation state does not permit entry yet.
- `planned`: the stable FrontierOS contract exists before the native app UI is implemented.

A launch never silently redirects to an unrelated screen. `frontierLaunchApp()` returns a structured result and journals launch start/completion/block/failure events through P5.0.2.

## Deep links

Both forms are canonical:

```text
frontieros://training/run-1842
os/training/run-1842
```

Aliases are also accepted, such as `email/thread/42` resolving to Frontier Mail. Detail paths are preserved so later native apps can interpret them without changing the top-level app contract.

## Badges

P5.1.1 establishes initial badge providers:

- Pager: active selected incident
- Run Monitor: active training run
- People: active teammate advice

Future items can add notification/inbox counts without changing launcher APIs.

## Desktop metadata

Every app declares preferred window width/height and minimum dimensions. P5.1.3 will consume this metadata for old-school desktop windows rather than embedding dimensions in the shell.

## Observability

Registry lifecycle and launches emit:

- `os.app-registry.ready`
- `os.app.launch.started`
- `os.app.launch.completed`
- `os.app.launch.blocked`
- `os.app.launch.failed`

These carry build/session/state context automatically through the command/event bus and therefore appear in P5.0.3 debug bundles.

## CI evidence

`npm run test:app-registry` creates:

```text
artifacts/app-registry/report.json
artifacts/app-registry/REPORT.md
```

The test verifies all 14 canonical IDs, metadata completeness, uniqueness, phone/desktop declarations, alias resolution, deep links, ready/locked/planned behavior, a real command-backed app launch, badge providers, journal evidence and zero browser page errors.

The artifact is retained for 30 days and its summary is added to the GitHub Actions run summary.

## PWA

The registry is precached and the PWA cache advances to `frontier-lab-v31` so phone/installed builds cannot run a launcher against stale registry code.

## Architecture rule

From this item forward:

> Shells render apps. Apps do not define the shell. Navigation goes through the registry/command bus. Simulation state remains independent of OS navigation state.

P5.1.2 must use `frontierApps({surface:'phone'})` for the mobile home screen. P5.1.3 must use `frontierApps({surface:'desktop'})` for the desktop launcher/taskbar/window manager.

## Acceptance criteria

P5.1.1 is complete when all 14 app contracts are stable, aliases/deep links resolve, locked/planned apps fail safely, ready apps can launch through canonical handlers, badges are derived from live state, CI evidence is retained, PWA includes the registry, and no visual redesign is required to consume the APIs.
