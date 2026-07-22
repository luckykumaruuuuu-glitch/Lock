/**
 * unlockFlowState.ts
 *
 * Module-level state that connects the caller (toggle-off / Settings) to the
 * correct result-screen after a task is completed in the unlock flow.
 *
 * Set BEFORE pushing to /unlock-tasks; consumed by task-completion screens.
 *
 * Two flows:
 *   Toggle-off      → destination: "duration-selector"    (how long to stay unlocked)
 *   Settings Unlock → destination: "reel-count-schedule"  (how many reels to allow)
 *
 * sourceMode records which home-screen the user was on so that the destination
 * screen can restore the correct mode when navigating back to /(tabs).
 * DuckPal and DuckLock are two skins of the same app — not separate apps — so
 * one shared unlock flow serves both; only the return destination differs.
 */

export type UnlockDestination = "duration-selector" | "reel-count-schedule";
export type AppHomeMode = "DuckLock" | "DuckPal";
export type SourcePlatform =
  | "instagram"
  | "youtube"
  | "facebook"
  | "tiktok"
  | "twitter"
  | "snapchat"
  | "reddit"
  | "pinterest"
  | "whatsapp"
  | "telegram"
  | "discord"
  | "linkedin"
  | null;

let _destination: UnlockDestination = "duration-selector";
let _platform: SourcePlatform = null;
let _sourceMode: AppHomeMode = "DuckLock";

/** Call before router.push("/unlock-tasks") to set the post-task destination. */
export function setUnlockFlowState(
  dest: UnlockDestination,
  platform: SourcePlatform = null,
  sourceMode: AppHomeMode = "DuckLock",
): void {
  _destination = dest;
  _platform = platform;
  _sourceMode = sourceMode;
}

/** Where to navigate after a task is completed. */
export function getUnlockDestination(): UnlockDestination {
  return _destination;
}

/** Which platform the unlock was triggered from (may be null). */
export function getUnlockPlatform(): SourcePlatform {
  return _platform;
}

/**
 * Which home-screen mode the user was on when the unlock flow started.
 * Destination screens (duration-selector, reel-count-schedule) call this
 * to restore the correct mode before navigating back to /(tabs).
 */
export function getUnlockSourceMode(): AppHomeMode {
  return _sourceMode;
}
