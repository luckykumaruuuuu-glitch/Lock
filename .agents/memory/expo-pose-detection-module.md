---
name: expo-pose-detection custom module
description: MediaPipe pose detection Expo module ported from reference ZIP into DuckLock; dependency versions and peer-warning notes.
---

# expo-pose-detection Module in DuckLock

## What was done
Custom Expo module copied/adapted from reference project into `artifacts/mobile/modules/expo-pose-detection/`.

## Dependencies installed (artifacts/mobile/package.json)
- `react-native-vision-camera@^4.7.3` — camera + frame processor
- `@shopify/react-native-skia@^1.12.4` — skeleton overlay canvas
- `react-native-worklets-core@^1.6.3` — frame processor worklet runtime

## Peer warnings to ignore
`@shopify/react-native-skia@1.12.4` warns about `react@">=18.0 <19.0.0"` and `react-native@">=0.64 <0.78.0"` but the native build works fine regardless. Web uses graceful fallback so Skia never loads on web.

**Why:** Skia's JS peer range wasn't updated for RN 0.81 / React 19 in 1.x, but native Skia code is compatible.

## Architecture
- `PoseLandmarksFrameProcessorPlugin.kt` — VisionCamera frame processor; calls `detectAsync` on each frame
- `PoseLandmarkerHolder.kt` — singleton holding the MediaPipe `PoseLandmarker` instance
- `ExpoPoseDetectionModule.kt` — Expo Module; registers frame processor plugin, inits model, fires `onPoseLandmarksDetected` events
- `index.ts` + `src/` — JS event listener helpers (`addPoseLandmarksListener`, etc.)
- MediaPipe model: `android/src/main/assets/pose_landmarker_lite.task` (5.6 MB)

## Jump screen (artifacts/mobile/app/jump.tsx)
- `Platform.OS === 'web'` → graceful WebFallback component (no crash)
- Native: lazy `import()` of vision-camera, skia, expo-pose-detection to prevent web bundling issues
- Squat counter: knee angle state machine (SQUAT_DOWN_THRESHOLD=100°, STAND_UP_THRESHOLD=150°)
- `TARGET_REPS = 10` (configurable constant at top of file)
- On completion: `router.replace("/coming-soon")` after 500ms

## app.json changes
- Added `android.permission.CAMERA` to permissions array
- Added `react-native-vision-camera` plugin with cameraPermissionText
- Added iOS `NSCameraUsageDescription` in infoPlist
