// @ts-check
const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGE_NAME = "com.focuslock.app";

/* ───────────────────────────────────────────────
   Manifest helpers
─────────────────────────────────────────────── */
function ensureArray(obj, key) {
  if (!obj[key]) obj[key] = [];
  return obj[key];
}

function hasPermission(permissions, name) {
  return permissions.some((p) => p.$["android:name"] === name);
}

function addPermissions(manifest) {
  const perms = ensureArray(manifest, "uses-permission");
  const toAdd = [
    "android.permission.INTERNET",
    "android.permission.RECEIVE_BOOT_COMPLETED",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
    "android.permission.PACKAGE_USAGE_STATS",
  ];
  for (const name of toAdd) {
    if (!hasPermission(perms, name)) {
      perms.push({ $: { "android:name": name } });
    }
  }
}

function addDeviceAdminReceiver(application) {
  const receivers = ensureArray(application, "receiver");
  if (receivers.some((r) => r.$["android:name"] === ".DeviceAdminReceiver")) return;
  receivers.push({
    $: {
      "android:name": ".DeviceAdminReceiver",
      "android:label": "FocusLock",
      "android:description": "@string/app_name",
      "android:permission": "android.permission.BIND_DEVICE_ADMIN",
      "android:exported": "true",
    },
    "meta-data": [{ $: { "android:name": "android.app.device_admin", "android:resource": "@xml/device_admin" } }],
    "intent-filter": [{ action: [{ $: { "android:name": "android.app.action.DEVICE_ADMIN_ENABLED" } }] }],
  });
}

function addAccessibilityService(application) {
  const services = ensureArray(application, "service");
  if (services.some((s) => s.$["android:name"] === ".AppBlockerAccessibilityService")) return;
  services.push({
    $: {
      "android:name": ".AppBlockerAccessibilityService",
      "android:enabled": "true",
      "android:exported": "true",
      "android:label": "FocusLock Blocker",
      "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE",
    },
    "intent-filter": [{ action: [{ $: { "android:name": "android.accessibilityservice.AccessibilityService" } }] }],
    "meta-data": [{ $: { "android:name": "android.accessibilityservice", "android:resource": "@xml/accessibility_service_config" } }],
  });
}

function addBootReceiver(application) {
  const receivers = ensureArray(application, "receiver");
  if (receivers.some((r) => r.$["android:name"] === ".BootReceiver")) return;
  receivers.push({
    $: { "android:name": ".BootReceiver", "android:enabled": "true", "android:exported": "true" },
    "intent-filter": [{ action: [{ $: { "android:name": "android.intent.action.BOOT_COMPLETED" } }] }],
  });
}

/* ───────────────────────────────────────────────
   Plugin: Manifest
─────────────────────────────────────────────── */
const withFocusLockManifest = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    addPermissions(manifest);
    const app = manifest.application?.[0];
    if (app) {
      addDeviceAdminReceiver(app);
      addAccessibilityService(app);
      addBootReceiver(app);
    }
    return config;
  });

