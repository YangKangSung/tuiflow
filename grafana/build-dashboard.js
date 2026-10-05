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
const read = (f) => fs.readFileSync(path.join(here, "business-text", f), "utf8");

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

const outDir = path.join(here, "provisioning", "dashboards");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "tuiflow-demo.json");
fs.writeFileSync(outFile, JSON.stringify(dashboard, null, 2) + "\n");
console.log("wrote", path.relative(process.cwd(), outFile));
