/**
 * ReelsGlow.native.tsx — SVG RadialGradient glow (Android + iOS).
 *
 * Previously used @shopify/react-native-skia v1.12.4, which declares
 *   peerDependencies: { react: ">=18.0 <19.0.0", "react-native": ">=0.64 <0.78.0" }
 * This project runs React 19.1.0 + React Native 0.81.5, both outside that range.
 * Skia v1's bundled react-reconciler@0.27.0 reads React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
 * which React 19 removed, causing a fatal crash at module import time on Expo Go.
 *
 * Fix: use react-native-svg (bundled in Expo Go, fully React-19-compatible).
 * Visual output is identical — same centre, radius, colours, and gradient curve.
 * Upgrade path: when @shopify/react-native-skia is updated to v2.x (which
 * supports React 19), this file can be restored to the Skia implementation.
 */
import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

interface Props {
  glowBaseColor: string;
}

export default function ReelsGlow({ glowBaseColor }: Props) {
  const { width, height } = useWindowDimensions();

  // Exact same centre calculation as the original Skia version:
  //   cx = screenWidth  / 2
  //   cy = screenHeight / 2 − 40   (matches GLOW_Y_OFFSET in reels-lock.tsx)
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
        {/* Platform-colour glow — same 4-stop power-curve as the original Skia version */}
        <RadialGradient
          id="rg_main"
          cx={cx}
          cy={cy}
          r={r}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0.00" stopColor={glowBaseColor} stopOpacity={0.24} />
          <Stop offset="0.38" stopColor={glowBaseColor} stopOpacity={0.14} />
          <Stop offset="0.70" stopColor={glowBaseColor} stopOpacity={0.06} />
          <Stop offset="1.00" stopColor={glowBaseColor} stopOpacity={0.00} />
        </RadialGradient>

        {/* Warm golden centre highlight — same as the original Skia second circle */}
        <RadialGradient
          id="rg_gold"
          cx={cx}
          cy={cy}
          r={50}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0.00" stopColor="#FFE9B0" stopOpacity={0.188} />
          <Stop offset="1.00" stopColor="#FFE9B0" stopOpacity={0.000} />
        </RadialGradient>
      </Defs>

      {/* Platform-colour glow circle */}
      <Circle cx={cx} cy={cy} r={r} fill="url(#rg_main)" />
      {/* Golden centre highlight */}
      <Circle cx={cx} cy={cy} r={50} fill="url(#rg_gold)" />
    </Svg>
  );
}
