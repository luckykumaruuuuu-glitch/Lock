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


function addReelsLockActivity(application) {
  const activities = ensureArray(application, "activity");
  if (hasAttr(activities, "android:name", ".ReelsLockActivity")) return;
  activities.push({
    $: {
      "android:name": ".ReelsLockActivity",
      "android:exported": "false",
      "android:excludeFromRecents": "true",
      "android:taskAffinity": "",
      "android:launchMode": "singleTask",
      "android:windowSoftInputMode": "adjustNothing",
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
      addReelsLockActivity(app);
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


      const animDir = path.join(projectRoot, "app/src/main/res/anim");
      fs.mkdirSync(animDir, { recursive: true });

      /* ── res/anim/reels_lock_slide_up.xml — enter animation ── */
      fs.writeFileSync(path.join(animDir, "reels_lock_slide_up.xml"),
`<?xml version="1.0" encoding="utf-8"?>
<set xmlns:android="http://schemas.android.com/apk/res/android">
    <translate
        android:fromYDelta="100%p"
        android:toYDelta="0%p"
        android:duration="340"
        android:interpolator="@android:interpolator/decelerate_cubic"/>
</set>
`);

      /* ── res/anim/reels_lock_slide_down.xml — exit animation ── */
      fs.writeFileSync(path.join(animDir, "reels_lock_slide_down.xml"),
`<?xml version="1.0" encoding="utf-8"?>
<set xmlns:android="http://schemas.android.com/apk/res/android">
    <translate
        android:fromYDelta="0%p"
        android:toYDelta="100%p"
        android:duration="280"
        android:interpolator="@android:interpolator/accelerate_cubic"/>
</set>
`);
      /* ── res/drawable — character images for lock overlay ── */
      const drawableDir = path.join(projectRoot, "app/src/main/res/drawable");
      fs.mkdirSync(drawableDir, { recursive: true });
      const expoRoot = config.modRequest.projectRoot;
      const charImages = ["lock_char_instagram", "lock_char_tiktok", "lock_char_twitter", "lock_char_facebook", "lock_char_youtube", "lock_char_snapchat", "lock_char_reddit", "lock_char_pinterest", "lock_char_whatsapp", "lock_char_telegram", "lock_char_discord", "lock_char_linkedin"];
      for (const name of charImages) {
        const src = path.join(expoRoot, "assets", `${name}.png`);
        const dst = path.join(drawableDir, `${name}.png`);
        if (fs.existsSync(src)) fs.copyFileSync(src, dst);
      }

      const reelsLockCharImages = ["reels_lock_char_instagram", "reels_lock_char_youtube"];
      for (const name of reelsLockCharImages) {
        const src = path.join(expoRoot, "assets", `${name}.png`);
        const dst = path.join(drawableDir, `${name}.png`);
        if (fs.existsSync(src)) fs.copyFileSync(src, dst);
      }
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
    android:accessibilityEventTypes="typeWindowStateChanged|typeViewScrolled|typeWindowContentChanged"
    android:accessibilityFeedbackType="feedbackAllMask"
    android:accessibilityFlags="flagReportViewIds|flagRetrieveInteractiveWindows"
    android:canRetrieveWindowContent="true"
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
import android.graphics.*
import android.os.*
import android.view.*
import android.widget.*

/**
 * Full-screen overlay shown for 3 seconds when a locked app is opened.
 * Auto-dismisses to home screen. Back press also goes home.
 *
 * Design: dark brown-black background with a soft golden centre glow,
 * per-app character image in the middle, and a single live-updating
 * "Unlocks in Xh Ym" label above the character.
 */
class LockOverlayActivity : Activity() {

    companion object {
        const val EXTRA_APP_NAME = "app_name"
        const val EXTRA_PKG_NAME = "pkg_name"
        const val EXTRA_END_TIME = "end_time"

        /** Add new platforms here: package-name → drawable resource name (no extension). */
        private val CHAR_MAP = mapOf(
            "com.instagram.android" to "lock_char_instagram",
            "com.zhiliaoapp.musically" to "lock_char_tiktok",
            "com.twitter.android" to "lock_char_twitter",
            "com.facebook.katana" to "lock_char_facebook",
            "com.google.android.youtube" to "lock_char_youtube",
            "com.snapchat.android" to "lock_char_snapchat",
            "com.reddit.frontpage" to "lock_char_reddit",
            "com.pinterest" to "lock_char_pinterest",
            "com.whatsapp" to "lock_char_whatsapp",
            "org.telegram.messenger" to "lock_char_telegram",
            "com.discord" to "lock_char_discord",
            "com.linkedin.android" to "lock_char_linkedin"
        )
        /** Fallback image used for any unmapped package (currently same as Instagram). */
        private const val DEFAULT_CHAR = "lock_char_instagram"
    }

    private var countDown: CountDownTimer? = null
    private var updateHandler: Handler? = null
    private var updateRunnable: Runnable? = null
    private lateinit var unlockLabel: TextView

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
        // Cancel any in-flight timers from a previous (stale) trigger.
        countDown?.cancel()
        updateRunnable?.let { updateHandler?.removeCallbacks(it) }

        val pkgName = sourceIntent.getStringExtra(EXTRA_PKG_NAME) ?: ""
        val endTime = sourceIntent.getLongExtra(EXTRA_END_TIME, 0L)
        val density = resources.displayMetrics.density
        fun dp(v: Int) = (v * density).toInt()

        /* ── Root: FrameLayout so bg view + content can layer ── */
        val frame = FrameLayout(this)

        /* ── Background: dark brown-black + soft golden centre glow ── */
        val bgView = object : View(this) {
            override fun onDraw(canvas: Canvas) {
                val w = width.toFloat(); val h = height.toFloat()
                val cx = w / 2f; val cy = h * 0.48f
                // Solid dark base
                canvas.drawColor(Color.parseColor("#120A06"))
                // Radial golden glow
                val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
                glowPaint.shader = RadialGradient(
                    cx, cy, minOf(w, h) * 0.62f,
                    intArrayOf(
                        Color.parseColor("#6B4510"),
                        Color.parseColor("#3A1E07"),
                        Color.parseColor("#120A06")
                    ),
                    floatArrayOf(0f, 0.46f, 1f),
                    Shader.TileMode.CLAMP
                )
                canvas.drawRect(0f, 0f, w, h, glowPaint)
            }
        }
        frame.addView(bgView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        /* ── Content: vertically centred column ── */
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(32), 0, dp(32), 0)
        }

        // Single-line "Unlocks in Xh Ym" label above character
        unlockLabel = TextView(this).apply {
            text = formatRemaining(endTime)
            textSize = 20f
            setTextColor(Color.WHITE)
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(24))
        }
        content.addView(unlockLabel)

        // Character image (per-app mapping, fallback to default)
        val charResName = CHAR_MAP[pkgName] ?: DEFAULT_CHAR
        val charResId = resources.getIdentifier(charResName, "drawable", packageName)
        val imageView = ImageView(this).apply {
            if (charResId != 0) setImageResource(charResId)
            scaleType = ImageView.ScaleType.FIT_CENTER
        }
        val imgSize = dp(270)
        content.addView(imageView, LinearLayout.LayoutParams(imgSize, imgSize))

        frame.addView(content, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        setContentView(frame)

        /* ── Live-update the "Unlocks in" text every second ── */
        val handler = Handler(Looper.getMainLooper())
        updateHandler = handler
        val runnable = object : Runnable {
            override fun run() {
                if (!isFinishing) {
                    unlockLabel.text = formatRemaining(endTime)
                    handler.postDelayed(this, 1000)
                }
            }
        }
        updateRunnable = runnable
        handler.post(runnable)

        /* ── 3-second auto-dismiss (unchanged behaviour) ── */
        countDown = object : CountDownTimer(3200, 3200) {
            override fun onTick(ms: Long) {}
            override fun onFinish() = goHome()
        }.start()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() = goHome()

    override fun onDestroy() {
        super.onDestroy()
        countDown?.cancel()
        updateRunnable?.let { updateHandler?.removeCallbacks(it) }
    }

    private fun goHome() {
        countDown?.cancel()
        updateRunnable?.let { updateHandler?.removeCallbacks(it) }
        startActivity(Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        })
        finish()
    }

    private fun formatRemaining(endTime: Long): String {
        val ms = endTime - System.currentTimeMillis()
        if (ms <= 0) return "Unlocks in 0m"
        val s = ms / 1000
        val d = s / 86400; val h = (s % 86400) / 3600; val m = (s % 3600) / 60
        val parts = mutableListOf<String>()
        if (d > 0) parts += "\${d}d"
        if (h > 0) parts += "\${h}h"
        if (d == 0L && m > 0) parts += "\${m}m"
        if (parts.isEmpty()) parts += "<1m"
        return "Unlocks in \${parts.joinToString(" ")}"
    }
}
`);

      /* ════════════════════════════════════════════════
         ReelsLockActivity.kt
       ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "ReelsLockActivity.kt"),
`package ${PACKAGE_NAME}

import android.app.Activity
import android.content.Intent
import android.graphics.*
import android.os.*
import android.view.*
import android.widget.*

/**
 * Full-screen overlay shown when Reels Lock is active and the user
 * opens a Reels/Shorts section on a tracked platform.
 *
 * Design:  Same dark-brown/black + golden radial-glow background as
 *          LockOverlayActivity — completely distinct from it at runtime.
 *
 * Buttons:
 *   Unlock — placeholder (Toast); real task-flow comes later.
 *   Skip   — launches the platform's main/home screen so the user
 *            lands on the regular feed, away from Reels.
 *
 * Animation: slide-up from bottom (overridePendingTransition).
 * Back press: same as Skip (platform home, NOT DuckLock home).
 */
class ReelsLockActivity : Activity() {

    companion object {
        const val EXTRA_PKG_NAME = "reels_lock_pkg"

        /**
         * Separate character-image map for the Reels Lock screen.
         * Completely independent from LockOverlayActivity's CHAR_MAP.
         * Add per-platform images here when new platforms are enabled.
         */
        private val REELS_LOCK_CHAR_MAP = mapOf(
            "com.instagram.android"      to "reels_lock_char_instagram",
            "com.google.android.youtube" to "reels_lock_char_youtube",
        )
        /** Per-platform header text shown above the character image. */
        private val LOCK_TITLE_MAP = mapOf(
            "com.instagram.android"      to "Reels are locked",
            "com.google.android.youtube" to "Shorts are locked",
        )
        private const val DEFAULT_CHAR  = "reels_lock_char_instagram"
        private const val DEFAULT_TITLE = "Reels are locked"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )
        // Slide-up enter animation; slide-down exit
        @Suppress("DEPRECATION")
        overridePendingTransition(R.anim.reels_lock_slide_up, 0)

        buildUi()
    }

    private fun buildUi() {
        val density = resources.displayMetrics.density
        fun dp(v: Int) = (v * density).toInt()

        val pkgName = intent.getStringExtra(EXTRA_PKG_NAME) ?: ""

        /* ── Root: FrameLayout so bg + content can layer ── */
        val frame = FrameLayout(this)

        /* ── Background: dark brown-black + soft golden centre glow (same as LockOverlayActivity) ── */
        val bgView = object : View(this) {
            override fun onDraw(canvas: Canvas) {
                val w = width.toFloat(); val h = height.toFloat()
                val cx = w / 2f;         val cy = h * 0.45f
                canvas.drawColor(Color.parseColor("#120A06"))
                val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
                glowPaint.shader = RadialGradient(
                    cx, cy, minOf(w, h) * 0.65f,
                    intArrayOf(
                        Color.parseColor("#6B4510"),
                        Color.parseColor("#3A1E07"),
                        Color.parseColor("#120A06"),
                    ),
                    floatArrayOf(0f, 0.46f, 1f),
                    Shader.TileMode.CLAMP
                )
                canvas.drawRect(0f, 0f, w, h, glowPaint)
            }
        }
        frame.addView(bgView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        /* ── Content column ── */
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity     = Gravity.CENTER
            setPadding(dp(28), 0, dp(28), dp(40))
        }

        // Per-platform header text ("Reels are locked" / "Shorts are locked" / …)
        val titleLabel = TextView(this).apply {
            text      = LOCK_TITLE_MAP[pkgName] ?: DEFAULT_TITLE
            textSize  = 22f
            setTextColor(Color.WHITE)
            typeface  = Typeface.create("sans-serif", Typeface.BOLD)
            gravity   = Gravity.CENTER
            setPadding(0, 0, 0, dp(20))
        }
        content.addView(titleLabel)

        // Character image (from REELS_LOCK_CHAR_MAP — independent from LockOverlayActivity)
        val charResName = REELS_LOCK_CHAR_MAP[pkgName] ?: DEFAULT_CHAR
        val charResId   = resources.getIdentifier(charResName, "drawable", packageName)
        val imageView = ImageView(this).apply {
            if (charResId != 0) setImageResource(charResId)
            scaleType = ImageView.ScaleType.FIT_CENTER
        }
        val imgSize = dp(260)
        content.addView(imageView, LinearLayout.LayoutParams(imgSize, imgSize))

        // Spacer
        val spacer = View(this)
        content.addView(spacer, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(28)
        ))

        // ── Button row ──────────────────────────────────────────────────────

        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity     = Gravity.CENTER
        }

        // "Unlock" button — golden gradient style (matches app CTA)
        val unlockBtn = TextView(this).apply {
            text      = "Unlock"
            textSize  = 17f
            setTextColor(Color.WHITE)
            typeface  = Typeface.create("sans-serif", Typeface.BOLD)
            gravity   = Gravity.CENTER
            setPadding(dp(28), dp(14), dp(28), dp(14))
            background = android.graphics.drawable.GradientDrawable(
                android.graphics.drawable.GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(Color.parseColor("#FFBF80"), Color.parseColor("#FFA660"))
            ).apply {
                cornerRadius = dp(14).toFloat()
            }
            setOnClickListener {
                // Placeholder — task-based unlock system coming later
                Toast.makeText(this@ReelsLockActivity, "Task flow coming soon", Toast.LENGTH_SHORT).show()
            }
        }

        // "Skip" button — plain outline style
        val skipBtn = TextView(this).apply {
            text      = "Skip"
            textSize  = 17f
            setTextColor(Color.WHITE)
            gravity   = Gravity.CENTER
            setPadding(dp(28), dp(14), dp(28), dp(14))
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(Color.TRANSPARENT)
                cornerRadius = dp(14).toFloat()
                setStroke(dp(1), Color.parseColor("#80FFFFFF"))
            }
            setOnClickListener { goToPlatformHome() }
        }

        val btnParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { weight = 0f }

        val spaceBetween = LinearLayout.LayoutParams(dp(14), 1)

        btnRow.addView(unlockBtn, btnParams)
        btnRow.addView(View(this), spaceBetween)
        btnRow.addView(skipBtn,   btnParams)

        content.addView(btnRow, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { gravity = Gravity.CENTER_HORIZONTAL })

        frame.addView(content, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        setContentView(frame)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() = goToPlatformHome()

    /** Navigate to the platform's home/main feed (away from Reels), then finish. */
    private fun goToPlatformHome() {
        val pkg = intent.getStringExtra(EXTRA_PKG_NAME) ?: ""
        try {
            val launchIntent = packageManager.getLaunchIntentForPackage(pkg)
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                startActivity(launchIntent)
            }
        } catch (e: Exception) {
            // If the platform app is not installed, just finish
        }
        @Suppress("DEPRECATION")
        overridePendingTransition(0, R.anim.reels_lock_slide_down)
        finish()
    }
}
`);

      /* ════════════════════════════════════════════════
         ReelsLockHandler.kt
       ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "ReelsLockHandler.kt"),
`package ${PACKAGE_NAME}

