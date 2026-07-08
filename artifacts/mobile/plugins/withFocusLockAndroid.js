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
    "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
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
      ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "LockRepository.kt"),
`package ${PACKAGE_NAME}

import android.content.Context
import android.content.pm.PackageManager
import org.json.JSONObject
import java.io.File

/**
 * Reads active lock data from the JSON files maintained by the JS layer.
 *
 * Primary file  : [context.filesDir]/focuslock_data.json
 *   Format: { "locks": [...], "updatedAt": ms, "startupVerified": bool }
 *
 * Startup cache : [context.filesDir]/focuslock_startup_cache.json
 *   Format: { "locks": [...], "updatedAt": ms }
 *   Written every time locks change; used as conservative fallback during
 *   the cold-start window before JS sync completes (startupVerified: false).
 *
 * Startup safety logic:
 *   When startupVerified == false in the primary file, the JS layer is still
 *   fetching from Firebase. The AccessibilityService reads the startup cache
 *   instead to block apps conservatively during this 1-3s window.
 *   Once the JS sync completes, startupVerified is set to true and the primary
 *   file becomes the authoritative source.
 */
class LockRepository(private val context: Context) {

    data class NativeLock(
        val id: String,
        val appPackageNames: List<String>,
        val endTime: Long,
    )

    private fun dataFile(): File = File(context.filesDir, "focuslock_data.json")
    private fun startupCacheFile(): File = File(context.filesDir, "focuslock_startup_cache.json")

    /** Parse a JSON array of lock objects into NativeLock list, filtering expired. */
    private fun parseLockArray(json: JSONObject, key: String = "locks"): List<NativeLock> {
        val arr = json.optJSONArray(key) ?: return emptyList()
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
        // ⚠️ DEBUG — remove before production
        android.util.Log.d("DuckLock", "📋 Parsed \${result.size} active lock(s). Packages: \${result.flatMap { it.appPackageNames }}")
        return result
    }

    /**
     * Returns active locks with startup-safety logic:
     *
     * 1. If primary file missing or startupVerified == false →
     *    read startup cache (conservative: blocks apps that were locked before restart).
     * 2. If primary file exists and startupVerified == true →
     *    read primary file (normal operation).
     */
    fun getActiveLocks(): List<NativeLock> {
        val file = dataFile()
        // ⚠️ DEBUG — remove before production
        android.util.Log.d("DuckLock", "📂 Lock file: \${file.absolutePath} | exists: \${file.exists()}")

        // Primary file missing → JS hasn't written yet (very early cold start)
        // Fall back to startup cache so we don't allow locked apps through.
        if (!file.exists()) {
            return readStartupCache()
        }

        return try {
            val json = JSONObject(file.readText())
            val startupVerified = json.optBoolean("startupVerified", true)

            if (!startupVerified) {
                // JS sync still in progress — use startup cache conservatively.
                // Merge: take the union of cache locks and current file locks so
                // nothing slips through during the verification window.
                val cacheLocks = readStartupCache()
                val fileLocks = parseLockArray(json)
                val merged = (cacheLocks + fileLocks)
                    .distinctBy { it.id }
                    .filter { it.endTime > System.currentTimeMillis() }
                return merged
            }

            parseLockArray(json)
        } catch (e: Exception) {
            // Corrupted primary file → fall back to cache
            readStartupCache()
        }
    }

    /** Read the startup cache file. Returns empty list if missing or corrupt. */
    private fun readStartupCache(): List<NativeLock> {
        val cache = startupCacheFile()
        if (!cache.exists()) return emptyList()
        return try {
            parseLockArray(JSONObject(cache.readText()))
        } catch (e: Exception) { emptyList() }
    }

    fun hasActiveLocks(): Boolean = getActiveLocks().isNotEmpty()

    fun isPackageLocked(packageName: String): Long? {
        val now = System.currentTimeMillis()
        return getActiveLocks()
            .firstOrNull { lock -> packageName in lock.appPackageNames && lock.endTime > now }
            ?.endTime
    }

    fun lockedAppCount(): Int = getActiveLocks().sumOf { it.appPackageNames.size }

    fun longestEndTime(): Long? = getActiveLocks().maxOfOrNull { it.endTime }

    fun getAppName(packageName: String): String = try {
        val pm = context.packageManager
        pm.getApplicationLabel(pm.getApplicationInfo(packageName, 0)).toString()
    } catch (e: Exception) { packageName }
}
`);

      /* ════════════════════════════════════════════════
         FocusLockNotificationService.kt
      ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "FocusLockNotificationService.kt"),
`package ${PACKAGE_NAME}

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.*
import android.provider.Settings
import androidx.core.app.NotificationCompat

class FocusLockNotificationService : Service() {

    companion object {
        const val CHANNEL_ACTIVE  = "focuslock_active"
        const val CHANNEL_TAMPER  = "focuslock_tamper"
        const val NOTIF_ACTIVE    = 1001
        const val NOTIF_TAMPER    = 1002

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
      ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "DeviceAdminReceiver.kt"),
`package ${PACKAGE_NAME}

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent

class DeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        FocusLockNotificationService.cancelTamperNotification(context)
    }

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
            FocusLockNotificationService.createChannels(context)
            FocusLockNotificationService.showTamperNotification(
                context,
                "Device Admin disabled! FocusLock can now be uninstalled. " +
                "Tap here to re-enable admin and restore full protection.",
                isDeviceAdmin = true,
            )
        }
    }
}
`);

      /* ════════════════════════════════════════════════
         LockOverlayActivity.kt
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
 * Full-screen overlay shown for 3 seconds when a locked app is opened.
 * Auto-dismisses to home screen. Back press also goes home.
 */
