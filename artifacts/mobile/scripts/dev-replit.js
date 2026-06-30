/**
 * Replit dev wrapper for Expo web.
 *
 * Starts the Metro bundler and immediately pre-warms the web bundle so the
 * first browser request is fast (no 23-second cold-compile 502).
 */

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const PORT = process.env.PORT || 5000;
const PROJECT_ROOT = path.resolve(__dirname, "..");
const WORKSPACE_ROOT = path.resolve(__dirname, "../../..");

// ── Start Metro ──────────────────────────────────────────────────────────────
const env = { ...process.env };

const metro = spawn(
  "pnpm",
  [
    "exec",
    "expo",
    "start",
    "--web",
    "--localhost",
    "--port",
    String(PORT),
  ],
  {
    cwd: PROJECT_ROOT,
    env,
    stdio: "inherit",
  }
);

metro.on("error", (err) => {
  console.error("[dev-replit] Metro error:", err.message);
  process.exit(1);
});

metro.on("exit", (code) => {
  process.exit(code ?? 0);
});

["SIGINT", "SIGTERM", "SIGHUP"].forEach((sig) => {
  process.on(sig, () => {
    metro.kill(sig);
    process.exit(0);
  });
});

// ── Wait for Metro HTTP server ────────────────────────────────────────────────
function waitForPort(retries = 40, delayMs = 1500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const attempt = () => {
      attempts++;
      const req = http.get(`http://localhost:${PORT}/`, (res) => {
        res.resume();
        if (res.statusCode < 500) {
          resolve();
        } else {
          retry();
        }
      });
      req.on("error", retry);
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (attempts >= retries) {
        reject(new Error("Metro did not start in time"));
      } else {
        setTimeout(attempt, delayMs);
      }
    };

    // Give Metro a few seconds head-start before polling
    setTimeout(attempt, 3000);
  });
}

// ── Fetch the HTML to find the bundle URL, then pre-fetch it ─────────────────
function prewarm() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/`, (res) => {
      let html = "";
      res.on("data", (chunk) => (html += chunk));
      res.on("end", () => {
        // Find the .bundle src URL in the HTML
        const match = html.match(/src="([^"]+\.bundle[^"]*)"/);
        if (!match) {
          console.log("[dev-replit] No bundle URL found in HTML — skipping pre-warm.");
          return resolve();
        }

        const bundlePath = match[1];
        console.log(`[dev-replit] Pre-warming bundle: ${bundlePath.slice(0, 80)}…`);

        const bundleReq = http.get(
          `http://localhost:${PORT}${bundlePath}`,
          (bundleRes) => {
            let bytes = 0;
            bundleRes.on("data", (chunk) => (bytes += chunk.length));
            bundleRes.on("end", () => {
              console.log(
                `[dev-replit] ✓ Bundle ready (${(bytes / 1024).toFixed(0)} KB). App is warm!`
              );
              resolve();
            });
          }
        );

        bundleReq.on("error", (e) => {
          console.error("[dev-replit] Bundle pre-warm request failed:", e.message);
          resolve();
        });

        // Bundles can take up to 60 s on first compile — be patient
        bundleReq.setTimeout(90_000, () => {
          console.log("[dev-replit] Bundle pre-warm timed out (still compiling in background).");
          bundleReq.destroy();
          resolve();
        });
      });
    });

    req.on("error", (e) => {
      console.error("[dev-replit] Could not fetch HTML for pre-warm:", e.message);
      resolve();
    });
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log(`[dev-replit] Waiting for Metro on port ${PORT}…`);
    await waitForPort();
    console.log("[dev-replit] Metro is up. Starting bundle pre-warm…");
    await prewarm();
  } catch (err) {
    console.error("[dev-replit] Pre-warm failed:", err.message);
    // Non-fatal — Metro is still running, user can still load the page
  }
})();
