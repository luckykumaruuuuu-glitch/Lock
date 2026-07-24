#!/usr/bin/env node
/**
 * start-web.js — Replit launcher for the FocusLock web services
 *
 * Starts two processes in parallel:
 *   1. API server  → port 3001
 *   2. ui-design   → port 5000  (Vite dev server, proxies /api → 3001)
 *
 * Both processes share stdout/stderr with the parent so logs appear in the
 * Replit workflow console.  SIGTERM/SIGINT are forwarded to children for a
 * clean shutdown.
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(__dirname, "..");
const API_PORT = 3001;
const WEB_PORT = parseInt(process.env.PORT || "5000", 10);

function log(msg) {
  console.log(`[start-web] ${msg}`);
}

// ── Build + start API server ──────────────────────────────────────────────────
log(`Starting API server on port ${API_PORT}…`);
const apiProc = spawn(
  "pnpm",
  ["--filter", "@workspace/api-server", "run", "dev"],
  {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, PORT: String(API_PORT), NODE_ENV: "development" },
  },
);

apiProc.on("error", (err) => {
  console.error(`[api-server] spawn error: ${err.message}`);
});
apiProc.on("exit", (code, signal) => {
  if (code !== 0 && signal !== "SIGTERM") {
    console.error(`[api-server] exited with code ${code}`);
  }
});

// ── Start ui-design Vite dev server ─────────────────────────────────────────
log(`Starting ui-design on port ${WEB_PORT}…`);
const uiProc = spawn(
  "pnpm",
  ["--filter", "@workspace/ui-design", "run", "dev"],
  {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: String(WEB_PORT),
      BASE_PATH: "/",
      API_PORT: String(API_PORT),
      NODE_ENV: "development",
    },
  },
);

uiProc.on("error", (err) => {
  console.error(`[ui-design] spawn error: ${err.message}`);
});
uiProc.on("exit", (code, signal) => {
  if (code !== 0 && signal !== "SIGTERM") {
    console.error(`[ui-design] exited with code ${code}`);
  }
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(sig) {
  log(`${sig} received — shutting down…`);
  apiProc.kill("SIGTERM");
  uiProc.kill("SIGTERM");
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGHUP", () => shutdown("SIGHUP"));
