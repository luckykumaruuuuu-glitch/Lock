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

function hasAttr(arr, attr, value) {
  return arr.some((el) => el.$?.[attr] === value);
}

function addPermissions(manifest) {
  const perms = ensureArray(manifest, "uses-permission");
  const toAdd = [
    "android.permission.INTERNET",
    "android.permission.RECEIVE_BOOT_COMPLETED",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
    "android.permission.PACKAGE_USAGE_STATS",
    "android.permission.POST_NOTIFICATIONS",
  ];
  for (const name of toAdd) {
    if (!hasAttr(perms, "android:name", name)) {
      perms.push({ $: { "android:name": name } });
    }
  }
}

function addDeviceAdminReceiver(application) {
  const receivers = ensureArray(application, "receiver");
  if (hasAttr(receivers, "android:name", ".DeviceAdminReceiver")) return;
  receivers.push({
    $: {
      "android:name": ".DeviceAdminReceiver",
      "android:label": "@string/app_name",
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
  if (hasAttr(services, "android:name", ".AppBlockerAccessibilityService")) return;
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

function addNotificationService(application) {
  const services = ensureArray(application, "service");
  if (hasAttr(services, "android:name", ".FocusLockNotificationService")) return;
  services.push({
    $: {
      "android:name": ".FocusLockNotificationService",
      "android:foregroundServiceType": "specialUse",
      "android:exported": "false",
    },
  });
}

function addLockOverlayActivity(application) {
  const activities = ensureArray(application, "activity");
  if (hasAttr(activities, "android:name", ".LockOverlayActivity")) return;
  activities.push({
    $: {
      "android:name": ".LockOverlayActivity",
      "android:exported": "false",
      "android:excludeFromRecents": "true",
      "android:taskAffinity": "",
      "android:launchMode": "singleTask",
      "android:theme": "@android:style/Theme.Black.NoTitleBar.Fullscreen",
    },
  });
}

function addBootReceiver(application) {
  const receivers = ensureArray(application, "receiver");
  if (hasAttr(receivers, "android:name", ".BootReceiver")) return;
  receivers.push({
    $: { "android:name": ".BootReceiver", "android:enabled": "true", "android:exported": "true" },
    "intent-filter": [{
      action: [
        { $: { "android:name": "android.intent.action.BOOT_COMPLETED" } },
        { $: { "android:name": "android.intent.action.QUICKBOOT_POWERON" } },
      ],
    }],
  });
}

function addSpecialUseFgsProperty(application) {
  const props = ensureArray(application, "property");
  const propName = "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE";
  if (hasAttr(props, "android:name", propName)) return;
  props.push({
    $: {
      "android:name": propName,
      "android:value": "FocusLock monitors foreground apps to block locked social media apps.",
    },
  });
}

/* ───────────────────────────────────────────────
   Plugin: Manifest entries
─────────────────────────────────────────────── */
const withFocusLockManifest = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    addPermissions(manifest);
    const app = manifest.application?.[0];
    if (app) {
      addDeviceAdminReceiver(app);
      addAccessibilityService(app);
      addNotificationService(app);
      addLockOverlayActivity(app);
      addBootReceiver(app);
      addSpecialUseFgsProperty(app);
    }
    return config;
  });

/* ───────────────────────────────────────────────
   Plugin: Native source files
─────────────────────────────────────────────── */
const withFocusLockNativeFiles = (config) =>
  withDangerousMod(config, [
    "android",
    (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const packagePath = PACKAGE_NAME.replace(/\./g, "/");

      const xmlDir = path.join(projectRoot, "app/src/main/res/xml");
      fs.mkdirSync(xmlDir, { recursive: true });

      const valuesDir = path.join(projectRoot, "app/src/main/res/values");
      fs.mkdirSync(valuesDir, { recursive: true });

      const kotlinDir = path.join(projectRoot, `app/src/main/java/${packagePath}`);
      fs.mkdirSync(kotlinDir, { recursive: true });

      /* ── res/xml/device_admin.xml ── */
      fs.writeFileSync(path.join(xmlDir, "device_admin.xml"),
`<?xml version="1.0" encoding="utf-8"?>
<device-admin xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-policies>
        <force-lock />
        <wipe-data />
    </uses-policies>
</device-admin>
`);

      /* ── res/xml/accessibility_service_config.xml ── */
      fs.writeFileSync(path.join(xmlDir, "accessibility_service_config.xml"),
`<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowStateChanged"
    android:accessibilityFeedbackType="feedbackAllMask"
    android:accessibilityFlags="flagReportViewIds|flagRetrieveInteractiveWindows"
    android:canRetrieveWindowContent="false"
    android:notificationTimeout="50"
    android:description="@string/focuslock_accessibility_description"
    android:settingsActivity="${PACKAGE_NAME}.MainActivity" />
`);

      /* ── res/values/focuslock_strings.xml ── */
      fs.writeFileSync(path.join(valuesDir, "focuslock_strings.xml"),
`<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="focuslock_accessibility_description">FocusLock monitors which app is in the foreground and blocks access to locked social media apps. This is required for the app-blocking feature to work.</string>
</resources>
`);

      /* ════════════════════════════════════════════════
         LockRepository.kt
         Shared data layer — reads focuslock_data.json
         written by the React Native (JS) layer.
      ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "LockRepository.kt"),
`package ${PACKAGE_NAME}

import android.content.Context
import android.content.pm.PackageManager
import org.json.JSONObject
import java.io.File

/**
 * Reads active lock data from the JSON file maintained by the JS layer.
 *
 * JS writes: [context.filesDir]/focuslock_data.json
 * Format:
 *   { "locks": [{ "id": "...", "appPackageNames": [...], "endTime": ms }], "updatedAt": ms }
 */
class LockRepository(private val context: Context) {

    data class NativeLock(
        val id: String,
        val appPackageNames: List<String>,
        val endTime: Long,
    )

    private fun dataFile(): File = File(context.filesDir, "focuslock_data.json")

    fun getActiveLocks(): List<NativeLock> {
        val file = dataFile()
        if (!file.exists()) return emptyList()

        return try {
            val json = JSONObject(file.readText())
            val arr = json.optJSONArray("locks") ?: return emptyList()
            val now = System.currentTimeMillis()
            val result = mutableListOf<NativeLock>()

            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val endTime = obj.getLong("endTime")
                if (endTime <= now) continue

                val pkgArr = obj.getJSONArray("appPackageNames")
                val pkgs = (0 until pkgArr.length()).map { pkgArr.getString(it) }

                result += NativeLock(
                    id = obj.optString("id", ""),
                    appPackageNames = pkgs,
                    endTime = endTime,
                )
            }
            result
        } catch (e: Exception) { emptyList() }
    }

    fun hasActiveLocks(): Boolean = getActiveLocks().isNotEmpty()

    /** Returns the endTime of the lock on [packageName], or null if not locked. */
    fun isPackageLocked(packageName: String): Long? {
        val now = System.currentTimeMillis()
        return getActiveLocks()
            .firstOrNull { lock -> packageName in lock.appPackageNames && lock.endTime > now }
            ?.endTime
    }

    /** Total number of distinct app package names that are currently locked. */
    fun lockedAppCount(): Int = getActiveLocks().sumOf { it.appPackageNames.size }

    /** End time of the lock that expires last. */
    fun longestEndTime(): Long? = getActiveLocks().maxOfOrNull { it.endTime }

    /** Human-readable display name of a package. Falls back to the package name. */
    fun getAppName(packageName: String): String = try {
        val pm = context.packageManager
        pm.getApplicationLabel(pm.getApplicationInfo(packageName, 0)).toString()
    } catch (e: Exception) { packageName }
}
`);

      /* ════════════════════════════════════════════════
         FocusLockNotificationService.kt
         Foreground service — shows the persistent
         "FocusLock Active" notification and exposes
         static helpers for tamper notifications.
      ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "FocusLockNotificationService.kt"),
`package ${PACKAGE_NAME}

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.*
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat

class FocusLockNotificationService : Service() {

    companion object {
        const val CHANNEL_ACTIVE  = "focuslock_active"
        const val CHANNEL_TAMPER  = "focuslock_tamper"
        const val NOTIF_ACTIVE    = 1001
        const val NOTIF_TAMPER    = 1002
        private const val TAG     = "FocusLockNotif"

        fun start(context: Context) {
            val intent = Intent(context, FocusLockNotificationService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, FocusLockNotificationService::class.java))
        }

        fun createChannels(context: Context) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            NotificationChannel(CHANNEL_ACTIVE, "FocusLock Protection",
                NotificationManager.IMPORTANCE_LOW).apply {
                description = "Persistent notification while social media apps are locked"
                setShowBadge(false)
                nm.createNotificationChannel(this)
            }

            NotificationChannel(CHANNEL_TAMPER, "Security Alert",
                NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Alerts when FocusLock protection is tampered with"
                nm.createNotificationChannel(this)
            }
        }

        /**
         * Shows a persistent, non-dismissible alert when the user disables
         * the Accessibility Service or Device Admin while locks are active.
         * Tapping opens the appropriate settings screen.
         */
        fun showTamperNotification(context: Context, body: String, isDeviceAdmin: Boolean = false) {
            createChannels(context)
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val settingsIntent = if (isDeviceAdmin) {
                Intent(Settings.ACTION_SECURITY_SETTINGS)
            } else {
                Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            }.apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }

            val pi = PendingIntent.getActivity(
                context, NOTIF_TAMPER, settingsIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )

            val notif = NotificationCompat.Builder(context, CHANNEL_TAMPER)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("\\u26A0\\uFE0F FocusLock Protection Disabled!")
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentIntent(pi)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .build()

            nm.notify(NOTIF_TAMPER, notif)
        }

        fun cancelTamperNotification(context: Context) {
            (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .cancel(NOTIF_TAMPER)
        }
    }

    private val handler = Handler(Looper.getMainLooper())
    private lateinit var repo: LockRepository

    private val ticker = object : Runnable {
        override fun run() {
            updateNotification()
            handler.postDelayed(this, 60_000L)
        }
    }

    override fun onCreate() {
        super.onCreate()
        repo = LockRepository(applicationContext)
        createChannels(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        updateNotification()
        handler.removeCallbacks(ticker)
        handler.postDelayed(ticker, 60_000L)
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(ticker)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun updateNotification() {
        val locks = repo.getActiveLocks()

        if (locks.isEmpty()) {
            Log.i(TAG, "No active locks — stopping service")
            stopForeground(true)
            stopSelf()
            return
        }

        val appCount   = repo.lockedAppCount()
        val longestEnd = repo.longestEndTime() ?: return
        val remaining  = formatRemaining(longestEnd)

        val mainIntent = packageManager.getLaunchIntentForPackage(packageName)
            ?.apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
        val pi = PendingIntent.getActivity(
            this, 0, mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notif = NotificationCompat.Builder(this, CHANNEL_ACTIVE)
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentTitle("\\uD83D\\uDD12 FocusLock Active — $appCount app\${if (appCount != 1) "s" else ""} locked")
            .setContentText(remaining)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()

        startForeground(NOTIF_ACTIVE, notif)
        Log.i(TAG, "Notification updated: $appCount apps locked | $remaining")
    }

    private fun formatRemaining(endTime: Long): String {
        val ms = endTime - System.currentTimeMillis()
        if (ms <= 0) return "Lock expiring…"

        val totalSec = ms / 1000
        val days     = totalSec / 86400
        val hours    = (totalSec % 86400) / 3600
        val minutes  = (totalSec % 3600) / 60

        return buildString {
            if (days > 0)          append("\${days}d ")
            if (hours > 0)         append("\${hours}h ")
            if (days == 0L && minutes > 0) append("\${minutes}m ")
            append("remaining")
        }.trim()
    }
}
`);

      /* ════════════════════════════════════════════════
         DeviceAdminReceiver.kt
         Prevents FocusLock from being uninstalled
         while active locks exist.
      ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "DeviceAdminReceiver.kt"),
`package ${PACKAGE_NAME}

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Handles device admin lifecycle events.
 *
 * When active, the OS blocks uninstalling FocusLock automatically — no extra
 * code needed. Our job here is to detect tampering and show alert notifications.
 */
class DeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i(TAG, "Device admin ENABLED — FocusLock uninstall protection active")
        // Clear any tamper alert that might have been showing
        FocusLockNotificationService.cancelTamperNotification(context)
    }

    /**
     * Android shows this text in a confirmation dialog before disabling admin.
     * We cannot truly block deactivation, but we can make the user think twice.
     */
    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        val hasLocks = LockRepository(context).hasActiveLocks()
        return if (hasLocks) {
            "\\u26A0\\uFE0F FocusLock has ACTIVE locks. " +
            "Disabling device admin will allow FocusLock to be uninstalled — " +
            "bypassing your commitment. Your locks remain stored but protection " +
            "will be weakened. Are you absolutely sure?"
        } else {
            "FocusLock device admin will be deactivated. " +
            "Re-enable it from the app's setup screen to restore full protection."
        }
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        val repo = LockRepository(context)
        if (repo.hasActiveLocks()) {
            Log.w(TAG, "Device admin DISABLED while locks active — showing tamper alert")
            FocusLockNotificationService.createChannels(context)
            FocusLockNotificationService.showTamperNotification(
                context,
                "Device Admin disabled! FocusLock can now be uninstalled. " +
                "Tap here to re-enable admin and restore full protection.",
                isDeviceAdmin = true,
            )
        } else {
            Log.i(TAG, "Device admin disabled — no active locks")
        }
    }

    companion object { private const val TAG = "FocusLockAdmin" }
}
`);

      /* ════════════════════════════════════════════════
         LockOverlayActivity.kt
         Full-screen overlay shown for 3 seconds when
         the user opens a locked app.
      ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "LockOverlayActivity.kt"),
`package ${PACKAGE_NAME}

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.*
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.*

/**
 * Full-screen overlay activity that appears when a locked app is opened.
 *
 * Shows: app name, lock expiry, remaining time, motivational message.
 * Auto-dismisses after 3 seconds and sends the user to the home screen.
 * Back press also goes home — there is no close button.
 */
class LockOverlayActivity : Activity() {

    companion object {
        const val EXTRA_APP_NAME    = "app_name"
        const val EXTRA_PKG_NAME    = "pkg_name"
        const val EXTRA_END_TIME    = "end_time"
    }

    private var countDown: CountDownTimer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen on and show over lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
        window.addFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )

        val appName = intent.getStringExtra(EXTRA_APP_NAME) ?: "This app"
        val endTime = intent.getLongExtra(EXTRA_END_TIME, 0L)
        val density = resources.displayMetrics.density
        fun dp(v: Int) = (v * density).toInt()

        /* ── Root container ── */
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity     = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0F172A"))
            setPadding(dp(32), dp(48), dp(32), dp(48))
        }

        /* ── Lock emoji ── */
        root += textView("\\uD83D\\uDD12", 72f, "#FFFFFF")

        /* ── App name ── */
        root += textView(appName, 30f, "#FFFFFF").also {
            it.typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            it.setPadding(0, dp(16), 0, dp(4))
        }

        /* ── "is locked" label ── */
        root += textView("is locked", 16f, "#64748B").also {
            it.setPadding(0, 0, 0, dp(24))
        }

        /* ── Remaining time ── */
        root += textView(formatRemaining(endTime), 24f, "#60A5FA").also {
            it.typeface = Typeface.create("sans-serif", Typeface.BOLD)
            it.setPadding(0, 0, 0, dp(8))
        }

        /* ── Unlock date ── */
        val expiry = SimpleDateFormat("MMM d 'at' h:mm a", Locale.getDefault()).format(Date(endTime))
        root += textView("Unlocks $expiry", 14f, "#94A3B8").also {
            it.setPadding(0, 0, 0, dp(32))
        }

        /* ── Divider ── */
        root += View(this).also { v ->
            v.setBackgroundColor(Color.parseColor("#1E293B"))
            v.layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(1)
            ).apply { setMargins(0, 0, 0, dp(32)) }
        }

        /* ── Motivational ── */
        root += textView("Stay strong! You chose this. \\uD83D\\uDCAA", 18f, "#A78BFA").also {
            it.typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            it.setPadding(0, 0, 0, dp(40))
        }

        /* ── Countdown label ── */
        val countdownLabel = textView("Redirecting in 3s\\u2026", 13f, "#475569")
        root += countdownLabel

        setContentView(root)

        countDown = object : CountDownTimer(3200, 1000) {
            override fun onTick(ms: Long) {
                val s = (ms / 1000).coerceAtLeast(1)
                countdownLabel.text = "Redirecting in \${s}s\\u2026"
            }
            override fun onFinish() = goHome()
        }.start()
    }

    private operator fun LinearLayout.plusAssign(view: View) = addView(view)

    private fun textView(text: String, sizeSp: Float, hexColor: String) =
        TextView(this).apply {
            this.text  = text
            textSize   = sizeSp
            setTextColor(Color.parseColor(hexColor))
            gravity    = Gravity.CENTER
        }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() = goHome()

    override fun onDestroy() { super.onDestroy(); countDown?.cancel() }

    private fun goHome() {
        countDown?.cancel()
        startActivity(Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        })
        finish()
    }

    private fun formatRemaining(endTime: Long): String {
        val ms = endTime - System.currentTimeMillis()
        if (ms <= 0) return "Expired"
        val s = ms / 1000
        val d = s / 86400; val h = (s % 86400) / 3600; val m = (s % 3600) / 60
        val parts = mutableListOf<String>()
        if (d > 0) parts += "\${d}d"
        if (h > 0) parts += "\${h}h"
        if (d == 0L && m > 0) parts += "\${m}m"
        return parts.joinToString(" ") + " remaining"
    }
}
`);

      /* ════════════════════════════════════════════════
         AppBlockerAccessibilityService.kt
         Monitors foreground app, launches overlay on
         locked app, starts persistent notification,
         and shows tamper alert when disabled.
      ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "AppBlockerAccessibilityService.kt"),
`package ${PACKAGE_NAME}

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * Core enforcement service.
 *
 * - Monitors TYPE_WINDOW_STATE_CHANGED events.
 * - When a locked app is detected, launches LockOverlayActivity.
 * - Manages the persistent "FocusLock Active" foreground notification.
 * - On destroy (tamper): shows a persistent alert notification.
 */
