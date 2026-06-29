import { LinearGradient } from "expo-linear-gradient";
import React, { useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

interface AnimatedButtonProps {
  onPress: () => void;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  variant?: "primary" | "accent" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
}

const GRADIENTS = {
  primary: ["#FFBF80", "#FFA660"] as const,
  accent: ["#FF6B35", "#E85A20"] as const,
  ghost: ["rgba(255,255,255,0.07)", "rgba(255,255,255,0.04)"] as const,
  danger: ["#CC4400", "#FF6B35"] as const,
  success: ["#3D9142", "#4CAF50"] as const,
};

const GLOW_COLORS = {
  primary: "#FFBF80",
  accent: "#FF6B35",
  ghost: "transparent",
  danger: "#CC4400",
  success: "#4CAF50",
};

const SIZES = {
  sm: { paddingVertical: 10, paddingHorizontal: 18, fontSize: 14, gap: 6 },
  md: { paddingVertical: 15, paddingHorizontal: 24, fontSize: 15, gap: 8 },
  lg: { paddingVertical: 18, paddingHorizontal: 28, fontSize: 17, gap: 10 },
};

export function AnimatedButton({
  onPress,
  label,
  icon,
  disabled = false,
  variant = "primary",
  size = "md",
  style,
  loading = false,
}: AnimatedButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function handlePressOut() {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }

  const sizeStyle = SIZES[size];
  const gradient = GRADIENTS[variant];
  const isGhost = variant === "ghost";
  const glowColor = GLOW_COLORS[variant];

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
          shadowColor: glowColor,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={styles.pressable}
        android_ripple={null}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.gradient,
            {
              paddingVertical: sizeStyle.paddingVertical,
              paddingHorizontal: sizeStyle.paddingHorizontal,
              borderWidth: isGhost ? 1 : 0,
              borderColor: isGhost ? "rgba(255,255,255,0.15)" : undefined,
            },
          ]}
        >
          {loading ? (
            <LoadingSpinner />
          ) : (
            <View style={[styles.inner, { gap: sizeStyle.gap }]}>
              {icon}
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: sizeStyle.fontSize,
                    color: isGhost ? "#FFFFFF" : "#000000",
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function LoadingSpinner() {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ).start();
    return () => rotateAnim.stopAnimation();
  }, [rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: Platform.OS === "android" ? "hidden" : "visible",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  disabled: { opacity: 0.4 },
  pressable: { borderRadius: 16, overflow: "hidden" },
  gradient: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  spinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.3)",
    borderTopColor: "#000000",
  },
});
