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
  intensity = 25,
  borderColor = "rgba(196,123,43,0.28)",
  backgroundColor = "rgba(61,31,10,0.65)",
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
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
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
