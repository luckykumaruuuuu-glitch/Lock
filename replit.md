# DuckPal

A social media screen-time tracker and app-blocker. Users see how many reels they've watched, set limits, and lock distracting apps (Instagram, TikTok, YouTube, Snapchat, Facebook, etc.).

## Monorepo structure

| Path | Role |
|---|---|
| `artifacts/mobile` | React Native / Expo app — the primary product |
| `artifacts/api-server` | Express 5 + Drizzle ORM API (port 3001) |
| `artifacts/ui-design` | Vite/React web UI (port 5000) |
| `artifacts/mockup-sandbox` | Design sandbox (not production) |
| `lib/` | Shared TypeScript packages (`@workspace/*`) |

## Running on Replit

Two workflows are configured and start automatically:

### Web preview (port 5000)
**Workflow:** `Start application`
```
pnpm install --frozen-lockfile && PORT=5000 node scripts/start-web.js
```
Starts the Vite web UI on port 5000 and the API server on port 3001.

### Expo Go preview (port 8082)
**Workflow:** `Expo Go preview`
```
pnpm install --frozen-lockfile && (fuser -k 8080/tcp 2>/dev/null; true) && sleep 1 && PORT=8082 EXPO_PORT=18116 pnpm --filter @workspace/mobile run start-all
```
- Serves a web export of the Expo app on port 8082
- Spins up Metro bundler + a cloudflared tunnel for scanning with the **Expo Go** mobile app

## Firebase
Firebase config is set via env vars in `.replit` (`[userenv.shared]`):
- `EXPO_PUBLIC_FIREBASE_*` keys are already configured for the `focus-lock-6b0ab` project.

## Session secret
`SESSION_SECRET` is managed as a Replit secret.

## User preferences
_None recorded yet._
