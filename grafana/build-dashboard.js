#!/usr/bin/env node
/**
 * Assemble grafana/provisioning/dashboards/tuiflow-demo.json from the editable
 * sources in grafana/business-text/. Run after changing any of them:
 *
 *   node grafana/build-dashboard.js
 *
 * The generated JSON is committed so `docker compose up` works without Node.
 * Data comes from Grafana's built-in TestData datasource (random walk + CSV),
 * so the dashboard runs with no cluster attached.
 */
const fs = require("fs");
const path = require("path");

const here = __dirname;
const version = require("../package.json").version;
const read = (f) => fs.readFileSync(path.join(here, "business-text", f), "utf8").replace(/__TF_VERSION__/g, version);

const TESTDATA = { type: "grafana-testdata-datasource", uid: "testdata" };

const helpers = read("before.js");
const afterRender = read("after.js");
const styles = read("styles.css");

const PODS_CSV = [
  "pod,ready,restarts,cpu_m,mem_mi,status",
  "ingress-nginx-controller-6b8f-x2k1,1/1,0,120,210,Running",
  "ingress-nginx-controller-6b8f-p9zq,1/1,0,98,205,Running",
  "api-gateway-7d9f8c-4hv2x,1/1,0,310,540,Running",
  "api-gateway-7d9f8c-m8ql7,1/1,1,290,512,Running",
  "orders-svc-5c6b7d-abc12,1/1,0,180,420,Running",
  "orders-svc-5c6b7d-def34,1/1,0,175,415,Running",
  "orders-svc-5c6b7d-ghi56,1/1,0,190,430,Running",
  "orders-svc-5c6b7d-jkl78,0/1,0,0,0,Pending",
  "payments-svc-69fd4-q2wer,1/1,3,220,980,Running",
  "payments-svc-69fd4-t5yui,0/1,7,15,1010,CrashLoopBackOff",
  "postgres-0,1/1,0,410,1800,Running",
].join("\n");

function businessText(id, title, gridPos, targets, content, renderMode, extraAfter) {
  return {
    id,
    type: "marcusolsson-dynamictext-panel",
    title,
    gridPos,
    datasource: TESTDATA,
    targets: targets.map((t) => ({ datasource: TESTDATA, ...t })),
    fieldConfig: { defaults: {}, overrides: [] },
    options: {
      renderMode,
      content,
      defaultContent: "The query didn't return any results.",
      helpers,
      afterRender: extraAfter ? afterRender : "",
      styles,
      externalStyles: [],
      contentPartials: [],
      editors: ["helpers", "afterRender", "styles"],
      editor: { format: "auto", language: "html" },
      wrap: true,
      status: "",
    },
  };
}

const walk = (refId, alias, startValue, spread, noise, min, max) => ({
  refId,
  scenarioId: "random_walk",
  alias,
  startValue,
  spread,
  noise,
  min,
  max,
});

const dashboard = {
  uid: "tuiflow-demo",
  title: "tuiflow · TUI-style panels (TestData)",
  description: "Retro terminal look rendered as text inside Business Text panels. Data is synthetic.",
  tags: ["tuiflow", "demo"],
  timezone: "browser",
  editable: true,
  graphTooltip: 0,
  schemaVersion: 39,
  version: 1,
  refresh: "10s",
  time: { from: "now-1h", to: "now" },
  templating: { list: [] },
  annotations: { list: [] },
  links: [
    { title: "open with matrix theme", type: "link", url: "/d/tuiflow-demo/?theme=matrix", targetBlank: false, icon: "external link" },
    { title: "kiosk + matrix", type: "link", url: "/d/tuiflow-demo/?theme=matrix&kiosk", targetBlank: true, icon: "external link" },
  ],
  panels: [
    businessText(
      1,
      "api-gateway · flow",
      { x: 0, y: 0, w: 10, h: 11 },
      [
        walk("A", "rps", 300, 30, 10, 50, 600),
        walk("B", "p95_ms", 80, 15, 5, 10, 250),
        walk("C", "err_pct", 0.4, 0.3, 0.1, 0, 5),
      ],
      read("content.hbs"),
      "data",
      true
    ),
    businessText(
      2,
      "pods · namespace shop",
      { x: 10, y: 0, w: 14, h: 11 },
      [{ refId: "A", scenarioId: "csv_content", csvContent: PODS_CSV }],
      read("pods.hbs"),
      "allRows",
      false
    ),
    {
      id: 3,
      type: "text",
      title: "",
      gridPos: { x: 0, y: 11, w: 24, h: 4 },
      options: {
        mode: "markdown",
        content: [
          "**tuiflow** — every panel above is plain text: box drawing, `█▓░` bars, `▁▂▃▅▇` sparklines and a `.o@` packet travelling on a dashed edge, rendered by a Business Text panel.",
          "",
          "- Full terminal look: reopen this dashboard with [`?theme=matrix`](/d/tuiflow-demo/?theme=matrix) (hidden built-in Grafana theme: monospace font, no rounded corners).",
          "- Sources: `grafana/business-text/*.{js,hbs,css}` → `node grafana/build-dashboard.js` regenerates this JSON. Core library: `/public/tuiflow.js`.",
          "- Swap TestData for Prometheus: keep the aliases `rps`, `p95_ms`, `err_pct` as legend formats and the template keeps working.",
        ].join("\n"),
      },
    },
  ],
};

