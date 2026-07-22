import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import theme from "@/constants/theme";

const SHEET_HEIGHT = 280;

export type GoogleSignInMode = "new_user" | "returning_user";

interface Props {
  visible: boolean;
  mode: GoogleSignInMode;
  onComplete: () => void;
}

// Durations: new users see a longer "setup" animation; returning users a quick flash.
const DURATIONS: Record<GoogleSignInMode, number> = {
  new_user: 2800,
  returning_user: 1200,
};

const ARC_RADIUS = 28;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;
// 75% arc visible, 25% gap — matches the reference layout
const ARC_DASH = ARC_CIRCUMFERENCE * 0.75;
const ARC_GAP  = ARC_CIRCUMFERENCE * 0.25;

export function GoogleSignInBottomSheet({ visible, mode, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim  = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const spinRef    = useRef<Animated.CompositeAnimation | null>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      slideAnim.setValue(SHEET_HEIGHT);
      rotateAnim.setValue(0);
      return;
    }

    // Slide the sheet up
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 90,
      friction: 16,
    }).start();

    // Spin the arc continuously
    rotateAnim.setValue(0);
    spinRef.current = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    );
    spinRef.current.start();

    // Auto-complete after the mode-appropriate delay
    timerRef.current = setTimeout(() => {
      spinRef.current?.stop();
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 260,
        useNativeDriver: true,
      }).start(() => onComplete());
    }, DURATIONS[mode]);

    return () => {
      spinRef.current?.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const title    = mode === "new_user" ? "Setting up your account…" : "Verifying your account…";
  const subtitle = mode === "new_user" ? "Hang tight, this will be quick" : "Welcome back!";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      {/* Dim backdrop — does NOT block the background content (tap-through) */}
      <View style={styles.backdrop} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 24 },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Spinning progress arc */}
          <Animated.View style={[styles.arcWrap, { transform: [{ rotate }] }]}>
            <Svg width={72} height={72} viewBox="0 0 72 72">
              {/* Faint background track */}
              <Circle
                cx="36"
                cy="36"
                r={ARC_RADIUS}
                stroke="rgba(255,191,128,0.18)"
                strokeWidth="4.5"
                fill="none"
              />
              {/* Foreground arc (75% of the circle) */}
              <Circle
                cx="36"
                cy="36"
                r={ARC_RADIUS}
                stroke={theme.accent}
                strokeWidth="4.5"
                fill="none"
                strokeDasharray={`${ARC_DASH} ${ARC_GAP}`}
                strokeLinecap="round"
                // Start from 12 o'clock
                transform="rotate(-90 36 36)"
              />
            </Svg>
          </Animated.View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    width,
    backgroundColor: theme.cardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: "center",
    paddingTop: 14,
    paddingHorizontal: 24,
    gap: 20,
    // Subtle top border so it reads as a layer above the backdrop
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.accentBorder,
    // Shadow (iOS)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    // Elevation (Android)
    elevation: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.elevated,
    marginBottom: 8,
  },
  arcWrap: {
    marginVertical: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: theme.primaryText,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: theme.secondaryText,
    textAlign: "center",
  },
});
