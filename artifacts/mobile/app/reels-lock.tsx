/**
 * reels-lock.tsx — JS/React version of the native ReelsLockActivity.
 *
 * Shows the platform-specific "locked" screen (same dark-glow design as the
 * Kotlin original) and bridges into the JS unlock-tasks flow.
 *
 * Route params:
 *   platform: "instagram" | "youtube" | "facebook" | "tiktok" | "twitter" |
 *             "snapchat" | "reddit" | "pinterest" | "whatsapp" | "telegram" |
 *             "discord" | "linkedin"
 *
 * Buttons:
 *   "Back"   → router.back() (mimics native: returns to platform feed/home)
 *   "Unlock" → sets unlock flow state then pushes /unlock-tasks
 *
 * Timer:
 *   Live countdown synced from actual lock endTime in AsyncStorage.
 *   Ticks every second; hidden if no active lock found for this platform.
 */

import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getActiveLocks } from "@/hooks/useLockStorage";
import { setUnlockFlowState, SourcePlatform } from "@/lib/unlockFlowState";

// ── Platform config ───────────────────────────────────────────────────────────
type PlatformKey =
  | "instagram"
  | "youtube"
  | "facebook"
  | "tiktok"
  | "twitter"
  | "snapchat"
  | "reddit"
  | "pinterest"
  | "whatsapp"
  | "telegram"
  | "discord"
  | "linkedin";

const PLATFORM_CONFIG: Record<
  PlatformKey,
  { title: string; image: ReturnType<typeof require> }
> = {
  instagram: {
    title: "Reels are locked",
    image: require("@/assets/reels_lock_char_instagram.png"),
  },
  youtube: {
    title: "Shorts are locked",
    image: require("@/assets/reels_lock_char_youtube.png"),
  },
  facebook: {
    title: "Reels are locked",
    image: require("@/assets/reels_lock_char_facebook.png"),
  },
  tiktok: {
    title: "TikTok is locked",
    image: require("@/assets/lock_char_tiktok.png"),
  },
  twitter: {
    title: "Twitter is locked",
    image: require("@/assets/lock_char_twitter.png"),
  },
  snapchat: {
    title: "Snapchat is locked",
    image: require("@/assets/lock_char_snapchat.png"),
  },
  reddit: {
    title: "Reddit is locked",
    image: require("@/assets/lock_char_reddit.png"),
  },
  pinterest: {
    title: "Pinterest is locked",
    image: require("@/assets/lock_char_pinterest.png"),
  },
  whatsapp: {
    title: "WhatsApp is locked",
    image: require("@/assets/lock_char_whatsapp.png"),
  },
  telegram: {
    title: "Telegram is locked",
    image: require("@/assets/lock_char_telegram.png"),
  },
  discord: {
    title: "Discord is locked",
    image: require("@/assets/lock_char_discord.png"),
  },
  linkedin: {
    title: "LinkedIn is locked",
    image: require("@/assets/lock_char_linkedin.png"),
  },
};

// Glow accent colour per platform
const GLOW_COLOR: Record<PlatformKey, string> = {
  instagram: "rgba(193, 53, 132, 0.35)",   // Instagram pink/purple
  youtube:   "rgba(255, 0, 0, 0.30)",       // YouTube red
  facebook:  "rgba(24, 119, 242, 0.30)",    // Facebook blue
  tiktok:    "rgba(105, 201, 208, 0.30)",   // TikTok teal
  twitter:   "rgba(29, 161, 242, 0.28)",    // Twitter blue
  snapchat:  "rgba(255, 252, 0, 0.22)",     // Snapchat yellow
  reddit:    "rgba(255, 69, 0, 0.30)",      // Reddit orange-red
  pinterest: "rgba(230, 0, 35, 0.28)",      // Pinterest red
  whatsapp:  "rgba(37, 211, 102, 0.28)",    // WhatsApp green
  telegram:  "rgba(0, 136, 204, 0.28)",     // Telegram blue
  discord:   "rgba(88, 101, 242, 0.30)",    // Discord purple
  linkedin:  "rgba(10, 102, 194, 0.28)",    // LinkedIn blue
};

