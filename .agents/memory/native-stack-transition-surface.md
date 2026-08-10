---
name: Native stack transition surface
description: The background layering rule that prevents black flashes during native-stack back transitions.
---

This project uses Expo Router's native `Stack`, backed by `@react-navigation/native-stack` and `react-native-screens`. It does not expose a separate push/pop animation setting or a custom two-screen interpolator. A transparent root `contentStyle` was tested and did not remove the physical-device black flash, so it is not a valid fix.

**Why:** Native-stack accepts a single native animation per screen and reverses it internally; `animationMatchesGesture` only affects iOS swipe-dismiss behavior. A JS-stack-style `cardStyleInterpolator` is not available through this API.

**How to apply:** Do not claim a separate Android hardware-back animation can be configured without replacing the navigator or building a custom transition layer. Treat any native-stack animation change as a physical-device experiment.