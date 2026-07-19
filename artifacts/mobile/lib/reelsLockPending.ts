/**
 * reelsLockPending.ts
 *
 * Tiny module-level flag that bridges the Settings toggle → unlock-task flow.
 *
 * When the user taps the Reels Lock toggle OFF, the home screen sets this flag
 * and navigates to /unlock-tasks WITHOUT immediately disabling ReelsLock.
 * coming-soon.tsx reads this flag on mount: if set, it calls
 * NativeModules.ReelsLock.setEnabled(false) and clears the flag — completing
 * the disable only after a task was successfully finished.
 *
 * If the user backs out of unlock-tasks without completing a task the flag
 * stays false (never set), so the toggle stays ON.
 */

let _pending = false;

/** Mark that a toggle-OFF is waiting for task completion. */
export function setPendingReelsLockDisable(): void {
  _pending = true;
}

/** Returns true if a disable is pending, then clears the flag. */
export function consumePendingReelsLockDisable(): boolean {
  const was = _pending;
  _pending = false;
  return was;
}
