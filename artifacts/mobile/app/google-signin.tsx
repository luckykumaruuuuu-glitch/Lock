/**
 * Google Sign-In screen
 *
 * Shown once after onboarding, before the permission-setup flow.
 * On success it:
 *  - Shows a bottom-sheet progress indicator
 *  - Detects whether the Google account is new or returning (via AsyncStorage)
 *  - Navigates to /(tabs) — the SetupGuard then redirects to /setup if
 *    Android permissions haven't been granted yet.
 *
 * On Expo Go / web a simulated flow is used so the UI can still be tested
 * without a real APK build.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  GoogleSignInBottomSheet,
  GoogleSignInMode,
} from "@/components/ui/GoogleSignInBottomSheet";
import theme from "@/constants/theme";

// ─── AsyncStorage keys ───────────────────────────────────────────────────────
export const GOOGLE_SIGNIN_DONE_KEY = "focuslock_google_signin_done";
/** Stores the Google user-id so we can detect returning users. */
const GOOGLE_USER_ID_KEY = "focuslock_google_user_id";
/** Stores { name, email, photo } JSON for displaying in Settings. */
export const GOOGLE_USER_PROFILE_KEY = "focuslock_google_user_profile";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** true in Expo Go and browser-preview — native modules are unavailable. */
const isExpoGoOrWeb =
  Platform.OS === "web" || Constants.appOwnership === "expo";

/**
 * Returns the GoogleSignin module only in real APK / dev-client builds.
 * In Expo Go / web the import throws, so we catch and return null.
 */
function getGoogleSignin() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleSignin, statusCodes } = require("@react-native-google-signin/google-signin");
    return { GoogleSignin, statusCodes };
  } catch {
    return null;
  }
}

// Configure Google Sign-In once (safe to call on non-APK builds — caught above).
// Web Client ID is read from the Expo public env var set in .replit / .env.
try {
  const gs = getGoogleSignin();
  if (gs) {
    gs.GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
      offlineAccess: false,
    });
  }
} catch { /* no-op on Expo Go / web */ }

// ─── Component ───────────────────────────────────────────────────────────────

const { width } = Dimensions.get("window");

