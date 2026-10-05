#!/usr/bin/env node
/**
 * Generate the reusable library panels in grafana/library/*.json from the
 * Business Text sources. Each file is a Grafana library element
 * ({ uid, name, kind: 1, model }) that publish-library.js upserts through
 * /api/library-elements, after which any dashboard can "Add → Import from
 * library", swap the query, and get the TUI rendering of its own data.
 *
 *   node grafana/build-library.js
 */
const fs = require("fs");
const path = require("path");

const here = __dirname;
const version = require("../package.json").version;
const read = (f) => fs.readFileSync(path.join(here, "business-text", f), "utf8").replace(/__TF_VERSION__/g, version);
const TESTDATA = { type: "grafana-testdata-datasource", uid: "testdata" };

const helpers = read("before.js");
const styles = read("styles.css");

const walk = (refId, alias, startValue, spread, noise, min, max) => ({
  refId,
  datasource: TESTDATA,
  scenarioId: "random_walk",
  alias,
  startValue,
  spread,
  noise,
  min,
  max,
});

// Three sample series so every panel renders something the moment it is imported.
const sampleSeries = [
  walk("A", "api-gateway", 300, 30, 10, 50, 600),
  walk("B", "orders-svc", 180, 20, 8, 20, 400),
  walk("C", "payments-svc", 90, 15, 5, 10, 250),
];

function model(title, description, content, extra) {
  return Object.assign(
    {
      type: "marcusolsson-dynamictext-panel",
      title,
      description,
      datasource: TESTDATA,
      targets: sampleSeries,
      gridPos: { h: 10, w: 12, x: 0, y: 0 },
      fieldConfig: { defaults: { unit: "reqps", decimals: 0 }, overrides: [] },
      options: {
        renderMode: "data",
        content,
        defaultContent: "The query didn't return any results.",
        helpers,
        afterRender: "",
        styles,
        externalStyles: [],
        contentPartials: [],
        editors: ["helpers", "afterRender", "styles"],
        editor: { format: "auto", language: "html" },
        wrap: true,
        status: "",
      },
    },
    extra || {}
  );
}

const usage =
  "Replace the TestData queries with your own; units, decimals, min/max and thresholds from the field config are honoured. " +
  "Arguments are cell widths/heights, e.g. {{{tfTimeseries 100 16}}}.";

const library = [
  {
    uid: "tuiflow-timeseries",
    name: "TUI Time series",
    model: model("TUI Time series", "Braille line chart of every numeric series. " + usage, "<pre class=\"tf\">{{{tfTimeseries 90 14}}}</pre>"),
  },
  {
    uid: "tuiflow-stat",
    name: "TUI Stat",
    model: model("TUI Stat", "Name · sparkline · last value per series, coloured by thresholds. " + usage, "<pre class=\"tf\">{{{tfStat 28}}}</pre>", {
      gridPos: { h: 6, w: 12, x: 0, y: 0 },
    }),
  },
  {
    uid: "tuiflow-bargauge",
    name: "TUI Bar gauge",
    model: model("TUI Bar gauge", "Block bar per series on the field's min/max. " + usage, "<pre class=\"tf\">{{{tfBarGauge 32}}}</pre>", {
      gridPos: { h: 6, w: 12, x: 0, y: 0 },
      fieldConfig: {
        defaults: {
          unit: "reqps",
          decimals: 0,
          min: 0,
          max: 600,
          thresholds: { mode: "absolute", steps: [{ color: "green", value: null }, { color: "orange", value: 300 }, { color: "red", value: 450 }] },
        },
        overrides: [],
      },
    }),
  },
  {
    uid: "tuiflow-gauge",
    name: "TUI Gauge",
    model: model("TUI Gauge", "[████░░░░] percent meter per series. " + usage, "<pre class=\"tf\">{{{tfGauge 20}}}</pre>", {
      gridPos: { h: 6, w: 12, x: 0, y: 0 },
      fieldConfig: {
        defaults: {
          unit: "reqps",
          decimals: 0,
          min: 0,
          max: 600,
          thresholds: { mode: "absolute", steps: [{ color: "green", value: null }, { color: "orange", value: 300 }, { color: "red", value: 450 }] },
        },
        overrides: [],
      },
    }),
  },
  {
    uid: "tuiflow-table",
    name: "TUI Table",
    model: model("TUI Table", "First frame as a monospace table; numeric cells use the field display (unit, thresholds). " + usage, "<pre class=\"tf\">{{{tfTable 40}}}</pre>", {
      targets: [
        {
          refId: "A",
          datasource: TESTDATA,
          scenarioId: "csv_content",
          csvContent: [
            "pod,ready,restarts,cpu_m,mem_mi,status",
            "api-gateway-7d9f8c-4hv2x,1/1,0,310,540,Running",
            "orders-svc-5c6b7d-abc12,1/1,0,180,420,Running",
            "orders-svc-5c6b7d-jkl78,0/1,0,0,0,Pending",
            "payments-svc-69fd4-t5yui,0/1,7,15,1010,CrashLoopBackOff",
            "postgres-0,1/1,0,410,1800,Running",
          ].join("\n"),
        },
      ],
      fieldConfig: { defaults: {}, overrides: [] },
    }),
  },
  {
    uid: "tuiflow-flow",
    name: "TUI Flow (api-gateway box)",
    model: model("TUI Flow", "Hand-made box with bars, sparklines and an animated packet edge; template expects fields rps, p95_ms, err_pct.", read("content.hbs"), {
      targets: [walk("A", "rps", 300, 30, 10, 50, 600), walk("B", "p95_ms", 80, 15, 5, 10, 250), walk("C", "err_pct", 0.4, 0.3, 0.1, 0, 5)],
      fieldConfig: { defaults: {}, overrides: [] },
      options: undefined,
    }),
  },
];
// the flow panel needs the after-render animation
library[5].model.options = Object.assign({}, library[0].model.options, { content: read("content.hbs"), afterRender: read("after.js") });

const outDir = path.join(here, "library");
fs.mkdirSync(outDir, { recursive: true });
library.forEach((el) => {
  const file = path.join(outDir, el.uid + ".json");
  fs.writeFileSync(file, JSON.stringify({ uid: el.uid, name: el.name, kind: 1, model: el.model }, null, 2) + "\n");
  console.log("wrote", path.relative(process.cwd(), file));
});
