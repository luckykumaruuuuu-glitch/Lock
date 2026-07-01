/**
 * start-all.js — Permanent Replit launcher for FocusLock
 *
 * Strategy: port 5000 opens INSTANTLY to eliminate 502 errors.
 *
 * Phase 1 : Start static HTTP server on port 5000 immediately
 *           - If web-dist/index.html exists → serves the last build right away
 *           - If not → serves a "Building…" loading page
 * Phase 2 : Run expo export in background (async, non-blocking)
 *           - On completion the server automatically serves the new files
 *           - Browser users just need to refresh once the build finishes
 * Phase 3 : Start Metro dev server for Expo Go (also in background)
 */

const { spawn } = require("child_process");
const fs   = require("fs");
const path = require("path");
const nodeHttp = require("http");

const PORT    = parseInt(process.env.PORT || "5000", 10);
const ROOT    = path.resolve(__dirname, "..");
const WEBDIST = path.join(ROOT, "web-dist");

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

const LOADING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>FocusLock — Building…</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;
         display:flex;flex-direction:column;align-items:center;justify-content:center;
         min-height:100vh;gap:20px}
    .spinner{width:44px;height:44px;border:3px solid #2C2C2E;border-top-color:#FFBF80;
             border-radius:50%;animation:spin 0.9s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    h1{font-size:22px;font-weight:700;color:#FFBF80}
    p{font-size:14px;color:#8E8E93;text-align:center;max-width:300px;line-height:1.5}
  </style>
  <script>setTimeout(()=>location.reload(),4000)</script>
</head>
<body>
  <div class="spinner"></div>
  <h1>FocusLock</h1>
  <p>Building app… this takes a few seconds.<br/>Page will refresh automatically.</p>
</body>
</html>`;

// ─── Phase 1: Start HTTP server IMMEDIATELY ──────────────────────────────────
log(`Phase 1 — Starting static web server on port ${PORT} immediately…`);

let buildDone = fs.existsSync(path.join(WEBDIST, "index.html"));

const staticServer = nodeHttp.createServer((req, res) => {
  let urlPath = (req.url || "/").split("?")[0];
  try { urlPath = decodeURIComponent(urlPath); } catch (_) {}

  // If build isn't ready yet, serve the loading page for HTML requests
  if (!buildDone) {
    const ext = path.extname(urlPath).toLowerCase();
    if (!ext || ext === ".html") {
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache, no-store, must-revalidate",
      });
      res.end(LOADING_HTML);
      return;
    }
    res.writeHead(404);
    res.end("Building…");
    return;
  }

  // Build is ready — serve static files
  const safe = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(WEBDIST, safe);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.join(WEBDIST, "index.html"); // SPA fallback
  }

  const ext    = path.extname(filePath).toLowerCase();
  const mime   = MIME[ext] || "application/octet-stream";
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
  if (buildDone) {
    log(`Phase 1 done ✓ — Serving existing build on http://localhost:${PORT}`);
  } else {
    log(`Phase 1 done ✓ — Server live on port ${PORT} (serving loading page while build runs)`);
  }
  log("");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("  🌐  Web browser : open the Replit preview pane");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});

// ─── Phase 2: Build in background (non-blocking) ─────────────────────────────
log("Phase 2 — Building web export in background…");

const buildEnv = { ...process.env, CI: "1", NODE_ENV: "production" };

const buildProc = spawn(
  "pnpm",
  ["exec", "expo", "export", "--platform", "web", "--output-dir", "web-dist"],
  { cwd: ROOT, stdio: "inherit", env: buildEnv }
);

buildProc.on("error", (err) => {
  log(`Build error: ${err.message}`);
});

buildProc.on("exit", (code) => {
  if (code === 0) {
    buildDone = true;
    log("Phase 2 done ✓ — Build complete. Browser users: refresh the page to see latest changes.");
  } else {
    log(`Build exited with code ${code} — check logs above for errors.`);
    // If no existing build, we can't serve anything useful
    if (!fs.existsSync(path.join(WEBDIST, "index.html"))) {
      log("No web-dist available. Exiting.");
      process.exit(1);
    }
  }
});

// ─── Phase 3: Metro dev server (Expo Go) ─────────────────────────────────────
log("Phase 3 — Starting Metro dev server for Expo Go…");

const metroEnv = {
  ...process.env,
  EXPO_PACKAGER_PROXY_URL:        `https://${process.env.REPLIT_EXPO_DEV_DOMAIN || ""}`,
  EXPO_PUBLIC_DOMAIN:             process.env.REPLIT_DEV_DOMAIN || "",
  EXPO_PUBLIC_REPL_ID:            process.env.REPL_ID || "",
  REACT_NATIVE_PACKAGER_HOSTNAME: process.env.REPLIT_DEV_DOMAIN || "",
};

const metro = spawn(
  "pnpm",
  ["exec", "expo", "start", "--localhost"],
  { cwd: ROOT, stdio: "inherit", env: metroEnv }
);

metro.on("error", (err) => log(`Metro error: ${err.message}`));
metro.on("exit",  (code) => log(`Metro exited (code ${code})`));

// ─── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown(sig) {
  log(`${sig} received — shutting down…`);
  buildProc.kill("SIGTERM");
  metro.kill("SIGTERM");
  staticServer.close();
  process.exit(0);
}
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGHUP",  () => shutdown("SIGHUP"));
