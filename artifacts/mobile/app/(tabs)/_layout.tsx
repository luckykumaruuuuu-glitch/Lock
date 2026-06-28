import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useRef, useEffect } from "react";
import { Animated, Platform } from "react-native";

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

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#FFD580",
        tabBarInactiveTintColor: "#6B6B6B",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === "web" ? 84 : 70,
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
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name="settings" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
