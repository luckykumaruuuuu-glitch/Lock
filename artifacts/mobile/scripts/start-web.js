/**
 * Replit web startup script.
 *
 * 1. Runs `expo export --platform web` to produce a static web build.
 * 2. Serves the output on 0.0.0.0:PORT using Node's built-in http module.
 *
 * Static serving means zero cold-start bundling — no 502 timeouts.
 */

const { spawnSync } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT || "5000", 10);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(PROJECT_ROOT, "web-dist");

// ── 1. Export web build ────────────────────────────────────────────────────
console.log("[start-web] Building static web export…");
console.log("[start-web] This takes ~30-60 s the first time, then it's instant.");

const result = spawnSync(
  "pnpm",
  ["exec", "expo", "export", "--platform", "web", "--output-dir", "web-dist"],
  {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      CI: "1",
      NODE_ENV: "production",
    },
  }
);

if (result.status !== 0) {
  console.error("[start-web] expo export failed with status", result.status);
  process.exit(1);
}

console.log("[start-web] ✓ Web build complete. Starting server…");

// ── 2. Serve static files ──────────────────────────────────────────────────
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
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".map":  "application/json",
  ".txt":  "text/plain",
};

const server = http.createServer((req, res) => {
  // Strip query string
  let urlPath = req.url.split("?")[0];

  // Decode URI (handle %2F etc.)
  try { urlPath = decodeURIComponent(urlPath); } catch (_) {}

  // Prevent directory traversal
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(OUT_DIR, safePath);

  // If path is a directory, try index.html inside it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  // SPA fallback — serve root index.html for any missing file
  if (!fs.existsSync(filePath)) {
    filePath = path.join(OUT_DIR, "index.html");
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";

  // Cache headers: long cache for hashed assets, no-cache for HTML
  const isHtml = ext === ".html";
  res.writeHead(200, {
    "content-type": mime,
    "cache-control": isHtml
      ? "no-cache, no-store, must-revalidate"
      : "public, max-age=31536000, immutable",
  });

  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[start-web] ✓ Serving FocusLock web app on port ${PORT}`);
  console.log(`[start-web]   http://localhost:${PORT}`);
});

server.on("error", (err) => {
  console.error("[start-web] Server error:", err.message);
  process.exit(1);
});
