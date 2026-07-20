/**
 * jump.tsx — "Jump" challenge screen for DuckLock unlock tasks.
 *
 * Uses MediaPipe pose detection (expo-pose-detection custom module) +
 * react-native-vision-camera + @shopify/react-native-skia to:
 *   • Show live camera feed
 *   • Overlay 33-keypoint skeleton in real time
 *   • Count squats/jumps by tracking knee-angle state machine
 *   • Redirect to /coming-soon once TARGET_REPS are completed
 *
 * ⚠️  Requires a real APK / dev-client build — camera & native modules
 *     are unavailable on web. Web shows a graceful "not available" card.
 *
 * To change difficulty, edit TARGET_REPS below.
 */

import { router } from "expo-router";
import { getUnlockDestination } from "@/lib/unlockFlowState";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

// ─── Target reps — change freely ─────────────────────────────────────────────
const TARGET_REPS = 10;

// ─── MediaPipe keypoint indices (33-point body model) ────────────────────────
const KP = {
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

// Skeleton connections to draw (MediaPipe standard)
const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 23], [12, 24],
  [23, 24],
  [23, 25], [25, 27],
  [24, 26], [26, 28],
  [27, 29], [28, 30],
  [29, 31], [30, 32],
];

// ─── Angle math ───────────────────────────────────────────────────────────────
function angleDeg(
  p1: { x: number; y: number; z?: number },
  vertex: { x: number; y: number; z?: number },
  p3: { x: number; y: number; z?: number }
): number {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
  const v2 = { x: p3.x - vertex.x, y: p3.y - vertex.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
  if (mag1 === 0 || mag2 === 0) return 90;
  return (Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * 180) / Math.PI;
}

// ─── Squat counter hook ───────────────────────────────────────────────────────
const SQUAT_DOWN_THRESHOLD = 100; // degrees — fully squatted
const STAND_UP_THRESHOLD = 150;  // degrees — back to standing

type Phase = "standing" | "squatting";

function useSquatCounter(onComplete: () => void) {
  const [reps, setReps] = useState(0);
  const phase = useRef<Phase>("standing");
  const completed = useRef(false);

  const processLandmarks = useCallback(
    (landmarks: Array<{ x: number; y: number; z: number; visibility: number } | null>) => {
      if (completed.current) return;

      const lHip   = landmarks[KP.LEFT_HIP];
      const lKnee  = landmarks[KP.LEFT_KNEE];
      const lAnkle = landmarks[KP.LEFT_ANKLE];
      const rHip   = landmarks[KP.RIGHT_HIP];
      const rKnee  = landmarks[KP.RIGHT_KNEE];
      const rAnkle = landmarks[KP.RIGHT_ANKLE];

      if (!lHip || !lKnee || !lAnkle || !rHip || !rKnee || !rAnkle) return;
      if (lKnee.visibility < 0.5 && rKnee.visibility < 0.5) return;

      // Average left + right knee angles
      const leftAngle  = angleDeg(lHip, lKnee, lAnkle);
      const rightAngle = angleDeg(rHip, rKnee, rAnkle);
      const avgAngle   = (leftAngle + rightAngle) / 2;

      if (phase.current === "standing" && avgAngle < SQUAT_DOWN_THRESHOLD) {
        phase.current = "squatting";
      } else if (phase.current === "squatting" && avgAngle > STAND_UP_THRESHOLD) {
        phase.current = "standing";
        setReps((prev) => {
          const next = prev + 1;
          if (next >= TARGET_REPS && !completed.current) {
            completed.current = true;
            onComplete();
          }
          return next;
        });
      }
    },
    [onComplete]
  );

  return { reps, processLandmarks };
}

// ─── Web fallback ─────────────────────────────────────────────────────────────
function WebFallback() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Feather name="chevron-left" size={26} color="#FFFFFF" />
      </Pressable>

      <View style={styles.fallbackCenter}>
        <Text style={styles.fallbackIcon}>📱</Text>
        <Text style={styles.fallbackTitle}>Device Only</Text>
        <Text style={styles.fallbackBody}>
          The Jump challenge uses your camera and pose{"\n"}
          detection — it's only available on the{"\n"}
          Android app (real build / dev-client).
        </Text>
      </View>
    </View>
  );
}

