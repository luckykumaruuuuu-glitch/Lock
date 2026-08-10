---
name: Native stack transition surface
description: The background layering rule that prevents black flashes during native-stack back transitions.
---

The root native stack should keep its `contentStyle` transparent when individual route roots already render an opaque background. This allows the outgoing and returning screens to remain visible throughout a native pop instead of exposing a separate stack-level black surface.

**Why:** A stack-level black content surface can become visible as a gap during Android/iOS native back transitions, even when forward navigation looks correct.

**How to apply:** Preserve opaque backgrounds on each screen's root container, and do not reintroduce a stack-level black `contentStyle` unless the transition behavior is re-tested on a physical device.