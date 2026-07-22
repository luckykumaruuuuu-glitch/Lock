/**
 * home-pro.tsx — "Home Pro" tab: DuckLock home screen.
 *
 * This is the second tab in the bottom bar (label "Home Pro").
 * It renders DuckLockHomeContent — the app-blocking / Reels Lock skin —
 * along with the shared PermissionGuardPopup that verifies required Android
 * permissions for the locking features to work.
 *
 * Settings is NOT in the tab bar; it is accessed via the profile-photo tap
 * in the top-left header (already implemented in HomeHeader).
 */

import React, { useState } from "react";

import { PermissionGuardPopup } from "@/components/ui/PermissionGuardPopup";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { DuckLockHomeContent } from "./index";

export default function HomeProScreen() {
  const { missingPerms, recheck } = usePermissionGuard();
  const [popupBypassed, setPopupBypassed] = useState(false);

  return (
    <>
      <DuckLockHomeContent />
      <PermissionGuardPopup
        missing={popupBypassed ? [] : missingPerms}
        onRecheck={recheck}
        onBypass={() => setPopupBypassed(true)}
      />
    </>
  );
}