import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * ReelsLockHandler — implements ReelsSignalListener for the "Reels Lock" feature.
 *
 * When the Reels Lock toggle is ON (SharedPreferences) and the user enters a
 * Reels/short-video context on a supported platform, this handler launches
 * ReelsLockActivity to block access.
 *
 * Currently only Instagram is supported.  YouTube / Facebook can be enabled by
 * adding their package names to SUPPORTED_PACKAGES below.
 *
 * Mutually exclusive with DuckPalReelsHandler — only one will react at a time,
 * controlled by the ReelsSignalRouter based on isEnabled().
 */
class ReelsLockHandler(private val context: Context) : ReelsSignalListener {

    companion object {
        private const val TAG             = "DuckLock:ReelsLockHandler"
        const  val PREFS_NAME             = "focuslock_prefs"
        const  val KEY_REELS_LOCK_ENABLED = "reels_lock_enabled"

        /** Platforms where Reels Lock is active. Expand later for YouTube/Facebook. */
        private val SUPPORTED_PACKAGES = setOf(
            "com.instagram.android",
            "com.google.android.youtube",
        )
    }

    fun isEnabled(): Boolean =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
               .getBoolean(KEY_REELS_LOCK_ENABLED, false)

    // ── ReelsSignalListener ───────────────────────────────────────────────────

