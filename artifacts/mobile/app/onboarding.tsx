/**
 * BrainPal — Onboarding + Auth entry flow (UI ONLY)
 *
 * Screen 1: Landing  — "See your reels count", social icons, Get Started button
 * Screen 2: Sheet    — "Welcome to BrainPal", Continue With Google
 * Screen 3: Loading  — Spinner inside same sheet while auth is in progress
 *
 * Auth logic is the same as the original google-signin.tsx — zero backend changes.
 * On success, both ONBOARDING_DONE_KEY and GOOGLE_SIGNIN_DONE_KEY are marked so
 * the SetupGuard skips the now-redundant google-signin route.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { FontAwesome, FontAwesome5, Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import theme from "@/constants/theme";

// ─── AsyncStorage keys ────────────────────────────────────────────────────────
export const ONBOARDING_DONE_KEY = "focuslock_onboarding_done";
// Keep the same key so SetupGuard skips google-signin screen
const GOOGLE_SIGNIN_DONE_KEY = "focuslock_google_signin_done";
const GOOGLE_USER_ID_KEY     = "focuslock_google_user_id";
export const GOOGLE_USER_PROFILE_KEY = "focuslock_google_user_profile";

// ─── Platform detection (identical to google-signin.tsx) ─────────────────────
const isExpoGoOrWeb =
  Platform.OS === "web" || Constants.appOwnership === "expo";

function getGoogleSignin() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleSignin, statusCodes } = require("@react-native-google-signin/google-signin");
    return { GoogleSignin, statusCodes };
  } catch {
    return null;
  }
}

try {
  const gs = getGoogleSignin();
  if (gs) {
    gs.GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
      offlineAccess: false,
    });
  }
} catch { /* no-op on Expo Go / web */ }

// ─── Layout constants ─────────────────────────────────────────────────────────
const { width, height } = Dimensions.get("window");

// Sheet height ~48% of screen
const SHEET_HEIGHT = height * 0.48;

// Spinner arc geometry
const ARC_R   = 32;
const ARC_C   = 2 * Math.PI * ARC_R;
const ARC_DASH = ARC_C * 0.75;
const ARC_GAP  = ARC_C * 0.25;

