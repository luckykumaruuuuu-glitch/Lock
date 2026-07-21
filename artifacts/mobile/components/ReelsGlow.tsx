/**
 * ReelsGlow.tsx — SVG RadialGradient glow for web.
 * Metro picks this file when targeting web; native gets ReelsGlow.native.tsx.
 * react-native-svg renders as a native <svg> element on web, giving a true
 * continuous radial gradient with zero banding — no Skia needed here.
 */
import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

interface Props {
  glowBaseColor: string;
}

export default function ReelsGlow({ glowBaseColor }: Props) {
  const { width, height } = useWindowDimensions();

  // Match the same centre offset as the native Skia version:
  // original glowWrap had marginBottom:80 → centre shifts up by 40 px
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
        {/* 12 stops with a smooth power-curve falloff — eliminates all banding */}
        <RadialGradient
          id="rg"
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
      </Defs>

      {/* Single circle — one gradient, no rings */}
      <Circle cx={cx} cy={cy} r={r} fill="url(#rg)" />
    </Svg>
  );
}
