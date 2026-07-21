/**
 * ReelsGlow.tsx — View-based glow fallback for web.
 * Metro picks this file when targeting web; native gets ReelsGlow.native.tsx.
 * Skia is NOT imported here so it never enters the web bundle.
 */
import React from "react";
import { StyleSheet, View } from "react-native";

interface Props {
  glowBaseColor: string;
}

export default function ReelsGlow({ glowBaseColor }: Props) {
  return (
    <View style={styles.glowWrap} pointerEvents="none">
      <View style={[styles.ring, { width: 280, height: 280, borderRadius: 140, backgroundColor: glowBaseColor, opacity: 0.07 }]} />
      <View style={[styles.ring, { width: 200, height: 200, borderRadius: 100, backgroundColor: glowBaseColor, opacity: 0.11 }]} />
      <View style={[styles.ring, { width: 140, height: 140, borderRadius: 70,  backgroundColor: glowBaseColor, opacity: 0.16 }]} />
      <View style={[styles.ring, { width: 90,  height: 90,  borderRadius: 45,  backgroundColor: "#FFE9B0",     opacity: 0.12 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  glowWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 80,
  },
  ring: {
    position: "absolute",
  },
});
