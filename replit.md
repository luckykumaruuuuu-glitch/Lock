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

## API server

The Express API server runs as a separate workflow called **"artifacts/api-server: API Server"** on port 8080. Start it from the Workflows panel alongside the mobile app.

- Health check: `GET /api/healthz` → `{"status":"ok"}`
- Database: Replit's built-in PostgreSQL — `DATABASE_URL` is injected automatically
- Schema: managed by Drizzle ORM in `lib/db/src/schema/index.ts`; push changes with `pnpm --filter @workspace/db run push`

## Preview URL — automatic per account

The Expo web preview URL is generated **automatically** from `REPLIT_DEV_DOMAIN` on every session start. No manual changes are needed when importing the project to a new Replit account.

**How it works:** `artifacts/mobile/app.config.js` reads `REPLIT_DEV_DOMAIN` at build time and passes it as the `expo-router` origin. `start-all.js` also injects the domain into the `expo export` environment. Both are read fresh from Replit's injected env vars each time.

## Setup verification

After importing or cloning on Replit, confirm:

1. **Dependencies** — the Start application workflow runs `pnpm install --frozen-lockfile` automatically.
2. **Firebase env vars** — all seven `EXPO_PUBLIC_FIREBASE_*` variables must be set. They are pre-configured as shared env vars in `.replit` (`userenv.shared`) and mirrored into `artifacts/mobile/.env`.
3. **Web build** — the workflow builds the Expo web export and serves it on port 5000. Wait ~60 s for "Build complete" in the logs, then the preview pane loads the app.
4. **API server** — start the **"artifacts/api-server: API Server"** workflow. It builds and starts the Express server on port 8080 with `DATABASE_URL` auto-injected.

To validate the web app is running correctly, check that the Replit preview shows the FocusLock onboarding screen and the workflow logs end with `Phase 2 done ✓ — Build complete`.

## Notes

- `package.json` has a `pnpm.overrides` entry pinning `tar` to `7.5.20` — Replit's package firewall blocks the default `tar@7.5.17` that `@expo/cli` pulls in. Do not remove this override.
- `artifacts/mobile/.env` is generated from the shared Replit env vars and should not be committed to git (add to `.gitignore` if pushing to a public repo).
- `app.json` has been replaced by `app.config.js` — do not re-create `app.json` as it would override the dynamic config.

## User preferences

_None recorded yet._
