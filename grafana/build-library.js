#!/usr/bin/env node
/**
 * Generate the reusable library panels in grafana/library/*.json from the
 * Business Text sources and the panel catalogue (catalog.js). Each file is a
 * Grafana library element ({ uid, name, kind: 1, model }) that
 * publish-library.js upserts through /api/library-elements, after which any
 * dashboard can "Add → Import from library", swap the query, and get the TUI
 * rendering of its own data.
 *
 *   node grafana/build-library.js
 */
const fs = require("fs");
const path = require("path");
const { CATALOG, TESTDATA, usage } = require("./catalog");

const here = __dirname;
const version = require("../package.json").version;
const read = (f) => fs.readFileSync(path.join(here, "business-text", f), "utf8").replace(/__TF_VERSION__/g, version);

const helpers = read("before.js");
const afterRender = read("after.js");
const styles = read("styles.css");

/** Business Text panel model shared by every catalogue entry. */
function tuiPanelModel(entry) {
  return Object.assign(entry.panelExtra ? Object.assign({}, entry.panelExtra) : {}, {
    type: "marcusolsson-dynamictext-panel",
    title: entry.name,
    description: entry.description + " " + usage,
    datasource: TESTDATA,
    targets: entry.targets,
    gridPos: { h: entry.h, w: 12, x: 0, y: 0 },
    fieldConfig: entry.fieldConfig,
    options: {
      renderMode: "data",
      content: entry.content || read("content.hbs"),
      // Business Text renders defaultContent when the query returns no frames;
      // API-backed panels have no query, so their content goes there too.
      defaultContent: entry.targets.length ? "The query didn't return any results." : entry.content,
      helpers,
      afterRender,
      styles,
      externalStyles: [],
      contentPartials: [],
      editors: ["helpers", "afterRender", "styles"],
      editor: { format: "auto", language: "html" },
      wrap: true,
      status: "",
    },
  });
}

function main() {
  const outDir = path.join(here, "library");
  fs.mkdirSync(outDir, { recursive: true });
  // remove stale files from earlier catalogues
  fs.readdirSync(outDir).filter((f) => f.endsWith(".json") && !CATALOG.some((e) => e.uid + ".json" === f)).forEach((f) => fs.unlinkSync(path.join(outDir, f)));
  CATALOG.forEach((entry) => {
    const file = path.join(outDir, entry.uid + ".json");
    fs.writeFileSync(file, JSON.stringify({ uid: entry.uid, name: entry.name, kind: 1, model: tuiPanelModel(entry) }, null, 2) + "\n");
    console.log("wrote", path.relative(process.cwd(), file));
  });
}

if (require.main === module) main();

module.exports = { tuiPanelModel };
