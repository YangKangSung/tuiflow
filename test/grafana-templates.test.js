// Renders the Business Text sources (grafana/business-text/*) the way the
// panel does: helpers via `new Function('context', code)`, then Handlebars
// compile with `{ data }`. Catches template typos and width drift without a
// running Grafana. Requires the `handlebars` devDependency (npm install).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const hb = require("handlebars");

globalThis.window = globalThis;
globalThis.tuiflow = require("../src/tuiflow.js");

const version = require("../package.json").version;
// Same substitution the build scripts apply, so "in sync" checks compare like with like.
const src = (f) => fs.readFileSync(path.join(__dirname, "..", "grafana", "business-text", f), "utf8").replace(/__TF_VERSION__/g, version);
const width = (s) => Array.from(s).length;
const strip = (html) => html.replace(/<[^>]+>/g, "");

// The panel loads /public/tuiflow.js with a dynamic import; here the UMD is
// already required above, so the import becomes a resolved promise.
const helpers = src("before.js").replace(/import\("\/public\/tuiflow\.js[^"]*"\)/, "Promise.resolve()");
assert.notEqual(helpers, src("before.js"), "import() statement was found and stubbed");

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

test("generic helpers degrade to 'no data' without series", async () => {
  await new Function("context", helpers)({ handlebars: hb, panelData: { series: [] } });
  assert.match(hb.compile("{{{tfTimeseries}}}")({}), /no data/);
});

test("after.js animates the edge and returns a cleanup function", async () => {
  const el = { textContent: "" };
  const ctx = { element: { querySelector: () => el }, data: [series("rps", 320)] };
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

test("library panels are in sync and the library dashboard references all of them", () => {
  const libDir = path.join(__dirname, "..", "grafana", "library");
  const files = fs.readdirSync(libDir).filter((f) => f.endsWith(".json"));
  assert.equal(files.length, 6);
  const uids = new Set();
  files.forEach((f) => {
    const el = JSON.parse(fs.readFileSync(path.join(libDir, f), "utf8"));
    assert.equal(el.kind, 1);
    assert.equal(el.model.type, "marcusolsson-dynamictext-panel");
    assert.equal(el.model.options.helpers, src("before.js"), f + " helpers in sync");
    assert.equal(el.model.options.styles, src("styles.css"), f + " styles in sync");
    uids.add(el.uid);
  });
  const dash = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "grafana", "provisioning", "dashboards", "tuiflow-library.json"), "utf8"));
  const refs = dash.panels.filter((p) => p.libraryPanel).map((p) => p.libraryPanel.uid);
  assert.deepEqual(new Set(refs), uids);
});
