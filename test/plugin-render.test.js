// The panel plugin bundles the tuiflow modules from src/. This checks that the
// vendored copies have not drifted and that the panel runner draws a chart.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const hb = require("handlebars");
const tf = require("../src/tuiflow.js");
const helpers = require("../src/tuiflow-helpers.js");
const { renderTuiflow } = require("../yangkangsung-tuiflow-panel/src/renderTuiflow.js");

const root = path.join(__dirname, "..");
const plugin = path.join(root, "yangkangsung-tuiflow-panel");
const read = (p) => fs.readFileSync(p, "utf8");

test("plugin vendor copies match the sources they bundle", () => {
  const pairs = [
    ["src/tuiflow.js", "vendor/tuiflow.js"],
    ["src/tuiflow-helpers.js", "vendor/tuiflow-helpers.js"],
    ["src/tuiflow-dom.js", "vendor/tuiflow-dom.js"],
    ["src/tuiflow.css", "vendor/tuiflow.css.txt"],
  ];
  pairs.forEach(([src, dest]) => {
    assert.equal(read(path.join(plugin, dest)), read(path.join(root, src)), dest);
  });
  const vendored = fs.readdirSync(path.join(plugin, "vendor")).filter((f) => !f.endsWith(".d.ts"));
  assert.deepEqual(vendored.sort(), pairs.map(([, dest]) => path.basename(dest)).sort(), "nothing else is vendored");
});

test("panel runner draws a braille time series from data frames", async () => {
  const t0 = Date.UTC(2026, 9, 6);
  const n = 40;
  const series = [
    {
      name: "api-gateway",
      length: n,
      fields: [
        { name: "Time", type: "time", values: Array.from({ length: n }, (_, i) => t0 + i * 60000), config: {} },
        {
          name: "Value",
          type: "number",
          values: Array.from({ length: n }, (_, i) => 300 + Math.sin(i / 5) * 40),
          config: { displayNameFromDS: "api-gateway", unit: "reqps" },
          display: (v) => ({ text: Number(v).toFixed(0), suffix: " req/s" }),
        },
      ],
    },
  ];
  const html = renderTuiflow({
    tf,
    helpers,
    Handlebars: hb,
    series,
    kind: "timeseries",
    cols: 40,
    rows: 8,
  });
  assert.match(html, /<pre class="tf">/);
  assert.match(html, /[\u2800-\u28ff]/);
  assert.match(html, /api-gateway/);
});
