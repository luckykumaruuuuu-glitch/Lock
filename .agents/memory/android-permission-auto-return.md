---
name: Android permission auto-return watchability
description: Which Android permission grants can be detected live (ContentObserver/AppOpsManager) vs require manual back-navigation, and a JS template-literal pitfall hit while implementing it.
---

## Which permissions are watchable without the user manually returning to the app

- **Accessibility Service**: watchable via `ContentObserver` on `Settings.Secure.getUriFor(Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)` — a real, documented Settings key.
- **Usage Access, Overlay ("draw over other apps"), Notifications**: watchable via `AppOpsManager.startWatchingMode()` on the app's own op (`OPSTR_GET_USAGE_STATS`, `OPSTR_SYSTEM_ALERT_WINDOW`, `OPSTR_POST_NOTIFICATION`). Any app can watch its own AppOps op changes without extra privileges.
- **Device Admin, Battery Optimization allowlist**: NO public observable Settings key or AppOps op exists for either. This is an Android platform limitation, not a missing implementation — these two must keep relying on AppState-resume / navigation-focus re-checks (i.e. the user has to come back to the app, either automatically via task-switch or manually).

**Why:** initial assumption (from a user request) was that only Notifications + Accessibility were watchable; deeper research showed Usage Access and Overlay are too, via AppOps rather than Settings keys. Worth re-verifying against current Android docs before assuming a permission is "unwatchable" — check both Settings.Secure keys AND AppOpsManager ops.

**How to apply:** when adding "auto-return after granting permission X" UX, first check if X has a real Settings key (ContentObserver) or is backed by an AppOps op (OnOpChangedListener) before concluding it needs manual fallback.

## Pitfall: markdown backticks inside Kotlin/JS template-literal source

When Android native source is generated from a JS template literal (as in Expo config plugins), do NOT use markdown-style backticks (`` `like this` ``) inside Kotlin comments within that literal — an unescaped backtick terminates the JS template string early, causing a confusing `SyntaxError: missing ) after argument list` far from the actual cause. Always `node --check` the plugin file after editing embedded native-source templates.
