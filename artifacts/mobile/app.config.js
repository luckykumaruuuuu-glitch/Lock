// app.config.js — Dynamic Expo config for Replit compatibility
//
// WHY this file exists instead of app.json:
//   app.json is static — it cannot read environment variables at build/export time.
//   The expo-router `origin` MUST match the actual serving domain so that web
//   asset URLs are correct.  On Replit every account/session gets a unique
//   REPLIT_DEV_DOMAIN, so we derive the origin at runtime instead of hardcoding it.
//
// PERMANENT FIX for "preview URL dead after import to new account":
//   Old code:  "origin": "https://replit.com/"   ← hardcoded, always wrong
//   New code:  origin derived from REPLIT_DEV_DOMAIN env var at build time
//              Falls back to "/" so relative-URL routing works as a safe default.

function getReplitOrigin() {
  // Replit injects these automatically in every Repl session.
  // REPLIT_DEV_DOMAIN  →  e.g. "abc123.username.repl.co"  (no protocol)
  // REPLIT_INTERNAL_APP_DOMAIN  →  used in deployed/production Repls
  const domain =
    process.env.REPLIT_INTERNAL_APP_DOMAIN ||
    process.env.REPLIT_DEV_DOMAIN;

  if (domain) {
    // Strip any accidental protocol prefix, then build https:// URL
    const clean = domain.replace(/^https?:\/\//, "");
    return `https://${clean}/`;
  }

  // Outside Replit (e.g. local dev, EAS build) use "/" so routing still works
  return "/";
}

const origin = getReplitOrigin();

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: "DuckLock",
    slug: "mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "focuslock",
    userInterfaceStyle: "dark",
    backgroundColor: "#000000",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.focuslock.app",
      infoPlist: {
        NSCameraUsageDescription:
          "DuckLock needs camera access to detect your body movement for the Jump challenge.",
      },
    },
    android: {
      package: "com.focuslock.app",
      versionCode: 1,
      backgroundColor: "#000000",
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon-adaptive-fg.png",
        backgroundColor: "#000000",
      },
      minSdkVersion: 26,
      targetSdkVersion: 34,
      permissions: [
        "android.permission.INTERNET",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
        "android.permission.PACKAGE_USAGE_STATS",
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.USE_EXACT_ALARM",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
        "android.permission.CAMERA",
      ],
      googleServicesFile: "./google-services.json",
    },
    web: {
      favicon: "./assets/images/icon.png",
    },
    plugins: [
      [
        "expo-router",
        {
          // Dynamic origin — resolves to current Replit session domain automatically.
          // No manual changes needed when importing to a new account.
          origin,
        },
      ],
      "expo-font",
      "expo-web-browser",
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#1E40AF",
          sounds: [],
        },
      ],
      "./plugins/withFocusLockAndroid",
      [
        "react-native-vision-camera",
        {
          cameraPermissionText:
            "DuckLock needs camera access to detect your body movement for the Jump challenge.",
        },
      ],
      "expo-video",
      "expo-localization",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
