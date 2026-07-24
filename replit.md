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

### Verifying the stack is healthy

Once the workflow is running, confirm both services are up:

```bash
# API health check (via Vite proxy)
curl http://localhost:5000/api/healthz
# Expected: {"status":"ok"}

# API direct (bypasses proxy)
curl http://localhost:3001/healthz
```

The health route lives in `artifacts/api-server/src/routes/health.ts`.

### Mobile (Expo Go)

The Expo app (`artifacts/mobile`) runs separately — it is not part of the web workflow above. To run Metro for Expo Go, use:

```bash
pnpm --filter @workspace/mobile run start-all
```

Metro prints a QR code; scan it with the **Expo Go** app. A Cloudflared tunnel is used for the public URL. The tunnel URL looks like `exp://...expo.pike.replit.dev`.

For native (Android/iOS) builds, place `google-services.json` at `artifacts/mobile/android/app/google-services.json` and use EAS (`eas build`).

## Environment

| Variable | Source | Notes |
|---|---|---|
| `DATABASE_URL`, `PG*` | Replit-managed (auto-injected) | PostgreSQL 16 |
| `SESSION_SECRET` | Replit Secret | Required by the API server |
| `EXPO_PUBLIC_FIREBASE_*` | Shared env vars | Pre-configured |

## Database

Drizzle ORM with PostgreSQL. Push schema changes:

```bash
cd lib/db && pnpm run push
```

Schema lives in `lib/db/src/schema/index.ts`.

> **Note:** The schema currently exports an empty object — tables need to be defined before any data is persisted.

## User preferences

- Keep the existing monorepo structure (pnpm workspaces).
- Do not migrate or replace the Replit-managed PostgreSQL database unless explicitly asked.
