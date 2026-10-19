// Renders the Business Text adapter (grafana/business-text/*) the way the
// panel does: before.js via `new Function('context', code)`, which registers
// the src/tuiflow-helpers.js helpers, then Handlebars compile with `{ data }`.
// Catches template typos and width drift without a running Grafana. Requires
// the `handlebars` devDependency (npm install).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const hb = require("handlebars");

// What the three /public/tuiflow*.js modules leave on window in a browser.
globalThis.window = globalThis;
globalThis.tuiflow = require("../src/tuiflow.js");
globalThis.tuiflowHelpers = require("../src/tuiflow-helpers.js");
globalThis.tuiflowDom = require("../src/tuiflow-dom.js");

// Same substitution the build scripts apply, so "in sync" checks compare like with like.
const { read: src } = require("../grafana/business-text/sources");
const width = (s) => Array.from(s).length;
const strip = (html) => html.replace(/<[^>]+>/g, "");

// The adapter loads the modules with dynamic imports; they are already
// required above, so each import becomes a resolved promise.
const helpers = src("before.js").replace(/import\("\/public\/tuiflow[^"]*"\)/g, "Promise.resolve()");
assert.notEqual(helpers, src("before.js"), "import() statements were found and stubbed");
assert.equal((src("before.js").match(/import\(/g) || []).length, 3, "adapter loads core, helpers and dom");

const series = (alias, base, n = 120) =>
  Array.from({ length: n }, (_, i) => ({ time: i, [alias]: base + Math.sin(i / 9) * base * 0.4 }));

test("before.js registers helpers through the panel's Function wrapper", async () => {
  const run = new Function("context", helpers);
  const result = run({ handlebars: hb });
  assert.ok(result instanceof Promise, "returns a promise the panel awaits");
  await result;
  ["tfBar", "tfSpark", "tfLast", "tfMax", "tfAvg", "tfFixed", "tfPadL", "tfPadR", "tfStatus", "tfPhase"].forEach((h) =>
    assert.equal(typeof hb.helpers[h], "function", h)
  );
});

test("content.hbs renders an aligned box in All data mode", async () => {
  await new Function("context", helpers)({ handlebars: hb });
  const data = [series("rps", 320), series("p95_ms", 90), series("err_pct", 0.8)];
  const html = hb.compile(src("content.hbs"))({ data });
  const lines = strip(html).split("\n");
  const box = lines.filter((l) => /^[┌┆└]/.test(l));
  assert.equal(box.length, 9);
  const widths = new Set(box.map(width));
  assert.equal(widths.size, 1, "all box lines share one width: " + [...widths]);
  assert.match(html, /<span class="tf-(ok|warn|crit)">/);
  assert.match(html, /tf-edge/);
});

test("pods.hbs renders one line per row in All rows mode", async () => {
  await new Function("context", helpers)({ handlebars: hb });
  const data = [
    { pod: "api-gateway-7d9f8c-4hv2x", ready: "1/1", restarts: 0, cpu_m: 310, mem_mi: 540, status: "Running" },
    { pod: "payments-svc-69fd4-t5yui", ready: "0/1", restarts: 7, cpu_m: 15, mem_mi: 1010, status: "CrashLoopBackOff" },
    { pod: "orders-svc-5c6b7d-jkl78", ready: "0/1", restarts: 0, cpu_m: 0, mem_mi: 0, status: "Pending" },
  ];
  const html = hb.compile(src("pods.hbs"))({ data });
  const rows = strip(html).split("\n").filter((l) => /^(api|payments|orders)-/.test(l));
  assert.equal(rows.length, 3);
  assert.equal(new Set(rows.map(width)).size, 1, "rows are equally wide");
  assert.match(html, /tf-crit">CrashLoopBackOff/);
  assert.match(html, /tf-warn">Pending/);
  assert.match(html, /3 pods/);
});

// --- generic panel helpers against fake Grafana DataFrames -------------------

const t0 = 1_700_000_000_000;
const display = (unit) => (v) => ({ text: Number(v).toFixed(0), suffix: " " + unit, color: v > 450 ? "red" : v > 300 ? "orange" : "green" });
function frame(name, base, opts = {}) {
  const n = 60;
  const times = Array.from({ length: n }, (_, i) => t0 + i * 60_000);
  const values = Array.from({ length: n }, (_, i) => base + Math.sin(i / 7) * base * 0.4);
  return {
    name,
    length: n,
    fields: [
      { name: "Time", type: "time", values: opts.vector ? { toArray: () => times } : times, config: {} },
      {
        name: "Value",
        type: "number",
        values: opts.vector ? { toArray: () => values } : values,
        labels: { service: name },
        config: Object.assign({ unit: "reqps", displayNameFromDS: name }, opts.config || {}),
        display: display("req/s"),
      },
    ],
  };
}
const panelData = { series: [frame("api-gateway", 300), frame("orders-svc", 180, { vector: true }), frame("payments", 90, { config: { min: 0, max: 600 } })] };

async function renderGeneric(content) {
  await new Function("context", helpers)({ handlebars: hb, panelData });
  return hb.compile(content)({ data: [] });
}

test("tfTimeseries draws a braille chart with axis, legend and series colours", async () => {
  const html = await renderGeneric("{{{tfTimeseries 80 10}}}");
  const text = strip(html).split("\n");
  assert.ok(text.length >= 13, "rows: " + text.length);
  assert.match(text[0], /req\/s ┤/, "y-axis label uses field display");
  assert.match(html, /[\u2800-\u28ff]/, "braille glyphs present");
  assert.match(html, /class="tf-s0"/);
  assert.match(html, /class="tf-s2"/);
  assert.match(strip(html), /■ api-gateway \d+ req\/s/);
  assert.match(strip(html), /■ orders-svc/, "Vector-style values are read");
});

test("tfStat / tfBarGauge / tfGauge render one coloured line per series", async () => {
  const stat = await renderGeneric("{{{tfStat 20}}}");
  assert.equal(strip(stat).split("\n").length, 3);
  assert.match(stat, /style="color:(red|orange|green)"/, "threshold colour from field display");
  const bar = await renderGeneric("{{{tfBarGauge 20}}}");
  const barLines = strip(bar).split("\n");
  assert.equal(barLines.length, 3);
  assert.equal(new Set(barLines.map((l) => l.indexOf("█") < 0 ? l.indexOf("░") : Math.min(l.indexOf("█"), l.indexOf("░") < 0 ? 1e9 : l.indexOf("░")))).size, 1, "bars start in the same column");
  const gauge = await renderGeneric("{{{tfGauge 12}}}");
  assert.match(strip(gauge), /\[[█▏▎▍▌▋▊▉░]{12}\]\s+\d+%/);
});

test("tfTable renders the first frame with display formatting and right-aligned numbers", async () => {
  const html = await renderGeneric("{{{tfTable 5}}}");
  const lines = strip(html).split("\n");
  assert.equal(lines.length, 2 + 5);
  assert.match(lines[0], /Time\s+api-gateway/);
  assert.match(lines[2], /\d+ req\/s$/);
});

const catFrame = {
  name: "services",
  length: 3,
  fields: [
    { name: "service", type: "string", values: ["api-gateway", "orders-svc", "payments-svc"], config: {} },
    { name: "requests", type: "number", values: [812, 431, 268], config: {}, display: (v) => ({ text: String(v) }) },
    { name: "errors", type: "number", values: [12, 3, 9], config: {}, display: (v) => ({ text: String(v) }) },
  ],
};
async function renderWith(series, content) {
  await new Function("context", helpers)({ handlebars: hb, panelData: { series } });
  return hb.compile(content)({ data: [] });
}

test("tfBarChart / tfColumns / tfPie render a categorical frame", async () => {
  const bars = strip(await renderWith([catFrame], "{{{tfBarChart 20}}}")).split("\n");
  assert.equal(bars.filter((l) => /[█▏▎▍▌▋▊▉░]/.test(l)).length, 6, "3 categories × 2 numeric fields");
  assert.match(bars[0], /^api-gateway\s+█{20} 812$/);
  const cols = strip(await renderWith([catFrame], "{{{tfColumns 6 4}}}")).split("\n");
  assert.equal(cols.length, 7);
  assert.match(cols[cols.length - 1], /api-/);
  const pie = await renderWith([catFrame], "{{{tfPie 4 0}}}");
  assert.match(pie, /[▀▄█]/);
  assert.equal(/[\u2800-\u28ff]/.test(strip(pie)), false);
  assert.match(pie, /class="tf-s\d tf-bg\d">[\u2580-\u259f]/);
  assert.match(strip(pie), /■ api-gateway\s+54%\s+812/);
});

test("tfStateTimeline / tfStatusHistory / tfHeatmap / tfHistogram use the series", async () => {
  const tl = await renderGeneric("{{{tfStateTimeline 40}}}");
  assert.equal(strip(tl).split("\n").length, 4, "3 rows + time axis");
  assert.match(tl, /style="color:(red|orange|green)">█+/);
  const sh = strip(await renderGeneric("{{{tfStatusHistory 40}}}"));
  assert.match(sh, /(▇ ){5,}/);
  const hm = strip(await renderGeneric("{{{tfHeatmap 40 6}}}")).split("\n");
  assert.equal(hm.length, 7);
  assert.match(hm.join(""), /[░▒▓█]/);
  const hist = strip(await renderGeneric("{{{tfHistogram 20 5}}}")).split("\n");
  assert.equal(hist.length, 6);
  assert.match(hist[hist.length - 1], /req\/s.*req\/s/);
});

test("tfCandlestick / tfXY / tfTrend read numeric columns of the first frame", async () => {
  const n = 30;
  const t = Array.from({ length: n }, (_, i) => t0 + i * 900e3);
  const open = Array.from({ length: n }, (_, i) => 100 + Math.sin(i / 4) * 10);
  const close = open.map((o, i) => o + (i % 3 === 0 ? 3 : -2));
  const ohlc = {
    name: "ohlc", length: n,
    fields: [
      { name: "time", type: "time", values: t, config: {} },
      { name: "open", type: "number", values: open, config: {}, display: (v) => ({ text: v.toFixed(1) }) },
      { name: "high", type: "number", values: open.map((o, i) => Math.max(o, close[i]) + 2), config: {}, display: (v) => ({ text: v.toFixed(1) }) },
      { name: "low", type: "number", values: open.map((o, i) => Math.min(o, close[i]) - 2), config: {}, display: (v) => ({ text: v.toFixed(1) }) },
      { name: "close", type: "number", values: close, config: {}, display: (v) => ({ text: v.toFixed(1) }) },
    ],
  };
  const cs = await renderWith([ohlc], "{{{tfCandlestick 30 8}}}");
  assert.match(cs, /class="tf-up"/);
  assert.match(cs, /class="tf-down"/);
  assert.match(strip(cs), /last \d+\.\d/);
  const xy = {
    name: "xy", length: 20,
    fields: [
      { name: "latency_ms", type: "number", values: Array.from({ length: 20 }, (_, i) => 20 + i * 5), config: {}, display: (v) => ({ text: v.toFixed(0) + " ms" }) },
      { name: "rps", type: "number", values: Array.from({ length: 20 }, (_, i) => 900 - i * 30), config: {}, display: (v) => ({ text: v.toFixed(0) }) },
    ],
  };
  const sc = strip(await renderWith([xy], "{{{tfXY 40 6}}}"));
  assert.match(sc, /[\u2800-\u28ff]/);
  assert.match(sc, /20 ms.*115 ms/);
  assert.match(sc, /■ rps\s+x: latency_ms/);
  const tr = await renderWith([xy], "{{{tfTrend 40 6}}}");
  assert.match(tr, /[\u2800-\u28ff]/);
});

test("tfLogs / tfNodeGraph / tfTraces understand their Grafana frame shapes", async () => {
  const logs = {
    name: "logs", length: 3,
    fields: [
      { name: "time", type: "time", values: [t0, t0 + 1000, t0 + 2000], config: {} },
      { name: "message", type: "string", values: ["started worker", "warn: slow query 2.1s", "error: connection refused"], config: {} },
      { name: "level", type: "string", values: ["info", "warning", "error"], config: {} },
    ],
  };
  const lg = await renderWith([logs], "{{{tfLogs 10}}}");
  const lines = strip(lg).split("\n");
  assert.equal(lines.length, 3);
  assert.match(lines[0], /\[error\] error: connection refused$/, "newest first");
  assert.match(lg, /class="tf-crit">\[error\]/);
  assert.match(lg, /class="tf-warn">\[warn\] /, "warning normalised to [warn]");

  const nodes = { name: "nodes", length: 3, fields: [
    { name: "id", type: "string", values: ["a", "b", "c"], config: {} },
    { name: "title", type: "string", values: ["ingress", "api", "db"], config: {} },
    { name: "mainstat", type: "number", values: [812, 640, 120], config: { unit: "reqps" }, display: (v) => ({ text: v + " req/s" }) },
  ] };
  const edges = { name: "edges", length: 2, fields: [
    { name: "id", type: "string", values: ["e1", "e2"], config: {} },
    { name: "source", type: "string", values: ["a", "b"], config: {} },
    { name: "target", type: "string", values: ["b", "c"], config: {} },
  ] };
  const ngHtml = await renderWith([nodes, edges], "{{{tfNodeGraph}}}");
  assert.doesNotMatch(ngHtml, /<span class="tf-edge">\s*<\/span>/, "no blank .tf-edge: tuiflow-dom would animate it as the flow edge");
  const ng = strip(ngHtml);
  assert.match(ng, /┌ ingress|ingress/);
  assert.match(ng, /ingress ──▶ api/);
  assert.match(ng, /api ──▶ db/);
  const titleRow = ng.split("\n")[1];
  assert.ok(titleRow.indexOf("ingress") < titleRow.indexOf("api") && titleRow.indexOf("api") < titleRow.indexOf("db"), "layers left to right");

  const spans = { name: "trace", length: 3, fields: [
    { name: "traceID", type: "string", values: ["t", "t", "t"], config: {} },
    { name: "spanID", type: "string", values: ["1", "2", "3"], config: {} },
    { name: "parentSpanID", type: "string", values: ["", "1", "2"], config: {} },
    { name: "operationName", type: "string", values: ["GET /checkout", "orders.create", "pg.insert"], config: {} },
    { name: "serviceName", type: "string", values: ["gateway", "orders", "postgres"], config: {} },
    { name: "startTime", type: "number", values: [0, 10, 20], config: {} },
    { name: "duration", type: "number", values: [100, 60, 20], config: {} },
  ] };
  const tr = strip(await renderWith([spans], "{{{tfTraces 40 10}}}")).split("\n");
  assert.equal(tr.length, 3);
  assert.match(tr[0], /^GET \/checkout\s+█{40}/);
  assert.match(tr[2], /^ {4}pg\.insert/, "indented by depth");
});

test("tfAlertList / tfDashboardList emit async placeholders", async () => {
  const html = await renderWith([], "{{{tfAlertList 5}}}{{{tfDashboardList 7}}}");
  assert.match(html, /class="tf-async" data-tf="alerts" data-max="5"/);
  assert.match(html, /data-tf="dashboards" data-max="7"/);
});

test("tfServiceFlow draws the canvas diagram as boxes and packets", async () => {
  const flowFrame = {
    name: "flow",
    length: 6,
    fields: [
      { name: "service", type: "string", values: ["ingress", "api-gateway", "orders", "payments", "shop", "postgres"], config: {} },
      { name: "rps", type: "number", values: [128, 340, 96, 74, 41, 55], config: {} },
      { name: "err", type: "number", values: [1.2, 0.4, 0.2, 1.8, 0.1, 0.3], config: {} },
    ],
  };
  await new Function("context", helpers)({ handlebars: hb, panelData: { series: [flowFrame] } });
  const html = hb.compile("{{{tfServiceFlow}}}")({ data: [] });
  const text = strip(html);
  ["ingress", "api-gateway", "orders", "payments", "shop", "postgres"].forEach((name) => assert.match(text, new RegExp(name)));
  assert.match(text, /┌/);
  assert.match(text, /┆/);
  assert.match(text, /\.o@/);
  assert.equal((html.match(/class="tf-packet/g) || []).length, 9, "3 horizontal links + 2 vertical links of 3 cells");
  assert.match(html, /data-dir="up"/);
  assert.match(html, /data-dir="v"/);
  // the orders box sits in column 24; its indentation must survive the
  // panel's markdown step, which trims bare leading spaces on later lines
  const lines = html.split("\n");
  assert.match(lines[1], /^<span> {24}<\/span><span class="tf-border">┆<\/span> rps/);
  assert.equal(width(strip(lines[1]).replace(/\s+$/, "")), width(strip(lines[0]).replace(/\s+$/, "")), "box side under box top");
});

test("tfFlame / tfCanvas / tfGeomap / tfText / tfNews / tfAnnotations cover the remaining official panels", async () => {
  const flame = {
    name: "profile",
    length: 3,
    fields: [
      { name: "label", type: "string", values: ["total", "serve", "db"], config: {} },
      { name: "level", type: "number", values: [0, 1, 2], config: {} },
      { name: "value", type: "number", values: [100, 80, 40], config: {} },
      { name: "self", type: "number", values: [20, 40, 40], config: {} },
    ],
  };
  const fl = strip(await renderWith([flame], "{{{tfFlame 20}}}"));
  assert.match(fl, /total/);
  assert.match(fl, /100%/);
  assert.match(fl, /db/);
  assert.match(await renderWith([flame], "{{{tfFlame 20}}}"), /class="tf-flame"/);

  const canvas = strip(await renderWith([catFrame], "{{{tfCanvas 28}}}"));
  assert.match(canvas, /api-gateway/);
  assert.match(canvas, /orders-svc/);
  assert.match(await renderWith([catFrame], "{{{tfCanvas 28}}}"), /tf-packet/);

  const geo = {
    name: "sites",
    length: 2,
    fields: [
      { name: "name", type: "string", values: ["Seoul", "Virginia"], config: {} },
      { name: "lat", type: "number", values: [37.57, 39.04], config: {} },
      { name: "lon", type: "number", values: [126.98, -77.49], config: {} },
      { name: "rps", type: "number", values: [812, 520], config: {}, display: (v) => ({ text: String(v) }) },
    ],
  };
  const gm = strip(await renderWith([geo], "{{{tfGeomap 36 8}}}"));
  assert.match(gm, /\*/);
  assert.match(gm, /Seoul/);
  assert.match(gm, /180W/);
  assert.match(await renderWith([geo], "{{{tfGeomap 36 8}}}"), /tf-ping/);

  const text = {
    name: "runbook",
    length: 2,
    fields: [{ name: "line", type: "string", values: ["# shop", "page @sre"], config: {} }],
  };
  const tx = await renderWith([text], "{{{tfText 40}}}");
  assert.match(strip(tx), /# shop/);
  assert.match(tx, /tf-cursor/);

  const news = {
    name: "news",
    length: 2,
    fields: [
      { name: "time", type: "time", values: [Date.parse("2026-10-06T08:00:00Z"), Date.parse("2026-10-05T08:00:00Z")], config: {} },
      { name: "source", type: "string", values: ["grafana", "k8s"], config: {} },
      { name: "title", type: "string", values: ["Alerting GA", "1.32 notes"], config: {} },
    ],
  };
  const nw = strip(await renderWith([news], "{{{tfNews 10}}}"));
  assert.match(nw, /Alerting GA/);
  assert.ok(nw.indexOf("Alerting GA") < nw.indexOf("1.32 notes"), "newest first");

  const anno = {
    name: "anno",
    length: 1,
    fields: [
      { name: "time", type: "time", values: [Date.parse("2026-10-06T01:12:00Z")], config: {} },
      { name: "title", type: "string", values: ["deploy shop v2.4.1"], config: {} },
      { name: "tags", type: "string", values: ["deploy"], config: {} },
    ],
  };
  const an = strip(await renderWith([anno], "{{{tfAnnotations 8}}}"));
  assert.match(an, /deploy shop v2.4.1/);
  assert.match(an, /#deploy/);
});

test("catalogue covers every official Grafana visualization", () => {
  const { CATALOG } = require("../grafana/catalog");
  const official = [
    "timeseries", "state-timeline", "status-history", "barchart", "histogram", "heatmap",
    "piechart", "candlestick", "gauge", "trend", "xychart", "stat", "bargauge", "table",
    "logs", "nodeGraph", "traces", "flamegraph", "canvas", "geomap", "dashlist", "alertlist",
    "annolist", "text", "news",
  ];
  const have = new Set(CATALOG.map((e) => e.stock).filter(Boolean));
  official.forEach((t) => assert.ok(have.has(t), "missing TUI panel for " + t));
});

test("generic helpers degrade to 'no data' without series", async () => {
  await new Function("context", helpers)({ handlebars: hb, panelData: { series: [] } });
  assert.match(hb.compile("{{{tfTimeseries}}}")({}), /no data/);
});

test("after.js animates the edge and returns a cleanup function", async () => {
  const el = { textContent: "" };
  const ctx = {
    element: {
      querySelector: () => el,
      querySelectorAll: (sel) => {
        if (sel === ".tf-edge:not(.tf-packet)") return [el];
        return [];
      },
    },
    data: [series("rps", 320)],
  };
  const stop = new Function("context", src("after.js")).call({}, ctx);
  assert.equal(typeof stop, "function");
  await new Promise((r) => setTimeout(r, 300));
  stop();
  assert.equal(width(el.textContent), 17); // 16 cells + head
  assert.match(el.textContent, /\.o@/);
});

test("build-dashboard.js output is in sync with the sources", () => {
  const json = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "grafana", "provisioning", "dashboards", "tuiflow-demo.json"), "utf8"));
  const flow = json.panels.find((p) => p.title.startsWith("api-gateway"));
  assert.equal(flow.options.content, src("content.hbs"));
  assert.equal(flow.options.helpers, src("before.js"));
  assert.equal(flow.options.afterRender, src("after.js"));
  assert.equal(flow.options.styles, src("styles.css"));
  assert.equal(flow.options.renderMode, "data");
});

test("library panels match the catalogue and both dashboards cover all of them", async () => {
  await new Function("context", helpers)({ handlebars: hb, panelData: { series: [] } });
  const { CATALOG } = require("../grafana/catalog");
  const libDir = path.join(__dirname, "..", "grafana", "library");
  const files = fs.readdirSync(libDir).filter((f) => f.endsWith(".json"));
  assert.equal(files.length, CATALOG.length);
  const uids = new Set();
  files.forEach((f) => {
    const el = JSON.parse(fs.readFileSync(path.join(libDir, f), "utf8"));
    assert.equal(el.kind, 1);
    assert.equal(el.model.type, "marcusolsson-dynamictext-panel");
    assert.equal(el.model.options.helpers, src("before.js"), f + " helpers in sync");
    assert.equal(el.model.options.afterRender, src("after.js"), f + " afterRender in sync");
    assert.equal(el.model.options.styles, src("styles.css"), f + " styles in sync");
    // every helper referenced by a content template must be registered
    const m = el.model.options.content.match(/\{\{\{(tf\w+)/);
    if (m) assert.equal(typeof hb.helpers[m[1]], "function", m[1] + " registered");
    uids.add(el.uid);
  });
  const dashDir = path.join(__dirname, "..", "grafana", "provisioning", "dashboards");
  const lib = JSON.parse(fs.readFileSync(path.join(dashDir, "tuiflow-library.json"), "utf8"));
  assert.deepEqual(new Set(lib.panels.filter((p) => p.libraryPanel).map((p) => p.libraryPanel.uid)), uids);
  const gallery = JSON.parse(fs.readFileSync(path.join(dashDir, "tuiflow-gallery.json"), "utf8"));
  const galleryTitles = gallery.panels.filter((p) => p.type === "marcusolsson-dynamictext-panel").map((p) => p.title);
  assert.deepEqual(new Set(galleryTitles), new Set(CATALOG.map((e) => e.name)));
  assert.equal(galleryTitles.length, CATALOG.length);
  const pluginDash = JSON.parse(fs.readFileSync(path.join(dashDir, "tuiflow-plugin.json"), "utf8"));
  const pluginViews = pluginDash.panels.filter((p) => p.type === "tuiflow-tui-panel").map((p) => p.options.view);
  assert.equal(pluginViews.length, CATALOG.length);
  assert.equal(new Set(pluginViews).size, CATALOG.length);
  const ba = JSON.parse(fs.readFileSync(path.join(dashDir, "tuiflow-before-after.json"), "utf8"));
  // intro markdown is also type "text" but has no targets; the stock Text viz does
  const stock = ba.panels.filter((p) => p.type !== "marcusolsson-dynamictext-panel" && Array.isArray(p.targets));
  const tuis = ba.panels.filter((p) => p.type === "marcusolsson-dynamictext-panel");
  assert.equal(stock.length, tuis.length);
  assert.equal(stock.length, CATALOG.filter((e) => e.stock !== null).length);
  stock.forEach((s, i) => assert.deepEqual(s.targets, tuis[i].targets, s.title + " shares targets with its TUI twin"));

  const k8s = JSON.parse(fs.readFileSync(path.join(dashDir, "tuiflow-k8s.json"), "utf8"));
  assert.equal(k8s.uid, "tuiflow-k8s");
  assert.deepEqual(
    k8s.panels.filter((p) => p.type === "row").map((p) => p.title),
    [
      "Node Resource Overview：Selected Nodes:【$Node】",
      "Pod Resource Overview：SelectedPod:【$Pod】",
      "Microservices (Container Name) Resource Overview：Selected Microservices:【$Container】",
    ]
  );
  assert.deepEqual(k8s.templating.list.map((v) => v.name), ["Node", "NameSpace", "Container", "Pod"]);
  const k8sViz = k8s.panels.filter((p) => p.type === "marcusolsson-dynamictext-panel");
  assert.equal(k8sViz.length, 33);
  const helperFor = (title) => k8sViz.find((p) => p.title === title).options.content;
  assert.match(helperFor("Node Memory Ratio"), /tfBarGauge/);
  assert.match(helperFor("Cluster summary"), /tfStat/);
  assert.match(helperFor("Namespace Resource Statistics"), /tfTable/);
  assert.match(helperFor("Memory Usage【$Node】"), /tfTimeseries/);
  k8sViz.forEach((p) => {
    assert.equal(p.options.helpers, src("before.js"), p.title);
    assert.equal(p.datasource.uid, "testdata", p.title);
  });

  const cluster = JSON.parse(fs.readFileSync(path.join(dashDir, "tuiflow-k8s-cluster.json"), "utf8"));
  assert.equal(cluster.uid, "tuiflow-k8s-cluster");
  assert.deepEqual(
    cluster.panels.filter((p) => p.type === "row").map((p) => p.title),
    ["Cluster Health", "Deployments", "Node", "Pods", "Containers", "Jobs"]
  );
  assert.deepEqual(cluster.templating.list.map((v) => v.name), ["node", "namespace"]);
  const clusterViz = cluster.panels.filter((p) => p.type === "marcusolsson-dynamictext-panel");
  assert.equal(clusterViz.length, 29);
  const clusterHelper = (title) => clusterViz.find((p) => p.title === title).options.content;
  assert.match(clusterHelper("Cluster Pod Usage"), /tfStat/);
  assert.match(clusterHelper("Cluster CPU Capacity"), /tfTimeseries/);
  assert.match(clusterHelper("Deployment Replicas - Up To Date"), /tfTable/);
  assert.equal(clusterViz.find((p) => p.title === "Jobs Active").description.includes("kube_job_status_active"), true);
  clusterViz.forEach((p) => {
    assert.equal(p.options.helpers, src("before.js"), p.title);
    assert.equal(p.datasource.uid, "testdata", p.title);
  });
});
