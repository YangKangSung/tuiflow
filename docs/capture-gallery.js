// Captures docs/gallery/<uid>.png for every panel of the tuiflow-gallery
// dashboard through Grafana's single-panel renderer (/d-solo), each at its own
// grid size (24 columns = 1584 px, one row = 30 px + 8 px gap), 2x pixel
// density, matrix theme. Needs the local Grafana (grafana/up.ps1) and a
// Chromium: `npm i -D playwright`, or the playwright-core that ships with
// tuiflow-tui-panel plus a browser under ~/AppData/Local/ms-playwright.
//
//   GRAFANA_URL=http://localhost:3000  TF_THEME=matrix  TF_CHROME=<chrome.exe>  node docs/capture-gallery.js [uid ...]
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const OUT = path.join(__dirname, "gallery");
const BASE = (process.env.GRAFANA_URL || "http://localhost:3000").replace(/\/$/, "");
const THEME = process.env.TF_THEME || "matrix";
const COL_PX = 66; // 1584 px dashboard / 24 columns: the 90-column templates fit a half-width panel
const ROW_PX = 30;
const GAP_PX = 8;

function playwright() {
  for (const id of ["playwright", "playwright-core", path.join(root, "tuiflow-tui-panel", "node_modules", "playwright-core")]) {
    try {
      return require(id);
    } catch (err) {
      if (err.code !== "MODULE_NOT_FOUND") throw err;
    }
  }
  throw new Error("playwright not found: npm i -D playwright, or npm install inside tuiflow-tui-panel");
}

// Newest Chromium that Playwright has already downloaded, if the bundled revision is missing.
function installedChrome() {
  if (process.env.TF_CHROME) return process.env.TF_CHROME;
  const home = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.LOCALAPPDATA || process.env.HOME || "", "ms-playwright");
  if (!fs.existsSync(home)) return undefined;
  const dirs = fs
    .readdirSync(home)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const d of dirs) {
    for (const exe of ["chrome-win64/chrome.exe", "chrome-win/chrome.exe", "chrome-linux/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"]) {
      const p = path.join(home, d, exe);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

async function launch(chromium) {
  try {
    return await chromium.launch();
  } catch (err) {
    const exe = installedChrome();
    if (!exe) throw err;
    return chromium.launch({ executablePath: exe });
  }
}

function panels() {
  const dash = JSON.parse(fs.readFileSync(path.join(root, "grafana", "provisioning", "dashboards", "tuiflow-gallery.json"), "utf8"));
  const { CATALOG } = require(path.join(root, "grafana", "catalog.js"));
  return CATALOG.map((entry) => {
    const panel = dash.panels.find((p) => p.title === entry.name);
    if (!panel) throw new Error("gallery dashboard has no panel titled " + entry.name);
    return { uid: entry.uid, id: panel.id, dashUid: dash.uid, w: panel.gridPos.w, h: panel.gridPos.h };
  });
}

(async () => {
  const only = new Set(process.argv.slice(2));
  const list = panels().filter((p) => !only.size || only.has(p.uid));
  if (!list.length) throw new Error("no panels matched " + [...only].join(", "));
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await launch(playwright().chromium);
  try {
    for (const p of list) {
      const width = p.w * COL_PX;
      const height = p.h * ROW_PX + (p.h - 1) * GAP_PX;
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
      const url = BASE + "/d-solo/" + p.dashUid + "/?panelId=" + p.id + "&theme=" + THEME + "&kiosk";
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForSelector("pre.tf", { timeout: 30000 });
      // Alert / dashboard / annotation lists fill in after their own fetch.
      await page.waitForFunction(() => !document.querySelector(".tf-async"), null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(800); // font + first animation tick
      const file = path.join(OUT, p.uid + ".png");
      await page.screenshot({ path: file });
      await page.close();
      console.log(p.uid.padEnd(24), width + "x" + height, (fs.statSync(file).size / 1024).toFixed(0) + " KB");
    }
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
