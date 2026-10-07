# Install the tuiflow panel on your Grafana

This installs the panel plugin in `tuiflow-tui-panel/`. In the visualization list it is named **tuiflow**. The plugin id is `tuiflow-tui-panel`.

It is not on grafana.com and it is not signed. A Grafana you run yourself can load it after you allow that id. Grafana Cloud will not.

You need **Grafana 12.0 or newer**. Older versions hide the plugin.

## 1. Build the folder Grafana loads

On a machine with Node 22 or newer:

```bash
cd tuiflow-tui-panel
npm install
npm run build
```

From the repo root, `npm run plugin:pack` does the same build and also writes `tuiflow-tui-panel/artifacts/tuiflow-tui-panel.zip`.

Grafana does not want the zip, `node_modules`, or the TypeScript sources. It wants one directory whose name is the plugin id, with `plugin.json` and `module.js` directly inside:

```
tuiflow-tui-panel/
  plugin.json
  module.js
  module.js.map
  README.md
  LICENSE
  img/logo.svg
```

That is `tuiflow-tui-panel/dist/` after the build. If you move the zip instead, unzip it and check the layout. A second nested `tuiflow-tui-panel/` folder means Grafana will not see the plugin.

## 2. Put that folder on the Grafana server

Copy `dist/` to the Grafana plugins directory and name the destination `tuiflow-tui-panel`. Then allow the unsigned id and restart Grafana.

### Package install (Linux)

```bash
sudo mkdir -p /var/lib/grafana/plugins
sudo rm -rf /var/lib/grafana/plugins/tuiflow-tui-panel
sudo cp -a dist /var/lib/grafana/plugins/tuiflow-tui-panel
sudo chown -R grafana:grafana /var/lib/grafana/plugins/tuiflow-tui-panel
```

In `grafana.ini` (or a file under `conf.d/`):

```ini
[plugins]
allow_loading_unsigned_plugins = tuiflow-tui-panel
```

```bash
sudo systemctl restart grafana-server
```

### Windows installer

The plugins directory is the `plugins` path in `grafana.ini`. On the standard installer that is `data/plugins` under the install directory. Copy `dist` there as `tuiflow-tui-panel`.

Add the same `[plugins]` block to `conf/custom.ini`, then restart the Grafana Windows service.

### Your own Docker Compose or `docker run`

Mount the built folder onto the plugin id path. Do not mount it over the whole plugins directory if other plugins already live there.

```yaml
services:
  grafana:
    image: grafana/grafana:12.2.0
    ports:
      - "3000:3000"
    environment:
      GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS: tuiflow-tui-panel
    volumes:
      - /absolute/path/to/tuiflow-tui-panel/dist:/var/lib/grafana/plugins/tuiflow-tui-panel:ro
```

Recreate the container after changing the environment or the mount. A restart of an already-created container does not pick up a new `environment` value.

### This repo's dev stack

`grafana/docker-compose.yml` already mounts `tuiflow-tui-panel/dist` and allows the unsigned id. From Windows:

```powershell
.\grafana\up.ps1
```

Then open the example dashboard:

http://localhost:3000/d/tuiflow-plugin/?theme=dark

Log in as `admin` / `admin` to edit. Anonymous access is Viewer only.

## 3. Confirm Grafana registered it

In the UI: **Administration → Plugins and data → Plugins**, search for `tuiflow`.

Or read the log. A successful start contains both of these for `pluginId=tuiflow-tui-panel`:

- `Permitting unsigned plugin. It is not signed.`
- `Plugin registered`

If the visualization list has no **tuiflow**:

- The server is older than Grafana 12.
- The folder is not named `tuiflow-tui-panel`, or `plugin.json` is nested one level too deep.
- `allow_loading_unsigned_plugins` does not list `tuiflow-tui-panel`.
- Grafana was not restarted after the copy.

## 4. Use it on a dashboard

1. Open a dashboard and choose **Add → Visualization**.
2. Write the query the way you already do (Prometheus, Loki, TestData, a database, and so on).
3. Set the visualization to **tuiflow**.
4. Under **tuiflow → View**, pick the drawing. The panel size is converted to character columns and rows.
5. Under **Standard options**, set Unit, Decimals, Min, Max, and Thresholds. Axes, last values, gauge percentages, and threshold colors use those settings. The panel text keeps Grafana's own theme color.

To turn an existing panel into this drawing, change its visualization to **tuiflow** and pick a View. The query stays.

| View | What to query |
|---|---|
| Time series | A time field and one or more numeric series |
| Trend | A numeric x column first, then the y series |
| Bar chart, Columns, Pie | A text category column and numeric columns |
| Stat, Gauge, Bar gauge | Numeric series. Min and Max on the field set the meter |
| Table | The first frame, as rows |
| State timeline, Status history | Numeric or text series over time |
| Heatmap, Histogram | Numeric samples |
| Candlestick | Fields named open, high, low, close (or the first four numeric fields) |
| XY chart | First numeric field is x, the rest are y |
| Logs | Log lines |
| Node graph | A node-graph frame (nodes and edges) |
| Traces | A trace frame |
| Flame graph | A flame-graph frame |
| Canvas | The bundled boxes and a travelling packet |
| Geomap | Latitude and longitude fields |
| Alert list, Dashboard list, Annotations | Filled from this Grafana's own API |
| Text, News | Text frames |
| Flow | The bundled api-gateway box. It reads fields named `rps`, `p95_ms`, and `err_pct` |

The provisioned example dashboard (`grafana/provisioning/dashboards/tuiflow-plugin.json`) uses the TestData source with uid `testdata`. Import that JSON only on a Grafana that has the same datasource. On your own server, adding a panel and pointing it at your query is the normal path.

## 5. Upgrade

Build again, replace the `tuiflow-tui-panel` directory, and restart Grafana. Then hard-refresh the browser. Grafana caches `module.js` with the plugin version, so a version bump in `tuiflow-tui-panel/package.json` before `npm run build` avoids a stale script.
