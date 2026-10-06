#!/usr/bin/env node
/**
 * Assemble the provisioned dashboards in grafana/provisioning/dashboards/
 * from the Business Text sources and the panel catalogue (catalog.js):
 *
 *   tuiflow-demo.json          hand-made flow box + pods table
 *   tuiflow-gallery.json       every catalogue panel, inlined (no library publish)
 *   tuiflow-library.json       references to every library panel (uid only)
 *   tuiflow-before-after.json  stock Grafana panel on the left, same query +
 *                              same fieldConfig rendered by tuiflow on the right
 *   tuiflow-plugin.json        every catalogue example on the panel plugin
 *
 *   node grafana/build-dashboard.js
 *
 * The generated JSON is committed so `docker compose up` works without Node.
 * Data comes from Grafana's built-in TestData datasource, so everything runs
 * with no cluster attached.
 */
const fs = require("fs");
const path = require("path");
const { CATALOG, TESTDATA, PODS_CSV, walk, csv } = require("./catalog");
const { tuiPanelModel } = require("./build-library");

const here = __dirname;
const version = require("../package.json").version;
const read = (f) => fs.readFileSync(path.join(here, "business-text", f), "utf8").replace(/__TF_VERSION__/g, version);

const helpers = read("before.js");
const afterRender = read("after.js");
const styles = read("styles.css");

const base = (uid, title, description, tags, panels, extra) =>
  Object.assign(
    {
      uid,
      title,
      description,
      tags: ["tuiflow"].concat(tags),
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
        { title: "open with matrix theme", type: "link", url: "/d/" + uid + "/?theme=matrix", icon: "external link" },
        { title: "kiosk + matrix", type: "link", url: "/d/" + uid + "/?theme=matrix&kiosk", targetBlank: true, icon: "external link" },
      ],
      panels,
    },
    extra || {}
  );

const markdown = (id, gridPos, lines) => ({ id, type: "text", title: "", gridPos, options: { mode: "markdown", content: lines.join("\n") } });

// ---------------------------------------------------------------- demo

