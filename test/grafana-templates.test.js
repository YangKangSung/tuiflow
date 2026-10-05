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

const src = (f) => fs.readFileSync(path.join(__dirname, "..", "grafana", "business-text", f), "utf8");
const width = (s) => Array.from(s).length;
const strip = (html) => html.replace(/<[^>]+>/g, "");

// The panel loads /public/tuiflow.js with a dynamic import; here the UMD is
// already required above, so the import becomes a resolved promise.
const helpers = src("before.js").replace('import("/public/tuiflow.js")', "Promise.resolve()");

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
