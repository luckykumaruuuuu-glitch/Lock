import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
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
            Lock distracting apps, track your Reels, and build a focus streak — with DuckPal by your side
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
            {/* UPI logo SVG */}
            <Svg width={40} height={12} viewBox="39 126 640 188">
              {/* U letter */}
              <Path fill="#FEFEFE" d="M104.326 126.886q2.214 0 4.428.016l2.35.005c2.486.005 4.972.018 7.459.03q2.522.009 5.044.014 6.197.017 12.393.049c-.6 5.061-1.696 9.745-3.258 14.602l-.678 2.15q-1.088 3.439-2.189 6.873l-1.52 4.792a1545 1545 0 0 1-8.732 26.682c-7.353 21.889-13.921 44.056-20.688 66.131l-.75 2.443-1.384 4.518A518 518 0 0 1 93 267l125-1c16.962-51.946 16.962-51.946 22.934-71.39 3.398-10.967 7.096-21.836 10.76-32.716a2500 2500 0 0 0 4.126-12.417l2.072-6.262q.667-2.017 1.331-4.036.92-2.788 1.843-5.574l1.061-3.214C263 128 263 128 264 127c2.594-.089 5.16-.115 7.754-.098l2.35.005c2.486.005 4.972.018 7.459.03q2.522.009 5.044.014 6.197.017 12.393.049c-2.513 9.712-5.53 19.254-8.562 28.813l-.8 2.527a2212 2212 0 0 1-11.988 36.746 2374 2374 0 0 0-8.65 26.289l-.623 1.928a2022 2022 0 0 0-7.633 24.201A2453 2453 0 0 1 254 269l-.988 3.1c-3.714 11.447-7.228 21.32-18.256 27.588-7.062 3.39-14.387 2.997-22.034 2.927q-2.442.006-4.882.017c-4.392.014-8.784-.003-13.177-.026-4.607-.02-9.213-.014-13.82-.012q-11.595-.002-23.19-.052c-8.932-.037-17.862-.046-26.793-.039-8.606.007-17.212-.004-25.818-.024q-5.486-.011-10.97-.009-6.458 0-12.914-.04-2.366-.01-4.733-.005a602 602 0 0 1-6.469-.03l-3.653-.012c-4.28-.496-7.918-1.714-10.729-5.102-4.397-8.833-3.997-15.01-1.074-24.156l.82-2.648c.881-2.83 1.778-5.654 2.68-8.477l.86-2.693q1.837-5.745 3.687-11.485c3.383-10.518 6.635-21.076 9.89-31.635 3.973-12.882 7.995-25.743 12.162-38.564 2.256-6.971 4.439-13.961 6.585-20.967l.832-2.715q2.052-6.704 4.088-13.412l1.49-4.884.693-2.3c1.932-6.318 1.932-6.318 6.04-6.459" />
              {/* P letter */}
              <Path fill="#FEFEFE" d="m327.444 126.86 2.065-.01q3.45-.01 6.9-.011l4.926-.015q6.713-.019 13.427-.024l8.388-.012q13.12-.02 26.24-.027 15.148-.007 30.294-.05 11.703-.033 23.406-.034 6.99 0 13.982-.025 6.583-.023 13.166-.01 2.412.002 4.823-.013c17.955-.104 17.955-.104 23.441 4.681 3.463 3.79 5.6 7.687 5.424 12.883a84.6 84.6 0 0 1-3.301 16.682l-.768 2.597q-.888 2.99-1.79 5.976a1681 1681 0 0 0-3.004 10.14c-.941 3.194-1.893 6.385-2.847 9.575q-.708 2.37-1.404 4.743c-8.516 28.958-8.516 28.958-20.117 35.367-5.559 2.57-10.268 3.853-16.415 3.847l-3.535.004-3.867-.01h-4.08q-5.535-.001-11.07-.013c-3.857-.006-7.714-.006-11.571-.008q-10.954-.005-21.908-.021-12.472-.015-24.943-.022-25.653-.016-51.306-.05l-.39 1.811c-1.726 7.895-1.726 7.895-2.935 11.673l-.73 2.3-.773 2.396-.823 2.582q-1.295 4.059-2.599 8.113l-1.7 5.32q-1.263 3.96-2.53 7.92A6315 6315 0 0 0 301 302h-36a1564 1564 0 0 1 15.415-49.896c3.9-11.935 7.68-23.904 11.376-35.904.38-1.227.76-2.455 1.15-3.72l.99-3.221c1.244-3.792 2.668-7.523 4.069-11.259h155l3-11c1.172-4.032 2.398-8.047 3.625-12.062l.945-3.124.907-2.974.815-2.676C463 164 463 164 464 162H310c3.38-13.52 3.38-13.52 4.79-17.95.3-.949.602-1.898.913-2.876l.922-2.862.945-2.99c2.701-8.445 2.701-8.445 9.874-8.462" />
              {/* I letter */}
              <Path fill="#FEFEFE" d="M538 127h36c-5.06 18.282-10.355 36.481-15.761 54.663q-3.493 11.753-6.973 23.509l-.695 2.345a5563 5563 0 0 0-12.733 43.724c-3.16 11-6.35 21.984-9.75 32.913-1.84 5.924-3.452 11.848-5.088 17.846h-36c2.25-10.128 2.25-10.128 3.445-14.363l.813-2.893.867-3.057.922-3.267Q494.52 273.21 496 268l.995-3.522c3.642-12.89 7.352-25.75 11.292-38.551 2.471-8.055 4.817-16.144 7.15-24.24a1571 1571 0 0 1 9.528-31.786c3.192-10.301 6.185-20.658 9.154-31.026l1.096-3.812.972-3.403C537 129 537 129 538 127" />
              {/* Orange stripe */}
              <Path fill="#ED7B22" d="M601 130h2l1.398 3.116q3.3 7.35 6.602 14.696l1.216 2.708c4.449 9.896 8.911 19.786 13.436 29.648l1.106 2.412q2.594 5.652 5.201 11.298c2.901 6.3 5.752 12.567 8.041 19.122a504 504 0 0 1-3.312 3.938l-1.864 2.214C633 221 633 221 630 222l-.812 1.688c-1.72 3.35-4.274 5.936-7.188 8.312h-2v2h-2v2h-2l-.75 1.734c-1.443 2.616-3.132 4.414-5.25 6.516l-2.125 2.14C606 248 606 248 604 248v2h-2v2h-2c-.245.57-.49 1.138-.741 1.725-1.485 2.683-3.235 4.505-5.402 6.676l-2.588 2.608-2.8 2.788-2.87 2.875q-3 3.006-6.012 6.001a2398 2398 0 0 0-7.707 7.715 2668 2668 0 0 1-5.924 5.924q-2.115 2.115-4.225 4.235l-2.588 2.57-2.284 2.277C555 299 555 299 553 299c2.887-11.806 6.003-23.538 9.25-35.25l.792-2.863c6.07-21.908 12.298-43.772 18.53-65.634q1.194-4.185 2.383-8.371c10.91-38.35 10.91-38.35 17.045-56.882" />
              {/* Green stripe */}
              <Path fill="#0E7F3B" d="M629 130c3 1 3 1 4.223 2.955l1.195 2.576c.445.947.89 1.895 1.35 2.87l1.42 3.099 1.484 3.169q2.176 4.66 4.328 9.331 2.024 4.379 4.063 8.75l.954 2.048c2.446 5.193 5.094 10.263 7.795 15.327a839 839 0 0 1 11.438 22.313l1.523 2.998 1.368 2.81 1.235 2.49C672 213 672 213 671.22 215.177c-1.4 2.093-2.932 3.8-4.72 5.573l-1.844 1.86C663 224 663 224 661 224l-.812 1.938C659 228 659 228 656 229l-1 3h-2v2c-1.375 1.625-1.375 1.625-3 3h-2l-.655 1.639c-1.815 3.187-4.282 5.576-6.865 8.14l-1.705 1.715a1892 1892 0 0 1-5.587 5.584q-1.94 1.942-3.879 3.884a5063 5063 0 0 1-8.13 8.12 4391 4391 0 0 0-10.432 10.438 4877 4877 0 0 1-8.009 8.01 2335 2335 0 0 0-3.846 3.85 1673 1673 0 0 1-5.372 5.36l-1.613 1.624C588.23 299 588.23 299 586 299c.5-6.893 1.65-13.331 3.438-20q.657-2.5 1.308-5l.648-2.477c.629-2.618 1.108-5.24 1.579-7.89.7-3.604 1.413-6.053 4.027-8.758l1.563-1.695C600 252 600 252 602 252v-2h2v-2c1.61-1.55 1.61-1.55 3.75-3.312 3.168-2.676 5.68-5.427 8.25-8.688h2v-2h2v-2c1.574-1.55 1.574-1.55 3.688-3.312C629.335 223.874 634.23 218.666 639 213a1178 1178 0 0 0-10.5-24.625l-1.395-3.195-1.386-3.157-1.344-3.086C623 176 623 176 621.438 173.353c-3.561-6.064-3.561-6.064-3.208-9.756.78-2.605 1.754-5.074 2.77-7.597a312 312 0 0 0 1.79-6.156c.3-1.042.602-2.083.913-3.156q.936-3.234 1.867-6.47l.907-3.124c.268-.932.537-1.863.815-2.823C628 132 628 132 629 130" />
            </Svg>
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
      <Svg width={36} height={36} viewBox="960 95 280 235">
        <Path fill="#3C7EE2" d="M1175.141 119.308q3.907 2.311 7.824 4.606c6.568 3.85 13.125 7.715 19.637 11.66a280 280 0 0 0 5.421 3.133c13.766 7.8 23.205 17.435 28.32 32.758 4.966 19.18-.656 34.531-10.28 50.91-2.328 3.892-4.69 7.76-7.063 11.625-4.213 6.893-8.168 13.888-12 21a2200 2200 0 0 1-6.937 12.688c-.583 1.075-1.165 2.15-1.764 3.26-5.414 9.79-10.775 17.578-21.299 22.052-2.875.813-2.875.813-6 1l-2.496.188c-6.931.307-11.45-.966-17.504-4.188a770 770 0 0 0-3.672-1.824A1180 1180 0 0 1 1137 283c-2.467 2.27-4.113 4.617-5.812 7.5l-1.583 2.684a365 365 0 0 0-4.605 8.378c-4.152 7.657-8.44 14.624-15 20.438h-2v2c-12.703 7.848-25.855 12.484-41 9-2.451-.845-4.651-1.87-7-3a247 247 0 0 0-6-2v-2l-1.723-.809c-3.189-1.668-6.031-3.767-8.96-5.851-2.317-1.34-2.317-1.34-4.644-1.758-2.983-.65-5.11-1.735-7.763-3.238l-2.913-1.637L1025 311l-5.754-3.219-5.808-3.281c-.964-.543-1.928-1.085-2.92-1.645-22.33-12.617-41.493-23.667-48.807-49.953-.813-3.318-1.449-6.492-1.711-9.902l-.312-3.875c.26-13.993 5.706-26.124 12.312-38.125q1.385-2.577 2.766-5.156c5.98-11.116 12.172-22.107 18.48-33.04 1.716-2.976 3.4-5.965 5.04-8.984 4.797-8.797 9.435-16.423 19.155-20.144 11.599-3.064 19.951.662 29.856 6.326A443 443 0 0 1 1054 144l.273-2.078c.89-3.58 2.503-6.517 4.352-9.672l1.086-1.87c3.036-5.132 6.366-9.88 10.289-14.38l1.605-1.855c31.246-33.62 71.299-13.932 103.536 5.163" />
        <Path fill="#F3B606" d="m1211.793 140.586 2.395 1.789 2.417 1.773L1219 146l2.516 1.848c10.23 8.863 15.586 22.012 16.757 35.238.616 19.922-9.2 34.51-19.273 50.914-4.213 6.893-8.168 13.888-12 21a2200 2200 0 0 1-6.937 12.688c-.583 1.075-1.165 2.15-1.764 3.26-5.414 9.79-10.775 17.578-21.299 22.052-2.875.813-2.875.813-6 1l-2.496.188c-6.931.307-11.45-.966-17.504-4.188a770 770 0 0 0-3.672-1.824A1180 1180 0 0 1 1137 283c-2.467 2.27-4.113 4.617-5.812 7.5l-1.583 2.684a365 365 0 0 0-4.605 8.378c-4.152 7.657-8.44 14.624-15 20.438h-2v2c-12.703 7.848-25.855 12.484-41 9-2.451-.845-4.651-1.87-7-3a247 247 0 0 0-6-2v-2l-1.625-.687c-10.54-5.825-16.284-16.896-19.625-28.125-2.068-9.407-1.045-19.186 2.25-28.188 1.605-2.344 1.605-2.344 3-4 3.473 1.267 6.219 2.748 9.188 4.938 8.047 5.458 16.72 7.409 26.28 5.593 11.388-2.952 18.154-9.247 24.097-19.135a600 600 0 0 0 4.935-8.896c4.766-8.63 9.621-17.193 14.625-25.687a829 829 0 0 0 14.398-25.575c28.657-52.932 28.657-52.932 44.91-58.515 10.867-2.202 25.467-2.755 35.36 2.863" />
        <Path fill="#359C50" d="M1175.141 119.308q3.907 2.311 7.824 4.606c7.37 4.32 14.724 8.667 22.035 13.086-2.974.875-5.473 1.068-8.562.922-10.508-.354-19.115-.452-28.438 5.078l-2.027 1.094c-9.181 5.625-14.142 17.482-19.098 26.594q-1.482 2.696-2.966 5.393-1.002 1.82-2.002 3.642a1446 1446 0 0 1-9.532 17.027l-1.602 2.83-3.185 5.618q-3.207 5.658-6.409 11.32l-3.223 5.691a1458 1458 0 0 0-8.604 15.408l-1.854 3.354a1203 1203 0 0 0-3.478 6.343c-7.467 13.495-15.015 24.921-30.395 29.374-10.926 1.3-19.599-.708-28.52-7.286-2.28-1.518-4.537-2.465-7.105-3.402-5.258 9.32-6.538 19.893-4.277 30.34 1.953 6.776 4.646 12.646 8.277 18.66a217 217 0 0 1 2 4c-6.888-3.331-9.382-10.183-12-17-3.967-13.423-1.837-26.638 4.507-38.917a428 428 0 0 1 5.368-9.208q1.513-2.574 3.022-5.15 1.03-1.76 2.064-3.517c3.459-5.894 6.785-11.858 10.101-17.833 3.541-6.372 7.119-12.716 10.82-18.996.32-.54.32-.54 1.93-3.273q1.82-3.076 3.659-6.142c5.686-9.598 8.938-17.58 7.529-28.964-3.578-12.446-14.694-17.645-25.254-23.496L1053 145c6.368-18.143 18.688-35.16 36.25-43.812 32.529-13.505 58.2 1.718 85.891 18.12" />
        <Path fill="#CB3A2D" d="m1211.793 140.586 2.395 1.789 2.417 1.773L1219 146l2.516 1.848c10.23 8.863 15.586 22.012 16.757 35.238.616 19.922-9.2 34.51-19.273 50.914-4.213 6.893-8.168 13.888-12 21a2200 2200 0 0 1-6.937 12.688c-.583 1.075-1.165 2.15-1.764 3.26-5.414 9.79-10.775 17.578-21.299 22.052-2.875.813-2.875.813-6 1l-2.496.188c-6.926.307-11.476-.908-17.504-4.188q-1.947-1.026-3.895-2.047c-3.716-1.958-7.413-3.949-11.105-5.953 1.292-4.245 2.911-7.89 5.133-11.727l1.92-3.335 1.022-1.757a1387 1387 0 0 0 3.193-5.526q2.797-4.857 5.606-9.71c5.185-8.96 10.351-17.932 15.435-26.952q1.568-2.779 3.164-5.54c5.884-10.22 8.812-18.83 5.664-30.71-4.61-12.644-13.538-18.085-25.137-23.743.998-7.774 6.85-14.608 12.813-19.437 12.54-8.289 33.44-10.665 46.98-2.977" />
      </Svg>
    </View>
  );
}

