# FocusLock

A React Native / Expo mobile app that helps users block distracting apps (social media, etc.) with a duck mascot. Built as a pnpm monorepo.

## Project structure

```
artifacts/
  mobile/          # Expo React Native app (main app)
  api-server/      # Express API server (TypeScript, esbuild)
  ui-design/       # Web UI design reference
  mockup-sandbox/  # Component preview / Canvas mockups
lib/
  api-client-react/  # React Query hooks for the API
  api-spec/          # Shared API route definitions
  api-zod/           # Shared Zod schemas
  db/                # Drizzle ORM database layer
```

## How to run

The **Start application** workflow runs `pnpm --filter @workspace/mobile run start-all` on port 5000. This:
1. Serves a static loading page immediately on port 5000
2. Builds the Expo web export in the background
3. Starts the Metro bundler for Expo Go (QR code in logs)

Once the build finishes (~30–60 s), the preview pane auto-refreshes and shows the app.

To run on a phone: scan the QR code that appears in the **Start application** workflow logs with the **Expo Go** app.

## Firebase

Firebase credentials are already set as shared environment variables in `.replit`. The project uses Firebase Realtime Database with anonymous auth (device-UUID approach — no `getReactNativePersistence`).

## Key environment variables (already set)

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_DATABASE_URL`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

## Notes

- `package.json` has a `pnpm.overrides` entry pinning `tar` to `7.5.20` — Replit's package firewall blocks the default `tar@7.5.17` that `@expo/cli` pulls in. Do not remove this override.

## User preferences

_None recorded yet._
