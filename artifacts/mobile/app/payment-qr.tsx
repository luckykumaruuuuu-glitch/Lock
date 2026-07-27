/**
 * payment-qr.tsx — UPI QR Code payment screen.
 *
 * Receives `amount` param from router (e.g. "₹1", "₹199", "₹999").
 * Shows a dummy QR code with a 10-minute countdown timer.
 * Timer auto-closes the screen at 00:00.
 * Share button uses React Native Share API.
 * Download button is a placeholder (no real file write needed yet).
 */

import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
  black: "#000000",
  white: "#FFFFFF",
  bg: "#0D0D0D",
  card: "#1A1A1A",
  muted: "#8A8A8E",
  amber: "#FFAD60",
  amberDark: "#E89040",
};

const QR_SIZE = 240;
const TIMER_START = 10 * 60; // 10 minutes in seconds

// ─── Dummy QR Code SVG ─────────────────────────────────────────────────────────
// Draws a realistic-looking (but non-scannable) QR code using SVG.
// Module grid = 21×21 (Version 1 layout).
const M = QR_SIZE / 21; // module size in px

// 1 = black module, 0 = white module
// Hand-crafted pattern: real finder patterns at corners + pseudo-random data
const QR_GRID: number[][] = [
  [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,0,0,0,0,1,1,1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,1,1,0,0,1,0,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,1,1,0,0,1,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
  [0,0,0,0,0,0,0,0,1,1,0,1,0,1,0,0,0,0,0,0,0],
  [1,0,1,1,0,0,1,1,0,1,1,0,1,0,1,1,0,1,1,0,1],
  [0,1,0,0,1,0,0,1,1,0,0,1,0,1,1,0,1,0,0,1,0],
  [1,0,1,0,1,1,1,0,1,1,0,0,1,1,0,1,0,1,0,1,1],
  [0,1,1,0,0,1,0,1,0,1,1,0,1,0,1,0,1,1,0,0,1],
  [1,0,0,1,1,0,1,0,1,0,0,1,1,1,0,1,1,0,1,0,1],
  [0,0,0,0,0,0,0,0,1,0,1,1,0,0,1,0,1,0,0,1,0],
  [1,1,1,1,1,1,1,0,0,1,0,0,1,0,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,1,0,1,0,1,1,0,1,0,0,1,0,0,1,0],
  [1,0,1,1,1,0,1,0,0,1,0,0,1,1,1,0,1,1,0,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,0,0,0,0,1,0,0,1,0,0],
  [1,0,1,1,1,0,1,0,0,1,1,1,0,1,1,0,1,0,1,1,0],
  [1,0,0,0,0,0,1,0,1,0,0,0,1,0,0,1,0,1,0,0,1],
  [1,1,1,1,1,1,1,0,0,1,0,1,1,1,0,0,1,1,0,1,1],
];

function DummyQR() {
  return (
    <View style={qrStyles.container}>
      <Svg width={QR_SIZE} height={QR_SIZE}>
        {/* White background */}
        <Rect x={0} y={0} width={QR_SIZE} height={QR_SIZE} fill="white" />
        {/* Quiet zone inset (4 modules) */}
        {QR_GRID.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            if (!cell) return null;
            return (
              <Rect
                key={`${rowIdx}-${colIdx}`}
                x={colIdx * M}
                y={rowIdx * M}
                width={M}
                height={M}
                fill="black"
              />
            );
          })
        )}
      </Svg>
    </View>
  );
}

const qrStyles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    padding: 14,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});

// ─── Small UPI app icons ───────────────────────────────────────────────────────
function UpiAppIcons() {
  return (
    <View style={upiStyles.row}>
      {/* Google Pay */}
      <View style={[upiStyles.icon, { backgroundColor: "#FFFFFF" }]}>
        <Text style={upiStyles.gpayG}>G</Text>
      </View>
      {/* PhonePe */}
      <View style={[upiStyles.icon, { backgroundColor: "#5F259F" }]}>
        <Text style={upiStyles.pe}>Pe</Text>
      </View>
      {/* Paytm */}
      <View style={[upiStyles.icon, { backgroundColor: "#00BAF2" }]}>
        <Text style={upiStyles.paytm}>P</Text>
      </View>
    </View>
  );
}

const upiStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 10,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  gpayG: {
    color: "#4285F4",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  pe: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  paytm: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function PaymentQRScreen() {
  const insets = useSafeAreaInsets();
  const { amount } = useLocalSearchParams<{ amount: string }>();
  const displayAmount = amount ?? "₹1";

  // Countdown timer — 10 minutes
  const [secondsLeft, setSecondsLeft] = useState(TIMER_START);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto-close when timer hits 00:00
          setTimeout(() => router.back(), 400);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const timerDisplay = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [secondsLeft]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Pay ${displayAmount} to DuckPal via UPI QR code.`,
        title: "DuckPal UPI Payment",
      });
    } catch {
      // user cancelled — do nothing
    }
  }, [displayAmount]);

  const handleDownload = useCallback(() => {
    Alert.alert(
      "Download QR",
      "QR code saved to your downloads folder.",
      [{ text: "OK" }]
    );
  }, []);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom + 16, 32),
        },
      ]}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
          hitSlop={12}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <View style={styles.closeBtnCircle}>
            <Feather name="x" size={18} color="#FFFFFF" />
          </View>
        </Pressable>

        <Pressable
          onPress={() => undefined}
          style={({ pressed }) => pressed && styles.pressed}
          hitSlop={12}
          accessibilityLabel="Need Help?"
          accessibilityRole="button"
        >
          <Text style={styles.helpText}>Need Help?</Text>
        </Pressable>
      </View>

      {/* QR Card */}
      <View style={styles.card}>
        {/* Amount */}
        <Text style={styles.amount}>{displayAmount}</Text>

        {/* QR Code */}
        <DummyQR />

        {/* Subtitle */}
        <Text style={styles.scanSubtitle}>Scan and set-up pay using any UPI app</Text>

        {/* UPI app icons */}
        <UpiAppIcons />
      </View>

      {/* Timer */}
      <View style={styles.timerRow}>
        <Text style={styles.timerLabel}>QR code is valid for </Text>
        <Text style={styles.timerValue}>{timerDisplay} min</Text>
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Share button */}
      <Pressable
        onPress={handleShare}
        style={({ pressed }) => [styles.shareBtn, pressed && styles.shareBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Share QR Code"
      >
        <Feather name="share-2" size={18} color="#101010" style={{ marginRight: 8 }} />
        <Text style={styles.shareBtnText}>Share QR Code</Text>
      </Pressable>

      {/* Download */}
      <Pressable
        onPress={handleDownload}
        style={({ pressed }) => [styles.downloadBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Download QR Code"
      >
        <Feather name="download" size={17} color={COLORS.white} style={{ marginRight: 7 }} />
        <Text style={styles.downloadText}>Download</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.black,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  closeBtn: {},
  closeBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
  helpText: {
    color: COLORS.white,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    textDecorationLine: "underline",
    textDecorationColor: "rgba(255,255,255,0.4)",
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  amount: {
    color: COLORS.white,
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -0.8,
    marginBottom: 20,
  },
  scanSubtitle: {
    color: COLORS.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
  },
  timerLabel: {
    color: COLORS.white,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  timerValue: {
    color: COLORS.white,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  spacer: { flex: 1 },
  shareBtn: {
    width: "100%",
    height: 58,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.white,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    marginBottom: 4,
  },
  shareBtnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  shareBtnText: {
    color: "#101010",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  downloadText: {
    color: COLORS.white,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
});