function PhonePeIcon() {
  return (
    <View style={icon.phonepe}>
      <Svg width={40} height={40} viewBox="1040 131 280 280" preserveAspectRatio="xMidYMid meet">
        <Path fill="#5C2E9B" d="m1271 166 2.86 2.402c4.49 3.857 4.49 3.857 6.14 5.598v2l3 1a123 123 0 0 1 5.625 7.063l1.614 2.182c21.168 29.168 30.652 64.36 26.011 100.255-3.582 20.557-10.765 40.768-23.613 57.36-1.963 2.566-3.825 5.197-5.7 7.827-5.708 7.845-12.908 14.805-20.937 20.313h-2l-1 3c-15.778 11.576-35.524 20.616-55 23q-3 .492-6 1c-16.987 2.506-34.55 1.423-51.043-3.191a178 178 0 0 0-5.695-1.461c-7.336-1.795-13.63-4.772-20.262-8.348l-2.922-1.547c-12.796-6.857-12.796-6.857-16.078-9.453v-2l-1.707-.785c-2.538-1.345-4.704-2.903-6.98-4.652l-2.387-1.81C1093 364 1093 364 1092 361c-2.062-1.187-2.062-1.187-4-2v-2l-3-1c-3-3.444-3-3.444-3-6h-2a90 90 0 0 1-4.25-5.812l-1.22-1.796c-18.87-28.148-27.78-64.006-21.28-97.642A283 283 0 0 1 1055 238l.844-3.668c6.886-28.641 24.104-54.08 47.156-72.332h2v-2c1.398-1.126 1.398-1.126 3.375-2.355l2.212-1.377c.796-.48 1.593-.96 2.413-1.456l2.468-1.492c49.067-29.089 112.205-24.686 155.532 12.68" />
        <Path fill="#F1EFF7" d="m1170 171.25 1.938.203c5.038 1.336 7.944 4.278 11.062 8.297a380 380 0 0 0 11.375 13.625c3.712 4.259 7.411 8.525 11.045 12.851a297 297 0 0 0 2.789 3.255c2.036 2.35 3.871 4.648 5.514 7.292 1.95 2.923 3.21 4.458 6.277 6.227 4.477.78 8.965.849 13.5.753 6.864-.117 6.864-.117 10.582 2.009 3.259 3.803 3.056 7.038 3.043 11.926l.008 2.949C1247 243 1247 243 1246 244a69 69 0 0 1-4.473.098l-2.724-.01-2.866-.025-2.876-.014q-3.53-.018-7.061-.049l.003 1.7q.033 20.442.049 40.884.007 9.885.023 19.77.016 9.533.02 19.063.003 3.645.01 7.29.01 5.088.009 10.174l.01 3.077-.004 2.784.003 2.433C1226 353 1226 353 1225 354c-2.43.127-4.82.185-7.25.188l-2.027.037c-4.026.011-7.138-.36-10.723-2.225-2.906-2.906-2.966-5.053-3.114-9.116l.016-3.618.01-3.926.025-4.09q.008-2.068.014-4.137.018-5.056.049-10.113l-2.508 1.072c-6.828 2.794-12.657 4.78-20.054 4.553l-2.447-.04c-9.535-.376-18.368-3.5-24.991-10.585-8.918-11.91-11.19-23.732-11.098-38.312l.005-2.59c.005-2.699.018-5.398.03-8.098q.008-2.764.014-5.527.017-6.736.049-13.473l-3.14.14q-2.055.057-4.11.11l-2.066.102c-3.498.067-5.315-.067-8.121-2.235-3.558-4.82-2.926-11.345-2.563-17.117 1.871-1.871 5.042-1.174 7.54-1.205l2.069-.03q3.4-.046 6.801-.081l4.704-.063q6.203-.082 12.404-.153 6.324-.077 12.648-.161 12.417-.162 24.834-.307a5562 5562 0 0 0-9-9.062l-2.543-2.569c-4.45-4.468-8.962-8.777-13.746-12.885-2.162-1.875-4.196-3.855-6.211-5.886l-2.246-2.256-2.254-2.28-2.348-2.36A3307 3307 0 0 1 1148 180c1.697-3.846 1.697-3.846 4.426-5.23l2.887-.958 2.863-.98c4.041-1.19 7.61-2.092 11.824-1.582" />
        <Path fill="#5B2D9B" d="M1166 244h36c.161 6.55.3 13.091.385 19.641q.052 3.337.143 6.675c.085 3.208.125 6.413.156 9.622l.11 2.99c.003 6.483-1.368 9.82-5.866 14.51-4.888 3.96-10.014 4.85-16.178 4.437-5.447-.801-8.417-2.237-11.937-6.562-3.558-6.503-4.112-12.829-4.043-20.083v-2.432q.006-2.522.024-5.045c.019-2.576.02-5.152.02-7.728l.018-4.92.003-2.33c.029-3.184.15-5.731 1.165-8.775" />
      </Svg>
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
    alignItems: "center",
    justifyContent: "center",
  },
  phonepe: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