/* ───────────────────────────────────────────────
   Plugin: res/xml + Kotlin source files
─────────────────────────────────────────────── */
const withFocusLockNativeFiles = (config) =>
  withDangerousMod(config, [
    "android",
    (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const packagePath = PACKAGE_NAME.replace(/\./g, "/");

      /* ── res/xml ── */
      const xmlDir = path.join(projectRoot, "app/src/main/res/xml");
      fs.mkdirSync(xmlDir, { recursive: true });

      fs.writeFileSync(
        path.join(xmlDir, "device_admin.xml"),
        `<?xml version="1.0" encoding="utf-8"?>
<device-admin xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-policies>
        <limit-password />
        <watch-login />
        <reset-password />
        <force-lock />
        <wipe-data />
        <expire-password />
        <encrypted-storage />
        <disable-camera />
    </uses-policies>
</device-admin>
`
      );

      fs.writeFileSync(
        path.join(xmlDir, "accessibility_service_config.xml"),
        `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged"
    android:accessibilityFeedbackType="feedbackAllMask"
    android:accessibilityFlags="flagReportViewIds|flagRetrieveInteractiveWindows"
    android:canRetrieveWindowContent="true"
    android:notificationTimeout="100"
    android:description="@string/accessibility_service_description"
    android:settingsActivity="${PACKAGE_NAME}.MainActivity" />
`
      );

      /* ── Kotlin source files ── */
      const kotlinDir = path.join(projectRoot, `app/src/main/java/${packagePath}`);
      fs.mkdirSync(kotlinDir, { recursive: true });

      /* DeviceAdminReceiver.kt */
      fs.writeFileSync(
        path.join(kotlinDir, "DeviceAdminReceiver.kt"),
        `package ${PACKAGE_NAME}

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * FocusLock Device Admin Receiver
 *
 * Prevents FocusLock from being uninstalled while an active lock is in place.
 * When device admin is disabled, it checks for active locks and warns the user.
 */
class DeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i(TAG, "Device admin enabled — FocusLock is now protected from uninstall")
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        val hasActive = LockRepository(context).hasActiveLocks()
        if (hasActive) {
            Log.w(TAG, "Device admin disabled while active locks exist — enforcement paused")
        }
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        val repo = LockRepository(context)
        return if (repo.hasActiveLocks()) {
            "⚠️ FocusLock has active locks. Disabling admin will NOT remove them — " +
            "they remain stored and will resume if you re-enable admin."
        } else {
            "FocusLock device admin will be deactivated."
        }
    }

    companion object {
        private const val TAG = "FocusLockAdmin"
    }
}
`
      );

      /* LockRepository.kt — shared data layer */
      fs.writeFileSync(
        path.join(kotlinDir, "LockRepository.kt"),
        `package ${PACKAGE_NAME}

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Reads lock data written by the React Native layer.
 *
 * The JS layer writes to:
 *   [context.filesDir]/focuslock_data.json
 *
 * Format:
 * {
 *   "locks": [
 *     { "id": "...", "appPackageNames": ["com.foo"], "endTime": 1700000000000 },
 *     ...
 *   ],
 *   "updatedAt": 1700000000000
 * }
 */
class LockRepository(private val context: Context) {

    data class NativeLock(
        val id: String,
        val appPackageNames: List<String>,
        val endTime: Long
    )

    private fun getDataFile(): File = File(context.filesDir, "focuslock_data.json")

    fun getActiveLocks(): List<NativeLock> {
        val file = getDataFile()
        if (!file.exists()) return emptyList()

        return try {
            val json = JSONObject(file.readText())
            val locksArray = json.optJSONArray("locks") ?: return emptyList()
            val now = System.currentTimeMillis()
            val result = mutableListOf<NativeLock>()

            for (i in 0 until locksArray.length()) {
                val obj = locksArray.getJSONObject(i)
                val endTime = obj.getLong("endTime")
                if (endTime <= now) continue   // already expired

                val pkgsArray = obj.getJSONArray("appPackageNames")
                val pkgs = (0 until pkgsArray.length()).map { pkgsArray.getString(it) }

                result.add(
                    NativeLock(
                        id = obj.optString("id", ""),
                        appPackageNames = pkgs,
                        endTime = endTime
                    )
                )
            }
            result
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun hasActiveLocks(): Boolean = getActiveLocks().isNotEmpty()

    fun isPackageLocked(packageName: String): Long? {
        val now = System.currentTimeMillis()
        return getActiveLocks()
            .firstOrNull { lock -> packageName in lock.appPackageNames && lock.endTime > now }
            ?.endTime
    }
}
`
      );

      /* AppBlockerAccessibilityService.kt */
      fs.writeFileSync(
        path.join(kotlinDir, "AppBlockerAccessibilityService.kt"),
        `package ${PACKAGE_NAME}

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * FocusLock Accessibility Service
 *
 * Monitors foreground app changes. When a locked app is detected:
 *   1. Immediately redirects the user to the home screen.
 *   2. Shows a Toast with the exact unlock date/time.
 *
 * Lock data is read from [filesDir]/focuslock_data.json which is
 * maintained by the React Native (JS) layer via expo-file-system.
 */
class AppBlockerAccessibilityService : AccessibilityService() {

    private lateinit var repo: LockRepository
    private val handler = Handler(Looper.getMainLooper())
    private var lastBlockedPackage: String? = null
    private var lastBlockedTime: Long = 0L

    // Debounce: don't fire twice for the same package within 2 s
    private val DEBOUNCE_MS = 2_000L

    private val HOME_PACKAGES = setOf(
        "com.android.launcher",
        "com.android.launcher2",
        "com.android.launcher3",
        "com.google.android.apps.nexuslauncher",
        "com.sec.android.app.launcher",
        "com.miui.home",
        "com.huawei.android.launcher",
        "com.oppo.launcher",
        "com.vivo.launcher"
    )

    override fun onServiceConnected() {
        super.onServiceConnected()
        repo = LockRepository(applicationContext)

        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                         AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_ALL_MASK
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            notificationTimeout = 100
        }

        Log.i(TAG, "AppBlockerAccessibilityService connected — monitoring active")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val packageName = event.packageName?.toString() ?: return

        // Skip ourselves and home launchers
        if (packageName == applicationContext.packageName) return
        if (packageName in HOME_PACKAGES) return

        val now = System.currentTimeMillis()

        // Debounce — skip if we just blocked this package
        if (packageName == lastBlockedPackage && now - lastBlockedTime < DEBOUNCE_MS) return

        // Check lock data
        val endTime = repo.isPackageLocked(packageName) ?: return

        // Lock is active — redirect to home
        lastBlockedPackage = packageName
        lastBlockedTime = now

        Log.i(TAG, "Blocking $packageName — locked until $endTime")

        // Go to home screen
        val homeIntent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(homeIntent)

        // Toast on main thread
        val expiry = SimpleDateFormat("MMM d 'at' h:mm a", Locale.getDefault())
            .format(Date(endTime))

        handler.post {
            Toast.makeText(
                applicationContext,
                "🔒 This app is locked until $expiry",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "AppBlockerAccessibilityService interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "AppBlockerAccessibilityService destroyed")
    }

    companion object {
        private const val TAG = "FocusLockA11y"
    }
}
`
      );

      /* BootReceiver.kt */
      fs.writeFileSync(
        path.join(kotlinDir, "BootReceiver.kt"),
        `package ${PACKAGE_NAME}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * FocusLock Boot Receiver
 *
 * Triggered after device reboot. Checks for active locks — if any exist,
 * it logs a warning so the service can re-start monitoring.
 *
 * The AccessibilityService is system-managed and will restart automatically
 * if the user had it enabled; this receiver acts as a cross-check and
 * future hook for a foreground-service monitor.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        Log.i(TAG, "Boot completed — checking for active FocusLock locks")

        val repo = LockRepository(context)
        val activeLocks = repo.getActiveLocks()

        if (activeLocks.isEmpty()) {
            Log.i(TAG, "No active locks — nothing to resume")
            return
        }

        Log.i(TAG, "Found \${activeLocks.size} active lock(s) — accessibility service should resume monitoring")

        // The AccessibilityService is re-bound automatically by Android after reboot
        // if the user had it enabled. No explicit start needed.
        // Future: start a foreground timer service here as a fallback.
    }

    companion object {
        private const val TAG = "FocusLockBoot"
    }
}
`
      );

      return config;
    },
  ]);

/* ───────────────────────────────────────────────
   Export composed plugin
─────────────────────────────────────────────── */
const withFocusLockAndroid = (config) => {
  config = withFocusLockManifest(config);
  config = withFocusLockNativeFiles(config);
  return config;
};

module.exports = withFocusLockAndroid;
