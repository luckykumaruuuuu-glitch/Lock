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

One workflow starts everything:

| Workflow | Command | Port |
|---|---|---|
| **Start application** | `pnpm install --frozen-lockfile && PORT=5000 node scripts/start-web.js` | 5000 (web UI), 3001 (API) |

`scripts/start-web.js` launches two processes in parallel:
- **ui-design** Vite dev server on port 5000 (visible in the Replit preview pane)
- **api-server** Express server on port 3001

Vite proxies all `/api/*` requests to the API server, so the web UI talks to the API through the same origin.

### Mobile (Expo Go)
The Expo app (`artifacts/mobile`) runs separately — it is not part of the web workflow above. To run Metro for Expo Go, use:
```bash
pnpm --filter @workspace/mobile run start-all
```
Metro prints a QR code; scan it with the **Expo Go** app. A Cloudflared tunnel is used for the public URL.

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
