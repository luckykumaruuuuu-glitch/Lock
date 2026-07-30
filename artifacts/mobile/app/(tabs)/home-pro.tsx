/**
 * home-pro.tsx — "Home Pro" tab: DuckLock home screen.
 *
 * This is the second tab in the bottom bar (label "Home Pro").
 * It renders DuckLockHomeContent — the app-blocking / Reels Lock skin.
 *
 * The PermissionGuardPopup has been intentionally moved to (tabs)/_layout.tsx
 * so it fires once at app-level (when the user first reaches any tab after
 * completing setup) rather than only when this specific tab mounts.
 *
 * Settings is NOT in the tab bar; it is accessed via the profile-photo tap
 * in the top-left header (already implemented in HomeHeader).
 */

import React from "react";
import { DuckLockHomeContent } from "./index";

export default function HomeProScreen() {
  return <DuckLockHomeContent />;
}
