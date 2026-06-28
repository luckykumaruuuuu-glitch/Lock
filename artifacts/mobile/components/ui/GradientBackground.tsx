import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";

interface GradientBackgroundProps {
  children: React.ReactNode;
  colors?: readonly [string, string, ...string[]];
}

const DEFAULT_COLORS = ["#080014", "#16082E", "#0D1535"] as const;

export function GradientBackground({
  children,
  colors = DEFAULT_COLORS,
}: GradientBackgroundProps) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
