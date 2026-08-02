# DuckPal

A social media screen-time awareness app. Users track how many reels/shorts they've watched, compete in challenges, and get nudges to be more mindful of doomscrolling.

## Stack

- **Mobile app** (`artifacts/mobile`) — React Native + Expo (Expo Router), Firebase auth & Realtime DB
- **API server** (`artifacts/api-server`) — Express 5 + TypeScript, runs on port 3001
- **Web landing/UI** (`artifacts/ui-design`) — Vite + React, runs on port 5000 (the Replit preview)
- **Monorepo** — pnpm workspaces, shared packages under `artifacts/`

## How to run

Both workflows start automatically:

| Workflow | Command | Port |
|---|---|---|
| Start application | `pnpm install --frozen-lockfile && PORT=5000 node scripts/start-web.js` | 5000 (preview) |
| Expo Go preview | `pnpm install --frozen-lockfile && PORT=8082 EXPO_PORT=18116 pnpm --filter @workspace/mobile run start-all` | 8082 (web export) + Metro |

- The **Replit preview pane** shows the web version of the app on port 5000.
- For native mobile testing, scan the QR code in the "Expo Go preview" workflow console with the Expo Go app.

## Firebase

Firebase credentials are set as `EXPO_PUBLIC_FIREBASE_*` environment variables in `.replit` (shared env). No additional setup needed for Firebase.

## Environment secrets

- `SESSION_SECRET` — available but not currently wired into the codebase.

## User preferences

<!-- Add any user-specific preferences here -->