    override fun onReelsContextChanged(pkg: String, active: Boolean) {
        if (!active) return                    // leaving Reels — nothing to do
        if (pkg !in SUPPORTED_PACKAGES) return // platform not yet supported
        if (!isEnabled()) return               // toggle is OFF — router ensures we're not called, but guard anyway

        Log.d(TAG, "Reels Lock triggered for \${pkg} — launching ReelsLockActivity")

        val intent = Intent(context, ReelsLockActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(ReelsLockActivity.EXTRA_PKG_NAME, pkg)
        }
        context.startActivity(intent)
    }

    override fun onNewReelAdvanced(pkg: String, isSponsored: Boolean) {
        // Reels Lock does not count reels — that is DuckPal's concern.
    }
}
`);

      /* ════════════════════════════════════════════════
         ReelsSignalRouter.kt
       ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "ReelsSignalRouter.kt"),
`package ${PACKAGE_NAME}

/**
 * Routes ReelDetector signals to either DuckPalReelsHandler or ReelsLockHandler
 * depending on the current Reels Lock toggle state.
 *
 * At any moment exactly ONE handler is active:
 *   • toggle OFF → DuckPalReelsHandler (counting + floating overlay)
 *   • toggle ON  → ReelsLockHandler   (blocks access with ReelsLockActivity)
 *
 * The router is read live on every signal so the user can toggle mid-session
 * without restarting the accessibility service.
 */
