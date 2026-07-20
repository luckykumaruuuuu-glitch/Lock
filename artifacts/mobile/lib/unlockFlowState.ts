/**
 * unlockFlowState.ts
 *
 * Module-level state that connects the caller (toggle-off / Settings) to the
 * correct result-screen after a task is completed in the unlock flow.
 *
 * Set BEFORE pushing to /unlock-tasks; consumed by task-completion screens.
 *
 * Two flows:
 *   Toggle-off    → destination: "duration-selector"  (how long to stay unlocked)
 *   Settings Unlock → destination: "reel-count-schedule" (how many reels to allow)
 */

export type UnlockDestination = "duration-selector" | "reel-count-schedule";
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

/** Call before router.push("/unlock-tasks") to set the post-task destination. */
export function setUnlockFlowState(
  dest: UnlockDestination,
  platform: SourcePlatform = null,
): void {
  _destination = dest;
  _platform = platform;
}

/** Where to navigate after a task is completed. */
export function getUnlockDestination(): UnlockDestination {
  return _destination;
}

/** Which platform the unlock was triggered from (may be null). */
export function getUnlockPlatform(): SourcePlatform {
  return _platform;
}
