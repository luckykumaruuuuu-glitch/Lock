# FocusLock (DuckLock / DuckPal)

A mobile-first screen-time & focus app built with Expo + React Native (web preview via Metro), an Express API backend, and a React/Vite web UI.

## Project structure

| Path | Purpose |
|---|---|
| `artifacts/mobile` | Expo app (iOS / Android / web via Metro) |
| `artifacts/api-server` | Express REST API (Node.js + Drizzle ORM + PostgreSQL) |
| `artifacts/ui-design` | Web landing / design preview (React 19 + Vite + Tailwind 4) |
| `artifacts/mockup-sandbox` | Component playground for design iteration |
| `lib/db` | Shared Drizzle schema + database client (`@workspace/db`) |
| `lib/api-zod` | Shared Zod request/response schemas (`@workspace/api-zod`) |
| `lib/api-client-react` | Typed React hooks for the API (`@workspace/api-client-react`) |

## How to run

All workflows are configured and start automatically.

| Workflow | Command | Port |
|---|---|---|
| **Start application** (main) | `pnpm install --frozen-lockfile && PORT=5000 pnpm --filter @workspace/mobile run start-all` | 5000 |
| **API Server** | `pnpm --filter @workspace/api-server run dev` | 8080 |
| **App UI Design** | `pnpm --filter @workspace/ui-design run dev` | auto |
| **Component Preview Server** | `pnpm --filter @workspace/mockup-sandbox run dev` | auto |
| **Expo (Metro dev)** | `pnpm --filter @workspace/mobile run dev` | 18115 |

The main workflow serves the Expo web export on port 5000 (mapped to `:80`). Metro also starts for Expo Go scanning via a Cloudflared tunnel.

## Environment

All Firebase keys (`EXPO_PUBLIC_FIREBASE_*`) are pre-configured as shared env vars.

The database (PostgreSQL 16) is Replit-managed — `DATABASE_URL` and `PG*` variables are injected automatically.

`SESSION_SECRET` is stored as a Replit Secret.

## Database

Drizzle ORM with PostgreSQL. Push schema changes:

```bash
cd lib/db && pnpm run push
```

Schema lives in `lib/db/src/schema/index.ts`.

## Mobile (Expo Go)

The Metro dev server prints a QR code in the `artifacts/mobile: expo` workflow logs. Scan it with the **Expo Go** app. The tunnel URL looks like `exp://...expo.pike.replit.dev`.

For native (Android/iOS) builds, place `google-services.json` at `artifacts/mobile/android/app/google-services.json` and use EAS (`eas build`).

## User preferences

- Keep the existing monorepo structure (pnpm workspaces).
- Do not migrate or replace the Replit-managed PostgreSQL database unless explicitly asked.
