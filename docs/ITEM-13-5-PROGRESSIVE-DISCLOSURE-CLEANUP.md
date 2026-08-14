# Item 13.5 — Progressive Disclosure Cleanup

## Goal

Make dense mobile screens collapse intentionally instead of producing blank bars, duplicated headings, stale mobile chrome, or section state that changes when modules reorder their DOM.

This builds on:

- Item 13.1 visual inventory
- Item 13.2 semantic theme tokens
- Item 13.3 browser-default styling firewall
- Item 13.4 shared panel/card system

## Behavior

Progressive disclosure remains limited to dense mobile views at `max-width: 720px`.

The first major section of a dense view stays fully visible as page context. Secondary sections receive one `pd-toggle` summary row.

The runtime classifies each secondary section as:

- `ready` — ordinary available content
- `empty` — zero-data / no-active-items state
- `locked` — content marked with an explicit locked state

Default behavior:

- first ready secondary section: expanded
- later ready sections: collapsed
- empty sections: collapsed
- locked sections: collapsed

Collapsed sections become exactly one compact themed row. Their original headings, content, pseudo-elements, min-height and local padding are hidden so a collapsed section cannot leave an empty colored/white strip behind.

## Empty states

The runtime recognizes both explicit shared empty-state classes (`fl-empty`, legacy `*empty*` classes) and common zero-data copy such as `No active projects.`

Example on an empty Critical Path page:

`Dependency graph · No data yet  +`

This replaces a large empty card with an intentional summary while still allowing the player to expand it and read the underlying explanation.

## Locked states

Sections carrying `.locked`, `data-locked="true"`, or `data-lock-state="locked"` receive a warning-themed disclosure row and the visible status `Locked`.

Locked disclosures remain expandable so the UI can still explain why a system is unavailable.

## Stable persistence

The old implementation persisted state with a raw section index:

`index + title`

That meant inserting/reordering a section could restore the wrong open/closed state.

Item 13.5 uses a versioned session key:

`frontier-disclosure:v2:<view>`

Each section key is derived from:

- normalized section title
- normalized stable legacy class hint
- duplicate ordinal only when two sections have the same title/class identity

This makes ordinary cross-render reordering safe.

## Responsive cleanup

The old implementation added mobile disclosure classes but did not actively remove them when crossing back to desktop.

Item 13.5 listens to the mobile media query and actively removes:

- `pd-toggle`
- `pd-enhanced`
- `pd-collapsed`
- disclosure data attributes

when the viewport is no longer mobile or the current view is not a dense view.

Desktop therefore gets the original full page with no hidden mobile state.

## Render lifecycle

The disclosure layer now responds to:

- the main `render()` chain
- dense-view DOM replacement through a `MutationObserver`
- mobile/desktop breakpoint changes
- explicit QA/manual synchronization through `frontierDisclosureSync()`

`frontierDisclosureReset()` clears all disclosure session memory and reapplies defaults.

Repeated synchronization is idempotent and must never create duplicate toggles.

## Styling

All Item 13.5 styling lives in `progressive-disclosure.css` and consumes Item 13.2 `--fl-*` tokens.

The old `.pd-*` rules were removed from `app-experience.css`, leaving one source of truth.

Disclosure styling layers after the Item 13.4 shared surface system.

## Accessibility

Each disclosure control is a real button and reports:

- `aria-expanded`
- an action-oriented `aria-label` (`Expand <section>` / `Collapse <section>`)
- visible section title
- visible state text (`Show details`, `Hide details`, `No data yet`, or `Locked`)

Focus styling uses the shared Frontier Lab focus token.

## Platform parity

The dedicated stylesheet is included in:

- browser / GitHub Pages
- Scriptable WebView
- PWA/offline cache

The service-worker cache advances to `frontier-lab-v14`.

## Regression coverage

### Static

`tests/progressive-disclosure-static.mjs` verifies:

- dedicated state styles exist
- theme tokens are consumed
- collapsed sections remove local padding and hide all non-toggle content
- stable v2 state identity exists
- empty/locked classifications remain explicit
- mobile/desktop cleanup remains present
- Browser, Scriptable and PWA asset parity
- service-worker cache version

### Browser

`tests/progressive-disclosure.mjs` verifies:

- empty Critical Path renders one compact dark disclosure row on mobile
- empty state says `No data yet`
- collapsed native heading is not left as a duplicate bar
- expand/collapse updates `aria-expanded`
- disclosure state survives a full re-render
- locked/empty/ready synthetic future sections are classified correctly
- saved state survives section reordering
- repeated synchronization does not create duplicate controls
- resizing to desktop removes all mobile disclosure chrome/classes
- dense desktop pages remain fully expanded
- no runtime errors are introduced

## Scope boundary

Item 13.5 owns disclosure/collapse behavior. Item 13.6 will normalize the broader button/control language across pages. Items 13.7+ remain responsible for the page-by-page visual polish sweep.
