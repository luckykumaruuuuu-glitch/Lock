# FocusLock

A focus app that helps users manage distractions by locking specific apps for set durations.

## Run & Operate

- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app (main workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned by Replit)

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Mobile: Expo 54 + React Native 0.81, expo-router
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Sync: Firebase Realtime Database (data sync only, no auth)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo mobile app (main user-facing app)
- `artifacts/api-server/` — Express API server
- `artifacts/ui-design/` — Design system / Vite sandbox
- `artifacts/mockup-sandbox/` — Component prototyping
- `lib/db/` — Drizzle schema and migrations
- `lib/api-spec/` — OpenAPI contract (source of truth)
- `lib/api-client-react/` — Generated TanStack Query hooks
- `lib/api-zod/` — Generated Zod schemas

## Architecture decisions

- Firebase is used only for Realtime Database sync (not auth). Device-local UUID used as RTDB path for isolation without auth tokens.
- App works in "local-only" mode when Firebase env vars are not set — all locking still works.
- No login/auth flow — app is single-user, device-local.
- PostgreSQL (Replit-managed) for server-side persistence; Firebase for cross-device sync.

## Product

FocusLock lets users lock distracting apps for a set period with no way to bypass early. Features an interactive duck character, glassmorphism UI, and cross-device sync via Firebase.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The mobile dev script passes several Replit-specific env vars (REPLIT_EXPO_DEV_DOMAIN, REPLIT_DEV_DOMAIN, REPL_ID) to Expo for proxying.
- Firebase keys live in `.replit` `[userenv.shared]` — they're public-facing Expo env vars (EXPO_PUBLIC_*) and intentionally not secret.
- Always run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI spec.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
