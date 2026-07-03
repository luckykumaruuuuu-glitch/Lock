// ⚠️ TEMPORARY DEV BYPASS — REMOVE BEFORE PRODUCTION BUILD ⚠️
// Ye poora file delete karna hai jab final APK banaani ho.
// Isse false karo ya poora file remove karo production ke liye.
//
// Kahan use ho raha hai (production se pehle yahan se hatao):
//   1. hooks/usePermissionGuard.ts  → getMissingPermissions()
//   2. app/setup.tsx                → verifyAndMarkPermission()
//   3. app/setup.tsx                → useEffect (initial mount bypass)

// DEV_BYPASS_PERMISSIONS
export const DEV_BYPASS_PERMISSIONS = true;
