// @ts-check
const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGE_NAME = "com.focuslock.app";

/* ───────────────────────────────────────────────
   Helpers
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
  return manifest;
}

function addDeviceAdminReceiver(application) {
  const receivers = ensureArray(application, "receiver");
  const alreadyExists = receivers.some(
    (r) => r.$["android:name"] === ".DeviceAdminReceiver"
  );
  if (!alreadyExists) {
    receivers.push({
      $: {
        "android:name": ".DeviceAdminReceiver",
        "android:label": "FocusLock",
        "android:description": "@string/app_name",
        "android:permission": "android.permission.BIND_DEVICE_ADMIN",
        "android:exported": "true",
      },
      "meta-data": [
        {
          $: {
            "android:name": "android.app.device_admin",
            "android:resource": "@xml/device_admin",
          },
        },
      ],
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name":
                  "android.app.action.DEVICE_ADMIN_ENABLED",
              },
            },
          ],
        },
      ],
    });
  }
}

function addAccessibilityService(application) {
  const services = ensureArray(application, "service");
  const alreadyExists = services.some(
    (s) => s.$["android:name"] === ".AppBlockerAccessibilityService"
  );
  if (!alreadyExists) {
    services.push({
      $: {
        "android:name": ".AppBlockerAccessibilityService",
        "android:enabled": "true",
        "android:exported": "true",
        "android:label": "FocusLock Blocker",
        "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE",
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name":
                  "android.accessibilityservice.AccessibilityService",
              },
            },
          ],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.accessibilityservice",
            "android:resource": "@xml/accessibility_service_config",
          },
        },
      ],
    });
  }
}

function addBootReceiver(application) {
  const receivers = ensureArray(application, "receiver");
  const alreadyExists = receivers.some(
    (r) => r.$["android:name"] === ".BootReceiver"
  );
  if (!alreadyExists) {
    receivers.push({
      $: {
        "android:name": ".BootReceiver",
        "android:enabled": "true",
        "android:exported": "true",
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name": "android.intent.action.BOOT_COMPLETED",
              },
            },
          ],
        },
      ],
    });
  }
}

/* ───────────────────────────────────────────────
   Plugin: Manifest
─────────────────────────────────────────────── */
const withFocusLockManifest = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    addPermissions(manifest);

    const application = manifest.application?.[0];
    if (application) {
      addDeviceAdminReceiver(application);
      addAccessibilityService(application);
      addBootReceiver(application);
    }

    return config;
  });

/* ───────────────────────────────────────────────
   Plugin: Native files (res/xml + Kotlin stubs)
─────────────────────────────────────────────── */
const withFocusLockNativeFiles = (config) =>
  withDangerousMod(config, [
    "android",
    (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const packagePath = PACKAGE_NAME.replace(/\./g, "/");

      /* ── res/xml ─────────────────────────── */
      const xmlDir = path.join(projectRoot, "app/src/main/res/xml");
      fs.mkdirSync(xmlDir, { recursive: true });

      // device_admin.xml
      fs.writeFileSync(
        path.join(xmlDir, "device_admin.xml"),
        `<?xml version="1.0" encoding="utf-8"?>
<device-admin xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-policies>
        <!-- Prevent the user from uninstalling FocusLock while a lock is active -->
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

      // accessibility_service_config.xml
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

      /* ── Kotlin source stubs ──────────────── */
      const kotlinDir = path.join(
        projectRoot,
        `app/src/main/java/${packagePath}`
      );
      fs.mkdirSync(kotlinDir, { recursive: true });

      // DeviceAdminReceiver.kt
      const deviceAdminPath = path.join(kotlinDir, "DeviceAdminReceiver.kt");
      if (!fs.existsSync(deviceAdminPath)) {
        fs.writeFileSync(
          deviceAdminPath,
          `package ${PACKAGE_NAME}

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * FocusLock Device Admin Receiver
 *
 * Prevents FocusLock from being uninstalled while an active lock is in place.
 * Activated when the user grants device admin privileges from the permission
 * setup screen.
 *
 * NOTE: Full enforcement logic (checking active locks before allowing removal)
 * will be wired in a future milestone.
 */
class DeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i(TAG, "Device admin enabled — FocusLock is now protected")
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        // TODO: Check for active locks; if any exist, re-activate admin
        Log.w(TAG, "Device admin disabled — enforcement suspended")
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        return "FocusLock has an active lock. Disabling device admin will NOT " +
               "remove any active locks — they will resume when admin is re-enabled."
    }

    companion object {
        private const val TAG = "FocusLockAdmin"
    }
}
`
        );
      }

      // AppBlockerAccessibilityService.kt
      const a11yPath = path.join(
        kotlinDir,
        "AppBlockerAccessibilityService.kt"
      );
      if (!fs.existsSync(a11yPath)) {
        fs.writeFileSync(
          a11yPath,
          `package ${PACKAGE_NAME}

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * FocusLock Accessibility Service
 *
 * Monitors window-state changes to detect when a locked app is brought to the
 * foreground. When a locked app is detected, it redirects the user back to the
 * FocusLock app with an explanation screen.
 *
 * NOTE: The actual lock-list lookup and redirect logic will be wired in a
 * future milestone. This stub sets up the service lifecycle only.
 */
class AppBlockerAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        super.onServiceConnected()
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                         AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_ALL_MASK
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            notificationTimeout = 100
        }
        serviceInfo = info
        Log.i(TAG, "AppBlockerAccessibilityService connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val packageName = event.packageName?.toString() ?: return

        // TODO (next milestone):
        //   1. Query active locks from shared preferences / Room DB
        //   2. If packageName is in active locks → launch BlockedActivity
        Log.v(TAG, "Window state changed: $packageName")
    }

    override fun onInterrupt() {
        Log.w(TAG, "AppBlockerAccessibilityService interrupted")
    }

    companion object {
        private const val TAG = "FocusLockA11y"
    }
}
`
        );
      }

      // BootReceiver.kt
      const bootPath = path.join(kotlinDir, "BootReceiver.kt");
      if (!fs.existsSync(bootPath)) {
        fs.writeFileSync(
          bootPath,
          `package ${PACKAGE_NAME}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * FocusLock Boot Receiver
 *
 * Re-starts the lock monitoring foreground service after a device reboot so
 * that active locks remain enforced even if the device is restarted.
 *
 * NOTE: The foreground service start logic will be wired in a future milestone.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.i(TAG, "Boot completed — restoring active lock monitoring")
            // TODO: Start LockMonitorService.kt
        }
    }

    companion object {
        private const val TAG = "FocusLockBoot"
    }
}
`
        );
      }

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