// Second dashboard: nothing but references to the library panels published by
// publish-library.js. Grafana resolves them at load time, so this file stays
// tiny and every panel updates when the library element does.
const libRef = (id, uid, name, gridPos) => ({ id, gridPos, libraryPanel: { uid, name }, title: name });
const libraryDashboard = {
  uid: "tuiflow-library",
  title: "tuiflow · library panels (any query → TUI)",
  description: "Each panel is a tuiflow library panel. Run `node grafana/publish-library.js` first.",
  tags: ["tuiflow", "library"],
  timezone: "browser",
  editable: true,
  graphTooltip: 0,
  schemaVersion: 39,
  version: 1,
  refresh: "10s",
  time: { from: "now-1h", to: "now" },
  templating: { list: [] },
  annotations: { list: [] },
  links: [{ title: "open with matrix theme", type: "link", url: "/d/tuiflow-library/?theme=matrix", icon: "external link" }],
  panels: [
    libRef(1, "tuiflow-timeseries", "TUI Time series", { x: 0, y: 0, w: 14, h: 11 }),
    libRef(2, "tuiflow-stat", "TUI Stat", { x: 14, y: 0, w: 10, h: 5 }),
    libRef(3, "tuiflow-bargauge", "TUI Bar gauge", { x: 14, y: 5, w: 10, h: 6 }),
    libRef(4, "tuiflow-gauge", "TUI Gauge", { x: 0, y: 11, w: 8, h: 6 }),
    libRef(5, "tuiflow-table", "TUI Table", { x: 8, y: 11, w: 16, h: 6 }),
    libRef(6, "tuiflow-flow", "TUI Flow (api-gateway box)", { x: 0, y: 17, w: 12, h: 11 }),
    {
      id: 7,
      type: "text",
      title: "",
      gridPos: { x: 12, y: 17, w: 12, h: 11 },
      options: {
        mode: "markdown",
        content: [
          "**Use these anywhere**: in any dashboard, *Add → Import from library* → pick a `TUI …` panel → *Unlink* (optional) → replace the TestData queries with your own.",
          "",
          "- The templates don't care about field names: every numeric field becomes a series; Grafana field config (unit, decimals, min/max, thresholds, display name) is honoured.",
          "- Convert an existing panel: change its visualization to *Business Text*, paste `{{{tfTimeseries 90 14}}}` (or `tfStat` / `tfBarGauge` / `tfGauge` / `tfTable`) as Content and the helpers/styles from a TUI panel. Queries stay as they are.",
          "- Numbers in the braces are cell widths/heights. Pick them for the panel size; auto-fit comes with the panel plugin.",
          "- Reopen with [`?theme=matrix`](/d/tuiflow-library/?theme=matrix).",
        ].join("\n"),
      },
    },
  ],
};

const outDir = path.join(here, "provisioning", "dashboards");
fs.mkdirSync(outDir, { recursive: true });
[
  ["tuiflow-demo.json", dashboard],
  ["tuiflow-library.json", libraryDashboard],
].forEach(([name, json]) => {
  const outFile = path.join(outDir, name);
  fs.writeFileSync(outFile, JSON.stringify(json, null, 2) + "\n");
  console.log("wrote", path.relative(process.cwd(), outFile));
});
