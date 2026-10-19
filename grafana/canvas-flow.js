/**
 * Canvas, as text. The stock panel is boxes plus connections whose dashes
 * travel. This dashboard draws that with the tfServiceFlow helper
 * (src/tuiflow-helpers.js): dashed tf.box frames and a .o@ packet on each
 * link, moved by src/tuiflow-dom.js.
 *
 *   node grafana/canvas-flow.js
 */
const fs = require("fs");
const path = require("path");
const { read } = require("./business-text/sources");

const here = __dirname;

const CSV = [
  "service,rps,err",
  "ingress,128,1.2",
  "api-gateway,340,0.4",
  "orders,96,0.2",
  "payments,74,1.8",
  "shop,41,0.1",
  "postgres,55,0.3",
];

function canvasFlowDashboard() {
  const helpers = read("before.js");
  const afterRender = read("after.js");
  const styles = read("styles.css");
  return {
    uid: "tuiflow-canvas-flow",
    title: "tuiflow · canvas (TUI)",
    description: "Grafana Canvas as text: dashed boxes and a .o@ packet travelling on each connection. Data is synthetic.",
    tags: ["tuiflow", "demo", "canvas"],
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
      { title: "open with matrix theme", type: "link", url: "/d/tuiflow-canvas-flow/?theme=matrix", icon: "external link" },
      { title: "kiosk + matrix", type: "link", url: "/d/tuiflow-canvas-flow/?theme=matrix&kiosk", targetBlank: true, icon: "external link" },
    ],
    panels: [
      {
        id: 1,
        type: "marcusolsson-dynamictext-panel",
        title: "request path",
        description: "ingress → api-gateway → orders / payments / shop, payments → postgres. Packets move on the links.",
        gridPos: { x: 0, y: 0, w: 24, h: 14 },
        datasource: { type: "grafana-testdata-datasource", uid: "testdata" },
        targets: [
          {
            refId: "A",
            datasource: { type: "grafana-testdata-datasource", uid: "testdata" },
            scenarioId: "csv_content",
            csvContent: CSV.join("\n"),
          },
        ],
        fieldConfig: { defaults: {}, overrides: [] },
        options: {
          renderMode: "data",
          content: '<pre class="tf">{{{tfServiceFlow}}}</pre>',
          defaultContent: "The query didn't return any results.",
          helpers,
          afterRender,
          styles,
          externalStyles: [],
          contentPartials: [],
          editors: ["helpers", "afterRender", "styles"],
          editor: { format: "auto", language: "html" },
          wrap: false,
          status: "",
        },
      },
    ],
  };
}

function main() {
  const outDir = path.join(here, "provisioning", "dashboards");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, "tuiflow-canvas-flow.json");
  fs.writeFileSync(outFile, JSON.stringify(canvasFlowDashboard(), null, 2) + "\n");
  console.log("wrote", path.relative(process.cwd(), outFile));
}

if (require.main === module) main();

module.exports = { canvasFlowDashboard };
