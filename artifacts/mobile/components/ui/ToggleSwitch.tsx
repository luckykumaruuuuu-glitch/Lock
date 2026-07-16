/**
 * ToggleSwitch — same track/dot geometry and spring animation as the Sound
 * toggle in Settings. Accepts custom colors so it can be reused anywhere with
 * different on/off palettes while keeping an identical visual feel.
 *
 * track: 44 × 26, borderRadius 13
 * dot  : 22 × 22, borderRadius 11, white, marginHorizontal 1
 * spring: tension 200, friction 10
 */
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  /** Track color when value is false. Default matches Sound toggle off. */
  trackColorOff?: string;
  /** Track color when value is true. Default matches Sound toggle on. */
  trackColorOn?: string;
}

export function ToggleSwitch({
  value,
  onValueChange,
  trackColorOff = "#3A3A3C",
  trackColorOn = "#FFBF80",
}: ToggleSwitchProps) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      tension: 200,
      friction: 10,
    }).start();
  }, [value, anim]);

  const dotPos = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 20] });
  const trackBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [trackColorOff, trackColorOn],
  });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackBg }]}>
        <Animated.View style={[styles.dot, { transform: [{ translateX: dotPos }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 44, height: 26, borderRadius: 13, justifyContent: "center" },
  dot:   { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF", marginHorizontal: 1 },
});
