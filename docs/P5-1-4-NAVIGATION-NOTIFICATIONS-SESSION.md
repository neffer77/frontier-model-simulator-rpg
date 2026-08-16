# P5.1.4 — FrontierOS Navigation, Notifications & Session Layer

## Goal

Make the FrontierOS phone and desktop shells behave like one coherent operating environment rather than isolated launchers.

The layer is intentionally separate from simulation save state. Navigation, recent apps, notification read state and transient UI session state live in `sessionStorage` under `frontieros.session.v1` so they can survive reloads in the current browsing session without polluting career/company saves.

## Runtime APIs

```js
frontierOsNavigate(target, options)
frontierOsBack()
frontierOsForward()
frontierOsHome()
frontierOsRecentApps()
frontierOsNotify(notification)
frontierOsNotifications(options)
frontierOsNotificationOpen(id)
frontierOsNotificationDismiss(id)
frontierOsOpenNotificationCenter()
frontierOsCloseNotificationCenter()
frontierOsSessionSnapshot()
frontierOsSessionRestore()
```

## Navigation

Canonical navigation is app-centric and uses P5.1.1 app IDs/deep links. Examples:

```js
await frontierOsNavigate('training')
await frontierOsNavigate('frontieros://training/run-1842')
await frontierOsNavigate('model-lab')
await frontierOsBack()
await frontierOsForward()
```

Each successful transition records a bounded history entry with:

- app ID
- canonical `os/*` route
- optional deep-link detail
- label
- current shell surface
- timestamp
- source

Back/forward traverses the FrontierOS history rather than browser URL history. The history is capped at 80 entries.

## Recent apps

The 10 most recent distinct apps are tracked independently of the history cursor. Recent apps are visible in the notification/session center and use the same shell-aware launch path.

## Notifications

`frontierOsNotify()` creates a local FrontierOS notification:

```js
frontierOsNotify({
  title: 'Run 1842 halted',
  body: 'NaN detected at step 441,198.',
  deepLink: 'frontieros://training/run-1842',
  severity: 'warn',
  source: 'training-runtime'
})
```

Notifications support:

- app ID or deep-link destinations
- info/warn/error severity
- unread/read state
- dismissal
- bounded retention (80)
- shell badges
- opening directly into the declared app

Opening a notification marks it read, resolves the app/deep link through the canonical registry, launches it through the active shell and records the transition in history.

## Shared notification center

The same responsive notification center is used on phone and desktop. It contains:

- Back / Forward / Home
- recent apps
- unread count
- notifications
- dismiss controls

On phones it fills the usable viewport with safe-area handling. On desktop it appears above the taskbar as a compact OS panel.

The mobile dock and desktop tray receive an unread badge/control automatically when their shells exist.

## Session persistence

`frontieros.session.v1` persists only transient OS data:

- history
- history cursor
- recents
- notification metadata/read state

It does **not** contain simulation state and does not increment `stateRevision`.

Reloading restores the session metadata. Shell transitions after restore remain observable through the P5.0.2 journal.

## Observability

The layer emits:

- `os.session.ready`
- `os.session.restored`
- `os.navigation.requested`
- `os.navigation.changed`
- `os.notification.created`
- `os.notification.read`
- `os.notification.opened`
- `os.notification.dismissed`
- `os.notification-center.opened`
- `os.notification-center.closed`

These events inherit P5.0.1 build/session/state identity through the P5.0.2 event bus and therefore appear in P5.0.3 debug bundles.

For a navigation bug, inspect `os.navigation.changed` around the failure, then compare the reported app ID, history index, active shell and subsequent `os.mobile.*` or `os.desktop.*` event.

## QA evidence

`npm run test:os-session` creates:

```text
artifacts/frontieros-session/
├── report.json
├── REPORT.md
├── phone-notification-center.png
├── phone-restored-session.png
├── desktop-notification-center.png
└── phone-trace.zip
```

The browser regression validates:

1. phone app history records multiple app transitions;
2. Back and Forward reopen the correct apps;
3. recent apps are ordered correctly;
4. a warning notification renders and increments unread count;
5. a deep-linked notification opens Run Monitor and preserves `run-1842` detail in history;
6. opening marks the notification read;
7. history/recents/notifications survive a same-session reload;
8. desktop navigation uses the same session APIs;
9. the desktop tray exposes notification access;
10. no runtime page errors occur.

A dedicated `FrontierOS navigation session evidence` workflow retains the artifact for 30 days. The cumulative Item 13.16 release gate also treats `frontieros-session` as a blocker and requires `artifacts/frontieros-session/report.json`.

## Keyboard navigation

When the notification center is closed:

- Alt/Meta + Left: FrontierOS Back
- Alt/Meta + Right: FrontierOS Forward

Escape closes the notification center.

## Delivery parity

P5.1.4 assets are included in:

- browser runtime
- production `_site` build
- PWA precache (`frontier-lab-v34`)
- Scriptable asset mirror

## Next dependency

P5.2 can begin migrating individual application interiors—starting with Pager and Run Monitor—while relying on a stable shell/navigation/notification contract instead of inventing navigation inside each app.
