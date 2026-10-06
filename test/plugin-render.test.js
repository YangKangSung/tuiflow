// The catalog panel reuses the Business Text helpers. This checks that the
// vendored copies have not drifted and that the panel runner draws a chart.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const hb = require("handlebars");
const tf = require("../src/tuiflow.js");
const { renderTuiflow } = require("../yangkangsung-tuiflow-panel/src/renderTuiflow.js");

const root = path.join(__dirname, "..");
const plugin = path.join(root, "yangkangsung-tuiflow-panel");
const read = (p) => fs.readFileSync(p, "utf8");

test("plugin vendor copies match the sources they bundle", () => {
  const pairs = [
    ["grafana/business-text/before.js", "vendor/before.js.txt"],
    ["grafana/business-text/after.js", "vendor/after.js.txt"],
    ["grafana/business-text/styles.css", "vendor/styles.css.txt"],
    ["src/tuiflow.js", "vendor/tuiflow.js"],
  ];
  pairs.forEach(([src, dest]) => {
    assert.equal(read(path.join(plugin, dest)), read(path.join(root, src)), dest);
  });
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
  const html = await renderTuiflow({
    tf,
    Handlebars: hb,
    beforeSource: read(path.join(root, "grafana/business-text/before.js")),
    series,
    kind: "timeseries",
    cols: 40,
    rows: 8,
  });
  assert.match(html, /<pre class="tf">/);
  assert.match(html, /[\u2800-\u28ff]/);
  assert.match(html, /api-gateway/);
});
