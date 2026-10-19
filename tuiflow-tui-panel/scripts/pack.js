const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Catalog zip for tuiflow-tui-panel only. Two things must never end up in it:
//   - the Apache ECharts render path (repo echarts/), a separate experiment
//   - the Business Text adapter (repo grafana/business-text/), which belongs
//     to the Business Text dashboards, not to this plugin
// The plugin bundles only the tuiflow modules from src/.
const id = 'tuiflow-tui-panel';
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const artifacts = path.join(root, 'artifacts');
const stage = path.join(artifacts, id);
const zip = path.join(artifacts, id + '.zip');

if (!fs.existsSync(path.join(dist, 'plugin.json'))) {
  console.error('dist/plugin.json missing. Run npm run build first.');
  process.exit(1);
}

// Refuse the catalog zip if the built plugin pulled in Apache ECharts or the
// Business Text adapter.
const FORBIDDEN = [
  { re: /require\(["']echarts["']\)|from ["']echarts["']|tuiflow-echarts|echarts\/dist/, what: 'the echarts path' },
  { re: /business-text|Business Text|marcusolsson-dynamictext|\/public\/tuiflow/i, what: 'the Business Text adapter' },
];
function assertNoEcharts(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) {
      assertNoEcharts(file);
      continue;
    }
    if (!/\.(js|json|map|css|html)$/.test(name)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const { re, what } of FORBIDDEN) {
      if (re.test(text)) {
        console.error('refusing to pack: ' + path.relative(root, file) + ' references ' + what + ', which is not part of the catalog plugin');
        process.exit(1);
      }
    }
  }
}
assertNoEcharts(dist);

fs.rmSync(artifacts, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
fs.cpSync(dist, stage, { recursive: true });

if (process.platform === 'win32') {
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-Command', `Compress-Archive -Path '${stage}' -DestinationPath '${zip}' -Force`],
    { stdio: 'inherit' }
  );
} else {
  execFileSync('zip', ['-qr', zip, id], { cwd: artifacts, stdio: 'inherit' });
}

const plugin = JSON.parse(fs.readFileSync(path.join(stage, 'plugin.json'), 'utf8'));
console.log('packed', zip);
console.log('id', plugin.id, 'version', plugin.info.version);
