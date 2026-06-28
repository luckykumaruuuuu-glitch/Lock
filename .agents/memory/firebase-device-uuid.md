---
name: Firebase device-UUID approach
description: How FocusLock connects to Firebase RTDB without Firebase Auth, and why.
---

## Rule
Do NOT use `initializeAuth` + `getReactNativePersistence` with Firebase 12.x — the function was removed. Use a device-generated UUID stored in AsyncStorage as the RTDB path key instead of Firebase Auth UID.

## Why
Firebase JS SDK 12 dropped `getReactNativePersistence` from `firebase/auth`. The React Native auth persistence story requires `@react-native-firebase` (native modules) which doesn't work in Expo managed workflow without ejecting. For a single-device lock app, a stable UUID stored in AsyncStorage provides the same isolation without auth complexity.

## How to apply
- Path: `devices/{deviceId}/locks/{lockId}`
- `getDeviceId()` in `lib/firebaseLockRepo.ts` generates/retrieves the UUID from AsyncStorage
- Security rules: allow read/write at device level; validate status (ACTIVE→EXPIRED only) and endTime (immutable after write) via rules
- No Firebase Auth imports needed at all — just `firebase/app` and `firebase/database`
