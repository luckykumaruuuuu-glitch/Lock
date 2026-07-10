# DuckLock

A focus / screen-time locker mobile app built with **Expo (React Native)** + **Firebase Realtime Database**. Once a lock session starts, there's no way to bypass it early.

## Stack

| Layer | Tech |
|---|---|
| Mobile app | Expo ~54, React Native 0.81, expo-router |
| State / data | Firebase Realtime Database (firebase ^12) |
| Styling | react-native-reanimated, expo-linear-gradient |
| i18n | i18next / react-i18next |
| Monorepo | pnpm workspaces |

## Running on Replit

```
pnpm install          # install all workspace deps
# then use the "Start application" workflow (port 5000)
```

The `start-all` script runs three things in parallel:
1. **Static file server** on port 5000 (immediate, serves a loading page then the built web export)
2. **Expo web export** (`expo export --platform web`) — output lands in `artifacts/mobile/web-dist/`
3. **Metro dev server** on port 8082 — for Expo Go / native builds

The preview pane shows the web version. For the native app, scan the QR code printed in the workflow logs with Expo Go.

## Firebase config

All Firebase public config keys are stored as `EXPO_PUBLIC_*` environment variables in `.replit` under `[userenv.shared]`. No secrets are required for the web/preview build.

## Artifacts

| Name | Path | Purpose |
|---|---|---|
| FocusLock (mobile) | `artifacts/mobile` | Main Expo app |
| API Server | `artifacts/api-server` | Express API (TypeScript, esbuild) |
| App UI Design | `artifacts/ui-design` | Vite/React design exploration |
| Canvas / Mockup Sandbox | `artifacts/mockup-sandbox` | Component preview server |

## User preferences

- Keep the existing monorepo structure (pnpm workspaces).
- Do not restructure or migrate the project unless explicitly asked.
