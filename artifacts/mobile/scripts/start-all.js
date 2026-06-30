/**
 * start-all.js — Permanent Replit launcher for FocusLock
 *
 * Phase 1 : expo export --platform web  → web-dist/  (static build, ~45s)
 * Phase 2 : Start static HTTP server on 0.0.0.0:PORT  (web browser preview)
 * Phase 3 : Start Metro dev server in background      (Expo Go / native)
 *
 * Result:
 *   • Web browser  → hits port 5000, served from static files, instant (no 502)
 *   • Expo Go      → scans QR shown in logs, connects to Metro
 */

const { spawnSync, spawn } = require("child_process");
const http = require("fs");
const fs = require("fs");
const path = require("path");
const nodeHttp = require("http");

const PORT    = parseInt(process.env.PORT || "5000", 10);
const ROOT    = path.resolve(__dirname, "..");
const WEBDIST = path.join(ROOT, "web-dist");

// ─── helpers ────────────────────────────────────────────────────────────────
function log(msg) { console.log(`[start-all] ${msg}`); }

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".mp4":  "video/mp4",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".map":  "application/json",
  ".txt":  "text/plain",
};

// ─── Phase 1 : Static web export ────────────────────────────────────────────
log("Phase 1 — Building static web export (first run ~45s, then instant)…");

const buildEnv = {
  ...process.env,
  CI: "1",
  NODE_ENV: "production",
};

const buildResult = spawnSync(
  "pnpm",
  ["exec", "expo", "export", "--platform", "web", "--output-dir", "web-dist"],
  { cwd: ROOT, stdio: "inherit", env: buildEnv }
);

if (buildResult.status !== 0) {
  log("ERROR: expo export failed. Exiting.");
  process.exit(1);
}

log("Phase 1 done ✓ — web-dist/ ready.");

// ─── Phase 2 : Static HTTP server ───────────────────────────────────────────
log(`Phase 2 — Starting static web server on port ${PORT}…`);

const staticServer = nodeHttp.createServer((req, res) => {
  let urlPath = (req.url || "/").split("?")[0];
  try { urlPath = decodeURIComponent(urlPath); } catch (_) {}

  const safe = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(WEBDIST, safe);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.join(WEBDIST, "index.html"); // SPA fallback
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  const isHtml = ext === ".html";

  res.writeHead(200, {
    "content-type": mime,
    "cache-control": isHtml
      ? "no-cache, no-store, must-revalidate"
      : "public, max-age=31536000, immutable",
  });
  fs.createReadStream(filePath).pipe(res);
});

staticServer.on("error", (err) => {
  log(`Static server error: ${err.message}`);
  process.exit(1);
});

staticServer.listen(PORT, "0.0.0.0", () => {
  log(`Phase 2 done ✓ — Web app live at http://localhost:${PORT}`);
  log("");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("  🌐  Web browser : open the Replit preview pane");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});

// ─── Phase 3 : Metro dev server (Expo Go) ───────────────────────────────────
log("Phase 3 — Starting Metro dev server for Expo Go…");

const metroEnv = {
  ...process.env,
  EXPO_PACKAGER_PROXY_URL:      `https://${process.env.REPLIT_EXPO_DEV_DOMAIN || ""}`,
  EXPO_PUBLIC_DOMAIN:           process.env.REPLIT_DEV_DOMAIN || "",
  EXPO_PUBLIC_REPL_ID:          process.env.REPL_ID || "",
  REACT_NATIVE_PACKAGER_HOSTNAME: process.env.REPLIT_DEV_DOMAIN || "",
};

const metro = spawn(
  "pnpm",
  ["exec", "expo", "start", "--localhost"],
  { cwd: ROOT, stdio: "inherit", env: metroEnv }
);

metro.on("error", (err) => log(`Metro error: ${err.message}`));
metro.on("exit",  (code) => log(`Metro exited (code ${code})`));

// ─── Graceful shutdown ───────────────────────────────────────────────────────
function shutdown(sig) {
  log(`${sig} received — shutting down…`);
  metro.kill("SIGTERM");
  staticServer.close();
  process.exit(0);
}
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGHUP",  () => shutdown("SIGHUP"));