function businessText(id, title, gridPos, targets, content, renderMode, withAfter) {
  return {
    id,
    type: "marcusolsson-dynamictext-panel",
    title,
    gridPos,
    datasource: TESTDATA,
    targets,
    fieldConfig: { defaults: {}, overrides: [] },
    options: {
      renderMode,
      content,
      defaultContent: "The query didn't return any results.",
      helpers,
      afterRender: withAfter ? afterRender : "",
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

const demo = base(
  "tuiflow-demo",
  "tuiflow · TUI-style panels (TestData)",
  "Retro terminal look rendered as text inside Business Text panels. Data is synthetic.",
  ["demo"],
  [
    businessText(
      1,
      "api-gateway · flow",
      { x: 0, y: 0, w: 10, h: 11 },
      [walk("A", "rps", 300, 30, 10, 50, 600), walk("B", "p95_ms", 80, 15, 5, 10, 250), walk("C", "err_pct", 0.4, 0.3, 0.1, 0, 5)],
      read("content.hbs"),
      "data",
      true
    ),
    businessText(2, "pods · namespace shop", { x: 10, y: 0, w: 14, h: 11 }, [csv("A", PODS_CSV)], read("pods.hbs"), "allRows", false),
    markdown(3, { x: 0, y: 11, w: 24, h: 4 }, [
      "**tuiflow** — every panel above is plain text: box drawing, `█▓░` bars, `▁▂▃▅▇` sparklines and a `.o@` packet travelling on a dashed edge, rendered by a Business Text panel.",
      "",
      "- Full terminal look: reopen this dashboard with [`?theme=matrix`](/d/tuiflow-demo/?theme=matrix) (hidden built-in Grafana theme: monospace font, no rounded corners).",
      "- Every panel on one page: [gallery](/d/tuiflow-gallery/?theme=matrix) · [library panels](/d/tuiflow-library/?theme=matrix) · [before / after](/d/tuiflow-before-after/?theme=matrix).",
      "- Sources: `grafana/business-text/*.{js,hbs,css}` → `npm run build` regenerates this JSON. Core library: `/public/tuiflow.js`.",
    ]),
  ]
);

// ---------------------------------------------------------------- gallery (every panel, self-contained)

const galleryPanels = [
  markdown(1, { x: 0, y: 0, w: 24, h: 2 }, [
    "**Every tuiflow panel** so far, on synthetic TestData. Panels are inlined, so this page renders without `npm run publish:library`.",
    "",
    "Reuse one elsewhere: [library](/d/tuiflow-library/?theme=matrix) (*Add → Import from library*). Compare with stock Grafana: [before / after](/d/tuiflow-before-after/?theme=matrix).",
  ]),
];
{
  let y = 2;
  let id = 2;
  for (let i = 0; i < CATALOG.length; i += 2) {
    const a = CATALOG[i];
    const b = CATALOG[i + 1];
    const h = Math.max(a.h, b ? b.h : 0);
    const left = tuiPanelModel(a);
    left.id = id++;
    left.gridPos = { x: 0, y, w: 12, h };
    galleryPanels.push(left);
    if (b) {
      const right = tuiPanelModel(b);
      right.id = id++;
      right.gridPos = { x: 12, y, w: 12, h };
      galleryPanels.push(right);
    }
    y += h;
  }
}
const gallery = base(
  "tuiflow-gallery",
  "tuiflow · all panels (TestData demo)",
  "Every tuiflow panel rendered from the catalogue on synthetic TestData. Self-contained: no library publish required.",
  ["demo", "gallery"],
  galleryPanels
);

// ---------------------------------------------------------------- library references

const libRef = (id, entry, gridPos) => ({ id, gridPos, libraryPanel: { uid: entry.uid, name: entry.name }, title: entry.name });
const libraryPanels = [];
{
  let y = 0;
  let id = 1;
  const twoUp = CATALOG.filter((e) => e.stock !== null);
  for (let i = 0; i < twoUp.length; i += 2) {
    const a = twoUp[i];
    const b = twoUp[i + 1];
    const h = Math.max(a.h, b ? b.h : 0);
    libraryPanels.push(libRef(id++, a, { x: 0, y, w: 12, h }));
    if (b) libraryPanels.push(libRef(id++, b, { x: 12, y, w: 12, h }));
    y += h;
  }
  const flow = CATALOG.find((e) => e.uid === "tuiflow-flow");
  libraryPanels.push(libRef(id++, flow, { x: 0, y, w: 12, h: flow.h }));
  libraryPanels.push(
    markdown(id++, { x: 12, y, w: 12, h: flow.h }, [
      "**Use these anywhere**: in any dashboard, *Add → Import from library* → pick a `TUI …` panel → *Unlink* (optional) → replace the sample queries with your own.",
      "",
      "- Templates don't care about field names: numeric fields become series, the first string field becomes categories; Grafana field config (unit, decimals, min/max, thresholds, display name) is honoured.",
      "- Convert an existing panel in place: change its visualization to *Business Text*, paste the one-line Content (e.g. `{{{tfTimeseries 90 14}}}`) and the helpers/styles from any TUI panel. Queries stay as they are.",
      "- Numbers in the braces are cell widths/heights — pick them for the panel size; auto-fit comes with the panel plugin.",
      "- Compare with stock panels: [before / after](/d/tuiflow-before-after/?theme=matrix).",
    ])
  );
}
const library = base(
  "tuiflow-library",
  "tuiflow · library panels (any query → TUI)",
  "Each panel is a tuiflow library panel. Run `npm run publish:library` first.",
  ["library"],
  libraryPanels
);

// ---------------------------------------------------------------- before / after

const beforeAfterPanels = [
  markdown(1000, { x: 0, y: 0, w: 24, h: 2 }, [
    "**Left** = stock Grafana visualization · **Right** = the same `targets` and the same `fieldConfig` rendered as text by tuiflow. " +
      "Diff a pair in *Inspect → Panel JSON*: only `type` and `options` differ. Convert any of your panels the same way, or *Import from library → TUI …* and swap the query.",
  ]),
];
{
  let y = 2;
  let id = 1;
  CATALOG.filter((e) => e.stock !== null).forEach((entry) => {
    beforeAfterPanels.push(
      Object.assign(entry.panelExtra ? Object.assign({}, entry.panelExtra) : {}, {
        id: id++,
        type: entry.stock,
        title: entry.name.replace(/^TUI /, "") + " (stock)",
        gridPos: { x: 0, y, w: 12, h: entry.h },
        datasource: TESTDATA,
        targets: entry.targets,
        fieldConfig: entry.fieldConfig,
        options: entry.stockOptions,
      })
    );
    const tui = tuiPanelModel(entry);
    tui.id = id++;
    tui.title = entry.name + " (tuiflow)";
    tui.gridPos = { x: 12, y, w: 12, h: entry.h };
    delete tui.description;
    beforeAfterPanels.push(tui);
    y += entry.h;
  });
}
const beforeAfter = base(
  "tuiflow-before-after",
  "tuiflow · before / after (same query, same field config)",
  "Left: stock Grafana panels. Right: identical targets + fieldConfig, rendered by tuiflow. Only type/options differ.",
  ["example"],
  beforeAfterPanels,
  { graphTooltip: 1 }
);

// ---------------------------------------------------------------- panel plugin examples

const VIEW_BY_UID = {
  "tuiflow-piechart": "pie",
  "tuiflow-state-timeline": "state",
  "tuiflow-status-history": "status",
  "tuiflow-xychart": "xy",
  "tuiflow-flamegraph": "flame",
  "tuiflow-alertlist": "alerts",
  "tuiflow-dashlist": "dashboards",
  "tuiflow-annolist": "annotations",
};
const pluginView = (entry) => VIEW_BY_UID[entry.uid] || entry.uid.replace(/^tuiflow-/, "");

const pluginPanels = [
  markdown(1, { x: 0, y: 0, w: 24, h: 2 }, [
    "**tuiflow panel plugin** examples. Each panel is visualization `tuiflow` with a different View, and the same TestData query the Business Text catalogue uses.",
    "",
    "Grafana's own theme stays as it is. Open [the gallery](/d/tuiflow-gallery/?theme=dark) for the Business Text versions of the same drawings.",
  ]),
];
{
  let y = 2;
  let id = 2;
  for (let i = 0; i < CATALOG.length; i += 2) {
    const pair = [CATALOG[i], CATALOG[i + 1]].filter(Boolean);
    const h = Math.max(...pair.map((e) => e.h));
    pair.forEach((entry, col) => {
      pluginPanels.push(
        Object.assign(entry.panelExtra ? Object.assign({}, entry.panelExtra) : {}, {
          id: id++,
          type: "tuiflow-tui-panel",
          title: entry.name.replace(/^TUI /, ""),
          description: entry.description,
          gridPos: { x: col * 12, y, w: 12, h },
          datasource: TESTDATA,
          targets: entry.targets,
          fieldConfig: entry.fieldConfig,
          options: { view: pluginView(entry) },
        })
      );
    });
    y += h;
  }
}
const pluginDash = base(
  "tuiflow-plugin",
  "tuiflow · panel plugin examples",
  "Every tuiflow view on the panel plugin, with the catalogue's TestData queries.",
  ["plugin", "example"],
  pluginPanels
);

// ---------------------------------------------------------------- write

const outDir = path.join(here, "provisioning", "dashboards");
fs.mkdirSync(outDir, { recursive: true });
[
  ["tuiflow-demo.json", demo],
  ["tuiflow-gallery.json", gallery],
  ["tuiflow-library.json", library],
  ["tuiflow-before-after.json", beforeAfter],
  ["tuiflow-plugin.json", pluginDash],
].forEach(([name, json]) => {
  const outFile = path.join(outDir, name);
  fs.writeFileSync(outFile, JSON.stringify(json, null, 2) + "\n");
  console.log("wrote", path.relative(process.cwd(), outFile));
});
