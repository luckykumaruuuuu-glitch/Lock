import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width, height } = Dimensions.get("window");
const PARTICLE_COUNT = 26;

const COLORS = [
  "#6366F1",
  "#FF006E",
  "#00FF88",
  "#FF9500",
  "#A5B4FC",
  "#F9A8D4",
  "#FCD34D",
  "#34D399",
];

const SHAPES = ["●", "■", "★", "◆", "▲"];

interface Particle {
  id: number;
  x: number;
  startY: number;
  color: string;
  shape: string;
  size: number;
  delay: number;
  duration: number;
  rotMul: number;
}

const PARTICLES: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  x:
    (i / PARTICLE_COUNT) * width +
    (((i * 137) % 100) / 100 - 0.5) * (width / PARTICLE_COUNT) * 2,
  startY: -30 - (i % 5) * 12,
  color: COLORS[i % COLORS.length],
  shape: SHAPES[i % SHAPES.length],
  size: 8 + (i % 4) * 3,
  delay: (i % 8) * 80,
  duration: 1900 + (i % 6) * 200,
  rotMul: i % 2 === 0 ? 3 + (i % 3) : -(3 + (i % 3)),
}));

interface ParticlesProps {
  active: boolean;
}

export function Particles({ active }: ParticlesProps) {
  const anims = useRef(
    PARTICLES.map(() => ({
      y: new Animated.Value(0),
      x: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotation: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!active) {
      anims.forEach((a) => {
        a.y.setValue(0);
        a.x.setValue(0);
        a.opacity.setValue(0);
        a.rotation.setValue(0);
      });
      return;
    }

    PARTICLES.forEach((p, i) => {
      const a = anims[i];
      a.y.setValue(0);
      a.x.setValue(0);
      a.opacity.setValue(0);
      a.rotation.setValue(0);

      Animated.sequence([
        Animated.delay(p.delay),
        Animated.parallel([
          Animated.timing(a.y, {
            toValue: height + 60,
            duration: p.duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(a.opacity, {
              toValue: 1,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.delay(p.duration - 500),
            Animated.timing(a.opacity, {
              toValue: 0,
              duration: 320,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(a.rotation, {
            toValue: p.rotMul,
            duration: p.duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(a.x, {
              toValue: (i % 2 === 0 ? 1 : -1) * 30,
              duration: p.duration / 2,
              useNativeDriver: true,
            }),
            Animated.timing(a.x, {
              toValue: (i % 2 === 0 ? -1 : 1) * 20,
              duration: p.duration / 2,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    });

    return () => {
      anims.forEach((a) => {
        a.y.stopAnimation();
        a.opacity.stopAnimation();
        a.rotation.stopAnimation();
        a.x.stopAnimation();
      });
    };
  }, [active, anims]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PARTICLES.map((p, i) => {
        const rotate = anims[i].rotation.interpolate({
          inputRange: [-10, 10],
          outputRange: ["-720deg", "720deg"],
        });
        return (
          <Animated.Text
            key={p.id}
            style={{
              position: "absolute",
              left: p.x,
              top: p.startY,
              fontSize: p.size,
              color: p.color,
              opacity: anims[i].opacity,
              transform: [
                { translateY: anims[i].y },
                { translateX: anims[i].x },
                { rotate },
              ],
            }}
          >
            {p.shape}
          </Animated.Text>
        );
      })}
    </View>
  );
}
