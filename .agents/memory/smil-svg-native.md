---
name: SMIL SVG animations
description: Native handling for supplied SVGs that rely on SMIL animation tags.
---

`react-native-svg` renders SVG geometry but does not execute SMIL tags such as `animate`, `animateTransform`, `animateMotion`, or `set`. For Expo Go-compatible UI, keep the supplied vector paths and palette, then replace the SMIL timeline with native React Native animation layers; avoid adding a native-only renderer just for one asset.

**Why:** The supplied success-confetti asset depends on SMIL and the mobile app does not include Lottie, Rive, or a WebView renderer. A native vector rebuild keeps the animation working in Expo Go and on web without changing the app’s native dependency surface.

**How to apply:** Use `react-native-svg` for the static paths and the project’s existing animation primitives for scale, opacity, translation, rotation, and stroke-dash drawing. Keep the animation component isolated from the popup’s state, lock logic, and timers.