export default function GoogleSignInScreen() {
  const insets = useSafeAreaInsets();

  const [loading, setLoading]       = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [signInMode, setSignInMode] = useState<GoogleSignInMode>("new_user");

  // Called after sign-in (real or simulated) to determine new vs returning.
  const handleSignedIn = useCallback(async (
    googleUserId: string,
    profile?: { name: string | null; email: string | null; photo: string | null },
  ) => {
    const stored = await AsyncStorage.getItem(GOOGLE_USER_ID_KEY);
    const mode: GoogleSignInMode =
      stored === googleUserId ? "returning_user" : "new_user";

    if (stored !== googleUserId) {
      await AsyncStorage.setItem(GOOGLE_USER_ID_KEY, googleUserId);
    }

    // Persist profile so Settings screen can display it.
    if (profile) {
      await AsyncStorage.setItem(GOOGLE_USER_PROFILE_KEY, JSON.stringify(profile));
    }

    setSignInMode(mode);
    setSheetVisible(true);
  }, []);

  // Called when the bottom-sheet finishes its animation.
  const handleSheetComplete = useCallback(async () => {
    setSheetVisible(false);
    await AsyncStorage.setItem(GOOGLE_SIGNIN_DONE_KEY, "true");
    // SetupGuard will redirect to /setup if Android permissions are pending.
    router.replace("/(tabs)");
  }, []);

  // ── Real native Google Sign-In ──────────────────────────────────────────
  const handleNativeSignIn = useCallback(async () => {
    const gs = getGoogleSignin();
    if (!gs) {
      // Shouldn't reach here on real builds, but guard anyway.
      Alert.alert("Error", "Google Sign-In module not available.");
      return;
    }
    const { GoogleSignin, statusCodes } = gs;

    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const u = userInfo.data?.user ?? userInfo.user;
      await handleSignedIn(u?.id ?? "unknown", {
        name:  u?.name  ?? null,
        email: u?.email ?? null,
        photo: u?.photo ?? null,
      });
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled — do nothing.
      } else if (code === statusCodes.IN_PROGRESS) {
        // Already in progress.
      } else if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          "Google Play Services unavailable",
          "Please update or enable Google Play Services on your device.",
        );
      } else {
        Alert.alert(
          "Sign-in failed",
          "Could not complete Google Sign-In. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [handleSignedIn]);

  // ── Simulated flow for Expo Go / web ───────────────────────────────────
  const handleSimulatedSignIn = useCallback(async () => {
    setLoading(true);
    // Short delay to mimic the account picker appearing
    await new Promise<void>((r) => setTimeout(r, 600));
    setLoading(false);
    // Use a fixed stub ID so second "sign-in" becomes returning user.
    // No photo in stub — exercises the default-avatar fallback in Settings.
    await handleSignedIn("expo-go-stub-user", {
      name:  "Demo User",
      email: "demo@gmail.com",
      photo: null,
    });
  }, [handleSignedIn]);

  const onPressSignIn = isExpoGoOrWeb ? handleSimulatedSignIn : handleNativeSignIn;

  const topPad = Platform.OS === "web" ? 52 : insets.top + 20;
  const botPad = Platform.OS === "web" ? 40 : insets.bottom + 24;

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: botPad }]}>

      {/* ── Top section ── */}
      <View style={styles.top}>
        {/* Icon / lock mark */}
        <View style={styles.iconRing}>
          <Feather name="lock" size={36} color={theme.accent} />
        </View>

        <Text style={styles.heading}>Connect your account</Text>
        <Text style={styles.body}>
          Sign in with Google to sync your DuckLock data across devices and
          keep your locks intact even after reinstalling.
        </Text>

        {isExpoGoOrWeb && (
          <View style={styles.devBadge}>
            <Text style={styles.devBadgeText}>
              ⚡ Expo Go / Web — simulated sign-in
            </Text>
          </View>
        )}
      </View>

      {/* ── Sign-in button ── */}
      <View style={styles.bottom}>
        <View style={[styles.btnShadow, { shadowColor: theme.accent }]}>
          <Pressable
            onPress={loading ? undefined : onPressSignIn}
            style={({ pressed }) => [{ opacity: pressed || loading ? 0.8 : 1 }]}
          >
            <LinearGradient
              colors={theme.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btn}
            >
              {loading ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <>
                  {/* Google "G" icon — inline SVG approximation using text */}
                  <View style={styles.googleIcon}>
                    <Text style={styles.googleG}>G</Text>
                  </View>
                  <Text style={styles.btnText}>Continue with Google</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        <Text style={styles.legal}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>

      {/* ── Progress bottom-sheet ── */}
      <GoogleSignInBottomSheet
        visible={sheetVisible}
        mode={signInMode}
        onComplete={handleSheetComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },

  // ── Top ──
  top: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: theme.accentBg,
    borderWidth: 1.5,
    borderColor: theme.accentBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  heading: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: theme.primaryText,
    letterSpacing: -0.8,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: theme.secondaryText,
    lineHeight: 23,
    textAlign: "center",
    maxWidth: 320,
  },
  devBadge: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "rgba(255,191,128,0.12)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.accentBorder,
  },
  devBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: theme.accent,
  },

  // ── Bottom ──
  bottom: {
    gap: 16,
    alignItems: "center",
  },
  btnShadow: {
    width: width - 56,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  btn: {
    width: width - 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    borderRadius: 20,
  },
  googleIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
    lineHeight: 20,
  },
  btnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: theme.buttonText,
  },
  legal: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: theme.tertiaryText,
    textAlign: "center",
    lineHeight: 17,
    maxWidth: 280,
  },
});
