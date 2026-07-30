import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useRef, useEffect, useState } from "react";
import { Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PermissionGuardPopup } from "@/components/ui/PermissionGuardPopup";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";

function AnimatedTabIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  color: string;
  focused: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Feather name={name} size={22} color={color} />
    </Animated.View>
  );
}

const TAB_HEIGHT = 60;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === "web" ? 84 : TAB_HEIGHT + insets.bottom;

  // ── App-level permission guard ────────────────────────────────────────────
  // Runs once when the user arrives at the tabs group (right after setup),
  // and re-checks whenever the app comes back to the foreground (AppState).
  // Lives here — not inside any individual tab — so it fires on the default
  // "Home" tab and is independent of which tab is currently active.
  // popupBypassed is session-only; it resets if the app is killed (intentional).
  const { missingPerms, recheck } = usePermissionGuard();
  const [popupBypassed, setPopupBypassed] = useState(false);

  return (
    <>
    <PermissionGuardPopup
      missing={popupBypassed ? [] : missingPerms}
      onRecheck={recheck}
      onBypass={() => setPopupBypassed(true)}
    />
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#FFBF80",
        tabBarInactiveTintColor: "#6B6B6B",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: tabBarHeight,
          paddingBottom: Platform.OS === "web" ? 0 : insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          marginBottom: Platform.OS === "web" ? 8 : 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="home-pro"
        options={{
          title: "Home Pro",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      {/* Settings is accessed via the profile-photo icon, not the tab bar */}
      <Tabs.Screen
        name="settings"
        options={{ href: null }}
      />
    </Tabs>
    </>
  );
}