class ReelsSignalRouter(
    private val duckPalHandler:   DuckPalReelsHandler,
    private val reelsLockHandler: ReelsLockHandler,
) : ReelsSignalListener {

    override fun onReelsContextChanged(pkg: String, active: Boolean) {
        if (reelsLockHandler.isEnabled()) {
            reelsLockHandler.onReelsContextChanged(pkg, active)
        } else {
            duckPalHandler.onReelsContextChanged(pkg, active)
        }
    }

    override fun onNewReelAdvanced(pkg: String, isSponsored: Boolean) {
        if (reelsLockHandler.isEnabled()) {
            reelsLockHandler.onNewReelAdvanced(pkg, isSponsored)
        } else {
            duckPalHandler.onNewReelAdvanced(pkg, isSponsored)
        }
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
 *
 * Reel detection: ReelDetector is instantiated here and receives every event via
 * reelDetector.onEvent() — called AFTER all locking logic so it never interferes.
 */
class AppBlockerAccessibilityService : AccessibilityService() {

    private lateinit var repo: LockRepository
    // Per-package debounce state — each locked app tracks its OWN last-blocked
    // timestamp. A trigger for one package must never affect the debounce
    // state of a different package (that previously caused a bypass window).
    private val lastBlockedTimes = mutableMapOf<String, Long>()
    private val DEBOUNCE_MS     = 2_000L

    // ── Reel detection — independent from locking ─────────────────────────────
    private var reelDetector: ReelDetector? = null
    private var duckPalHandler: DuckPalReelsHandler? = null
    private var reelsLockHandler: ReelsLockHandler? = null

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

    companion object {
        /**
         * Platform registry for reel/short-video detection.
         * Add new PlatformReelConfig entries here to enable detection on additional
         * platforms — no changes to ReelDetector logic required.
         */
        private val PLATFORM_CONFIGS: Map<String, PlatformReelConfig> = listOf(
            PlatformReelConfig(
                packageName         = "com.instagram.android",
                pagerIdKeywords     = listOf(
                    "clips_viewer_view_pager",
                    "reel_viewer_pager",
                    "clips_tab_fragment",
                    "video_feed_view_pager",
                    "reels_tray_container",
                ),
                classKeywords       = listOf(
                    "ReelViewer",
                    "ClipsViewer",
                    "ClipsVideo",
                    "VideoWatch",
                    "ReelsTab",
                    "ClipsTab",
                    "IgReels",
                ),
                hasSponsoredContent = true,
            ),
            // ── YouTube Shorts (best-guess keywords — verify on real device) ──
            PlatformReelConfig(
                packageName         = "com.google.android.youtube",
                pagerIdKeywords     = listOf(
                    "reel_recycler",
                    "reel_player_page",
                    "shorts_player",
                    "shorts_video_container",
                    "reel_watch_player",
                ),
                classKeywords       = listOf(
                    "ReelWatchFragment",
                    "ShortsPlayerFragment",
                    "ReelWatchPage",
                    "ShortsLockup",
                    "ReelRecyclerView",
                ),
                hasSponsoredContent = true,
            ),
            // ── Facebook Reels (best-guess keywords — verify on real device) ──
            PlatformReelConfig(
                packageName         = "com.facebook.katana",
                pagerIdKeywords     = listOf(
                    "reels_viewer_pager",
                    "video_reels_container",
                    "reel_view_pager",
                    "story_viewer_view_pager",
                    "video_home_reels_tab",
                ),
                classKeywords       = listOf(
                    "ReelsFragment",
                    "VideoHomeFragment",
                    "ReelViewerFragment",
                    "ShortFormVideoPlayerFragment",
                    "FBReelsTab",
                ),
                hasSponsoredContent = true,
            ),
        ).associateBy { it.packageName }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        repo = LockRepository(applicationContext)

        serviceInfo = AccessibilityServiceInfo().apply {
            eventTypes     = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                             AccessibilityEvent.TYPE_VIEW_SCROLLED or
                             AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
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

        // Initialise reel detector + DuckPal handler (independent — no locking side-effects)
        val duckPal  = DuckPalReelsHandler(applicationContext).also { duckPalHandler = it }
        val reelsLock = ReelsLockHandler(applicationContext).also { reelsLockHandler = it }
        val router   = ReelsSignalRouter(duckPal, reelsLock)
        reelDetector = ReelDetector(applicationContext, PLATFORM_CONFIGS, router)

        // ⚠️ DEBUG — remove before production
        val lockFilePath = applicationContext.filesDir.absolutePath + "/focuslock_data.json"
        Log.d("DuckLock", "✅ Service connected. Lock file path: $lockFilePath")
        Toast.makeText(applicationContext, "DuckLock service started ✅", Toast.LENGTH_SHORT).show()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event ?: return

        // ════════════════════════════════════════════════════════════════════════
        // LOCKING LOGIC — not modified (Phase 1/2). Only TYPE_WINDOW_STATE_CHANGED
        // events reach the blocking code paths below.
        // ════════════════════════════════════════════════════════════════════════
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val pkg = event.packageName?.toString() ?: return
            if (pkg == applicationContext.packageName) {
                // Still pass to reel detector even for our own package (harmless, returns early inside)
                reelDetector?.onEvent(event, this)
                return
            }
            if (pkg in HOME_LAUNCHERS) {
                reelDetector?.onEvent(event, this)
                return
            }

            val now = System.currentTimeMillis()
            val lastTimeForPkg = lastBlockedTimes[pkg]
            if (lastTimeForPkg != null && now - lastTimeForPkg < DEBOUNCE_MS) {
                reelDetector?.onEvent(event, this)
                return
            }

            // ⚠️ DEBUG — remove before production
            Log.d("DuckLock", "📱 Foreground app detected: $pkg")

            val endTime = repo.isPackageLocked(pkg)
            // ⚠️ DEBUG — remove before production
            Log.d("DuckLock", "🔒 Is '$pkg' locked? \${endTime != null}")
            if (endTime == null) {
                reelDetector?.onEvent(event, this)
                return
            }

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

        // ════════════════════════════════════════════════════════════════════════
        // REEL DETECTION (Phase 3A) — runs for ALL event types, fully independent.
        // Locking logic above is completely unaffected by this call.
        // ════════════════════════════════════════════════════════════════════════
        reelDetector?.onEvent(event, this)
    }

    override fun onInterrupt() {
        // Safety-net: hide overlay immediately if service is interrupted
        duckPalHandler?.hideOverlay()
    }

    override fun onDestroy() {
        super.onDestroy()
        // Safety-net: hide overlay so it never gets stuck on screen if service is killed
        duckPalHandler?.hideOverlay()

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

      /* ════════════════════════════════════════════════
         PlatformReelConfig.kt  (shared platform registry)
       ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "PlatformReelConfig.kt"),
`package ${PACKAGE_NAME}

/**
 * Configuration for a single platform's reel/short-video detection.
 *
 * @param packageName          Android package name (e.g. "com.instagram.android").
 * @param pagerIdKeywords      Partial resource-ID strings that identify the short-video ViewPager.
 * @param classKeywords        Fragments of fragment/activity class names that indicate the user
 *                             is inside the short-video section of this platform.
 * @param hasSponsoredContent  Whether this platform shows sponsored/ad content that should
 *                             be detected and excluded from the reel count.
 */
data class PlatformReelConfig(
    val packageName: String,
    val pagerIdKeywords: List<String>,
    val classKeywords: List<String>,
    val hasSponsoredContent: Boolean,
)
`);

      /* ════════════════════════════════════════════════
         ReelsSignalListener.kt  (detection → consumer interface)
       ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "ReelsSignalListener.kt"),
`package ${PACKAGE_NAME}

/**
 * Decouples pure reel-detection (ReelDetector) from consumer-specific behaviour
 * (DuckPal counting+overlay, future Reels Lock enforcement, etc.).
 *
 * Implement this interface and register it with ReelDetector to receive detection
 * signals without depending on any platform-specific internals.
 */
interface ReelsSignalListener {

    /**
     * Called when the user enters or leaves a Reels/short-video context.
     *
     * @param pkg    The platform's Android package name.
     * @param active true  → user just entered Reels (first reel on screen).
     *               false → user left Reels or switched away from the platform.
     */
    fun onReelsContextChanged(pkg: String, active: Boolean)

    /**
     * Called when a brand-new reel has been watched long enough to count
     * (dwell ≥ THRESHOLD_MS) and has been classified for sponsored content.
     *
     * @param pkg         The platform's Android package name.
     * @param isSponsored true if the reel is a sponsored/ad post (skip counting).
     */
    fun onNewReelAdvanced(pkg: String, isSponsored: Boolean)
}
`);

      /* ════════════════════════════════════════════════
         ReelDetector.kt  (generic multi-platform)
       ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "ReelDetector.kt"),
`package ${PACKAGE_NAME}

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.lang.ref.WeakReference

/**
 * ReelDetector — Generic multi-platform reel/short-video detection.
 *
 * Driven by a Map<String, PlatformReelConfig> rather than hardcoded per-platform
 * constants. Each tracked platform gets its own independent ReelSessionTracker so
 * scroll-session state never bleeds across platforms.
 *
 * Detection results are emitted via ReelsSignalListener — this class never touches
 * the overlay, counting storage, or any locking logic directly.
 *
 * ── Detection strategy ─────────────────────────────────────────────────────────
 * (unchanged from Phase 3A — only the platform abstraction is new)
 *
 * 1. TYPE_WINDOW_STATE_CHANGED — tracks foreground package + Reels context entry/exit.
 * 2. TYPE_VIEW_SCROLLED        — detects reel-to-reel transitions via ViewPager scrolls.
 * 3. Sponsored detection       — 300 ms delayed rootInActiveWindow traversal (depth ≤ 8).
 *    Only runs for platforms where hasSponsoredContent == true.
 *
 * ── Adding a new platform ──────────────────────────────────────────────────────
 * Add a PlatformReelConfig entry to the PLATFORM_CONFIGS map in
 * AppBlockerAccessibilityService. No changes to this class are required.
 */
class ReelDetector(
    private val context: Context,
    private val platformConfigs: Map<String, PlatformReelConfig>,
    var listener: ReelsSignalListener? = null,
) {

    companion object {
        private const val TAG                      = "DuckLock:ReelDetector"
        const  val THRESHOLD_MS                    = 2_500L
        private const val SPONSORED_CHECK_DELAY_MS = 300L
    }

    // ── Per-platform runtime state ─────────────────────────────────────────────
    // Each map is keyed by platform packageName.
    private val sessionTrackers      = platformConfigs.mapValues { ReelSessionTracker() }
    private val isInReelsContext     = mutableMapOf<String, Boolean>()
    private val reelEnteredAt        = mutableMapOf<String, Long>()
    private val currentReelSponsored = mutableMapOf<String, Boolean>()
    private val sponsoredRunnables   = mutableMapOf<String, Runnable?>()

    private var currentFgPkg = ""
    private val handler      = Handler(Looper.getMainLooper())

    // ── Entry point (called from AppBlockerAccessibilityService) ───────────────
    fun onEvent(event: AccessibilityEvent, service: AccessibilityService) {
        val pkg = event.packageName?.toString() ?: return

        when (event.eventType) {
            // Window events must reach us for ALL packages so we can detect
            // when the user leaves a tracked platform.
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ->
                handleWindowState(pkg, event, service)
            // Scroll events are only relevant for tracked platforms.
            AccessibilityEvent.TYPE_VIEW_SCROLLED ->
                if (platformConfigs.containsKey(pkg)) handleScroll(pkg, event, service)
            else -> Unit
        }
    }

    // ── Window state: track fg package + Reels context entry / exit ───────────
    private fun handleWindowState(pkg: String, event: AccessibilityEvent, service: AccessibilityService) {
        val prevPkg = currentFgPkg
        currentFgPkg = pkg

        val config = platformConfigs[pkg]

        if (config == null) {
            // New fg package is not a tracked platform.
            // If the previous fg was a tracked platform mid-session, end that session.
            if (platformConfigs.containsKey(prevPkg) && isInReelsContext[prevPkg] == true) {
                Log.d(TAG, "Left \${prevPkg} (switched to \${pkg}) — ending Reels session")
                endReelsSession(prevPkg)
            }
            return
        }

        // pkg IS a tracked platform — check className for Reels context
        val className     = event.className?.toString() ?: ""
        val isReelsWindow = config.classKeywords.any { className.contains(it, ignoreCase = true) }

        if (isReelsWindow && isInReelsContext[pkg] != true) {
            Log.d(TAG, "Entered Reels context via window: pkg=\${pkg} className=\${className}")
            isInReelsContext[pkg] = true
            sessionTrackers[pkg]?.onSessionEntered()
            startReelTimer(pkg, service, config)
            listener?.onReelsContextChanged(pkg, true)
        } else if (!isReelsWindow && className.isNotEmpty() && isInReelsContext[pkg] == true) {
            Log.d(TAG, "Left Reels context: pkg=\${pkg} className=\${className}")
            endReelsSession(pkg)
        }
    }

    // ── Scroll: detect reel-to-reel transition ─────────────────────────────────
    private fun handleScroll(pkg: String, event: AccessibilityEvent, service: AccessibilityService) {
        val config = platformConfigs[pkg] ?: return

        val srcNode   = event.source
        val viewId    = srcNode?.viewIdResourceName ?: ""
        val className = event.className?.toString() ?: ""

        // Is this scroll from a Reels ViewPager?
        val isReelsPagerById    = config.pagerIdKeywords.any { viewId.contains(it, ignoreCase = true) }
        val isReelsPagerByClass = isInReelsContext[pkg] == true && (
            className.contains("ViewPager",    ignoreCase = true) ||
            className.contains("RecyclerView", ignoreCase = true)
        )
        if (!isReelsPagerById && !isReelsPagerByClass) {
            srcNode?.recycle()
            return
        }

        // First qualifying scroll: promote to Reels context if not already set
        if (isInReelsContext[pkg] != true) {
            Log.d(TAG, "Reels context set via first ViewPager scroll: pkg=\${pkg} viewId=\${viewId}")
            isInReelsContext[pkg] = true
            sessionTrackers[pkg]?.onSessionEntered()
            startReelTimer(pkg, service, config)
            listener?.onReelsContextChanged(pkg, true)
            srcNode?.recycle()
            return  // nothing to count yet — no previous reel to evaluate
        }

        // ── Direction detection + duplicate-prevention (Phase 3B) ─────────────
        val tracker   = sessionTrackers[pkg] ?: run { srcNode?.recycle(); return }
        val direction = tracker.detectScrollDirection(event)

        if (direction == ReelSessionTracker.ScrollDirection.UNKNOWN) {
            // Cannot determine direction — hold state intact, wait for next scroll
            srcNode?.recycle()
            return
        }

        val isNewReel = tracker.advance(direction)
        if (!isNewReel) {
            // Revisit reel (backward, or forward into already-seen) — cancel dwell
            cancelSponsoredCheck(pkg)
            reelEnteredAt[pkg]        = 0L
            currentReelSponsored[pkg] = false
            srcNode?.recycle()
            return
        }

        // ── Evaluate the reel that just scrolled away ──────────────────────────
        val now       = System.currentTimeMillis()
        val entered   = reelEnteredAt[pkg] ?: 0L
        val dwellMs   = if (entered > 0) now - entered else 0L
        val sponsored = currentReelSponsored[pkg] ?: false

        Log.d(TAG, "Reel scroll — pkg=\${pkg} dwell=\${dwellMs}ms (need \${THRESHOLD_MS}ms) sponsored=\${sponsored} [NEW]")

        if (dwellMs >= THRESHOLD_MS) {
            listener?.onNewReelAdvanced(pkg, sponsored)
        } else {
            Log.d(TAG, "Quick scroll — NOT counted (dwell=\${dwellMs}ms < \${THRESHOLD_MS}ms)")
        }

        // New reel entering screen — reset timer + schedule fresh sponsored check
        startReelTimer(pkg, service, config)
        srcNode?.recycle()
    }

    // ── Session lifecycle helpers ──────────────────────────────────────────────

    /** Tears down Reels session for the given platform and notifies listener. */
    private fun endReelsSession(pkg: String) {
        cancelSponsoredCheck(pkg)
        reelEnteredAt[pkg]        = 0L
        currentReelSponsored[pkg] = false
        isInReelsContext[pkg]     = false
        sessionTrackers[pkg]?.reset()
        listener?.onReelsContextChanged(pkg, false)
    }

    // ── New-reel entry: start clock + optionally schedule sponsored check ──────

    private fun startReelTimer(pkg: String, service: AccessibilityService, config: PlatformReelConfig) {
        reelEnteredAt[pkg]        = System.currentTimeMillis()
        currentReelSponsored[pkg] = false  // optimistic: assume not sponsored
        if (config.hasSponsoredContent) scheduleSponsoredCheck(pkg, service)
    }

    private fun cancelSponsoredCheck(pkg: String) {
        sponsoredRunnables[pkg]?.let { handler.removeCallbacks(it) }
        sponsoredRunnables[pkg] = null
    }

    private fun scheduleSponsoredCheck(pkg: String, service: AccessibilityService) {
        cancelSponsoredCheck(pkg)
        val svcRef = WeakReference(service)
        val runnable = Runnable {
            sponsoredRunnables[pkg] = null
            val svc  = svcRef.get() ?: return@Runnable
            val root = svc.rootInActiveWindow ?: return@Runnable
            val isSponsored = containsSponsoredLabel(root)
            root.recycle()
            currentReelSponsored[pkg] = isSponsored
            if (isSponsored) Log.d(TAG, "⚠️ Sponsored reel detected (pkg=\${pkg}) — will be skipped")
        }
        sponsoredRunnables[pkg] = runnable
        handler.postDelayed(runnable, SPONSORED_CHECK_DELAY_MS)
    }

    // ── Sponsored label tree traversal ─────────────────────────────────────────
    /**
     * Depth-first traversal (max 8 levels) looking for a "Sponsored" ad label.
     * Instagram renders it as a plain text node or accessibility label on the ad chip.
     */
    private fun containsSponsoredLabel(node: AccessibilityNodeInfo, depth: Int = 0): Boolean {
        if (depth > 8) return false
        val text = node.text?.toString()?.trim() ?: ""
        val cd   = node.contentDescription?.toString()?.trim() ?: ""
        if (text.equals("Sponsored", ignoreCase = true) ||
            cd.equals("Sponsored",   ignoreCase = true)) return true
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = containsSponsoredLabel(child, depth + 1)
            child.recycle()
            if (found) return true
        }
        return false
    }
}
`);


      /* ════════════════════════════════════════════════
         ReelSessionTracker.kt  (Phase 3B — duplicate-prevention)
      ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "ReelSessionTracker.kt"),
`package ${PACKAGE_NAME}

import android.os.Build
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * ReelSessionTracker — Phase 3B: Duplicate-prevention for reel counting.
 *
 * Layered ON TOP of ReelDetector (Phase 3A) without modifying any existing
 * counting logic. ReelDetector calls this tracker to decide whether the reel
 * about to be evaluated is brand-new or a revisit before running the 2.5s
 * dwell / Sponsored checks.
 *
 * ── Session model ─────────────────────────────────────────────────────────────
 * A session starts when the user enters Instagram Reels and ends when they
 * leave Instagram or switch away. Session data is purely in-memory — it resets
 * automatically on session exit but does NOT touch the persisted daily count
 * stored in reelcount_data.json.
 *
 *   currentIndex    : index of the reel currently on screen (0 = first reel)
 *   maxForwardIndex : highest index ever reached going forward this session
 *
 * A reel is NEW (eligible to be counted by Phase 3A) only when:
 *   advance(FORWARD) is called AND currentIndex > maxForwardIndex
 *
 * All other cases are revisits and return false from advance():
 *   - Any BACKWARD scroll
 *   - A FORWARD scroll through a reel already seen (currentIndex <= maxForwardIndex)
 *   - UNKNOWN direction (safe default: skip counting)
 *
 * ── Direction detection ───────────────────────────────────────────────────────
 * detectScrollDirection() uses a three-tier fallback:
 *
 *   Tier 1 — fromIndex / toIndex (most reliable when ViewPager2 emits page
 *             indices via accessibility):
 *             toIndex > fromIndex → FORWARD, toIndex < fromIndex → BACKWARD
 *
 *   Tier 2 — scrollDeltaY (API 26+, Android O+):
 *             positive delta → content moved up → user saw next reel → FORWARD
 *             negative delta → content moved down → user went back → BACKWARD
 *
 *   Tier 3 — consecutive scrollY delta (compatible with all API levels):
 *             currY > prevY → FORWARD, currY < prevY → BACKWARD
 *
 * ── Usage in ReelDetector ─────────────────────────────────────────────────────
 *   // On Reels entry (before any scroll):
 *   sessionTracker.onSessionEntered()
 *
 *   // On each qualifying Reels ViewPager scroll:
 *   val direction = sessionTracker.detectScrollDirection(event)
 *   val isNewReel = sessionTracker.advance(direction)
 *   if (!isNewReel) return   // skip counting entirely — Phase 3A logic not reached
 *   // ... Phase 3A dwell + Sponsored logic runs only here ...
 *
 *   // On Reels / Instagram exit:
 *   sessionTracker.reset()
 */
class ReelSessionTracker {

    companion object {
        private const val TAG = "DuckLock:SessionTracker"
    }

    // currentIndex=-1 means "session not started" (before onSessionEntered())
    private var currentIndex    = -1
    private var maxForwardIndex = -1

    // Tier-3 fallback: track consecutive scrollY for direction detection
    private var prevScrollY     = Int.MIN_VALUE

    enum class ScrollDirection { FORWARD, BACKWARD, UNKNOWN }

    // ── Session lifecycle ─────────────────────────────────────────────────────

    /**
     * Call when the user enters Instagram Reels (window state change or first
     * ViewPager scroll). Sets currentIndex = 0 (reel-0 is now on screen) so the
     * very next forward scroll correctly returns isNew = true for reel-1.
     */
    fun onSessionEntered() {
        currentIndex    = 0
        maxForwardIndex = 0
        prevScrollY     = Int.MIN_VALUE
        Log.d(TAG, "Session entered — reel-0 on screen")
    }

    /**
     * Reset all session state. Call when the user leaves Reels or switches away
     * from Instagram. Does NOT touch the persisted daily count file.
     */
    fun reset() {
        currentIndex    = -1
        maxForwardIndex = -1
        prevScrollY     = Int.MIN_VALUE
        Log.d(TAG, "Session reset")
    }

    // ── Direction detection ───────────────────────────────────────────────────

    /**
     * Infers scroll direction from an accessibility TYPE_VIEW_SCROLLED event.
     * Three-tier fallback for maximum compatibility across Instagram versions.
     */
    fun detectScrollDirection(event: AccessibilityEvent): ScrollDirection {
        // Tier 1: fromIndex / toIndex — ViewPager2 emits these as page positions
        val from = event.fromIndex
        val to   = event.toIndex
        if (from >= 0 && to >= 0 && from != to) {
            val dir = if (to > from) ScrollDirection.FORWARD else ScrollDirection.BACKWARD
            Log.d(TAG, "Dir(fromIndex/toIndex): \${from}→\${to} = \${dir}")
            return dir
        }

        // Tier 2: scrollDeltaY (API 26+). Wrapped in try-catch because some OEM
        // implementations on API 26/27 may throw or behave unexpectedly; we fall
        // through to Tier 3 silently on any failure.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val delta = event.scrollDeltaY
                if (delta != 0) {
                    val dir = if (delta > 0) ScrollDirection.FORWARD else ScrollDirection.BACKWARD
                    Log.d(TAG, "Dir(scrollDeltaY=\${delta}) = \${dir}")
                    return dir
                }
            } catch (_: Exception) { /* fall through to Tier 3 */ }
        }

        // Tier 3: consecutive scrollY delta
        val currY = event.scrollY
        if (prevScrollY == Int.MIN_VALUE) {
            prevScrollY = currY
            Log.d(TAG, "Dir(scrollY): first sample, storing \${currY}, returning UNKNOWN")
            return ScrollDirection.UNKNOWN
        }
        val dir = when {
            currY > prevScrollY -> ScrollDirection.FORWARD
            currY < prevScrollY -> ScrollDirection.BACKWARD
            else                -> ScrollDirection.UNKNOWN
        }
        Log.d(TAG, "Dir(scrollY delta): prev=\${prevScrollY} curr=\${currY} = \${dir}")
        prevScrollY = currY
        return dir
    }

    // ── Session advance ───────────────────────────────────────────────────────

    /**
     * Advances the session for one reel-to-reel scroll.
     *
     * @param direction Detected scroll direction (call detectScrollDirection() first).
     * @return true  → reel is brand-new this session; Phase 3A counting should run.
     *         false → revisit (backward, or re-entering an already-seen reel);
     *                 Phase 3A counting must be skipped entirely.
     */
    fun advance(direction: ScrollDirection): Boolean {
        // Guard: if somehow called before onSessionEntered(), init conservatively
        if (currentIndex < 0) {
            currentIndex    = 0
            maxForwardIndex = 0
        }

        return when (direction) {
            ScrollDirection.FORWARD -> {
                currentIndex++
                val isNew = currentIndex > maxForwardIndex
                if (isNew) {
                    maxForwardIndex = currentIndex
                    Log.d(TAG, "FORWARD → NEW reel #\${currentIndex} (maxForward=\${maxForwardIndex})")
                } else {
                    Log.d(TAG, "FORWARD → REVISIT reel #\${currentIndex} (maxForward=\${maxForwardIndex})")
                }
                isNew
            }
            ScrollDirection.BACKWARD -> {
                currentIndex = maxOf(0, currentIndex - 1)
                Log.d(TAG, "BACKWARD → REVISIT reel #\${currentIndex} (maxForward=\${maxForwardIndex})")
                false   // backward is always a revisit
            }
            ScrollDirection.UNKNOWN -> {
                // Unknown direction: safe default — don't count
                Log.d(TAG, "UNKNOWN direction → REVISIT (safe default)")
                false
            }
        }
    }
}
`);

      /* ════════════════════════════════════════════════
         DuckPalReelsHandler.kt  (counting + overlay consumer)
       ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "DuckPalReelsHandler.kt"),
`package ${PACKAGE_NAME}

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

/**
 * DuckPalReelsHandler — implements ReelsSignalListener and drives:
 *   1. The floating DuckPal overlay (show / hide / update count).
 *   2. The persisted daily reel count (sponsored reels excluded).
 *
 * This is the ONLY place that touches reelcount_data.json and
 * ReelOverlayManager. ReelDetector emits signals; this class acts on them.
 *
 * Separation of concerns:
 *   ReelDetector        — pure detection (new reel? dwell passed? sponsored?)
 *   DuckPalReelsHandler — what to DO about it (count it, show on the overlay)
 */
class DuckPalReelsHandler(private val context: Context) : ReelsSignalListener {

    companion object {
        private const val TAG   = "DuckLock:DuckPalHandler"
        const  val COUNT_FILE   = "reelcount_data.json"
        const  val DATE_FORMAT  = "yyyy-MM-dd"
    }

    private val overlayManager = ReelOverlayManager(context)

    // ── ReelsSignalListener ───────────────────────────────────────────────────

    override fun onReelsContextChanged(pkg: String, active: Boolean) {
        if (active) {
            overlayManager.show(readEntry().second)
            Log.d(TAG, "Overlay shown for \${pkg}")
        } else {
            overlayManager.hide()
            Log.d(TAG, "Overlay hidden for \${pkg}")
        }
    }

    override fun onNewReelAdvanced(pkg: String, isSponsored: Boolean) {
        if (isSponsored) {
            Log.d(TAG, "Sponsored reel — SKIPPED (pkg=\${pkg})")
        } else {
            Log.d(TAG, "Reel COUNTED (pkg=\${pkg})")
            incrementTodayCount()
        }
    }

    // ── Overlay safety-net ────────────────────────────────────────────────────
    /** Called from AppBlockerAccessibilityService lifecycle (onInterrupt / onDestroy)
     *  so the overlay is always removed even if the service is killed abruptly. */
    fun hideOverlay() { overlayManager.hide() }

    // ── Storage ───────────────────────────────────────────────────────────────

    private fun todayString(): String =
        SimpleDateFormat(DATE_FORMAT, Locale.US).format(Date())

    private fun countFile(): File = File(context.filesDir, COUNT_FILE)

    /** Returns (todayDateString, currentCount). Resets to 0 on date rollover. */
    fun readEntry(): Pair<String, Int> {
        val today = todayString()
        return try {
            val json  = JSONObject(countFile().readText())
            val saved = json.optString("date", "")
            val count = if (saved == today) json.optInt("count", 0) else 0
            Pair(today, count)
        } catch (e: Exception) {
            Pair(today, 0)
        }
    }

    private fun incrementTodayCount() {
        val (today, current) = readEntry()
        val newCount = current + 1
        try {
            countFile().writeText(JSONObject().apply {
                put("date",      today)
                put("count",     newCount)
                put("updatedAt", System.currentTimeMillis())
            }.toString())
            Log.d(TAG, "💾 Count saved: \${newCount} reels today (\${today})")
            overlayManager.updateCount(newCount)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to write reel count: \${e.message}")
        }
    }
}
`);

      /* ════════════════════════════════════════════════
         ReelOverlayManager.kt  — floating duck overlay
      ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "ReelOverlayManager.kt"),
`package ${PACKAGE_NAME}

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.DisplayMetrics
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import kotlin.math.abs
import kotlin.math.max

class ReelOverlayManager(private val context: Context) {

    companion object {
        private const val TAG = "DuckLock:ReelOverlay"
        const val MAX_COUNT = 100
        private const val MIN_SIZE_RATIO = 0.14f
        private const val MAX_SIZE_RATIO = 0.60f
        private const val BADGE_EXTRA_DP = 56
        private const val ASSET_NAME = "duck_overlay_character.webp"

        // Pre-loaded image cache — populated on a background thread so show() is instant
        @Volatile var cachedDrawable: Drawable? = null

        fun preloadAsset(ctx: Context) {
            if (cachedDrawable != null) return
            Thread {
                try {
                    val d = ctx.assets.open(ASSET_NAME).use { Drawable.createFromStream(it, null) }
                    cachedDrawable = d
                    Log.d(TAG, "Duck image pre-loaded into cache")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to pre-load duck image: \${e.message}")
                }
            }.also { it.name = "duck-preload"; it.isDaemon = true }.start()
        }
    }

    private val windowManager =
        context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val mainHandler = Handler(Looper.getMainLooper())

    private var overlayRoot: FrameLayout? = null
    private var characterView: ImageView? = null
    private var badgeText: TextView? = null
    private var layoutParams: WindowManager.LayoutParams? = null

    private var isShowing = false
    private var currentCount = 0

    private var dragStartX = 0
    private var dragStartY = 0
    private var touchStartRawX = 0f
    private var touchStartRawY = 0f
    private var isDragging = false

    init {
        // Kick off background pre-load as soon as this manager is created
        // (at AccessibilityService start-up) so the duck image is ready when show() fires.
        preloadAsset(context)
    }

    private fun screenSize(): Pair<Int, Int> {
        val dm = DisplayMetrics()
        windowManager.defaultDisplay.getMetrics(dm)
        return Pair(dm.widthPixels, dm.heightPixels)
    }

    private fun dpToPx(dp: Int): Int {
        val density = context.resources.displayMetrics.density
        return (dp * density).toInt()
    }

    private fun characterSizePx(count: Int): Int {
        val (screenW, _) = screenSize()
        val clamped = count.coerceIn(0, MAX_COUNT)
        val ratio = MIN_SIZE_RATIO + (MAX_SIZE_RATIO - MIN_SIZE_RATIO) * (clamped / MAX_COUNT.toFloat())
        return (screenW * ratio).toInt()
    }

    fun show(initialCount: Int) {
        if (!Settings.canDrawOverlays(context)) {
            Log.d(TAG, "Overlay permission not granted — skipping show()")
            return
        }
        if (isShowing) {
            updateCount(initialCount)
            return
        }
        val showCalledAt = System.currentTimeMillis()
        Log.d(TAG, "⏱ show() called at t=0 (count=\$initialCount, imageReady=\${cachedDrawable != null})")
        currentCount = initialCount
        mainHandler.post {
            try {
                buildOverlayIfNeeded()
                windowManager.addView(overlayRoot, layoutParams)
                isShowing = true
                updateCount(initialCount)
                val elapsed = System.currentTimeMillis() - showCalledAt
                Log.d(TAG, "⏱ addView() done — total show() lag: \${elapsed}ms (target <100ms)")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to add overlay view: \${e.message}")
            }
        }
    }

    fun hide() {
        if (!isShowing) return
        mainHandler.post {
            try {
                overlayRoot?.let { windowManager.removeView(it) }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to remove overlay view: \${e.message}")
            }
            isShowing = false
            Log.d(TAG, "Overlay hidden")
        }
    }

    fun updateCount(count: Int) {
        currentCount = count
        if (!isShowing) return
        mainHandler.post {
            applySizeForCount(count)
            badgeText?.text = count.toString()
        }
    }

    private fun buildOverlayIfNeeded() {
        if (overlayRoot != null) return

        val size = characterSizePx(currentCount)
        val badgeExtraPx = dpToPx(BADGE_EXTRA_DP)

        val root = FrameLayout(context)

        val character = ImageView(context).apply {
            scaleType = ImageView.ScaleType.FIT_CENTER
            // Use pre-loaded cache for instant display; synchronous fallback only if the
            // background thread hasn't finished yet (very-first launch, extremely rare).
            val drawable = cachedDrawable ?: run {
                Log.d(TAG, "Cache miss — loading \$ASSET_NAME synchronously (should be rare)")
                try {
                    context.assets.open(ASSET_NAME).use { Drawable.createFromStream(it, null) }
                        .also { cachedDrawable = it }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to load \$ASSET_NAME from assets: \${e.message}")
                    null
                }
            }
            drawable?.let { setImageDrawable(it) }
        }
        val charParams = FrameLayout.LayoutParams(size, size).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
        }
        root.addView(character, charParams)

        val badge = TextView(context).apply {
            setTextColor(Color.WHITE)
            textSize = 14f
            setPadding(dpToPx(12), dpToPx(5), dpToPx(12), dpToPx(5))
            gravity = Gravity.CENTER
            background = GradientDrawable().apply {
                setColor(Color.BLACK)
                cornerRadius = dpToPx(20).toFloat()
            }
        }
        val badgeParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
        }
        root.addView(badge, badgeParams)

        overlayRoot = root
        characterView = character
        badgeText = badge

        val overlayType =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

        val (screenW, screenH) = screenSize()
        val totalSize = size + badgeExtraPx
        val params = WindowManager.LayoutParams(
            totalSize,
            totalSize,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = Gravity.TOP or Gravity.START
        params.x = (screenW - totalSize) / 2
        params.y = (screenH - totalSize) / 3
        layoutParams = params

        root.setOnTouchListener { _, event ->
            handleDrag(event)
        }
    }

    private fun applySizeForCount(count: Int) {
        val size = characterSizePx(count)
        val badgeExtraPx = dpToPx(BADGE_EXTRA_DP)
        val newTotal = size + badgeExtraPx

        (characterView?.layoutParams as? FrameLayout.LayoutParams)?.let {
            it.width = size
            it.height = size
            characterView?.layoutParams = it
        }

        val lp = layoutParams ?: return
        val oldTotal = lp.width
        val centerX = lp.x + oldTotal / 2
        val centerY = lp.y + oldTotal / 2

        lp.width = newTotal
        lp.height = newTotal
        lp.x = centerX - newTotal / 2
        lp.y = centerY - newTotal / 2

        clampToScreen(lp)
        try { windowManager.updateViewLayout(overlayRoot, lp) } catch (_: Exception) {}
    }

    private fun clampToScreen(lp: WindowManager.LayoutParams) {
        val (screenW, screenH) = screenSize()
        lp.x = lp.x.coerceIn(0, max(0, screenW - lp.width))
        lp.y = lp.y.coerceIn(0, max(0, screenH - lp.height))
    }

    private fun handleDrag(event: MotionEvent): Boolean {
        val lp = layoutParams ?: return false
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                dragStartX = lp.x
                dragStartY = lp.y
                touchStartRawX = event.rawX
                touchStartRawY = event.rawY
                isDragging = false
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = (event.rawX - touchStartRawX).toInt()
                val dy = (event.rawY - touchStartRawY).toInt()
                if (abs(dx) > 6 || abs(dy) > 6) isDragging = true
                lp.x = dragStartX + dx
                lp.y = dragStartY + dy
                clampToScreen(lp)
                try { windowManager.updateViewLayout(overlayRoot, lp) } catch (_: Exception) {}
                return true
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> return isDragging
        }
        return false
    }

}
`);

      /* ════════════════════════════════════════════════
         ReelCounterModule.kt  — JS bridge
      ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "ReelCounterModule.kt"),
`package ${PACKAGE_NAME}

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

