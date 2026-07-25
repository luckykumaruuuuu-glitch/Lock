import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
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
  white: "#FFFFFF",
  softWhite: "#F5F5F7",
  muted: "#98989F",
  card: "#202020",
  cardTop: "#292929",
  lime: "#A8FF00",
  orange: "#FF6A4D",
};

type PlanId = "free" | "monthly" | "yearly";

export default function PaywallScreen() {
  // If the user arrived here by completing a task triggered from the Settings
  // toggle, finish the disable now (task was completed → toggle goes OFF).
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

  useEffect(() => {
    const countdown = setInterval(() => {
      setSecondsRemaining((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => clearInterval(countdown);
  }, []);

  const timeParts = useMemo(() => {
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;

    return [0, hours, minutes, seconds].map((part) => String(part).padStart(2, "0"));
  }, [secondsRemaining]);

  const horizontalPadding = width < 360 ? 14 : 18;
  const trialButtonText =
    selectedPlan === "free"
      ? "TRY FREE 3-DAYS TRIAL"
      : selectedPlan === "monthly"
        ? "CONTINUE WITH MONTHLY"
        : "CONTINUE WITH YEARLY";

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 22),
        },
      ]}
    >
      <View style={styles.statusBar}>
        <Text style={styles.statusTime}>9:41</Text>
        <View style={styles.dynamicIsland} />
        <View style={styles.statusIcons}>
          <Feather name="bar-chart-2" size={14} color={COLORS.white} />
          <Feather name="wifi" size={14} color={COLORS.white} />
          <View style={styles.battery}>
            <View style={styles.batteryLevel} />
          </View>
        </View>
      </View>

      <View style={[styles.topControls, { paddingHorizontal: horizontalPadding }]}>
        <Pressable
          accessibilityLabel="Close paywall"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <Feather name="x" size={23} color={COLORS.white} strokeWidth={1.7} />
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
          <Text style={styles.headlineGreen}>Create Headshots</Text>
          <Text style={styles.headlineWhite}>without limits</Text>
          <Text style={styles.subtitle}>
            Generate professional or unique portraits with various tools and styles
          </Text>
        </View>

        <View style={[styles.plans, { maxWidth: Math.min(width - horizontalPadding * 2, 410) }]}>
          <PlanCard
            planId="free"
            label="FREE TRIAL"
            title="Free"
            price="$0"
            perWeek="3 Days Free"
            selected={selectedPlan === "free"}
            badge="FREE"
            onPress={() => setSelectedPlan("free")}
          />
          <PlanCard
            planId="monthly"
            label="POPULAR"
            title="Monthly"
            price="$19.99"
            perWeek="$4.99/week"
            selected={selectedPlan === "monthly"}
            onPress={() => setSelectedPlan("monthly")}
          />
          <PlanCard
            planId="yearly"
            label="BEST DEAL"
            title="Yearly"
            price="$39.99"
            perWeek="$0.79/week"
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
          onPress={() => undefined}
          style={({ pressed }) => [styles.trialButton, pressed && styles.trialButtonPressed]}
        >
          <Text style={styles.trialButtonText}>{trialButtonText}</Text>
        </Pressable>
      </View>

      <Text
        style={styles.legal}
        accessibilityLabel="Terms of Service and Privacy Policy"
      >
        Terms of Service and Privacy Policy
      </Text>
    </View>
  );
}

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

function PlanCard({
  planId,
  label,
  title,
  price,
  perWeek,
  selected = false,
  badge,
  onPress,
}: PlanCardProps) {
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.black,
    alignItems: "center",
    minHeight: 640,
  },
  statusBar: {
    width: "100%",
    minHeight: 30,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },
  statusTime: {
    color: COLORS.white,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.1,
  },
  dynamicIsland: {
    position: "absolute",
    top: 0,
    left: "50%",
    width: 92,
    height: 25,
    marginLeft: -46,
    borderRadius: 16,
    backgroundColor: COLORS.black,
  },
  statusIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  battery: {
    width: 22,
    height: 11,
    borderWidth: 1.3,
    borderColor: COLORS.white,
    borderRadius: 3,
    padding: 1.5,
    justifyContent: "center",
  },
  batteryLevel: {
    width: "78%",
    height: "100%",
    borderRadius: 1,
    backgroundColor: COLORS.white,
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
  pressed: {
    opacity: 0.55,
  },
  content: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 92,
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
  planCardPressed: {
    opacity: 0.78,
  },
  planLabel: {
    color: "#BDBDBD",
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    lineHeight: 18,
    letterSpacing: 0,
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