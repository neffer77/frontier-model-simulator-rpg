# P5.1.3 — Desktop FrontierOS Shell

## Goal

Give desktop players an old-school workstation experience while preserving the existing simulator as the live application backend during migration.

Core rule: **desktop = windows, mobile = apps**.

## Activation

This slice is intentionally opt-in while app interiors are still legacy-backed:

- `?frontieros=desktop`
- or `localStorage.setItem('frontieros.desktop','1')`
- `?frontieros=0` disables the shell for troubleshooting.

The runtime API can force activation with `frontierDesktopShellActivate()`.

## Desktop model

The shell renders:

- FrontierOS menu bar
- 14 registry-driven desktop icons
- wallpaper/workspace
- draggable app windows
- taskbar
- Start menu
- system tray / clock
- planned/locked app feedback

## Live-app bridge

The simulator still owns one canonical `#app` node. P5.1.3 never clones it.

The active FrontierOS window physically owns the live `#app` node. When a second app is focused, the previous window becomes a suspended shell, its app is relaunched through the canonical app registry, and the same `#app` node is reattached to the newly active window.

This keeps legacy controls functional and prevents cloned DOM from drifting while later phases migrate each application to a native independent content root.

## Runtime APIs

- `frontierDesktopShellActivate()`
- `frontierDesktopShellDeactivate()`
- `frontierDesktopAppOpen(appId)`
- `frontierDesktopWindowFocus(appId)`
- `frontierDesktopWindowMinimize(appId)`
- `frontierDesktopWindowClose(appId)`
- `frontierDesktopShellSnapshot()`

## Observability

Events include:

- `os.desktop.shell.ready`
- `os.desktop.app.opened`
- `os.desktop.app.blocked`
- `os.desktop.window.focused`
- `os.desktop.window.minimized`
- `os.desktop.window.closed`
- `os.desktop.window.moved`
- `os.desktop.start.toggled`

They flow through P5.0.2 and into P5.0.3 support bundles.

## QA evidence

`npm run test:desktop-os` validates 1440×1000 and 1920×1080 and produces:

```text
artifacts/desktop-frontieros/
├── report.json
├── REPORT.md
├── desktop-home-1440.png
├── run-monitor-window.png
├── desktop-wide-1920.png
└── trace.zip
```

The focused `FrontierOS desktop UI evidence` workflow retains this artifact for 30 days. The cumulative release gate also treats P5.1.3 as a blocker.

## Acceptance criteria

- all 14 registry apps render on the desktop;
- ready apps launch through the registry;
- two app windows can exist simultaneously;
- focus and z-order are deterministic;
- minimize/restore works from the taskbar;
- windows can be dragged without escaping the workspace;
- planned/locked apps do not misnavigate;
- Start menu opens/closes and uses the registry;
- no page-level horizontal overflow at 1440 or 1920;
- screenshots and trace are generated in CI;
- PWA cache includes the desktop shell;
- shell behavior emits diagnostics events.

## Next

P5.1.4 should introduce the shared FrontierOS navigation/session layer: app history, deep-link routing, notifications and shell-aware transitions. After that, individual apps can become native FrontierOS interiors instead of legacy-backed surfaces.