/**
 * Exposes Instagram reel-count data to JavaScript.
 *
 * JS usage (React Native):
 *   import { NativeModules } from 'react-native';
 *   const { date, count } = await NativeModules.ReelCounter.getTodayCount();
 *   // → { date: "2025-01-15", count: 42 }
 */
class ReelCounterModule(private val ctx: ReactApplicationContext)
    : ReactContextBaseJavaModule(ctx) {

    override fun getName() = "ReelCounter"

    /** Returns { date: "yyyy-MM-dd", count: number } for today. */
    @ReactMethod
    fun getTodayCount(promise: Promise) {
        try {
            val file  = File(ctx.filesDir, DuckPalReelsHandler.COUNT_FILE)
            val today = SimpleDateFormat(DuckPalReelsHandler.DATE_FORMAT, Locale.US).format(Date())
            val map   = Arguments.createMap()

            if (!file.exists()) {
                map.putString("date",  today)
                map.putInt("count",    0)
                promise.resolve(map)
                return
            }

            val json  = JSONObject(file.readText())
            val saved = json.optString("date", "")
            val count = if (saved == today) json.optInt("count", 0) else 0

            map.putString("date",  today)
            map.putInt("count",    count)
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("REEL_COUNT_ERROR", e.message ?: "Unknown error", e)
        }
    }
}
`);

      /* ── ReelCounterPackage.kt ── */
      fs.writeFileSync(path.join(kotlinDir, "ReelCounterPackage.kt"),
`package ${PACKAGE_NAME}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ReelCounterPackage : ReactPackage {
    override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> =
        listOf(ReelCounterModule(ctx))

    override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`);


      /* ════════════════════════════════════════════════
         ReelsLockModule.kt  — JS bridge for toggle persistence
       ════════════════════════════════════════════════ */
      fs.writeFileSync(path.join(kotlinDir, "ReelsLockModule.kt"),
`package ${PACKAGE_NAME}

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Exposes Reels Lock toggle persistence to JavaScript.
 *
 * JS usage (React Native):
 *   import { NativeModules } from 'react-native';
 *   const { ReelsLock } = NativeModules;
 *
 *   // Write (call on toggle change)
 *   ReelsLock.setEnabled(true);
 *
 *   // Read (call on mount to restore persisted state)
 *   const enabled = await ReelsLock.getEnabled();  // → boolean
 */
class ReelsLockModule(private val ctx: ReactApplicationContext)
    : ReactContextBaseJavaModule(ctx) {

    override fun getName() = "ReelsLock"

    private fun prefs() = ctx.getSharedPreferences(
        ReelsLockHandler.PREFS_NAME, Context.MODE_PRIVATE
    )

    /** Persists the toggle state so the Accessibility Service can read it. */
    @ReactMethod
    fun setEnabled(enabled: Boolean) {
        prefs().edit().putBoolean(ReelsLockHandler.KEY_REELS_LOCK_ENABLED, enabled).apply()
    }

    /** Returns the current persisted toggle state. */
    @ReactMethod
    fun getEnabled(promise: Promise) {
        try {
            promise.resolve(prefs().getBoolean(ReelsLockHandler.KEY_REELS_LOCK_ENABLED, false))
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
}
`);

      /* ── ReelsLockPackage.kt ── */
      fs.writeFileSync(path.join(kotlinDir, "ReelsLockPackage.kt"),
`package ${PACKAGE_NAME}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ReelsLockPackage : ReactPackage {
    override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> =
        listOf(ReelsLockModule(ctx))

    override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`);
      /* ── duck_overlay_character.webp → android/app/src/main/assets/ ── */
      const assetsDir = path.join(projectRoot, "app/src/main/assets");
      fs.mkdirSync(assetsDir, { recursive: true });
      const webpSrc = path.join(config.modRequest.projectRoot, "assets/duck_overlay_character.webp");
      const webpDst = path.join(assetsDir, "duck_overlay_character.webp");
      if (fs.existsSync(webpSrc)) {
        fs.copyFileSync(webpSrc, webpDst);
      } else {
        console.warn("[withFocusLockAndroid] duck_overlay_character.webp not found at:", webpSrc);
      }

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

      /* ── Patch MainApplication.kt to register both native packages ── */
      const mainAppPath = path.join(kotlinDir, "MainApplication.kt");
      if (fs.existsSync(mainAppPath)) {
        let content = fs.readFileSync(mainAppPath, "utf8");

        // Register ReelCounterPackage (reel counting JS bridge)
        if (!content.includes("ReelCounterPackage")) {
          const REEL_PATTERNS = [
            {
              // .apply block — receiver is the list itself, so bare add() works
              regex: /(PackageList\(this\)\.packages\.apply\s*\{)/,
              replacement: "$1\n              add(ReelCounterPackage())",
            },
            {
              // .also block — receiver is NOT the list; use it.add()
              regex: /(PackageList\(this\)\.packages\.also\s*\{)/,
              replacement: "$1\n              it.add(ReelCounterPackage())",
            },
            {
              regex: /(val packages = PackageList\(this\)\.packages)/,
              replacement: "$1\n          packages.add(ReelCounterPackage())",
            },
          ];
          let patched = content;
          let matchedPattern = null;
          for (const { regex, replacement } of REEL_PATTERNS) {
            const result = content.replace(regex, replacement);
            if (result !== content) {
              patched = result;
              matchedPattern = regex.toString();
              break;
            }
          }
          if (!matchedPattern) {
            throw new Error(
              "[withFocusLockAndroid] ReelCounterPackage was NOT registered in MainApplication.kt.\n" +
              "None of the known PackageList patterns matched. Add: add(ReelCounterPackage())\n" +
              "Then add the pattern to withFocusLockAndroid.js REEL_PATTERNS array."
            );
          }
          content = patched;
          console.log(`[withFocusLockAndroid] ReelCounterPackage registered via pattern: ${matchedPattern}`);
        } else {
          console.log("[withFocusLockAndroid] ReelCounterPackage already present in MainApplication.kt — skipping patch.");
        }

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
              // .apply block — receiver is the list itself, so bare add() works
              regex: /(PackageList\(this\)\.packages\.apply\s*\{)/,
              replacement: "$1\n              add(PermissionCheckerPackage())",
            },
            {
              // B — .also block variant — receiver is NOT the list; use it.add()
              regex: /(PackageList\(this\)\.packages\.also\s*\{)/,
              replacement: "$1\n              it.add(PermissionCheckerPackage())",
            },
            {
              // C — explicit val style: insert add() after the val declaration
              regex: /(val packages = PackageList\(this\)\.packages)/,
              replacement: "$1\n          packages.add(PermissionCheckerPackage())",
            },
          ];

          let matchedPattern = null;
          for (const { regex, replacement } of PATTERNS) {
            const result = content.replace(regex, replacement);
            if (result !== content) {
              content = result;
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

          console.log(`[withFocusLockAndroid] PermissionCheckerPackage registered via pattern: ${matchedPattern}`);
        } else {
          console.log("[withFocusLockAndroid] PermissionCheckerPackage already present in MainApplication.kt — skipping patch.");
        }

        // Register ReelsLockPackage (Reels Lock toggle JS bridge)
        if (!content.includes("ReelsLockPackage")) {
          const REELS_LOCK_PATTERNS = [
            {
              regex: /(PackageList\(this\)\.packages\.apply\s*\{)/,
              replacement: "$1\n              add(ReelsLockPackage())",
            },
            {
              regex: /(PackageList\(this\)\.packages\.also\s*\{)/,
              replacement: "$1\n              it.add(ReelsLockPackage())",
            },
            {
              regex: /(val packages = PackageList\(this\)\.packages)/,
              replacement: "$1\n          packages.add(ReelsLockPackage())",
            },
          ];
          let patched2 = content;
          let matchedPattern2 = null;
          for (const { regex, replacement } of REELS_LOCK_PATTERNS) {
            const result = content.replace(regex, replacement);
            if (result !== content) {
              patched2 = result;
              matchedPattern2 = regex.toString();
              break;
            }
          }
          if (!matchedPattern2) {
            console.warn("[withFocusLockAndroid] ReelsLockPackage could NOT be auto-registered. Add add(ReelsLockPackage()) manually.");
          } else {
            content = patched2;
            console.log(`[withFocusLockAndroid] ReelsLockPackage registered via pattern: ${matchedPattern2}`);
          }
        } else {
          console.log("[withFocusLockAndroid] ReelsLockPackage already present in MainApplication.kt — skipping patch.");
        }

        // Write once — after all patches so all additions land in a single write.
        fs.writeFileSync(mainAppPath, content, "utf8");
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
