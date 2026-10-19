// Copies the monorepo sources the panel bundles. Run from the plugin directory.
const fs = require('fs');
const path = require('path');

const pluginRoot = path.join(__dirname, '..');
const repoRoot = path.join(pluginRoot, '..');
// Allowlist: the tuiflow modules from src/ only. echarts/ (separate
// experiment) and grafana/business-text/ (the Business Text adapter) are not
// plugin sources and must not be vendored into a catalog build. Adding either
// here fails the copy on purpose.
const pairs = [
  ['src/tuiflow.js', 'vendor/tuiflow.js'],
  ['src/tuiflow-helpers.js', 'vendor/tuiflow-helpers.js'],
  ['src/tuiflow-dom.js', 'vendor/tuiflow-dom.js'],
  ['src/tuiflow.css', 'vendor/tuiflow.css.txt'],
];

for (const [from] of pairs) {
  if (/echarts|business-text/.test(from) || !from.startsWith('src/')) {
    process.stderr.write('refusing to vendor ' + from + ' into the Grafana plugin\n');
    process.exit(1);
  }
}

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
