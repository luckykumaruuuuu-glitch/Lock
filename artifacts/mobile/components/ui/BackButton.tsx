/**
 * BackButton — shared circular back-navigation button.
 *
 * Standard style used across the app:
 *   40×40 px circle, backgroundColor #1C1C1E, Feather arrow-left icon.
 *
 * Usage:
 *   import { BackButton } from "@/components/ui/BackButton";
 *   <BackButton onPress={() => router.back()} />
 *
 * Pass `style` to override positioning (e.g. absolute placement).
 */

import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";

interface BackButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function BackButton({ onPress, style }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "#1C1C1E",
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Feather name="arrow-left" size={22} color="#FFFFFF" />
    </Pressable>
  );
}
