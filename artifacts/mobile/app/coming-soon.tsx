import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { consumePendingReelsLockDisable } from "@/lib/reelsLockPending";

const COLORS = {
  black: "#000000",
  bg: "#0E0E0E",
  white: "#FFFFFF",
  softWhite: "#F5F5F7",
  muted: "#98989F",
  card: "#202020",
  cardTop: "#292929",
  lime: "#A8FF00",
  orange: "#FF6A4D",
  amber: "#FFAD60",
  sheetBg: "#161616",
  rowBg: "#1E1E1E",
  rowBorder: "#2C2C2C",
  green: "#34C759",
};

type PlanId = "free" | "monthly" | "yearly";

const PLAN_AMOUNTS: Record<PlanId, string> = {
  free: "₹1",
  monthly: "₹199",
  yearly: "₹999",
};

// ─── Root paywall screen ───────────────────────────────────────────────────────
export default function PaywallScreen() {
  useEffect(() => {
    if (consumePendingReelsLockDisable()) {
      if (Platform.OS === "android" && NativeModules.ReelsLock) {
        NativeModules.ReelsLock.setEnabled(false);
      }
    }
  }, []);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [secondsRemaining, setSecondsRemaining] = useState(11 * 60 * 60 + 24 * 60 + 20);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("free");
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  useEffect(() => {
    const countdown = setInterval(() => {
      setSecondsRemaining((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  const timeParts = useMemo(() => {
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;
    return [0, hours, minutes, seconds].map((p) => String(p).padStart(2, "0"));
  }, [secondsRemaining]);

  const horizontalPadding = width < 360 ? 14 : 18;
  const trialButtonText =
    selectedPlan === "free"
      ? "TRY FREE 3-DAYS TRIAL"
      : selectedPlan === "monthly"
        ? "CONTINUE WITH MONTHLY"
        : "CONTINUE WITH YEARLY";

  const handleCTA = useCallback(() => {
    setShowPaymentSheet(true);
  }, []);

  const handleQRCode = useCallback(() => {
    setShowPaymentSheet(false);
    setTimeout(() => {
      router.push({ pathname: "/payment-qr", params: { amount: PLAN_AMOUNTS[selectedPlan] } });
    }, 300);
  }, [selectedPlan]);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom + 16, 34),
        },
      ]}
    >
      <View style={[styles.topControls, { paddingHorizontal: horizontalPadding }]}>
        <Pressable
          accessibilityLabel="Close paywall"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <Feather name="x" size={23} color={COLORS.white} />
        </Pressable>
        <Pressable
          accessibilityLabel="Restore purchases"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => undefined}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.restoreText}>Restore</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.headlineBlock}>
          <Text style={styles.headlineGreen}>Take Back</Text>
          <Text style={styles.headlineWhite}>your time</Text>
          <Text style={styles.subtitle}>
            Block distracting apps and reels — stay focused, feel better every day
          </Text>
        </View>

        <View style={[styles.plans, { maxWidth: Math.min(width - horizontalPadding * 2, 410) }]}>
          <PlanCard
            planId="free"
            label="FREE TRIAL"
            title="Free"
            price="₹1"
            perWeek="3 Days Free"
            selected={selectedPlan === "free"}
            badge="FREE"
            onPress={() => setSelectedPlan("free")}
          />
          <PlanCard
            planId="monthly"
            label="POPULAR"
            title="Monthly"
            price="₹199"
            perWeek="₹49/week"
            selected={selectedPlan === "monthly"}
            onPress={() => setSelectedPlan("monthly")}
          />
          <PlanCard
            planId="yearly"
            label="BEST DEAL"
            title="Yearly"
            price="₹999"
            perWeek="₹19/week"
            selected={selectedPlan === "yearly"}
            badge="85% OFF"
            onPress={() => setSelectedPlan("yearly")}
          />
        </View>

        <View style={styles.timer} accessibilityLabel="Offer countdown">
          {timeParts.map((part, index) => (
            <React.Fragment key={`${part}-${index}`}>
              {index > 0 && <Text style={styles.timerColon}>:</Text>}
              <View style={styles.timerBox}>
                <Text style={styles.timerText}>{part}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <Pressable
          accessibilityLabel={trialButtonText}
          accessibilityRole="button"
          onPress={handleCTA}
          style={({ pressed }) => [styles.trialButton, pressed && styles.trialButtonPressed]}
        >
          <Text style={styles.trialButtonText}>{trialButtonText}</Text>
        </Pressable>
      </View>

      <Text style={styles.legal}>Terms of Service and Privacy Policy</Text>

      {/* Payment Method Bottom Sheet */}
      <PaymentMethodSheet
        visible={showPaymentSheet}
        amount={PLAN_AMOUNTS[selectedPlan]}
        onClose={() => setShowPaymentSheet(false)}
        onQRCode={handleQRCode}
      />
    </View>
  );
}

// ─── Plan card ─────────────────────────────────────────────────────────────────
type PlanCardProps = {
  planId: PlanId;
  label: string;
  title: string;
  price: string;
  perWeek: string;
  selected?: boolean;
  badge?: string;
  onPress: () => void;
};

function PlanCard({ planId, label, title, price, perWeek, selected = false, badge, onPress }: PlanCardProps) {
  return (
    <Pressable
      accessibilityLabel={`${title} plan${selected ? ", selected" : ""}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.planCard,
        selected && styles.planCardSelected,
        pressed && styles.planCardPressed,
      ]}
      testID={`plan-card-${planId}`}
    >
      {badge && <Text style={styles.discountBadge}>{badge}</Text>}
      <Text style={styles.planLabel}>{label}</Text>
      <Text style={styles.planTitle}>{title}</Text>
      <Text style={styles.planPrice}>{price}</Text>
      <View style={styles.planDivider} />
      <Text style={styles.planPerWeek}>{perWeek}</Text>
    </Pressable>
  );
}

// ─── Payment method bottom sheet ───────────────────────────────────────────────
type PaymentMethodSheetProps = {
  visible: boolean;
  amount: string;
  onClose: () => void;
  onQRCode: () => void;
};

function PaymentMethodSheet({ visible, amount, onClose, onQRCode }: PaymentMethodSheetProps) {
  const translateY = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 400,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Dimmed backdrop */}
      <Animated.View style={[sheet.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[sheet.container, { transform: [{ translateY }] }]}>
        {/* Handle */}
        <View style={sheet.handle} />

        {/* Header */}
        <View style={sheet.header}>
          <View style={sheet.headerLeft}>
            <Text style={sheet.payByText}>Pay by </Text>
            {/* UPI badge */}
            <View style={sheet.upiBadge}>
              <Text style={sheet.upiTextBold}>UPI</Text>
            </View>
          </View>
        </View>
        <Text style={sheet.chooseText}>Choose payment method</Text>

        {/* Payment options */}
        <View style={sheet.optionsList}>
          {/* Google Pay */}
          <PaymentRow
            icon={<GooglePayIcon />}
            label="Google Pay"
            onPress={() => undefined}
          />

          {/* PhonePe */}
          <PaymentRow
            icon={<PhonePeIcon />}
            label="PhonePe"
            onPress={() => undefined}
          />

          {/* Pay via QR Code */}
          <PaymentRow
            icon={<QRIcon />}
            label="Pay via QR Code"
            badge="New"
            onPress={onQRCode}
            isLast
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Payment row ───────────────────────────────────────────────────────────────
function PaymentRow({
  icon,
  label,
  badge,
  onPress,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sheet.row, !isLast && sheet.rowBorder, pressed && sheet.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={sheet.rowIcon}>{icon}</View>
      <Text style={sheet.rowLabel}>{label}</Text>
      {badge && (
        <View style={sheet.newBadge}>
          <Text style={sheet.newBadgeText}>{badge}</Text>
        </View>
      )}
      <Feather name="chevron-right" size={18} color="#666" style={sheet.rowArrow} />
    </Pressable>
  );
}

// ─── Payment app icons ─────────────────────────────────────────────────────────
function GooglePayIcon() {
  return (
    <View style={icon.gpay}>
      <Text style={icon.gpayG}>G</Text>
      <Text style={icon.gpayPay}>Pay</Text>
    </View>
  );
}

function PhonePeIcon() {
  return (
    <View style={icon.phonepe}>
      <Text style={icon.phonepePe}>Pe</Text>
    </View>
  );
}

function QRIcon() {
  return (
    <View style={icon.qr}>
      <Feather name="grid" size={20} color={COLORS.white} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.black,
    alignItems: "center",
    minHeight: 640,
  },
  topControls: {
    width: "100%",
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  restoreText: {
    color: COLORS.white,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: -0.1,
  },
  pressed: { opacity: 0.55 },
  content: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  headlineBlock: {
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  headlineGreen: {
    color: COLORS.lime,
    fontFamily: "Inter_700Bold",
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: -1.35,
    textAlign: "center",
  },
  headlineWhite: {
    color: COLORS.white,
    fontFamily: "Inter_700Bold",
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: -1.35,
    textAlign: "center",
  },
  subtitle: {
    color: COLORS.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 302,
    marginTop: 13,
    textAlign: "center",
  },
  plans: {
    width: "100%",
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  planCard: {
    flex: 1,
    minHeight: 132,
    paddingHorizontal: 5,
    paddingTop: 10,
    paddingBottom: 9,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "visible",
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.lime,
    backgroundColor: COLORS.card,
    paddingHorizontal: 3,
    paddingTop: 8,
    paddingBottom: 7,
  },
  planCardPressed: { opacity: 0.78 },
  planLabel: {
    color: "#BDBDBD",
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    lineHeight: 18,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: COLORS.cardTop,
    overflow: "hidden",
  },
  planTitle: {
    color: COLORS.white,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 2,
  },
  planPrice: {
    color: COLORS.white,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  planDivider: {
    width: "80%",
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 2,
  },
  planPerWeek: {
    color: COLORS.softWhite,
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    lineHeight: 16,
    textAlign: "center",
  },
  discountBadge: {
    position: "absolute",
    right: -5,
    top: -12,
    zIndex: 2,
    color: COLORS.white,
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    lineHeight: 18,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: COLORS.orange,
    overflow: "hidden",
    transform: [{ rotate: "4deg" }],
  },
  timer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 17,
  },
  timerBox: {
    width: 35,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#1D1D1D",
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    color: COLORS.white,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: -0.3,
  },
  timerColon: {
    color: "#8F8F93",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    marginHorizontal: -2,
  },
  trialButton: {
    width: "100%",
    maxWidth: 410,
    minHeight: 63,
    borderRadius: 19,
    backgroundColor: COLORS.softWhite,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.white,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  trialButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  trialButtonText: {
    color: "#101010",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: -0.1,
  },
  legal: {
    color: "#68686D",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
  },
});

const sheet = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.sheetBg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 36,
    paddingTop: 12,
    paddingHorizontal: 0,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3A3A3C",
    alignSelf: "center",
    marginBottom: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  payByText: {
    color: COLORS.white,
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.4,
  },
  upiBadge: {
    backgroundColor: "#1E3A5F",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#2A5298",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  upiStripe: {
    width: 3,
    height: 14,
    borderRadius: 1.5,
  },
  upiTextBold: {
    color: COLORS.white,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1,
  },
  chooseText: {
    color: "#8A8A8E",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  optionsList: {
    paddingHorizontal: 14,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.rowBg,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  rowBorder: {
    // gap handles spacing in optionsList
  },
  rowPressed: { opacity: 0.7 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    color: COLORS.white,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  rowArrow: {
    marginLeft: 8,
  },
  newBadge: {
    backgroundColor: COLORS.green,
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginRight: 6,
  },
  newBadgeText: {
    color: COLORS.white,
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
});

const icon = StyleSheet.create({
  gpay: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  gpayG: {
    color: "#4285F4",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  gpayPay: {
    color: "#34A853",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
  phonepe: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#5F259F",
    alignItems: "center",
    justifyContent: "center",
  },
  phonepePe: {
    color: COLORS.white,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: -0.5,
  },
  qr: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
  },
});
