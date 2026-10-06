// Copies the monorepo sources the panel bundles. Run from the plugin directory.
const fs = require('fs');
const path = require('path');

const pluginRoot = path.join(__dirname, '..');
const repoRoot = path.join(pluginRoot, '..');
const pairs = [
  ['grafana/business-text/before.js', 'vendor/before.js.txt'],
  ['grafana/business-text/after.js', 'vendor/after.js.txt'],
  ['grafana/business-text/styles.css', 'vendor/styles.css.txt'],
  ['src/tuiflow.js', 'vendor/tuiflow.js'],
];

const anchor = path.join(repoRoot, 'src', 'tuiflow.js');
if (!fs.existsSync(anchor)) {
  process.stdout.write('parent sources not found; using the vendored copies\n');
  process.exit(0);
}

for (const [from, to] of pairs) {
  const src = path.join(repoRoot, from);
  const dest = path.join(pluginRoot, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  process.stdout.write('synced ' + to + '\n');
}