class LockOverlayActivity : Activity() {

    companion object {
        const val EXTRA_APP_NAME    = "app_name"
        const val EXTRA_PKG_NAME    = "pkg_name"
        const val EXTRA_END_TIME    = "end_time"
    }

    private var countDown: CountDownTimer? = null
    private lateinit var countdownLabel: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

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

        renderLockScreen(intent)
    }

    /**
     * Called by Android when this Activity is already on top (singleTask)
     * and a NEW locked-app trigger comes in — e.g. the user opened a
     * different locked app while this overlay was still showing.
     *
     * Without this override, the new intent's extras were silently
     * discarded and the original countdown kept running unaffected,
     * which let the accessibility service mark the new package's
     * debounce as "handled" even though no overlay was ever shown for
     * it — creating a bypass window. We now always adopt the latest
     * intent and fully refresh the screen + countdown.
     */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        renderLockScreen(intent)
    }

    private fun renderLockScreen(sourceIntent: Intent) {
        // Discard any in-flight countdown from a previous (now stale) trigger.
        countDown?.cancel()

        val appName = sourceIntent.getStringExtra(EXTRA_APP_NAME) ?: "This app"
        val endTime = sourceIntent.getLongExtra(EXTRA_END_TIME, 0L)
        val density = resources.displayMetrics.density
        fun dp(v: Int) = (v * density).toInt()

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity     = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0F172A"))
            setPadding(dp(32), dp(48), dp(32), dp(48))
        }

        root += textView("\\uD83D\\uDD12", 72f, "#FFFFFF")

        root += textView(appName, 30f, "#FFFFFF").also {
            it.typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            it.setPadding(0, dp(16), 0, dp(4))
        }

        root += textView("is locked", 16f, "#64748B").also {
            it.setPadding(0, 0, 0, dp(24))
        }

        root += textView(formatRemaining(endTime), 24f, "#60A5FA").also {
            it.typeface = Typeface.create("sans-serif", Typeface.BOLD)
            it.setPadding(0, 0, 0, dp(8))
        }

        val expiry = SimpleDateFormat("MMM d 'at' h:mm a", Locale.getDefault()).format(Date(endTime))
        root += textView("Unlocks $expiry", 14f, "#94A3B8").also {
            it.setPadding(0, 0, 0, dp(32))
        }

        root += View(this).also { v ->
            v.setBackgroundColor(Color.parseColor("#1E293B"))
            v.layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(1)
            ).apply { setMargins(0, 0, 0, dp(32)) }
        }

        root += textView("Stay strong! You chose this. \\uD83D\\uDCAA", 18f, "#A78BFA").also {
            it.typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            it.setPadding(0, 0, 0, dp(40))
        }

        countdownLabel = textView("Redirecting in 3s\\u2026", 13f, "#475569")
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
      ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "AppBlockerAccessibilityService.kt"),
