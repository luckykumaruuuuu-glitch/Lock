import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#E8A030",
        tabBarInactiveTintColor: "rgba(255,255,255,0.25)",
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === "web" ? 84 : 70,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              intensity={40}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={["rgba(0,0,0,0.85)", "rgba(10,5,0,0.95)"]}
              style={[
                StyleSheet.absoluteFill,
                {
                  borderTopWidth: 1,
                  borderTopColor: "rgba(232,160,48,0.12)",
                },
              ]}
            />
          </View>
        ),
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          marginBottom: Platform.OS === "web" ? 8 : 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              {focused && (
                <LinearGradient
                  colors={["#E8A030", "#C47B2B"]}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Feather name="home" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              {focused && (
                <LinearGradient
                  colors={["#E8A030", "#C47B2B"]}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Feather name="settings" size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconWrap: {
    width: 44,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
