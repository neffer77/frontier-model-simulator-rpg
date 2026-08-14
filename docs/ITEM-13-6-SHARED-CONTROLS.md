# Item 13.6 — Shared Button / Control Cleanup

## Goal

Give Frontier Lab one consistent semantic hierarchy for ordinary buttons and form controls without flattening controls that intentionally behave like cards, launchers, tabs, story decisions, or technical visualizations.

This builds on:

- Item 13.2 theme tokens
- Item 13.3 browser-default styling firewall
- Item 13.4 shared panel/card system
- Item 13.5 progressive disclosure cleanup

The firewall remains the last-resort safety net for incomplete markup. Item 13.6 sits above it and defines how ordinary controls should actually look and communicate importance.

## Canonical button variants

| Class | Meaning |
| --- | --- |
| `fl-btn fl-btn-primary` | the main action a player should take next |
| `fl-btn fl-btn-secondary` | ordinary application action |
| `fl-btn fl-btn-ghost` | subordinate/header/back/disclosure action |
| `fl-btn fl-btn-danger` | destructive or irreversible action |
| `fl-btn fl-btn-icon` | compact close/dismiss/menu-style control |
| `fl-btn fl-btn-nav` | role/tab/bottom-navigation control |
| `fl-btn fl-btn-locked` | unavailable/disabled/locked action state |

All variants use semantic `--fl-*` theme tokens.

## Form controls

Text-like inputs, selects, and textareas receive `fl-control-field` automatically. They share:

- dark inset surface
- border/radius treatment
- visible focus state
- disabled treatment
- 44px minimum mobile target for single-line controls

Checkboxes, radios, ranges, and color inputs remain owned by the Item 13.3 browser-default firewall because their native interaction affordances are useful and already dark-themed.

## Compatibility adapter

`shared-control-system.js` runs after all feature render layers and classifies legacy controls after every DOM insertion.

### Primary

Primary treatment is applied to explicit `.primary` controls and high-confidence CTAs such as:

- Found the lab
- objective-card CTAs
- install CTA
- Continue / Advance / Confirm / Approve / Hire / Ship / Launch Run
- the forward action in a story scene

### Danger

Destructive treatment is inferred from existing classes and explicit destructive actions/text such as:

- delete
- remove
- reset
- fire
- terminate
- abort
- revoke
- discard

This means legacy inline actions such as `removeProjectDependency(...)` no longer look identical to harmless navigation.

### Ghost

Ghost controls include:

- existing `.ghost`
- page/header return actions
- panel-title actions
- legacy `<lab-disclosure>` toggles

### Icon

Close/dismiss/menu controls and compact symbol-only buttons receive the icon treatment.

### Navigation

Role buttons, bottom navigation, tab lists, and inspect tabs use the nav variant. Context rules preserve existing layout:

- role navigation remains pill-shaped
- bottom navigation remains icon-over-label grid layout
- selected navigation retains a clear accent state

## Specialized controls intentionally excluded

The adapter deliberately does not flatten these into ordinary buttons:

- Item 13.4 `fl-launch` dashboard launchers
- training tier cards
- technology-tree nodes
- incident decision cards
- knowledge/term micro-controls
- Item 13.5 `pd-toggle` disclosure rows
- More-sheet system navigation tiles

`story-actions` also keeps its existing layout container so the mobile two-column story presentation is preserved, while the buttons inside it still receive semantic button variants.

## Control groups

Existing `*-actions` / `fl-actions` containers are tagged `fl-control-group` for consistent spacing and wrapping. Specialized `story-actions` is excluded from container normalization to preserve its responsive grid.

## Accessibility and interaction

Shared controls provide:

- visible `:focus-visible` treatment
- distinct selected nav state
- explicit disabled/locked appearance
- `aria-disabled` support
- optional `aria-busy` spinner state
- roughly 44px minimum touch height on mobile
- reduced-motion handling

## Platform parity

The system is included in:

- browser / GitHub Pages
- Scriptable WebView
- PWA/offline mode

The service worker advances to `frontier-lab-v15`.

## Regression coverage

### Static

`tests/shared-control-static.mjs` verifies:

- all semantic variants exist
- theme tokens are consumed
- specialized controls remain excluded
- bottom-nav and legacy-disclosure compatibility rules remain present
- the adapter runs last
- Browser / Scriptable / PWA contain both new assets
- cache version is v15

### Browser

`tests/shared-control-system.mjs` runs desktop and mobile and verifies:

- founder CTA is primary
- objective CTA is primary where present
- role and bottom navigation use nav treatment
- role pills retain their geometry
- bottom navigation remains a grid
- Expand Campus and Critical Path return controls are ghost actions
- Reset is destructive
- modal close is an icon action
- dashboard launchers and training tiers stay specialized
- future secondary/danger/locked/disabled/header/nav/icon/actions controls auto-normalize
- future text/select/textarea fields auto-normalize
- legacy `<lab-disclosure>` uses the shared ghost treatment
- More-sheet system tiles stay specialized
- mobile shared controls meet the touch-size target
- no runtime errors are introduced

## Scope boundary

13.6 establishes shared control hierarchy. The dedicated Company/Home dashboard repair begins in 13.7, followed by the exhaustive page-by-page visual sweep in 13.8 and later accessibility/responsive/release-gate passes.