`package ${PACKAGE_NAME}

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.widget.Toast

/**
 * Core enforcement service.
 * Monitors foreground app changes and launches the lock overlay when a locked
 * app is detected. Also manages the persistent notification and tamper alerts.
 */
class AppBlockerAccessibilityService : AccessibilityService() {

    private lateinit var repo: LockRepository
    // Per-package debounce state — each locked app tracks its OWN last-blocked
    // timestamp. A trigger for one package must never affect the debounce
    // state of a different package (that previously caused a bypass window).
    private val lastBlockedTimes = mutableMapOf<String, Long>()
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

        FocusLockNotificationService.cancelTamperNotification(applicationContext)
        // ⚠️ DEBUG — remove before production
        val lockFilePath = applicationContext.filesDir.absolutePath + "/focuslock_data.json"
        Log.d("DuckLock", "✅ Service connected. Lock file path: $lockFilePath")
        Toast.makeText(applicationContext, "DuckLock service started ✅", Toast.LENGTH_SHORT).show()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val pkg = event.packageName?.toString() ?: return
        if (pkg == applicationContext.packageName) return
        if (pkg in HOME_LAUNCHERS) return

        val now = System.currentTimeMillis()
        val lastTimeForPkg = lastBlockedTimes[pkg]
        if (lastTimeForPkg != null && now - lastTimeForPkg < DEBOUNCE_MS) return

        // ⚠️ DEBUG — remove before production
        Log.d("DuckLock", "📱 Foreground app detected: $pkg")

        val endTime = repo.isPackageLocked(pkg)
        // ⚠️ DEBUG — remove before production
        Log.d("DuckLock", "🔒 Is '$pkg' locked? \${endTime != null}")
        if (endTime == null) return

        // ⚠️ DEBUG — remove before production
        Log.d("DuckLock", "🚫 Blocking triggered for: $pkg")
        Toast.makeText(applicationContext, "🚫 Blocking: $pkg", Toast.LENGTH_SHORT).show()

        // Ensure foreground notification is active — prevents aggressive OEMs (MIUI, OPPO, etc.)
        // from killing this accessibility service when the React Native app is in background.
        FocusLockNotificationService.start(applicationContext)

        lastBlockedTimes[pkg] = now

        val appName = repo.getAppName(pkg)

        startActivity(Intent(applicationContext, LockOverlayActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(LockOverlayActivity.EXTRA_APP_NAME, appName)
            putExtra(LockOverlayActivity.EXTRA_PKG_NAME,  pkg)
            putExtra(LockOverlayActivity.EXTRA_END_TIME,  endTime)
        })
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        super.onDestroy()

        if (::repo.isInitialized && repo.hasActiveLocks()) {
            FocusLockNotificationService.showTamperNotification(
                applicationContext,
                "Accessibility service disabled! Locked apps can now be opened. " +
                "Tap here to re-enable and restore blocking.",
            )
        }
    }
}
`);

      /* ════════════════════════════════════════════════
         BootReceiver.kt
      ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "BootReceiver.kt"),
`package ${PACKAGE_NAME}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Triggered on device boot.
 * Restores the persistent foreground notification if locks are still active.
 * The AccessibilityService is re-bound automatically by Android.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != "android.intent.action.QUICKBOOT_POWERON") return

        val repo   = LockRepository(context)
        val active = repo.getActiveLocks()

        if (active.isEmpty()) return

        FocusLockNotificationService.createChannels(context)
        FocusLockNotificationService.start(context)
    }
}
`);

      return config;
    },
  ]);

/* ───────────────────────────────────────────────
   Plugin: Native permission checker module
   Adds a ReactNativeModule that exposes real
   OS-level permission status to JS.
─────────────────────────────────────────────── */
const withPermissionChecker = (config) =>
  withDangerousMod(config, [
    "android",
    (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const packagePath = PACKAGE_NAME.replace(/\./g, "/");
      const kotlinDir = path.join(
        projectRoot,
        `app/src/main/java/${packagePath}`
      );
      fs.mkdirSync(kotlinDir, { recursive: true });

      /* ── PermissionCheckerModule.kt ── */
      fs.writeFileSync(
        path.join(kotlinDir, "PermissionCheckerModule.kt"),
`package ${PACKAGE_NAME}

import android.app.AppOpsManager
import android.app.NotificationManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Exposes real OS-level permission checks to JavaScript.
 * Each check calls the actual Android API — no cache, no assumptions.
 *
 * JS usage:
 *   import { NativeModules } from 'react-native';
 *   const result = await NativeModules.FocusLockPermissionChecker.checkPermissions();
 *   // result: { usageAccess, overlay, deviceAdmin, accessibility, battery } — all booleans
 */
class PermissionCheckerModule(private val ctx: ReactApplicationContext)
    : ReactContextBaseJavaModule(ctx) {

    override fun getName() = "FocusLockPermissionChecker"

    // Active watchers keyed by permissionId — at most one per id at a time.
    // ContentObserver is used for Accessibility (has a real Settings.Secure key);
    // AppOpsManager.OnOpChangedListener is used for Usage Access / Overlay / Notifications
    // (all three are backed by an AppOps op we can watch for our own package).
    private val activeObservers   = mutableMapOf<String, ContentObserver>()
    private val activeOpListeners = mutableMapOf<String, AppOpsManager.OnOpChangedListener>()

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            val map = Arguments.createMap()
            map.putBoolean("usageAccess",   hasUsageStatsPermission())
            map.putBoolean("overlay",       canDrawOverlays())
            map.putBoolean("deviceAdmin",   isDeviceAdminActive())
            map.putBoolean("accessibility", isAccessibilityServiceEnabled())
            map.putBoolean("battery",       isIgnoringBatteryOptimizations())
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("PERMISSION_CHECK_ERROR", e.message ?: "Unknown error", e)
        }
    }

    /**
     * Registers a live watcher for the given permission's underlying OS state so DuckLock can
     * bring itself back to the foreground the INSTANT the user grants it in Settings — no
     * manual back-navigation needed.
     *
     * - "accessibility": ContentObserver on Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES —
     *   this is a real, documented, watchable Settings key.
     * - "notification", "usageAccess", "overlay": AppOpsManager.OnOpChangedListener on our own
     *   package's op (POST_NOTIFICATION / GET_USAGE_STATS / SYSTEM_ALERT_WINDOW respectively) —
     *   Android lets any app watch its own AppOps op changes without extra privileges.
     * - "deviceAdmin", "battery": Android exposes NO public observable Settings key or AppOps op
     *   for these two — DevicePolicyManager admin-active state and the battery-optimization
     *   allowlist are not backed by anything a ContentObserver or AppOpsManager can watch. This
     *   is an OS limitation, not a bug — these two keep relying on the existing AppState-resume /
     *   useFocusEffect re-check (manual back-navigation) instead.
     *
     * Resolves true if a watcher was successfully registered, false if this permission
     * has no watchable OS key (so the JS side knows to keep using the manual-return fallback).
     */
    @ReactMethod
    fun startWatchingPermission(permissionId: String, promise: Promise) {
        try {
            stopWatchingPermissionInternal(permissionId)
            val supported = when (permissionId) {
                "accessibility" -> {
                    val observer = object : ContentObserver(Handler(Looper.getMainLooper())) {
                        override fun onChange(selfChange: Boolean) {
                            if (isAccessibilityServiceEnabled()) {
                                stopWatchingPermissionInternal(permissionId)
                                bringAppToFront()
                            }
                        }
                    }
                    ctx.contentResolver.registerContentObserver(
                        Settings.Secure.getUriFor(Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES),
                        false,
                        observer
                    )
                    activeObservers[permissionId] = observer
                    true
                }
                "notification" -> watchAppOp(permissionId, AppOpsManager.OPSTR_POST_NOTIFICATION) { hasNotificationPermission() }
                "usageAccess"  -> watchAppOp(permissionId, AppOpsManager.OPSTR_GET_USAGE_STATS) { hasUsageStatsPermission() }
                "overlay"      -> watchAppOp(permissionId, AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW) { canDrawOverlays() }
                else -> false // deviceAdmin, battery — no observable OS key exists (Android limitation)
            }
            promise.resolve(supported)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /** Unregisters the watcher for this permissionId, if any is active. Safe to call anytime. */
    @ReactMethod
    fun stopWatchingPermission(permissionId: String, promise: Promise) {
        stopWatchingPermissionInternal(permissionId)
        promise.resolve(null)
    }

    private fun watchAppOp(permissionId: String, op: String, isGranted: () -> Boolean): Boolean {
        return try {
            val appOps = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val listener = AppOpsManager.OnOpChangedListener { _, _ ->
                if (isGranted()) {
                    stopWatchingPermissionInternal(permissionId)
                    bringAppToFront()
                }
            }
            appOps.startWatchingMode(op, ctx.packageName, listener)
            activeOpListeners[permissionId] = listener
            true
        } catch (e: Exception) { false }
    }

    private fun stopWatchingPermissionInternal(permissionId: String) {
        activeObservers.remove(permissionId)?.let {
            try { ctx.contentResolver.unregisterContentObserver(it) } catch (e: Exception) {}
        }
        activeOpListeners.remove(permissionId)?.let {
            try {
                val appOps = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
                appOps.stopWatchingMode(it)
            } catch (e: Exception) {}
        }
    }

    /** NotificationManager.areNotificationsEnabled — real OS check for the app-level toggle. */
    private fun hasNotificationPermission(): Boolean {
        return try {
            val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.areNotificationsEnabled()
        } catch (e: Exception) { false }
    }

    /**
     * Brings DuckLock back to the foreground without the user touching anything, exactly like
     * pressing the app icon again — reorders the existing task to front instead of creating a
     * new Activity instance, so all existing screen state (setup progress, animations) survives.
     */
    private fun bringAppToFront() {
        try {
            val launchIntent = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
            launchIntent?.addFlags(
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                Intent.FLAG_ACTIVITY_NEW_TASK
            )
            launchIntent?.let { ctx.startActivity(it) }
        } catch (e: Exception) {}
    }

    /**
     * Starts FocusLockNotificationService as a foreground service from the JS layer.
     * Called immediately after a lock is saved so the persistent notification keeps
     * the AccessibilityService alive on aggressive OEMs (MIUI, OPPO, OnePlus, etc.).
     * Safe to call multiple times — Android deduplicates running services.
     */
    @ReactMethod
    fun startForegroundService(promise: Promise) {
        try {
            FocusLockNotificationService.start(ctx)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("START_SERVICE_ERROR", e.message ?: "Unknown error", e)
        }
    }

    /**
     * Opens the Device Admin activation screen with the correct ComponentName.
     * expo-intent-launcher cannot pass a ComponentName Parcelable from JS, so this
     * native method creates it properly and calls startActivity directly.
     */
    @ReactMethod
    fun openDeviceAdminSettings(promise: Promise) {
        try {
            val component = ComponentName(ctx.packageName, "\${ctx.packageName}.DeviceAdminReceiver")
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, component)
                putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                    "DuckLock needs device admin to prevent uninstall while a lock is active.")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            ctx.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            // Fallback: open Security settings
            try {
                val fallback = Intent(Settings.ACTION_SECURITY_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                ctx.startActivity(fallback)
                promise.resolve(null)
            } catch (e2: Exception) {
                promise.reject("OPEN_DEVICE_ADMIN_ERROR", e.message ?: "Unknown error", e)
            }
        }
    }

    /**
     * Opens the Battery Optimization exemption screen for this app.
     * Uses startActivity (not startActivityForResult) so FLAG_ACTIVITY_NEW_TASK is required.
     * Manifest declares REQUEST_IGNORE_BATTERY_OPTIMIZATIONS permission so the primary
     * intent works without SecurityException.
     */
    @ReactMethod
    fun openBatterySettings(promise: Promise) {
        try {
            val intent = Intent(
                Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:\${ctx.packageName}")
            ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
            ctx.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            // Fallback 1: general battery optimization list
            try {
                val fallback = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                ctx.startActivity(fallback)
                promise.resolve(null)
            } catch (e2: Exception) {
                // Fallback 2: general Settings
                try {
                    val last = Intent(Settings.ACTION_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    ctx.startActivity(last)
                    promise.resolve(null)
                } catch (e3: Exception) {
                    promise.reject("OPEN_BATTERY_ERROR", e.message ?: "Unknown error", e)
                }
            }
        }
    }

    /** AppOpsManager.checkOpNoThrow for PACKAGE_USAGE_STATS */
    private fun hasUsageStatsPermission(): Boolean {
        return try {
            val appOps = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val uid    = ctx.applicationInfo.uid
            val pkg    = ctx.packageName
            val mode   = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, uid, pkg)
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, uid, pkg)
            }
            mode == AppOpsManager.MODE_ALLOWED
        } catch (e: Exception) { false }
    }

    /**
     * Checks the SYSTEM_ALERT_WINDOW ("Display Over Apps") permission.
     *
     * WHY NOT Settings.canDrawOverlays(ctx):
     *   Settings.canDrawOverlays() calls ctx.getOpPackageName() internally to
     *   resolve the package name. ReactApplicationContext can return an unexpected
     *   value from getOpPackageName() on some OEM ROMs (Samsung, MIUI), causing
     *   the check to always return false even when the permission is granted.
     *
     * FIX: Call AppOpsManager directly with ctx.packageName (explicit, reliable)
     *   instead of relying on ctx.getOpPackageName() indirectly via Settings API.
     *   This is the same underlying Android check, just with the package name forced.
     *   Falls back to Settings.canDrawOverlays() on API < 23.
     */
    private fun canDrawOverlays(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
        return try {
            val appOps = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val uid    = ctx.applicationInfo.uid
            val pkg    = ctx.packageName   // explicit — bypasses getOpPackageName() quirks
            val mode   = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW, uid, pkg)
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW, uid, pkg)
            }
            val result = mode == AppOpsManager.MODE_ALLOWED
            android.util.Log.d("DuckLock", "canDrawOverlays: AppOpsManager mode=\${mode}, granted=\${result}, pkg=\${pkg}")
            result
        } catch (e: Exception) {
            // Absolute last-resort fallback
            android.util.Log.d("DuckLock", "canDrawOverlays: AppOpsManager failed (\${e.message}), fallback to Settings API")
            Settings.canDrawOverlays(ctx)
        }
    }

    /** DevicePolicyManager.isAdminActive for our DeviceAdminReceiver */
    private fun isDeviceAdminActive(): Boolean {
        return try {
            val dpm       = ctx.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            val component = ComponentName(ctx, "\${ctx.packageName}.DeviceAdminReceiver")
            dpm.isAdminActive(component)
        } catch (e: Exception) { false }
    }

    /**
     * Checks whether AppBlockerAccessibilityService is actually turned ON by the
     * user in Settings → Accessibility. This is the single most critical permission —
     * without it the entire blocking mechanism (AppBlockerAccessibilityService) never
     * runs, even if every other permission is granted.
     *
     * There is no direct boolean API for "is my accessibility service enabled" — the
     * documented approach is to read the colon-separated list of enabled services from
     * Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES and look for our own ComponentName
     * (case-insensitive, since some OEMs normalize casing).
     */
    private fun isAccessibilityServiceEnabled(): Boolean {
        return try {
            val expectedComponentName = "\${ctx.packageName}/\${ctx.packageName}.AppBlockerAccessibilityService"
            val enabledServicesSetting = Settings.Secure.getString(
                ctx.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: return false
            enabledServicesSetting.split(':').any {
                it.equals(expectedComponentName, ignoreCase = true)
            }
        } catch (e: Exception) { false }
    }

    /** PowerManager.isIgnoringBatteryOptimizations */
    private fun isIgnoringBatteryOptimizations(): Boolean {
        return try {
            val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
            pm.isIgnoringBatteryOptimizations(ctx.packageName)
        } catch (e: Exception) { true }
    }
}
`
      );

      /* ── PermissionCheckerPackage.kt ── */
      fs.writeFileSync(
        path.join(kotlinDir, "PermissionCheckerPackage.kt"),
`package ${PACKAGE_NAME}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class PermissionCheckerPackage : ReactPackage {
    override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> =
        listOf(PermissionCheckerModule(ctx))

    override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`
      );

      /* ── Patch MainApplication.kt to register the package ── */
      const mainAppPath = path.join(kotlinDir, "MainApplication.kt");
      if (fs.existsSync(mainAppPath)) {
        let content = fs.readFileSync(mainAppPath, "utf8");
        if (!content.includes("PermissionCheckerPackage")) {
          //
          // Try multiple patterns — Expo/RN template changes across SDK versions.
          //
          // Pattern A (confirmed Expo 54 / RN 0.81):
          //   override fun getPackages(): List<ReactPackage> =
          //       PackageList(this).packages.apply {
          //         // add(MyPackage())
          //       }
          //
          // Pattern B (some RN 0.73+ variants using .also instead of .apply):
          //   PackageList(this).packages.also { ... }
          //
          // Pattern C (explicit val style, some future templates):
          //   val packages = PackageList(this).packages
          //   return packages
          //
          const PATTERNS = [
            {
              // A — primary: confirmed working for Expo 54 / RN 0.81
              regex: /(PackageList\(this\)\.packages\.apply\s*\{)/,
              replacement: "$1\n              add(PermissionCheckerPackage())",
            },
            {
              // B — .also block variant
              regex: /(PackageList\(this\)\.packages\.also\s*\{)/,
              replacement: "$1\n              add(PermissionCheckerPackage())",
            },
            {
              // C — explicit val style: insert add() after the val declaration
              regex: /(val packages = PackageList\(this\)\.packages)/,
              replacement: "$1\n          packages.add(PermissionCheckerPackage())",
            },
          ];

          let patched = content;
          let matchedPattern = null;
          for (const { regex, replacement } of PATTERNS) {
            const result = content.replace(regex, replacement);
            if (result !== content) {
              patched = result;
              matchedPattern = regex.toString();
              break;
            }
          }

          if (!matchedPattern) {
            // None of the known patterns matched — fail loudly so the developer
            // knows the registration was skipped instead of silently passing.
            throw new Error(
              "[withFocusLockAndroid] PermissionCheckerPackage was NOT registered in MainApplication.kt.\n" +
              "None of the known PackageList patterns matched the generated file.\n" +
              "Open android/app/src/main/java/com/focuslock/app/MainApplication.kt,\n" +
              "find the getPackages() method, and add: add(PermissionCheckerPackage())\n" +
              "Then add the new pattern to withFocusLockAndroid.js PATTERNS array."
            );
          }

          fs.writeFileSync(mainAppPath, patched, "utf8");
          console.log(`[withFocusLockAndroid] PermissionCheckerPackage registered via pattern: ${matchedPattern}`);
        } else {
          console.log("[withFocusLockAndroid] PermissionCheckerPackage already present in MainApplication.kt — skipping patch.");
        }
      } else {
        throw new Error(
          "[withFocusLockAndroid] MainApplication.kt not found at: " + mainAppPath + "\n" +
          "Make sure expo prebuild generates the Android project first."
        );
      }

      return config;
    },
  ]);

/* ───────────────────────────────────────────────
   Compose and export
─────────────────────────────────────────────── */
const withFocusLockAndroid = (config) => {
  config = withFocusLockManifest(config);
  config = withFocusLockNativeFiles(config);
  config = withPermissionChecker(config);
  return config;
};

module.exports = withFocusLockAndroid;
