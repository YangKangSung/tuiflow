// Builds docs/gallery.md and the thumbnail grid in README.md (between the
// `<!-- gallery:start -->` / `<!-- gallery:end -->` markers) from the catalog:
// one entry per library panel with its screenshot (docs/gallery/<uid>.png,
// captured by docs/capture-gallery.js), the helper call the panel uses, and
// the glyph output rendered here in node from the demo sample frames.
const fs = require("fs");
const path = require("path");
const hb = require("handlebars");
const tf = require("../src/tuiflow.js");
const helpers = require("../src/tuiflow-helpers.js");
const { CATALOG } = require("../grafana/catalog.js");
const { KINDS, renderKind } = require("../demo/build-plugin-kinds.js");

const root = path.join(__dirname, "..");
const GALLERY_DIR = path.join(__dirname, "gallery");
const COLUMNS = 4; // thumbnails per README row

// Catalog uid -> plugin visualization kind. Everything else is uid minus "tuiflow-".
const KIND_OF = {
  "tuiflow-piechart": "pie",
  "tuiflow-state-timeline": "stateTimeline",
  "tuiflow-status-history": "statusHistory",
  "tuiflow-xychart": "xy",
  "tuiflow-flamegraph": "flame",
  "tuiflow-annolist": "annotations",
  "tuiflow-flow": null, // hand-made src/flow.hbs, not a plugin kind
};

const kindOf = (uid) => (uid in KIND_OF ? KIND_OF[uid] : uid.replace(/^tuiflow-/, ""));
const labelOf = (kind) => (KINDS.find((k) => k.value === kind) || {}).label;
const helperOf = (entry) => entry.content && (entry.content.match(/\{\{\{[^}]+\}\}\}/) || [])[0];
const shortName = (entry) => entry.name.replace(/^TUI /, "").replace(/\s*\(.*\)$/, "");

// GitHub heading anchor: lower-case, drop punctuation, spaces to hyphens.
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .trim()
    .replace(/ /g, "-");

const series = (alias, base, n = 120) =>
  Array.from({ length: n }, (_, i) => ({ time: i, [alias]: base + Math.sin(i / 9) * base * 0.4 }));

function flowText() {
  const h = hb.create();
  helpers.register(h, tf, {});
  const data = [series("rps", 320), series("p95_ms", 90), series("err_pct", 0.8)];
  return h
    .compile(fs.readFileSync(path.join(root, "src", "flow.hbs"), "utf8"))({ data })
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function entries() {
  return CATALOG.map((entry) => {
    const kind = kindOf(entry.uid);
    const text = kind ? renderKind(kind).text.replace(/\s+$/, "") : flowText();
    const png = path.join(GALLERY_DIR, entry.uid + ".png");
    return {
      uid: entry.uid,
      name: entry.name,
      short: shortName(entry),
      anchor: slug(entry.name),
      description: entry.description,
      stock: entry.stock,
      kind,
      kindLabel: kind ? labelOf(kind) : null,
      helper: helperOf(entry),
      text,
      hasPng: fs.existsSync(png),
    };
  });
}

function galleryMarkdown(list) {
  const toc = list.map((e) => "[" + e.short + "](#" + e.anchor + ")").join(" · ");
  const sections = list.map((e) => {
    const how = [
      e.helper
        ? "Business Text: `" + e.helper + "`"
        : "Business Text: template [`src/flow.hbs`](../src/flow.hbs)",
      e.kindLabel ? "plugin visualization: **" + e.kindLabel + "**" : "plugin: not a visualization kind (template only)",
      e.stock ? "Grafana stock panel: `" + e.stock + "`" : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return [
      "## " + e.name,
      "",
      e.description,
      "",
      e.hasPng ? "![" + e.name + "](gallery/" + e.uid + ".png)" : "_screenshot not captured yet: `npm run gallery:shots`_",
      "",
      how,
      "",
      "```text",
      e.text,
      "```",
      "",
    ].join("\n");
  });
  return [
    "# Panel gallery",
    "",
    "Every library panel — the 25 official Grafana visualizations plus Flow and Columns — as it renders in the",
    "`tuiflow-gallery` TestData dashboard (`?theme=matrix`), followed by the same helper drawn in node from sample",
    "frames, so the glyph output is readable without a browser. Each panel is one `<pre class=\"tf\">` of strings;",
    "colour is only a `<span>` class.",
    "",
    "Regenerate: `npm run gallery` rewrites this file and the README grid; `npm run gallery:shots` recaptures the PNGs",
    "from the local Grafana (`grafana/up.ps1`). The sample frames are the ones behind [`demo/plugin-kinds.html`](../demo/plugin-kinds.html).",
    "",
    toc,
    "",
    ...sections,
  ].join("\n");
}

function readmeGrid(list) {
  const cell = (e) =>
    '<td align="center" valign="top" width="25%">' +
    '<a href="docs/gallery.md#' +
    e.anchor +
    '">' +
    (e.hasPng ? '<img src="docs/gallery/' + e.uid + '.png" alt="' + e.name + '" width="100%">' : "<code>" + e.uid + "</code>") +
    "</a><br><sub>" +
    e.short +
    "</sub></td>";
  const rows = [];
  for (let i = 0; i < list.length; i += COLUMNS) {
    rows.push("<tr>" + list.slice(i, i + COLUMNS).map(cell).join("") + "</tr>");
  }
  return "<table>\n" + rows.join("\n") + "\n</table>";
}

function updateReadme(grid) {
  const file = path.join(root, "README.md");
  const src = fs.readFileSync(file, "utf8");
  const start = "<!-- gallery:start -->";
  const end = "<!-- gallery:end -->";
  const a = src.indexOf(start);
  const b = src.indexOf(end);
  if (a < 0 || b < 0 || b < a) throw new Error("README.md needs " + start + " ... " + end + " markers");
  const next = src.slice(0, a + start.length) + "\n" + grid + "\n" + src.slice(b);
  if (next !== src) fs.writeFileSync(file, next);
  return next !== src;
}

if (require.main === module) {
  const list = entries();
  fs.writeFileSync(path.join(__dirname, "gallery.md"), galleryMarkdown(list));
  const changed = updateReadme(readmeGrid(list));
  const missing = list.filter((e) => !e.hasPng).map((e) => e.uid);
  console.log("wrote docs/gallery.md", list.length, "panels;", "README grid", changed ? "updated" : "unchanged");
  if (missing.length) console.log("no screenshot for:", missing.join(", "));
}

module.exports = { entries, kindOf };
