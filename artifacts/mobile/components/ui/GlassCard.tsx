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
  intensity = 20,
  borderColor = "rgba(255,255,255,0.1)",
  backgroundColor = "#1C1C1E",
  radius = 20,
  padding,
}: GlassCardProps) {
  const containerStyle: ViewStyle = {
    borderRadius: radius,
    borderWidth: 1,
    borderColor,
    overflow: "hidden",
    ...(padding !== undefined ? { padding } : {}),
  };

  return (
    <View
      style={[
        containerStyle,
        { backgroundColor },
        style,
      ]}
    >
      {children}
    </View>
  );
}
