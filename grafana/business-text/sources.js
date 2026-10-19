// The strings that go into a Business Text panel's option fields, read from
// their sources with __TF_VERSION__ substituted:
//
//   before.js   → options.helpers      (this folder: thin adapter)
//   after.js    → options.afterRender  (this folder: thin adapter)
//   pods.hbs    → options.content      (this folder: All-rows template)
//   styles.css  → options.styles       (src/tuiflow.css)
//   content.hbs → options.content      (src/flow.hbs)
//
// Build scripts and tests use this so every generated panel carries the same
// text as the sources it was built from.
const fs = require("fs");
const path = require("path");

const here = __dirname;
const src = path.join(here, "..", "..", "src");
const version = require("../../package.json").version;

const FILES = {
  "before.js": path.join(here, "before.js"),
  "after.js": path.join(here, "after.js"),
  "pods.hbs": path.join(here, "pods.hbs"),
  "styles.css": path.join(src, "tuiflow.css"),
  "content.hbs": path.join(src, "flow.hbs"),
};

function read(name) {
  const file = FILES[name];
  if (!file) throw new Error("unknown Business Text source: " + name);
  return fs.readFileSync(file, "utf8").replace(/__TF_VERSION__/g, version);
}

module.exports = { read, version, FILES };
