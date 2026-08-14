# Item 13.2 — Global Theme Tokens

## Goal

Create one canonical visual vocabulary for Frontier Lab before the page-by-page cleanup begins.

The simulator accumulated dozens of independently authored Phase 4 modules. Many represent the same visual concepts with slightly different hard-coded colors: dark cards, dark chrome, muted text, cyan accents, warning surfaces, danger surfaces, borders, disabled controls, and shadows.

That drift makes visual regressions difficult to fix globally. Item 13.2 establishes semantic CSS tokens so later Item 13 work can change the design system once instead of patching each screen independently.

## Canonical file

`theme-tokens.css` loads before every application stylesheet.

It owns these semantic groups:

- canvas and application chrome,
- five surface levels plus inset/hover/muted surfaces,
- subtle/default/strong/accent/focus borders,
- primary/secondary/muted/subtle/disabled/accent text,
- cyan/blue/teal/gold accents,
- success/warning/danger states,
- disabled state colors,
- shared panel/elevated/sheet/action/progress gradients,
- soft/panel/elevated/modal shadows,
- shared corner radii,
- focus-ring styling.

The app explicitly declares `color-scheme: dark` in the token layer.

## Naming rule

Tokens describe **meaning**, not individual screens.

Preferred:

```css
background: var(--fl-surface-3);
border-color: var(--fl-border-strong);
color: var(--fl-text-muted);
```

Avoid:

```css
--critical-path-blue: ...;
--quarterly-card-background: ...;
--hiring-gray: ...;
```

Page-specific colors should only exist when the color itself conveys a domain-specific meaning that cannot be represented by a shared semantic state.

## Surface hierarchy

The intended dark hierarchy is:

1. `--fl-canvas` — application background,
2. `--fl-chrome` — persistent navigation/chrome,
3. `--fl-surface-1` / `--fl-surface-2` — low/everyday content surfaces,
4. `--fl-surface-3` / `--fl-surface-4` — raised cards and controls,
5. `--fl-surface-5` — emphasized interactive surface,
6. `--fl-surface-hover` — active/pressed/hover feedback.

This hierarchy is deliberately dark throughout. A normal simulator panel should never require a white or browser-default background to express elevation.

## Semantic states

Success, warning, danger, and disabled treatments have separate foreground/background/border tokens.

This matters because previous modules frequently encoded state with unrelated orange/red/green values, making the same severity look different depending on which Phase 4 module rendered it.

Later page cleanup should use these semantic state tokens before introducing module-specific alternatives.

## Shared layers migrated in 13.2

The following cross-cutting styles now consume the token system:

- `responsive-gameplay-shell.css`
  - objective guidance,
  - bottom navigation,
  - More sheet,
  - locked navigation/system controls;
- `app-experience.css`
  - objective component,
  - PWA install component,
  - progressive-disclosure controls,
  - story cards and actions;
- `game-feel.css`
  - toasts,
  - milestone overlays,
  - progress feedback;
- `mobile-ux.css`
  - generic mobile Phase 4 controls and disabled states.

This intentionally does **not** migrate every historical page module yet. Items 13.4–13.8 will migrate those screens while repairing their visual hierarchy.

## Compatibility

Item 8 previously defined:

- `--feel-cyan`,
- `--feel-gold`,
- `--feel-red`.

Those names remain as compatibility aliases, but they resolve through the canonical `--fl-*` palette. `game-feel.css` no longer owns a parallel palette.

## Runtime integration

### Browser

`index.html` loads `theme-tokens.css` as the first application stylesheet.

### Scriptable

`Frontier Model Simulator.js` includes `theme-tokens.css` first in `STYLE_FILES`, matching browser order exactly.

### PWA

The service worker cache is bumped to `frontier-lab-v11` and precaches `theme-tokens.css`, preserving the same theme offline.

## Regression contract

`tests/theme-tokens.mjs` verifies:

- `theme-tokens.css` is the first stylesheet,
- the canonical semantic token groups exist,
- dark color scheme is explicitly declared,
- Item 8 compatibility colors alias canonical tokens,
- shared shell/component/game-feel/mobile styles actually consume the token system,
- `game-feel.css` cannot recreate its own `--feel-*` palette.

`npm run test:static` now includes this contract, and `npm run test:rc` uses the full static gate.

## Boundary with Item 13.3

Item 13.2 defines and adopts the palette. It does **not** yet create a broad desktop browser-default styling firewall.

That distinction is intentional:

- **13.2:** define what every surface/control/state should look like,
- **13.3:** ensure an unstyled or partially styled browser element cannot escape that system as a white/default-native rectangle.

The known `VIS-001` Company/Home white surfaces and `VIS-002` Critical Path orphan white control remain explicit reproduction targets until the relevant fallback/page rules are implemented and verified by the Item 13 visual inventory.

## Done criteria

Item 13.2 is complete when:

- one semantic theme file exists,
- it loads before all module CSS,
- browser/PWA/Scriptable use the same token layer,
- shared cross-cutting UI consumes the tokens,
- release CI protects the token contract,
- later Item 13 work has a documented rule for choosing colors and surfaces.
