import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const COLORS = {
  blue: "#1E71ED",
  green: "#50D05C",
  pink: "#F82681",
  yellow: "#FFBC32",
  mint: "#41AF80",
  white: "#FFFFFF",
} as const;

type SuccessConfettiAnimationProps = {
  size: number;
};

/**
 * Native version of the supplied success-confetti SVG.
 *
 * The source file uses SMIL tags (`animate`, `animateTransform`, `animateMotion`,
 * and `set`), which react-native-svg intentionally does not execute. The
 * vector geometry and palette are kept here while its timeline is driven by
 * React Native's native Animated implementation.
 */
export function SuccessConfettiAnimation({ size }: SuccessConfettiAnimationProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const blueScale = progress.interpolate({
    inputRange: [0, 0.108, 0.214, 0.284, 0.326, 0.354, 0.389, 1],
    outputRange: [0.2, 0.2, 1.1, 0.95, 1.02, 0.98, 1, 1],
  });
  const greenScale = progress.interpolate({
    inputRange: [0, 0.16, 0.24, 0.3, 1],
    outputRange: [0.08, 0.08, 1.05, 0.98, 1],
  });
  const greenOpacity = progress.interpolate({
    inputRange: [0, 0.14, 0.2, 0.33, 1],
    outputRange: [0, 0, 1, 1, 1],
  });
  const checkOpacity = progress.interpolate({
    inputRange: [0, 0.31, 0.37, 0.72, 1],
    outputRange: [0, 0, 1, 1, 0],
  });
  const checkDraw = progress.interpolate({
    inputRange: [0, 0.34, 0.63, 1],
    outputRange: [460, 460, 0, 0],
  });

  const confettiOpacity = (start: number, end: number) =>
    progress.interpolate({
      inputRange: [0, start, start + 0.04, end, Math.min(end + 0.16, 1)],
      outputRange: [0, 0, 1, 1, 0],
    });
  const travel = (amount: number, start: number, end: number) =>
    progress.interpolate({
      inputRange: [0, start, end, 1],
      outputRange: [0, 0, amount, amount],
    });

  return (
    <View pointerEvents="none" style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={[styles.layer, { transform: [{ scale: blueScale }] }]}>
        <Svg width={size} height={size} viewBox="-960 -960 1920 1920">
          <Circle cx="0" cy="0" r="346.667" fill={COLORS.blue} />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.layer, { opacity: greenOpacity, transform: [{ scale: greenScale }] }]}>
        <Svg width={size} height={size} viewBox="-960 -960 1920 1920">
          <Circle cx="0" cy="0" r="346.667" fill={COLORS.green} />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.layer, { opacity: checkOpacity }]}>
        <Svg width={size} height={size} viewBox="-960 -960 1920 1920">
          <AnimatedPath
            d="M-153.033 0.588 L-51.404 102.218 L151.749 -100.935"
            fill="none"
            stroke={COLORS.white}
            strokeWidth="55"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="460 460"
            strokeDashoffset={checkDraw}
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.layer,
          {
            opacity: confettiOpacity(0.06, 0.31),
            transform: [{ translateX: travel(18, 0.08, 0.26) }, { translateY: travel(-28, 0.08, 0.26) }, { rotate: "-18deg" }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="-960 -960 1920 1920">
          <Path
            fill={COLORS.mint}
            d="M30.522 0C30.522 16.856 16.856 30.522 0 30.522S-30.522 16.856-30.522 0-16.856-30.522 0-30.522 30.522-16.856 30.522 0Z"
            transform="translate(420 -440) scale(2.4)"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.layer,
          {
            opacity: confettiOpacity(0.07, 0.3),
            transform: [{ translateX: travel(32, 0.09, 0.27) }, { translateY: travel(-7, 0.09, 0.27) }, { rotate: "24deg" }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="-960 -960 1920 1920">
          <Path
            fill={COLORS.blue}
            d="M28.859 29.054 10.733 39.519a9.22 9.22 0 0 1-12.093-3.281l-32.73-56.691a9.22 9.22 0 0 1 3.281-12.094l18.127-10.466a9.22 9.22 0 0 1 12.093 3.281l32.73 56.691a9.22 9.22 0 0 1-3.282 12.095Z"
            transform="translate(560 -210) scale(1.45)"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.layer,
          {
            opacity: confettiOpacity(0.06, 0.3),
            transform: [{ translateX: travel(-28, 0.09, 0.28) }, { translateY: travel(-30, 0.09, 0.28) }, { rotate: "-42deg" }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="-960 -960 1920 1920">
          <Path
            fill={COLORS.pink}
            d="M30.521 0C30.521 16.856 16.856 30.521 0 30.521S-30.521 16.856-30.521 0-16.856-30.521 0-30.521 30.521-16.856 30.521 0Z"
            transform="translate(-430 -470) scale(2.1)"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.layer,
          {
            opacity: confettiOpacity(0.07, 0.32),
            transform: [{ translateX: travel(34, 0.1, 0.29) }, { translateY: travel(29, 0.1, 0.29) }, { rotate: "12deg" }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="-960 -960 1920 1920">
          <Path
            fill={COLORS.yellow}
            d="M-17.558-36.37c9.853-7.353 23.862-.216 23.705 12.078l-.055 4.305c-.063 4.882 2.28 9.482 6.266 12.301l3.516 2.486c10.038 7.099 7.579 22.626-4.161 26.276l-4.112 1.278a15.42 15.42 0 0 0-9.76 9.761l-1.279 4.112c-3.649 11.74-19.177 14.199-26.276 4.161l-2.487-3.515c-2.819-3.986-7.419-6.33-12.301-6.267l-4.306.055c-12.292.157-19.43-13.85-12.077-23.705l2.576-3.451c2.92-3.912 3.727-9.011 2.159-13.635l-1.383-4.077c-3.948-11.644 7.168-22.76 18.812-18.812l4.077 1.383c4.624 1.568 9.723.761 13.635-2.159Z"
            transform="translate(380 430) scale(1.55)"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.layer,
          {
            opacity: confettiOpacity(0.08, 0.32),
            transform: [{ translateX: travel(-34, 0.1, 0.3) }, { translateY: travel(25, 0.1, 0.3) }, { rotate: "-26deg" }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="-960 -960 1920 1920">
          <Path
            fill={COLORS.green}
            d="M-17.558-36.37c9.853-7.353 23.862-.216 23.705 12.078l-.055 4.305c-.063 4.882 2.28 9.482 6.266 12.301l3.516 2.486c10.038 7.099 7.579 22.626-4.161 26.276l-4.112 1.278a15.42 15.42 0 0 0-9.76 9.761l-1.279 4.112c-3.649 11.74-19.177 14.199-26.276 4.161l-2.487-3.515c-2.819-3.986-7.419-6.33-12.301-6.267l-4.306.055c-12.292.157-19.43-13.85-12.077-23.705l2.576-3.451c2.92-3.912 3.727-9.011 2.159-13.635l-1.383-4.077c-3.948-11.644 7.168-22.76 18.812-18.812l4.077 1.383c4.624 1.568 9.723.761 13.635-2.159Z"
            transform="translate(-380 410) scale(1.35)"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});