/**
 * ReelsGlow.native.tsx — SVG RadialGradient glow (Android + iOS).
 *
 * Uses react-native-svg (bundled in Expo Go, React-19-compatible).
 * Visually identical to ReelsGlow.tsx (web):
 *   • Same 11-stop power-curve falloff — no banding, no hard edges
 *   • Same centre: cx = screenWidth/2, cy = screenHeight/2 − 40
 *   • Same radius: 140 px
 *   • Same glowBaseColor opacities
 *   • Same warm golden centre highlight (r = 50)
 */
import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

interface Props {
  glowBaseColor: string;
}

export default function ReelsGlow({ glowBaseColor }: Props) {
  const { width, height } = useWindowDimensions();

  // Centre matches GLOW_Y_OFFSET = 40 in reels-lock.tsx
  const cx = width  / 2;
  const cy = height / 2 - 40;
  const r  = 140;

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      width={width}
      height={height}
    >
      <Defs>
        {/* Platform-colour glow — 11-stop power-curve, zero banding */}
        <RadialGradient
          id="rg_main"
          cx={cx}
          cy={cy}
          r={r}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0.00" stopColor={glowBaseColor} stopOpacity={0.24} />
          <Stop offset="0.10" stopColor={glowBaseColor} stopOpacity={0.22} />
          <Stop offset="0.20" stopColor={glowBaseColor} stopOpacity={0.20} />
          <Stop offset="0.30" stopColor={glowBaseColor} stopOpacity={0.17} />
          <Stop offset="0.40" stopColor={glowBaseColor} stopOpacity={0.14} />
          <Stop offset="0.50" stopColor={glowBaseColor} stopOpacity={0.11} />
          <Stop offset="0.60" stopColor={glowBaseColor} stopOpacity={0.08} />
          <Stop offset="0.70" stopColor={glowBaseColor} stopOpacity={0.05} />
          <Stop offset="0.80" stopColor={glowBaseColor} stopOpacity={0.03} />
          <Stop offset="0.90" stopColor={glowBaseColor} stopOpacity={0.01} />
          <Stop offset="1.00" stopColor={glowBaseColor} stopOpacity={0.00} />
        </RadialGradient>

        {/* Warm golden centre highlight */}
        <RadialGradient
          id="rg_gold"
          cx={cx}
          cy={cy}
          r={50}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0.00" stopColor="#FFE9B0" stopOpacity={0.19} />
          <Stop offset="1.00" stopColor="#FFE9B0" stopOpacity={0.00} />
        </RadialGradient>
      </Defs>

      {/* Platform-colour glow */}
      <Circle cx={cx} cy={cy} r={r}  fill="url(#rg_main)" />
      {/* Golden centre highlight */}
      <Circle cx={cx} cy={cy} r={50} fill="url(#rg_gold)" />
    </Svg>
  );
}
