# grafana/ — TUI look from a Business Text panel

Dashboards that run on synthetic data (Grafana's built-in TestData), and the editable sources of those panels.

```
grafana/
├─ docker-compose.yml            Grafana 12 + provisioning + ./plugins, mounts ../src/tuiflow.js
├─ up.ps1                        Windows: start/stop on the WSL Docker Engine (+ WSL keep-alive)
├─ fetch-plugins.ps1 / .sh       Download the Business Text plugin onto the host, into ./plugins
├─ build-dashboard.js            business-text/* → provisioning/dashboards/*.json (demo, library)
├─ build-library.js              business-text/* → library/*.json (25 official visualizations + Flow/Columns)
├─ publish-library.js            Upsert library/*.json through Grafana /api/library-elements
├─ business-text/
│  ├─ before.js                  Handlebars helpers: field helpers (tfBar…) + query-agnostic generics (tfTimeseries…)
│  ├─ content.hbs                api-gateway box (All data mode, three random_walk queries)
│  ├─ pods.hbs                   Pod table (All rows mode, csv_content query)
│  ├─ after.js                   "JavaScript code after content ready": packet animation on the dashed edge
│  └─ styles.css                 "Styles": font, palette, series colors (tf-s0..5)
├─ catalog.js                    1:1 catalogue of the official visualizations (helper, sample query, stock options)
├─ library/                      Generated library-panel JSON (25 official + Columns + Flow)
└─ provisioning/
   ├─ datasources/testdata.yaml  uid=testdata
   └─ dashboards/                provider + tuiflow-demo.json + tuiflow-library.json
```

## Library panels — any query, drawn as TUI

Generic helpers such as `{{{tfTimeseries}}}` never look at field names.
Every **numeric field** in `context.panelData.series` becomes a series, and Grafana field config (unit, decimals, min/max, thresholds, displayName, overrides) is applied through `field.display()`.
Swap the query and the [25 official visualizations](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/) come out in the same TUI tone.

```bash
npm run build              # regenerate library/*.json + provisioning/dashboards/*.json
npm run publish:library    # upsert the catalogue into local Grafana (admin/admin)
# Another Grafana: GRAFANA_URL=https://… GRAFANA_TOKEN=glsa_… npm run publish:library
```

| Library panel | Matching core panel | Content |
|---|---|---|
| TUI Time series | Time series | `{{{tfTimeseries 90 14}}}` — braille (⣿) line chart |
| TUI Trend | Trend | `{{{tfTrend 80 12}}}` — line on a numeric x axis |
| TUI Bar chart / Columns | Bar chart | `{{{tfBarChart 36}}}` / `{{{tfColumns 9 6}}}` |
| TUI Stat / Gauge / Bar gauge | Stat / Gauge / Bar gauge | `{{{tfStat}}}` `{{{tfGauge}}}` `{{{tfBarGauge}}}` |
| TUI Table | Table | `{{{tfTable 40}}}` |
| TUI Pie chart | Pie chart | `{{{tfPie 6 0}}}` — braille disc |
| TUI State timeline / Status history | State timeline / Status history | `{{{tfStateTimeline}}}` `{{{tfStatusHistory}}}` |
| TUI Heatmap / Histogram | Heatmap / Histogram | `{{{tfHeatmap}}}` `{{{tfHistogram}}}` |
| TUI Candlestick / XY | Candlestick / XY chart | `{{{tfCandlestick}}}` `{{{tfXY}}}` |
| TUI Logs / Traces / Node graph | Logs / Traces / Node graph | `{{{tfLogs}}}` `{{{tfTraces}}}` `{{{tfNodeGraph}}}` |
| TUI Flame graph | Flame graph | `{{{tfFlame 48}}}` — indent by level, plus a scan |
| TUI Canvas | Canvas | `{{{tfCanvas 30}}}` — dashed boxes + `.o@` packets |
| TUI Geomap | Geomap | `{{{tfGeomap 56 10}}}` — lat/lon `*` |
| TUI Alert / Dashboard / Annotations list | Alert / Dashboard / Annotations list | `{{{tfAlertList}}}` `{{{tfDashboardList}}}` `{{{tfAnnotations}}}` |
| TUI Text / News | Text / News | `{{{tfText}}}` `{{{tfNews}}}` |
| TUI Flow | (custom) | `content.hbs` — field names fixed to `rps` / `p95_ms` / `err_pct` |

Two ways to use them:

1. On any dashboard: *Add → Import from library → TUI …* → (*Unlink* if you want) → replace the TestData query with yours.
2. Convert a panel in place: set Visualization to *Business Text* → one line of content, `{{{tfTimeseries 90 14}}}` → paste `before.js` / `styles.css` into "JavaScript code before content rendering" and "Styles". Query, variables, and time range stay as they are.

Numbers in parentheses are width and height in cells (tune them to the panel size). Auto-fit belongs to the custom panel plugin (see the roadmap).
Grafana has no file provisioning for library panels, so they go in through the API (`publish-library.js`: POST when missing, PATCH with the version when present). The `tuiflow-library` dashboard only references uids, so open it after `publish:library`.

`before.js` loads `import("/public/tuiflow.js?v=<package.json version>")`. The build writes the version query. After a core change that is still cached, bump the `package.json` version and run `npm run build && npm run publish:library`.

## Run

### Windows + WSL Docker Engine (no Docker Desktop) — the default dev environment for this repo

```powershell
.\grafana\fetch-plugins.ps1   # once: download the Business Text plugin into grafana/plugins/
.\grafana\up.ps1              # start dockerd → compose up -d → WSL keep-alive → wait for health
# http://localhost:3000/d/tuiflow-demo/?theme=matrix       ← full terminal-look UI (edit: admin / admin)
# http://localhost:3000/d/tuiflow-demo/?theme=matrix&kiosk ← wall display (anonymous Viewer)
.\grafana\up.ps1 -Down        # stop
```

Requires Docker Engine in the WSL distro (`Ubuntu-24.04`): `curl -fsSL https://get.docker.com | sudo sh`.
Pass `-Distro` for a different distro.

### Linux / macOS

```bash
bash grafana/fetch-plugins.sh
cd grafana && docker compose up -d
```

### Two things this environment actually hit

1. **A corporate TLS-inspecting proxy.** The container (Alpine, default CA bundle) rejects `grafana.com` with `x509: certificate signed by unknown authority`, so `GF_INSTALL_PLUGINS` fails and Grafana exits immediately. Plugins are therefore downloaded on the host (which trusts the proxy CA) and `./plugins` is bind-mounted. `GF_PLUGINS_PREINSTALL_DISABLED`, `GF_PLUGINS_PUBLIC_KEY_RETRIEVAL_DISABLED`, and update checks are off, so the container makes no outbound calls. The side effect is that an offline PC works the same way (copy `grafana/plugins/` along with the repo).
2. **WSL VM idle shutdown.** About a minute after the last `wsl.exe` session ends, the VM goes down and dockerd plus the containers get SIGTERM (symptom: `:3000`, which worked a moment ago, becomes `ERR_CONNECTION_REFUSED`). `up.ps1` holds the VM open with a hidden `wsl --exec sleep infinity` session, and compose sets `restart: unless-stopped` so the containers come back when dockerd does.

### Attach to an existing Grafana, without Docker

1. Install `marcusolsson-dynamictext-panel` (Business Text 6.x, Grafana 11+).
2. Copy `src/tuiflow.js` into Grafana's `public/` folder so it is served at `/public/tuiflow.js` (`before.js` `import()`s it).
3. Import `provisioning/dashboards/tuiflow-demo.json`. The datasource points at TestData (uid `testdata`), so remap it on the import screen or replace the queries with Prometheus.

## Switch to Prometheus

The template only looks at key names on row objects. Match the query legend/alias as below and it works as-is.

| Key | Meaning | PromQL example |
|---|---|---|
| `rps` | Requests per second | `sum(rate(nginx_ingress_controller_requests[1m]))` |
| `p95_ms` | p95 latency (ms) | `histogram_quantile(0.95, sum by (le)(rate(http_request_duration_seconds_bucket[5m]))) * 1000` |
| `err_pct` | 5xx ratio (%) | `100 * sum(rate(...{status=~"5.."}[5m])) / sum(rate(...[5m]))` |

In Business Text the value-field name of a Prometheus result is the legend format (`Legend: rps`). For the pod table, join instant queries such as `kube_pod_status_phase` and `kube_pod_container_status_restarts_total` with a Table transformation, or read the Kubernetes API through the Infinity datasource into the same columns as the CSV (`pod,ready,restarts,cpu_m,mem_mi,status`).

## After editing the sources

```bash
node grafana/build-dashboard.js   # regenerate JSON
npm test                          # template width, helper registration, after.js cleanup (handlebars devDependency)
```

## How the panel code runs (from the plugin source)

- Before/After code runs as `new Function('context', code)`, so a top-level `await` is not available. `before.js` returns a Promise via `return import(...).then(...)`, and the panel awaits that before compiling the template.
- All rows mode: the template root is `{ data: rows }`, and After's `context.data` is the rows array. All data mode: `data` is an array of frames (each frame an array of rows).
- If After returns a function, the panel calls it as cleanup before the next render. Return the stop function from `tf.animate()` and the timer does not leak.
- `<pre>` and `<span class>` survive even when `disable_sanitize_html` is off. Turn it on only when you need an iframe.
