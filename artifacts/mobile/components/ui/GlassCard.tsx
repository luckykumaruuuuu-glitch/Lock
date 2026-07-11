import React from "react";
import {
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
  borderColor,
  backgroundColor = "#1C1C1E",
  radius = 20,
  padding,
}: GlassCardProps) {
  return (
    <View
      style={[
        {
          borderRadius: radius,
          backgroundColor,
        },
        style,
      ]}
    >
      <View
        style={{
          borderRadius: radius,
          overflow: "hidden",
          backgroundColor,
          ...(padding !== undefined ? { padding } : {}),
        }}
      >
        {children}
      </View>
    </View>
  );
}
