# Item 13.10 — Locked / Unavailable States

Item 13.10 makes inaccessible gameplay states intentional and understandable.

The previous simulator already enforced guided-campaign locks, but the UI often communicated them only through a lock icon, disabled-looking styling, or a log message. This pass gives the player enough context to understand what the system is, why it is unavailable, when it becomes available, and what action advances toward it.

## Two different unavailable states

13.10 deliberately separates two concepts.

### Campaign locked

A system is **campaign locked** when the guided early game intentionally withholds it until a known chapter.

Campaign-locked controls:

- remain visible so the player can understand the future simulation surface;
- remain keyboard-focusable and clickable for explanation;
- expose `aria-disabled="true"`;
- use warning/disabled theme tokens rather than active module gradients;
- show a chapter badge;
- open an inline prerequisite explainer instead of navigating into the unavailable system.

The click is informational. The system itself remains inaccessible.

### Unavailable now

A control is **unavailable now** when it is disabled by the current local simulation state rather than by the guided campaign.

Examples include an action that cannot currently be taken because a resource, selection, readiness threshold, or record is missing.

These controls:

- remain natively inert when `disabled`;
- receive a consistent disabled surface;
- receive an `Unavailable now` label where the element can contain one;
- receive a generic current-state explanation in `title` when the module did not already provide one;
- do **not** claim a campaign chapter prerequisite.

This avoids misleading the player by turning every disabled control into a progression gate.

## Unlock source of truth

The visual system does not maintain a second unlock table.

`early-game-progression.js` now exposes its existing `STAGES` configuration through:

- `campaignUnlockPlan(target)`
- `campaignUnlockRegistry()`

`campaignUnlockPlan` derives the first stage containing the target from `STAGES[stage].unlocks` or `STAGES[stage].core`.

The returned plan contains:

- target identifier;
- player-facing label;
- core/system type;
- whether it is currently unlocked;
- current chapter ID, kicker, title, CTA and action;
- unlock stage ID, kicker, title and chapter number;
- progress toward the unlock;
- remaining stage count.

The same table therefore controls both access and explanation.

## Current unlock matrix

The current guided campaign resolves to:

| Unlock point | Systems |
| --- | --- |
| Chapter 1 — First Call | Home, Training, Data + Evals |
| Chapter 4 — Recovery | Technical Debt |
| Chapter 5 — First Model | Models navigation |
| Chapter 6 — Build the Lab | Team / Hiring, Operations, Reliability |
| Chapter 7 — Company Bet | Releases, Roadmap, Capital |
| Early Game Complete | Governance, Executives, People + Memory, Workforce, Projects, Programs, Strategy, Investment, Competition, Ecosystem, Policy, Communications |

This table is documentation only. Runtime behavior is derived from `STAGES`.

## Stable navigation targets

`responsive-gameplay-shell.js` now adds `data-campaign-target` to core navigation and More-sheet system controls.

Examples:

- `data-campaign-target="team"`
- `data-campaign-target="models"`
- `data-campaign-target="opsOpen"`
- `data-campaign-target="governanceOpen"`

Locked actions pass those stable identifiers to `campaignLockedSystem` rather than passing only display copy.

This makes lock semantics resilient to text changes and gives regression tests a stable contract.

## Company/Home launcher support

Older feature modules own their own `*-launch` buttons and do not all expose a campaign target attribute.

`locked-state-system.js` therefore resolves Company/Home launchers using:

1. explicit `data-campaign-target` when present;
2. existing lock target metadata when already decorated;
3. class names;
4. `aria-label` / `title`;
5. inline or property click-handler signals;
6. visible launcher copy.

Function-name signals are preferred when available, while text/class hints provide compatibility for older modules.

## Lock explainer

Clicking a campaign-locked control calls `campaignLockedSystem(target)`.

The campaign layer records the event and delegates to `frontierLockedStateOpen` when Item 13.10 is present.

The inline explainer displays:

- target system name;
- unlock chapter;
- current prerequisite chapter/objective;
- exact unlock point;
- progress toward the unlock;
- a CTA that invokes the current campaign objective;
- a close control.

The explainer is inserted into `#app` near the campaign guidance instead of using a modal/overlay. That keeps Item 13.11 responsible for modal, story, and overlay consistency.

## Runtime API

`locked-state-system.js` exposes:

- `frontierLockedStateSync()`
- `frontierLockedStateOpen(targetOrPlan)`
- `frontierLockedStateClose()`
- `frontierLockedStateRegistry()`

The document marker is:

```text
data-fl-locked-state-system="1"
```

The app root records counts through:

- `data-fl-campaign-locks`
- `data-fl-unavailable-controls`

## Accessibility

Campaign locks remain focusable because opening the prerequisite explanation is a valid interaction.

They use:

- `aria-disabled="true"` to communicate that the target action itself is unavailable;
- a warning-colored focus ring;
- visible lock/chapter metadata;
- explanatory `title` text;
- an inline region with a labeled heading.

The lock explainer's current-objective CTA grows to approximately 44px on phone layouts.

Native disabled controls remain disabled and are not converted into fake clickable buttons.

## Lifecycle behavior

The runtime is idempotent and MutationObserver-backed.

When the campaign advances:

- stale lock classes are removed;
- Item 13.10-owned `aria-disabled` is removed;
- Item 13.10-owned title text is removed;
- chapter badges disappear;
- the original click behavior remains available;
- an open explanation panel is removed if its target has become unlocked.

The lock event listener remains attached but checks the current unlock plan before intercepting a click, so it becomes transparent after unlock.

## Platform parity

The system is loaded by:

- browser / GitHub Pages;
- Scriptable;
- PWA/offline cache.

The service-worker cache advances to `frontier-lab-v19`.

## Regression coverage

`tests/locked-state-static.mjs` validates:

- canonical lock/unavailable selectors;
- semantic token consumption;
- unlock-plan APIs;
- derivation from the existing `STAGES` table;
- stable `data-campaign-target` integration;
- browser/Scriptable/PWA parity;
- Item 13.1 locked-state inventory coverage;
- current cache version.

`tests/locked-state-system.mjs` validates desktop and mobile behavior for:

- Chapter 1 campaign state;
- exact unlock stages for representative systems;
- Team and Models bottom-navigation locks;
- unlocked Data + Evals behavior;
- locked Company/Home launchers;
- More-sheet locks;
- lock chapter metadata;
- `aria-disabled` behavior;
- direct click interception;
- preserving `state.view='company'` when a locked launcher is clicked;
- prerequisite explanation copy;
- progress display;
- current-objective CTA;
- mobile containment and touch sizing;
- generic disabled-control treatment;
- cleanup when a disabled control becomes enabled;
- complete campaign-lock cleanup after graduation;
- runtime errors.

Both test suites are included in `test:rc`.

## Scope boundary

13.10 does not redesign:

- story scenes;
- technical explainer modals;
- campaign-priority overlay;
- milestone overlays;
- incident overlays;
- other modal/backdrop surfaces.

Those remain Item 13.11.
