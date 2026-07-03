// ⚠️ TEMPORARY DEV BYPASS — REMOVE BEFORE PRODUCTION BUILD ⚠️
// यह पूरी file हटानी है जब final APK बनानी हो।
// साथ में इन सभी files से DEV_BYPASS_PERMISSIONS references हटाने हैं:
//   1. artifacts/mobile/lib/devBypass.ts          ← यह file (delete करें)
//   2. artifacts/mobile/hooks/usePermissionStatus.ts  ← allGranted में bypass
//   3. artifacts/mobile/hooks/usePermissionGuard.ts   ← getMissingPermissions() में bypass
//   4. artifacts/mobile/app/setup.tsx                 ← grantedCount, allGranted, verifyAndMarkPermission में bypass

export const DEV_BYPASS_PERMISSIONS = true;
