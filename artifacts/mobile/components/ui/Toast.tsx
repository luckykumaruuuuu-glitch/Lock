import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: "success" | "error" | "warning" | "info";
  onHide?: () => void;
  duration?: number;
}

const TYPE_CONFIG = {
  success: {
    bg: "rgba(76,175,80,0.18)",
    border: "rgba(76,175,80,0.40)",
    icon: "check-circle" as const,
    color: "#4CAF50",
  },
  error: {
    bg: "rgba(204,68,0,0.18)",
    border: "rgba(204,68,0,0.40)",
    icon: "alert-circle" as const,
    color: "#FF6B35",
  },
  warning: {
    bg: "rgba(255,107,53,0.18)",
    border: "rgba(255,107,53,0.40)",
    icon: "alert-triangle" as const,
    color: "#FF6B35",
  },
  info: {
    bg: "rgba(196,123,43,0.18)",
    border: "rgba(196,123,43,0.40)",
    icon: "info" as const,
    color: "#E8943A",
  },
};

export function Toast({
  visible,
  message,
  type = "success",
  onHide,
  duration = 3000,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  const config = TYPE_CONFIG[type];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 200,
          friction: 14,
        }),
        Animated.spring(opacity, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 14,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 12,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -120,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => onHide?.());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, translateY, opacity, scale, onHide]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
          backgroundColor: config.bg,
          borderColor: config.border,
        },
      ]}
    >
      <Feather name={config.icon} size={18} color={config.color} />
      <Text style={[styles.message, { color: config.color }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
});
