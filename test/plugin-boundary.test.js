// What the Grafana panel plugins may contain: the tuiflow modules from src/
// and nothing else. Two things stay out of every plugin package:
//   - the Apache ECharts render path (echarts/), a separate experiment
//   - the Business Text adapter (grafana/business-text/), which wires the same
//     src/ modules into Volkov Labs' Business Text panel for the provisioned
//     dashboards — a different delivery
// pack.js refuses a dist that references either; sync-vendor.js only copies
// from src/; the plugin sources never import from grafana/.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const ECHARTS_REF = /require\(["']echarts["']\)|from ["']echarts["']|tuiflow-echarts|echarts\/dist/;
const BUSINESS_TEXT_REF = /business-text|Business Text|marcusolsson-dynamictext|\/public\/tuiflow/i;

function sourceFiles(rel) {
  const dir = path.join(root, rel);
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) {
      out.push(...sourceFiles(path.join(rel, name)));
      continue;
    }
    if (/\.(js|ts|tsx|json|css|hbs|txt)$/.test(name)) out.push(file);
  }
  return out;
}

const PLUGIN_SOURCES = [
  "tuiflow-tui-panel/src",
  "tuiflow-tui-panel/.config/webpack",
  "yangkangsung-tuiflow-panel/src",
  "yangkangsung-tuiflow-panel/vendor",
];

test("plugin sources do not import the echarts path", () => {
  const files = PLUGIN_SOURCES.flatMap(sourceFiles);
  assert.ok(files.length > 0);
  files.forEach((file) => {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), ECHARTS_REF, path.relative(root, file));
  });
});

test("plugin sources and the bundled tuiflow modules carry nothing from the Business Text adapter", () => {
  const files = PLUGIN_SOURCES.flatMap(sourceFiles).concat(
    ["tuiflow.js", "tuiflow-helpers.js", "tuiflow-dom.js", "tuiflow.css", "flow.hbs"].map((f) => path.join(root, "src", f))
  );
  files.forEach((file) => {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), BUSINESS_TEXT_REF, path.relative(root, file));
  });
  // the adapter is the only place that loads the modules from /public
  const adapter = read("grafana/business-text/before.js");
  assert.match(adapter, /import\("\/public\/tuiflow-helpers\.js/);
  assert.match(adapter, /tuiflowHelpers\.register\(context\.handlebars, window\.tuiflow, context\)/);
  assert.ok(adapter.length < 2000, "before.js is a thin adapter, not the helper source");
  assert.doesNotMatch(adapter, /registerHelper\(/);
});

test("catalog pack refuses echarts and Business Text references; vendor allowlist is src/ only", () => {
  const pack = read("tuiflow-tui-panel/scripts/pack.js");
  assert.match(pack, /assertNoEcharts/);
  assert.match(pack, /refusing to pack/);
  assert.match(pack, /business-text\|Business Text\|marcusolsson-dynamictext/);
  const vendor = read("yangkangsung-tuiflow-panel/scripts/sync-vendor.js");
  assert.match(vendor, /refusing to vendor/);
  const copied = [...vendor.matchAll(/\['([^']+)',/g)].map((m) => m[1]);
  assert.deepEqual(copied, ["src/tuiflow.js", "src/tuiflow-helpers.js", "src/tuiflow-dom.js", "src/tuiflow.css"]);
  copied.forEach((f) => assert.ok(f.startsWith("src/"), f));
  const pluginPkg = JSON.parse(read("tuiflow-tui-panel/package.json"));
  assert.equal(pluginPkg.dependencies.echarts, undefined);
  assert.equal((pluginPkg.devDependencies || {}).echarts, undefined);
  // the catalog plugin resolves the modules from src/ through webpack aliases
  const webpack = read("tuiflow-tui-panel/.config/webpack/webpack.config.ts");
  ["tuiflow.js", "tuiflow-helpers.js", "tuiflow-dom.js", "flow.hbs"].forEach((f) => assert.match(webpack, new RegExp("\\.\\./src/" + f.replace(".", "\\."))));
});