class AppBlockerAccessibilityService : AccessibilityService() {

    private lateinit var repo: LockRepository
    private var lastBlockedPkg  = ""
    private var lastBlockedTime = 0L
    private val DEBOUNCE_MS     = 2_000L

    private val HOME_LAUNCHERS = setOf(
        "com.android.launcher",
        "com.android.launcher2",
        "com.android.launcher3",
        "com.google.android.apps.nexuslauncher",
        "com.sec.android.app.launcher",
        "com.miui.home",
        "com.huawei.android.launcher",
        "com.oppo.launcher",
        "com.vivo.launcher",
        "com.oneplus.launcher",
        "com.nothing.launcher",
    )

    override fun onServiceConnected() {
        super.onServiceConnected()
        repo = LockRepository(applicationContext)

        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes     = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType   = AccessibilityServiceInfo.FEEDBACK_ALL_MASK
            flags          = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                             AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            notificationTimeout = 50
        }

        FocusLockNotificationService.createChannels(applicationContext)

        if (repo.hasActiveLocks()) {
            FocusLockNotificationService.start(applicationContext)
        }

        // Clear any stale tamper alert
        FocusLockNotificationService.cancelTamperNotification(applicationContext)

        Log.i(TAG, "AppBlockerAccessibilityService connected — monitoring active")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val pkg = event.packageName?.toString() ?: return
        if (pkg == applicationContext.packageName) return
        if (pkg in HOME_LAUNCHERS) return

