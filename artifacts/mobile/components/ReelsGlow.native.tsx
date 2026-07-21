/**
 * ReelsGlow.native.tsx — Skia RadialGradient glow (Android + iOS only).
 * Metro picks this file for native builds; web gets ReelsGlow.tsx instead.
 */
import { Canvas, Circle, RadialGradient, vec } from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";

interface Props {
  glowBaseColor: string;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

export default function ReelsGlow({ glowBaseColor }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // Nudge up 40 px (same visual offset as original marginBottom:80 on glowWrap)
  const cx = screenWidth  / 2;
  const cy = screenHeight / 2 - 40;
  const r  = 140;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Platform-colour glow — smooth GPU radial, zero banding */}
      <Circle cx={cx} cy={cy} r={r}>
        <RadialGradient
          c={vec(cx, cy)}
          r={r}
          colors={[
            hexWithAlpha(glowBaseColor, 0.24),
            hexWithAlpha(glowBaseColor, 0.14),
            hexWithAlpha(glowBaseColor, 0.06),
            hexWithAlpha(glowBaseColor, 0.00),
          ]}
          positions={[0, 0.38, 0.70, 1]}
        />
      </Circle>
      {/* Warm golden centre highlight */}
      <Circle cx={cx} cy={cy} r={50}>
        <RadialGradient
          c={vec(cx, cy)}
          r={50}
          colors={["#FFE9B030", "#FFE9B000"]}
        />
      </Circle>
    </Canvas>
  );
}