// ─── Native jump screen ───────────────────────────────────────────────────────
function NativeJumpScreen() {
  const insets = useSafeAreaInsets();

  // Lazy-import NON-HOOK exports only.
  // Hooks (useCameraPermission, useCameraDevice, useFrameProcessor) must NOT be
  // stored in state — they must be called via require() directly in JumpCamera
  // so React's dispatcher sees them as normal top-level hook calls.
  const [Native, setNative] = useState<{
    Camera: any;
    VisionCameraProxy: any;
    Canvas: any;
    Line: any;
    Circle: any;
    vec: any;
    addPoseLandmarksListener: any;
    removePoseLandmarksListeners: any;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const [vc, skia, pose] = await Promise.all([
        import("react-native-vision-camera"),
        import("@shopify/react-native-skia"),
        import("../modules/expo-pose-detection"),
      ]);
      setNative({
        Camera: vc.Camera,
        VisionCameraProxy: vc.VisionCameraProxy,
        Canvas: skia.Canvas,
        Line: skia.Line,
        Circle: skia.Circle,
        vec: skia.vec,
        addPoseLandmarksListener: pose.addPoseLandmarksListener,
        removePoseLandmarksListeners: pose.removePoseLandmarksListeners,
      });
    })();
  }, []);

  if (!Native) {
    return (
      <View style={[styles.root, styles.centerContent]}>
        <Text style={styles.statusText}>Loading camera…</Text>
      </View>
    );
  }

  return <JumpCamera insets={insets} Native={Native} />;
}

