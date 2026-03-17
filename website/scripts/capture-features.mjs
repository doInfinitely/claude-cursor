/**
 * Capture feature videos and hero screenshot for the Claude Cursor landing page.
 * Records your screen using ffmpeg while triggering actions via the API.
 *
 * Usage:
 *   1. Open localhost:3000 in Chrome and have a session selected
 *   2. Run: node scripts/capture-features.mjs
 *   3. Follow the prompts
 *
 * Requires: ffmpeg, Chrome open with localhost:3000
 */

import { execSync, spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = path.resolve(__dirname, "../public/features");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Get Chrome window bounds via AppleScript: {x, y, w, h} */
function getChromeWindow() {
  try {
    const bounds = execSync(
      `osascript -e 'tell application "Google Chrome" to get bounds of window 1'`,
      { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();
    const [x1, y1, x2, y2] = bounds.split(", ").map(Number);
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  } catch {
    return null;
  }
}

/** Bring Chrome to front */
function focusChrome() {
  try {
    execSync(`osascript -e 'tell application "Google Chrome" to activate'`, { stdio: "ignore" });
  } catch {}
}

/** Get Chrome window ID for screencapture */
function getChromeWindowId() {
  try {
    const script = `
import Quartz, json
wl = Quartz.CGWindowListCopyWindowInfo(Quartz.kCGWindowListOptionOnScreenOnly, Quartz.kCGNullWindowID)
for w in wl:
    if w.get("kCGWindowOwnerName","") == "Google Chrome" and w.get("kCGWindowLayer",0) == 0:
        print(w["kCGWindowNumber"])
        break
`;
    return execSync(`python3 -c '${script}'`, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

/** Screenshot Chrome window */
function screenshotChrome(outPath) {
  focusChrome();
  const wid = getChromeWindowId();
  if (wid) {
    execSync(`screencapture -l ${wid} -o "${outPath}"`, { stdio: "ignore" });
  } else {
    // Fallback: interactive window capture
    console.log("  Click the Chrome window...");
    execSync(`screencapture -o -w "${outPath}"`, { stdio: "inherit" });
  }
}

/** Record Chrome window area for duration seconds using ffmpeg */
async function recordChrome(outPath, durationSecs) {
  focusChrome();
  await sleep(500);

  const win = getChromeWindow();
  if (!win) {
    console.log("  ✗ Could not find Chrome window");
    return;
  }

  // Get display scaling factor
  let scale = 2; // Retina default
  try {
    const res = execSync(
      `system_profiler SPDisplaysDataType | grep Resolution`,
      { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }
    );
    if (res.includes("Retina")) scale = 2;
  } catch {}

  // ffmpeg avfoundation captures the full screen, we crop to Chrome window
  const cropX = win.x * scale;
  const cropY = win.y * scale;
  const cropW = win.w * scale;
  const cropH = win.h * scale;

  // Make dimensions even (required by h264)
  const w = cropW % 2 === 0 ? cropW : cropW - 1;
  const h = cropH % 2 === 0 ? cropH : cropH - 1;

  const tmpPath = outPath.replace(/\.mp4$/, "-raw.mp4");

  return new Promise((resolve) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-f", "avfoundation",
      "-framerate", "30",
      "-capture_cursor", "0",
      "-i", "6:none",
      "-t", String(durationSecs),
      "-vf", `crop=${w}:${h}:${cropX}:${cropY}`,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-preset", "fast",
      "-crf", "23",
      "-movflags", "+faststart",
      "-an",
      tmpPath,
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    ffmpeg.stderr.on("data", (d) => { stderr += d; });

    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        console.log(`  ✗ ffmpeg failed (code ${code})`);
        if (stderr) console.log(`    ${stderr.split("\n").slice(-3).join("\n    ")}`);
        resolve();
        return;
      }

      // Scale down to 1x for web
      try {
        execSync(
          `ffmpeg -y -i "${tmpPath}" -vf "scale=${win.w}:${win.h}" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 -movflags +faststart -an "${outPath}"`,
          { stdio: "pipe" }
        );
        fs.rmSync(tmpPath, { force: true });
      } catch {
        // If scale fails, just use the raw file
        fs.renameSync(tmpPath, outPath);
      }

      const size = (fs.statSync(outPath).size / 1024).toFixed(0);
      console.log(`  ✓ ${path.basename(outPath)} — ${size}KB`);
      resolve();
    });
  });
}

async function main() {
  console.log(`🎬 Claude Cursor Feature Capture\n`);
  ensureDir(OUTPUT_DIR);

  // Verify app is running and get first session name
  let sessionName;
  try {
    const resp = await fetch(`${BASE_URL}/api/sessions`);
    const data = await resp.json();
    const sessions = data.sessions || [];
    if (sessions.length === 0) {
      console.log("  ✗ No sessions running. Start some sessions first.");
      process.exit(1);
    }
    sessionName = sessions[0].name;
    console.log(`  → App running with ${sessions.length} sessions, using "${sessionName}"`);
  } catch {
    console.log("  ✗ Can't reach app at " + BASE_URL);
    process.exit(1);
  }

  // Verify Chrome is open
  const win = getChromeWindow();
  if (!win) {
    console.log("  ✗ Chrome not open. Open localhost:3000 in Chrome first.");
    process.exit(1);
  }
  console.log(`  → Chrome window: ${win.w}x${win.h} at (${win.x},${win.y})\n`);

  // ── Hero screenshot ──
  console.log("Capturing hero...");
  focusChrome();
  await sleep(1000);
  screenshotChrome(path.join(OUTPUT_DIR, "hero-preview.png"));
  console.log("  ✓ hero-preview.png\n");

  /** Execute JS in Chrome's isolated world (can read DOM, return values, but can't trigger Vue events). */
  function chromeJS(js) {
    const escaped = js.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
    const script = `tell application "Google Chrome" to execute active tab of window 1 javascript "${escaped}"`;
    try {
      return execSync("osascript -", {
        input: script,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
        timeout: 5000,
      }).trim();
    } catch (e) {
      console.log(`  ⚠ chromeJS failed: ${e.message}`);
      return "";
    }
  }

  /** Execute JS in the PAGE's context (can trigger Vue events) by injecting a <script> tag. */
  function pageJS(js) {
    // Encode the JS as base64 to avoid all escaping issues
    const b64 = Buffer.from(js).toString("base64");
    const inject = `(function(){ var s=document.createElement('script'); s.textContent=atob('${b64}'); document.head.appendChild(s); s.remove(); return 'ok'; })()`;
    return chromeJS(inject);
  }

  /** Click a session card by name (via page context so Vue store.select fires) */
  function clickSession(name) {
    pageJS(`(function(){ var cards = document.querySelectorAll('.session-card'); for (var i = 0; i < cards.length; i++) { if (cards[i].textContent.includes('${name}')) { cards[i].click(); break; } } })()`);
  }

  /** Helper: start recording, run actions, wait for completion */
  async function recordWithActions(name, durationSecs, actionFn) {
    console.log(`Recording ${name} (${durationSecs}s)...`);
    focusChrome();
    await sleep(500);

    const recordingPromise = recordChrome(path.join(OUTPUT_DIR, `${name}.mp4`), durationSecs);
    await sleep(1000); // let ffmpeg start

    await actionFn();

    await recordingPromise;
    console.log("");
  }

  // ── 1. Create session — open dialog, type name, pause, then close ──
  await recordWithActions("create-session", 8, async () => {
    clickSession(sessionName);
    await sleep(1500);
    pageJS("document.querySelector('.new-session-btn').click()");
    await sleep(1500);
    // Type into input via page context (dispatches input event for Vue v-model)
    const name = "my-project";
    for (const ch of name) {
      pageJS(`(function(){ var i=document.querySelector('.modal-content input[type=text]'); if(i){i.focus(); i.value+='${ch}'; i.dispatchEvent(new Event('input',{bubbles:true}));} })()`);
      await sleep(100);
    }
    await sleep(2500);
    // Close dialog
    pageJS("(function(){ var b=document.querySelector('.modal-content .close-btn'); if(b) b.click(); })()");
    await sleep(1000);
  });

  // ── 2. Needs action — click through sessions to show action indicators ──
  await recordWithActions("needs-action", 6, async () => {
    // Click through several sessions to show the sidebar with status indicators
    const resp = await fetch(`${BASE_URL}/api/sessions`);
    const data = await resp.json();
    const sessions = data.sessions || [];
    for (let i = 0; i < Math.min(sessions.length, 3); i++) {
      clickSession(sessions[i].name);
      await sleep(1500);
    }
    await sleep(1000);
  });

  // ── 3. Notifications — click notification bell on session card ──
  await recordWithActions("notifications", 6, async () => {
    clickSession(sessionName);
    await sleep(1500);
    // Show all hover buttons on the active card
    pageJS(`(function(){ var cards = document.querySelectorAll('.session-card'); for (var i = 0; i < cards.length; i++) { if (cards[i].textContent.includes('${sessionName}')) { cards[i].querySelectorAll('.url-btn,.notify-btn,.close-btn').forEach(function(b){b.style.display='flex'}); break; } } })()`);
    await sleep(1000);
    // Now click notify
    pageJS(`(function(){ var cards = document.querySelectorAll('.session-card'); for (var i = 0; i < cards.length; i++) { if (cards[i].textContent.includes('${sessionName}')) { var btn = cards[i].querySelector('.notify-btn'); if (btn) btn.click(); break; } } })()`);
    await sleep(3000);
  });

  // Close any open dialogs before next recording
  pageJS("(function(){ var o = document.querySelector('.modal-overlay'); if (o) o.click(); })()");
  await sleep(500);

  // ── 4. Tunnel — click share/URL button on session card ──
  await recordWithActions("tunnel", 6, async () => {
    clickSession(sessionName);
    await sleep(1500);
    // Show all hover buttons on the active card
    pageJS(`(function(){ var cards = document.querySelectorAll('.session-card'); for (var i = 0; i < cards.length; i++) { if (cards[i].textContent.includes('${sessionName}')) { cards[i].querySelectorAll('.url-btn,.notify-btn,.close-btn').forEach(function(b){b.style.display='flex'}); break; } } })()`);
    await sleep(1000);
    // Now click share
    pageJS(`(function(){ var cards = document.querySelectorAll('.session-card'); for (var i = 0; i < cards.length; i++) { if (cards[i].textContent.includes('${sessionName}')) { var btn = cards[i].querySelector('.url-btn'); if (btn) btn.click(); break; } } })()`);
    await sleep(3000);
  });

  console.log("\n✅ Done! Videos saved to website/public/features/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
