import { BlurView } from "expo-blur";
import React from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  borderColor?: string;
  backgroundColor?: string;
  radius?: number;
  padding?: number;
}

export function GlassCard({
  children,
  style,
  intensity = 30,
  borderColor = "rgba(255,255,255,0.15)",
  backgroundColor = "rgba(255,255,255,0.07)",
  radius = 24,
  padding,
}: GlassCardProps) {
  const containerStyle: ViewStyle = {
    borderRadius: radius,
    borderWidth: 1,
    borderColor,
    overflow: "hidden",
    ...(padding !== undefined ? { padding } : {}),
  };

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          containerStyle,
          {
            backgroundColor,
            // @ts-ignore — web-only CSS property
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <BlurView
        intensity={intensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor }]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}
