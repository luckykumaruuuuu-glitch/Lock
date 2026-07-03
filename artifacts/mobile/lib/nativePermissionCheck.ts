import { NativeModules, Platform } from "react-native";

export interface NativePermissionStatus {
  usageAccess: boolean;
  overlay: boolean;
  deviceAdmin: boolean;
  battery: boolean;
}

const { FocusLockPermissionChecker } = NativeModules;

/**
 * Calls the native Android PermissionCheckerModule to get real-time
 * OS-level permission status. Each field maps to a real Android API:
 *
 *   usageAccess  → AppOpsManager.checkOpNoThrow(OPSTR_GET_USAGE_STATS)
 *   overlay      → Settings.canDrawOverlays(context)
 *   deviceAdmin  → DevicePolicyManager.isAdminActive(DeviceAdminReceiver)
 *   battery      → PowerManager.isIgnoringBatteryOptimizations(packageName)
 *
 * Returns null on non-Android or when the native module is not yet built
 * (e.g. Expo Go without a custom dev build). Callers should fall back to
 * AsyncStorage cache when null is returned.
 */
export async function checkNativePermissions(): Promise<NativePermissionStatus | null> {
  if (Platform.OS !== "android") return null;
  if (!FocusLockPermissionChecker?.checkPermissions) return null;
  try {
    return (await FocusLockPermissionChecker.checkPermissions()) as NativePermissionStatus;
  } catch {
    return null;
  }
}