// ─── Camera + skeleton component (native only) ────────────────────────────────
function JumpCamera({ insets, Native }: { insets: any; Native: any }) {
  const {
    Camera, VisionCameraProxy, Canvas, Line, Circle, vec,
    addPoseLandmarksListener, removePoseLandmarksListeners,
  } = Native;

  // ── Call hooks via require() — Metro's require() is synchronous and the
  //    module is already in the bundle cache after the async import() above.
  //    This guarantees React's dispatcher receives real hook calls at the top
  //    level of this component, NOT stored function references from state.
  const { useCameraPermission, useCameraDevice, useFrameProcessor } =
    require("react-native-vision-camera");

  const { hasPermission, requestPermission } = useCameraPermission();

  // ── Auto-request permission on mount so the native system dialog fires
  //    immediately when the screen opens — no manual tap required.
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run only once on mount

  // ── Camera facing toggle: front ↔ back ────────────────────────────────────
  const [cameraFacing, setCameraFacing] = useState<"front" | "back">("front");
  const device = useCameraDevice(cameraFacing);

  const toggleCamera = useCallback(() => {
    setCameraFacing((prev) => (prev === "front" ? "back" : "front"));
  }, []);

  const [landmarks, setLandmarks] = useState<Array<{
    x: number; y: number; z: number; visibility: number;
  } | null>>([]);
  const [modelStatus, setModelStatus] = useState("Initializing model…");
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  const handleComplete = useCallback(() => {
    setTimeout(() => router.replace(getUnlockDestination()), 500);
  }, []);

  const { reps, processLandmarks } = useSquatCounter(handleComplete);

  // Subscribe to landmark events from the native module
  useEffect(() => {
    const sub = addPoseLandmarksListener((event: { landmarks: any[][] }) => {
      if (!event.landmarks || event.landmarks.length === 0) return;
      const raw: any[] = event.landmarks[0];
      const normalized = new Array(33).fill(null);
      raw.forEach((lm, i) => {
        if (lm && i < 33) normalized[i] = lm;
      });
      setLandmarks(normalized);
      processLandmarks(normalized);
    });
    return () => {
      sub.remove();
    };
  }, [processLandmarks]);

  // Frame processor — triggers the native poseLandmarks plugin on each frame
  const plugin = useRef<any>(null);
  useEffect(() => {
    try {
      plugin.current = VisionCameraProxy.initFrameProcessorPlugin("poseLandmarks", {});
    } catch (e) {
      console.warn("[JumpScreen] Could not init poseLandmarks plugin:", e);
    }
  }, [VisionCameraProxy]);

  const frameProcessor = useFrameProcessor(
    (frame: any) => {
      "worklet";
      if (plugin.current != null) {
        plugin.current.call(frame);
      }
    },
    [plugin]
  );

  // ── Permission denied (user explicitly denied in the system dialog) ────────
  // hasPermission stays false only after the system dialog is dismissed with
  // "Deny". Show a minimal prompt so the user can open Settings manually.
  if (!hasPermission) {
    return (
      <View style={[styles.root, styles.centerContent, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={26} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.permTitle}>Camera Permission Denied</Text>
        <Text style={styles.permBody}>
          Please enable Camera access for DuckLock in{"\n"}
          Android Settings → Apps → DuckLock → Permissions.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={({ pressed }) => [styles.permBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.permBtnText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[styles.root, styles.centerContent, { paddingTop: insets.top }]}>
        <Text style={styles.statusText}>No camera found on this device.</Text>
      </View>
    );
  }

  const W = screenSize.width;
  const H = screenSize.height;

  return (
    <View
      style={styles.root}
      onLayout={(e) =>
        setScreenSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }
    >
      {/* Camera feed */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        frameProcessor={frameProcessor}
      />

      {/* Skeleton overlay — Skia Canvas */}
      {W > 0 && H > 0 && landmarks.length > 0 && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Skeleton bones */}
          {POSE_CONNECTIONS.map(([from, to], i) => {
            const lm1 = landmarks[from];
            const lm2 = landmarks[to];
            if (!lm1 || !lm2) return null;
            if (lm1.visibility < 0.4 || lm2.visibility < 0.4) return null;
            return (
              <Line
                key={`bone-${i}`}
                p1={vec(lm1.x * W, lm1.y * H)}
                p2={vec(lm2.x * W, lm2.y * H)}
                color="rgba(100,255,100,0.85)"
                strokeWidth={2.5}
              />
            );
          })}
          {/* Keypoints */}
          {landmarks.map((lm, i) => {
            if (!lm || lm.visibility < 0.4) return null;
            return (
              <Circle
                key={`kp-${i}`}
                cx={lm.x * W}
                cy={lm.y * H}
                r={5}
                color="rgba(180,255,100,0.9)"
              />
            );
          })}
        </Canvas>
      )}

      {/* HUD — rep counter + back button */}
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.hudBack, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={26} color="#FFFFFF" />
        </Pressable>

        <View style={styles.repBadge}>
          <Text style={styles.repCount}>{reps}</Text>
          <Text style={styles.repLabel}>/ {TARGET_REPS}</Text>
        </View>
      </View>

      {/* Status bar at bottom — hint text + camera-switch button */}
      <View style={[styles.statusBar, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.statusText}>{modelStatus}</Text>
        <Text style={styles.hintText}>
          {reps === 0
            ? "Get into frame — then squat down and stand up"
            : reps < TARGET_REPS
            ? `Keep going! ${TARGET_REPS - reps} more to go`
            : "Done! 🎉"}
        </Text>

        {/* Camera-switch button — bottom-right corner */}
        <Pressable
          onPress={toggleCamera}
          style={({ pressed }) => [
            styles.cameraSwitchBtn,
            { bottom: insets.bottom + 16, opacity: pressed ? 0.7 : 1 },
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Switch camera"
        >
          <Feather name="refresh-cw" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function JumpScreen() {
  if (Platform.OS === "web") {
    return <WebFallback />;
  }
  return <NativeJumpScreen />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  // ── Back button (web fallback) ──
  backBtn: {
    position: "absolute",
    top: 56,
    left: 20,
    zIndex: 10,
  },

  // ── Web fallback ──
  fallbackCenter: {
    alignItems: "center",
    gap: 16,
  },
  fallbackIcon: {
    fontSize: 64,
  },
  fallbackTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  fallbackBody: {
    fontSize: 15,
    color: "#8A8A8E",
    textAlign: "center",
    lineHeight: 22,
  },

  // ── Permission screen ──
  permTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  permBody: {
    fontSize: 15,
    color: "#8A8A8E",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  permBtn: {
    backgroundColor: "#FFAD60",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  permBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#000000",
  },

  // ── HUD ──
  hud: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  hudBack: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  repBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 4,
  },
  repCount: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFAD60",
  },
  repLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },

  // ── Status bar ──
  statusBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 16,
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 10,
  },

  // ── Camera switch button (bottom-right) ──
  cameraSwitchBtn: {
    position: "absolute",
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  statusText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  hintText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 4,
  },
});
