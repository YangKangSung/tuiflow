const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

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