        val now = System.currentTimeMillis()
        if (pkg == lastBlockedPkg && now - lastBlockedTime < DEBOUNCE_MS) return

        val endTime = repo.isPackageLocked(pkg) ?: return

        lastBlockedPkg  = pkg
        lastBlockedTime = now

        val appName = repo.getAppName(pkg)
        Log.i(TAG, "Blocking $appName ($pkg) locked until $endTime")

        // Launch full-screen overlay
        startActivity(Intent(applicationContext, LockOverlayActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(LockOverlayActivity.EXTRA_APP_NAME, appName)
            putExtra(LockOverlayActivity.EXTRA_PKG_NAME,  pkg)
            putExtra(LockOverlayActivity.EXTRA_END_TIME,  endTime)
        })
    }

    override fun onInterrupt() {
        Log.w(TAG, "AppBlockerAccessibilityService interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.w(TAG, "AppBlockerAccessibilityService destroyed")

        if (::repo.isInitialized && repo.hasActiveLocks()) {
            FocusLockNotificationService.showTamperNotification(
                applicationContext,
                "Accessibility service disabled! Locked apps can now be opened. " +
                "Tap here to re-enable and restore blocking.",
            )
        }
    }

    companion object { private const val TAG = "FocusLockA11y" }
}
`);

      /* ════════════════════════════════════════════════
         BootReceiver.kt
         After reboot: restores the persistent
         notification so the user knows protection
         is still active.
      ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "BootReceiver.kt"),
`package ${PACKAGE_NAME}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Triggered on device boot.
 *
 * The AccessibilityService is re-bound automatically by Android if the user
 * had it enabled before reboot, so no manual restart is needed. This receiver
 * restores the persistent foreground notification and logs the recovery.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != "android.intent.action.QUICKBOOT_POWERON") return

        Log.i(TAG, "Boot/quickboot completed — checking FocusLock state")

        val repo   = LockRepository(context)
        val active = repo.getActiveLocks()

        if (active.isEmpty()) {
            Log.i(TAG, "No active locks — nothing to restore")
            return
        }

        val appCount = repo.lockedAppCount()
        Log.i(TAG, "Restoring protection: $appCount app(s) locked")

        FocusLockNotificationService.createChannels(context)
        FocusLockNotificationService.start(context)
    }

    companion object { private const val TAG = "FocusLockBoot" }
}
`);

      return config;
    },
  ]);

/* ───────────────────────────────────────────────
   Compose and export
─────────────────────────────────────────────── */
const withFocusLockAndroid = (config) => {
  config = withFocusLockManifest(config);
  config = withFocusLockNativeFiles(config);
  return config;
};

module.exports = withFocusLockAndroid;
