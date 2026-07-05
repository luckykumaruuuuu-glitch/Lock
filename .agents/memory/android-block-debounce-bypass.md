---
name: Android app-block debounce/overlay bypass pattern
description: A class of bug in singleTask overlay Activities + debounce logic that can silently let a locked/blocked app open unblocked.
---

When an AccessibilityService (or similar foreground-app watcher) triggers a `singleTask` overlay Activity to block/interrupt a target app, two things must both be per-target-package, not global:

1. **The debounce/rate-limit state** in the watcher (e.g. "don't re-trigger for the same event within N ms"). A single shared `lastPkg`/`lastTime` var lets triggers for one package mark a *different* package's debounce as "handled," even though no overlay was ever shown for it.
2. **The overlay Activity's intent handling.** A `singleTask`/`singleInstance` Activity that's already on top does NOT get a fresh `onCreate` for a new launch intent — Android delivers it to `onNewIntent()` instead. If that's not overridden, the new intent's extras (which app, which end-time) are silently dropped and the old overlay/timer just keeps running, while the watcher has already (per bug #1) marked the new package as handled.

**Why:** Combined, these two gaps create a real bypass: open Locked App A (overlay shows) → quickly open Locked App B while A's overlay still showing → B's trigger updates the shared debounce and is swallowed by the stale Activity's onCreate-only logic → reopening B shortly after skips blocking entirely.

**How to apply:** Use a per-package map (`MutableMap<String, Long>`) for debounce timestamps, and always implement `onNewIntent()` on the overlay Activity to `setIntent()` and fully re-render/reset any UI + timers from the new intent's extras — never assume onCreate is the only entry point once the Activity can be reused via singleTask/singleInstance/singleTop.