// Android package name per platform — used to look up the active lock endTime
const PACKAGE_NAME: Record<PlatformKey, string> = {
  instagram: "com.instagram.android",
  youtube:   "com.google.android.youtube",
  facebook:  "com.facebook.katana",
  tiktok:    "com.zhiliaoapp.musically",
  twitter:   "com.twitter.android",
  snapchat:  "com.snapchat.android",
  reddit:    "com.reddit.frontpage",
  pinterest: "com.pinterest",
  whatsapp:  "com.whatsapp",
  telegram:  "org.telegram.messenger",
  discord:   "com.discord",
  linkedin:  "com.linkedin.android",
};

// ── Timer formatter (shows seconds for precision) ─────────────────────────────
function formatLiveTimer(endTime: number): string {
  const ms = endTime - Date.now();
  if (ms <= 0) return "Lock expired";

  const totalSeconds = Math.floor(ms / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs    = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m remaining`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s remaining`;
  }
  return `${minutes}m ${secs}s remaining`;
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ReelsLockScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ platform?: string }>();

  const platform: PlatformKey = (
    params.platform && params.platform in PLATFORM_CONFIG
      ? params.platform
      : "instagram"
  ) as PlatformKey;

  const config    = PLATFORM_CONFIG[platform];
  const glowColor = GLOW_COLOR[platform];

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // ── Live timer state ──────────────────────────────────────────────────────
  const [lockEndTime, setLockEndTime] = useState<number | null>(null);
  const [timerText, setTimerText]     = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load the active lock endTime for this platform
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const locks = await getActiveLocks();
        const pkg   = PACKAGE_NAME[platform];
        // Find the first active lock that contains this platform's package
        const match = locks.find((l) =>
          l.apps.some((a) => a.packageName === pkg)
        );
        if (!cancelled && match) {
          setLockEndTime(match.endTime);
          setTimerText(formatLiveTimer(match.endTime));
        }
      } catch {
        // Silently skip — timer simply won't show
      }
    })();
    return () => { cancelled = true; };
  }, [platform]);

  // Tick every second once we have an endTime
  useEffect(() => {
    if (lockEndTime === null) return;

    intervalRef.current = setInterval(() => {
      const text = formatLiveTimer(lockEndTime);
      setTimerText(text);
      if (text === "Lock expired") {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [lockEndTime]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/settings");
    }
  }

  function handleUnlock() {
    setUnlockFlowState("reel-count-schedule", platform as SourcePlatform);
    router.push("/unlock-tasks");
  }

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad }]}>

      {/* ── Radial glow behind character ─────────────────────────────── */}
      <View style={styles.glowWrap} pointerEvents="none">
        <LinearGradient
          colors={[glowColor, "transparent"]}
          style={styles.glow}
        />
      </View>

      {/* ── Character image ─────────────────────────────────────────── */}
      <View style={styles.imageWrap}>
        <Image
          source={config.image}
          style={styles.character}
          resizeMode="contain"
        />
      </View>

      {/* ── Title ────────────────────────────────────────────────────── */}
      <Text style={styles.title}>{config.title}</Text>
      <Text style={styles.subtitle}>
        Complete a quick challenge to unlock your session.
      </Text>

      {/* ── Live timer ───────────────────────────────────────────────── */}
      {lockEndTime !== null && (
        <View style={styles.timerWrap}>
          <Text style={styles.timerText}>{timerText}</Text>
        </View>
      )}

      {/* ── Buttons ──────────────────────────────────────────────────── */}
      <View style={styles.buttonRow}>
        {/* Back */}
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.btnBack, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.btnBackText}>Back</Text>
        </Pressable>

        {/* Unlock */}
        <Pressable
          onPress={handleUnlock}
          style={({ pressed }) => [styles.btnUnlock, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.btnUnlockText}>Unlock</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  // Glow — large soft circle centred behind the character
  glowWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    width: 380,
    height: 380,
    borderRadius: 190,
  },

  // Character image
  imageWrap: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  character: {
    width: 220,
    height: 220,
  },

  // Title
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 12,
  },

  // Subtitle
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },

  // Live timer badge
  timerWrap: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  timerText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFBF80",
    textAlign: "center",
    letterSpacing: 0.2,
  },

  // Buttons row — side by side
  buttonRow: {
    flexDirection: "row",
    gap: 14,
    width: "100%",
  },

  // "Back" — outlined/ghost style
  btnBack: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#3A3A3C",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  btnBackText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#EBEBF5",
  },

  // "Unlock" — filled amber/orange (matches app accent)
  btnUnlock: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFBF80",
  },
  btnUnlockText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#000000",
  },
});