// ─── Component ────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();

  // Whether the bottom sheet is open
  const [sheetOpen, setSheetOpen]   = useState(false);
  // Whether auth is running (shows loading Screen 3)
  const [isLoading, setIsLoading]   = useState(false);

  // ── Animations ──────────────────────────────────────────────────────────────
  // Button press scale / opacity
  const btnScale   = useRef(new Animated.Value(1)).current;
  const btnOpacity = useRef(new Animated.Value(1)).current;

  // Sheet slide-up + backdrop fade
  const sheetSlide     = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Spinner rotation
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinRef  = useRef<Animated.CompositeAnimation | null>(null);

  // ── Open sheet ───────────────────────────────────────────────────────────────
  function openSheet() {
    setSheetOpen(true);
    Animated.parallel([
      Animated.spring(sheetSlide, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 14,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0.6,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }

  // ── Spinner on/off ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) {
      spinAnim.setValue(0);
      spinRef.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
      );
      spinRef.current.start();
    } else {
      spinRef.current?.stop();
      spinAnim.setValue(0);
    }
    return () => spinRef.current?.stop();
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Button press animations ──────────────────────────────────────────────────
  function onPressIn() {
    Animated.parallel([
      Animated.spring(btnScale,   { toValue: 0.96, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(btnOpacity, { toValue: 0.85, duration: 80,  useNativeDriver: true }),
    ]).start();
  }
  function onPressOut() {
    Animated.parallel([
      Animated.spring(btnScale,   { toValue: 1,    useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.timing(btnOpacity, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
  }

  // ── Auth: mark complete & navigate ──────────────────────────────────────────
  const finishAuth = useCallback(async (
    googleUserId: string,
    profile?: { name: string | null; email: string | null; photo: string | null },
  ) => {
    const stored = await AsyncStorage.getItem(GOOGLE_USER_ID_KEY);
    if (stored !== googleUserId) {
      await AsyncStorage.setItem(GOOGLE_USER_ID_KEY, googleUserId);
    }
    if (profile) {
      await AsyncStorage.setItem(GOOGLE_USER_PROFILE_KEY, JSON.stringify(profile));
    }
    // Mark both keys so SetupGuard routes past both screens
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true");
    await AsyncStorage.setItem(GOOGLE_SIGNIN_DONE_KEY, "true");
    // SetupGuard will redirect to /setup if Android permissions are pending
    router.replace("/(tabs)");
  }, []);

  // ── Real native Google Sign-In ───────────────────────────────────────────────
  const handleNativeSignIn = useCallback(async () => {
    const gs = getGoogleSignin();
    if (!gs) {
      Alert.alert("Error", "Google Sign-In module not available.");
      return;
    }
    const { GoogleSignin, statusCodes } = gs;

    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const u = userInfo.data?.user ?? userInfo.user;
      await finishAuth(u?.id ?? "unknown", {
        name:  u?.name  ?? null,
        email: u?.email ?? null,
        photo: u?.photo ?? null,
      });
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      setIsLoading(false);
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled — stay on sheet
      } else if (code === statusCodes.IN_PROGRESS) {
        // Already in progress
      } else if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          "Google Play Services unavailable",
          "Please update or enable Google Play Services on your device.",
        );
      } else {
        Alert.alert("Sign-in failed", "Could not complete Google Sign-In. Please try again.");
      }
    }
  }, [finishAuth]);

  // ── Simulated flow for Expo Go / web ────────────────────────────────────────
  const handleSimulatedSignIn = useCallback(async () => {
    setIsLoading(true);
    await new Promise<void>((r) => setTimeout(r, 2200));
    await finishAuth("expo-go-stub-user", {
      name:  "Demo User",
      email: "demo@gmail.com",
      photo: null,
    });
  }, [finishAuth]);

  const onPressSignIn = isExpoGoOrWeb ? handleSimulatedSignIn : handleNativeSignIn;

  // ── Derived ──────────────────────────────────────────────────────────────────
  const topPad    = Platform.OS === "web" ? 52 : insets.top + 12;
  const bottomPad = Platform.OS === "web" ? 40 : insets.bottom + 24;

  const rotate = spinAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>

      {/* ══ Screen 1: Landing ═══════════════════════════════════════════════ */}
      <View style={[styles.landing, { paddingTop: topPad, paddingBottom: bottomPad }]}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.logo}>BRAINPAL</Text>
          <View style={styles.langPill}>
            <Ionicons name="language" size={15} color={theme.primaryText} />
            <Text style={styles.langText}>English</Text>
          </View>
        </View>

        {/* Breathing room */}
        <View style={styles.spacer} />

        {/* Bottom section */}
        <View style={styles.landingBottom}>
          <Text style={styles.headline}>See your reels count</Text>

          {/* Social platform icons */}
          <View style={styles.iconsRow}>
            <FontAwesome  name="instagram"  size={30} color={theme.elevated} style={styles.socialIcon} />
            <FontAwesome5 name="youtube"    size={26} color={theme.elevated} style={styles.socialIcon} />
            <FontAwesome5 name="snapchat"   size={26} color={theme.elevated} style={styles.socialIcon} />
            <FontAwesome  name="facebook"   size={30} color={theme.elevated} style={styles.socialIcon} />
          </View>

          {/* Get Started button */}
          <Animated.View
            style={[
              styles.btnShadow,
              { transform: [{ scale: btnScale }], opacity: btnOpacity },
            ]}
          >
            <Pressable
              onPress={openSheet}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
            >
              <LinearGradient
                colors={["#FFE8C8", "#FFBF80"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.getStartedBtn}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      {/* ══ Screens 2 & 3: Bottom sheet overlay ════════════════════════════ */}
      {sheetOpen && (
        <>
          {/* Backdrop */}
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
            pointerEvents="none"
          />

          {/* Sheet */}
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 16) + 16 },
              { transform: [{ translateY: sheetSlide }] },
            ]}
          >
            {/* Drag handle */}
            <View style={styles.handle} />

            {isLoading ? (
              /* ── Screen 3: Signing in ── */
              <View style={styles.loadingContent}>
                <Animated.View style={{ transform: [{ rotate }] }}>
                  <Svg width={76} height={76} viewBox="0 0 76 76">
                    {/* Background track */}
                    <Circle
                      cx="38" cy="38" r={ARC_R}
                      stroke="rgba(255,191,128,0.18)"
                      strokeWidth="5"
                      fill="none"
                    />
                    {/* Foreground arc */}
                    <Circle
                      cx="38" cy="38" r={ARC_R}
                      stroke={theme.accent}
                      strokeWidth="5"
                      fill="none"
                      strokeDasharray={`${ARC_DASH} ${ARC_GAP}`}
                      strokeLinecap="round"
                      transform="rotate(-90 38 38)"
                    />
                  </Svg>
                </Animated.View>
                <Text style={styles.signingTitle}>Signing in...</Text>
                <Text style={styles.signingSub}>Hang tight, this will be quick</Text>
              </View>
            ) : (
              /* ── Screen 2: Welcome ── */
              <View style={styles.welcomeContent}>
                {/* Need help? */}
                <TouchableOpacity style={styles.helpRow} activeOpacity={0.6}>
                  <Text style={styles.helpText}>Need help?</Text>
                </TouchableOpacity>

                <Text style={styles.welcomeTitle}>Welcome to BrainPal</Text>

                {/* Continue With Google */}
                <Pressable
                  onPress={onPressSignIn}
                  style={({ pressed }) => [
                    styles.googleBtnWrap,
                    { opacity: pressed ? 0.82 : 1 },
                  ]}
                >
                  <LinearGradient
                    colors={["#FFE8C8", "#FFBF80"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.googleBtn}
                  >
                    <Text style={styles.googleBtnText}>Continue With Google</Text>
                    {/* Google G icon */}
                    <View style={styles.gCircle}>
                      <Text style={styles.gLetter}>G</Text>
                    </View>
                  </LinearGradient>
                </Pressable>

                {/* Privacy */}
                <Text style={styles.privacyText}>
                  By continuing, you have read and agree to our{"\n"}
                  <Text style={styles.privacyLink}>Privacy Policy</Text>
                </Text>
              </View>
            )}
          </Animated.View>
        </>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },

  // ── Screen 1 ──
  landing: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: theme.accent,
    letterSpacing: 2,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  langText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: theme.primaryText,
  },
  spacer: { flex: 1 },
  landingBottom: {
    alignItems: "center",
    gap: 22,
    paddingBottom: 8,
  },
  headline: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  iconsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 30,
  },
  socialIcon: {
    opacity: 0.55,
  },
  btnShadow: {
    width: width - 48,
    borderRadius: 34,
    shadowColor: "#FFBF80",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  getStartedBtn: {
    width: width - 48,
    height: 62,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  getStartedText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#3D1800",
  },

  // ── Overlay / Sheet ──
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.cardBackground,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 14,
    paddingHorizontal: 24,
    // Subtle top border
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.accentBorder,
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    // Android
    elevation: 28,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.elevated,
    alignSelf: "center",
    marginBottom: 6,
  },

  // ── Screen 2: Welcome ──
  welcomeContent: {
    paddingTop: 8,
    gap: 20,
    alignItems: "center",
  },
  helpRow: {
    alignSelf: "flex-end",
  },
  helpText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: theme.secondaryText,
    textDecorationLine: "underline",
  },
  welcomeTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.4,
    marginTop: 4,
  },
  googleBtnWrap: {
    width: width - 48,
    borderRadius: 34,
    shadowColor: "#FFBF80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  googleBtn: {
    width: "100%",
    height: 62,
    borderRadius: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  googleBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#3D1800",
  },
  gCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  gLetter: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
    lineHeight: 20,
  },
  privacyText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: theme.secondaryText,
    textAlign: "center",
    lineHeight: 20,
  },
  privacyLink: {
    textDecorationLine: "underline",
    color: theme.secondaryText,
  },

  // ── Screen 3: Loading ──
  loadingContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 20,
  },
  signingTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  signingSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: theme.secondaryText,
    textAlign: "center",
  },
});
