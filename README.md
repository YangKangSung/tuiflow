# tuiflow

**Animated terminal-style diagrams and charts on the web — for Grafana dashboards, a VS Code extension, and presentations.**

Dashed box nodes, `.o@` packets flowing between them, `█▓░` bars, `▁▂▃▅▇` sparklines, a session log, and a tmux-style status line.
Every element is a **string**. Color is only a `<span>`. The same code runs in a browser, a Grafana panel, a VS Code webview, and a slide.

Reference look: [X video (eng_khairallah1)](https://x.com/eng_khairallah1/status/2106852012558266388/video/1). The breakdown of its parts is [docs/look-spec.md](docs/look-spec.md).

## Gallery

The 25 official Grafana visualizations plus Flow and Columns, in the TUI tone, captured from the TestData gallery dashboard. Click a tile for the glyph output and the helper call behind it — [docs/gallery.md](docs/gallery.md).

<!-- gallery:start -->
<table>
<tr><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-time-series"><img src="docs/gallery/tuiflow-timeseries.png" alt="TUI Time series" width="100%"></a><br><sub>Time series</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-trend"><img src="docs/gallery/tuiflow-trend.png" alt="TUI Trend" width="100%"></a><br><sub>Trend</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-bar-chart"><img src="docs/gallery/tuiflow-barchart.png" alt="TUI Bar chart" width="100%"></a><br><sub>Bar chart</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-columns-vertical-bars"><img src="docs/gallery/tuiflow-columns.png" alt="TUI Columns (vertical bars)" width="100%"></a><br><sub>Columns</sub></td></tr>
<tr><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-stat"><img src="docs/gallery/tuiflow-stat.png" alt="TUI Stat" width="100%"></a><br><sub>Stat</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-gauge"><img src="docs/gallery/tuiflow-gauge.png" alt="TUI Gauge" width="100%"></a><br><sub>Gauge</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-bar-gauge"><img src="docs/gallery/tuiflow-bargauge.png" alt="TUI Bar gauge" width="100%"></a><br><sub>Bar gauge</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-table"><img src="docs/gallery/tuiflow-table.png" alt="TUI Table" width="100%"></a><br><sub>Table</sub></td></tr>
<tr><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-pie-chart"><img src="docs/gallery/tuiflow-piechart.png" alt="TUI Pie chart" width="100%"></a><br><sub>Pie chart</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-state-timeline"><img src="docs/gallery/tuiflow-state-timeline.png" alt="TUI State timeline" width="100%"></a><br><sub>State timeline</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-status-history"><img src="docs/gallery/tuiflow-status-history.png" alt="TUI Status history" width="100%"></a><br><sub>Status history</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-heatmap"><img src="docs/gallery/tuiflow-heatmap.png" alt="TUI Heatmap" width="100%"></a><br><sub>Heatmap</sub></td></tr>
<tr><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-histogram"><img src="docs/gallery/tuiflow-histogram.png" alt="TUI Histogram" width="100%"></a><br><sub>Histogram</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-candlestick"><img src="docs/gallery/tuiflow-candlestick.png" alt="TUI Candlestick" width="100%"></a><br><sub>Candlestick</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-xy-chart"><img src="docs/gallery/tuiflow-xychart.png" alt="TUI XY chart" width="100%"></a><br><sub>XY chart</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-logs"><img src="docs/gallery/tuiflow-logs.png" alt="TUI Logs" width="100%"></a><br><sub>Logs</sub></td></tr>
<tr><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-node-graph"><img src="docs/gallery/tuiflow-nodegraph.png" alt="TUI Node graph" width="100%"></a><br><sub>Node graph</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-traces"><img src="docs/gallery/tuiflow-traces.png" alt="TUI Traces" width="100%"></a><br><sub>Traces</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-flame-graph"><img src="docs/gallery/tuiflow-flamegraph.png" alt="TUI Flame graph" width="100%"></a><br><sub>Flame graph</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-canvas"><img src="docs/gallery/tuiflow-canvas.png" alt="TUI Canvas" width="100%"></a><br><sub>Canvas</sub></td></tr>
<tr><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-geomap"><img src="docs/gallery/tuiflow-geomap.png" alt="TUI Geomap" width="100%"></a><br><sub>Geomap</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-alert-list"><img src="docs/gallery/tuiflow-alertlist.png" alt="TUI Alert list" width="100%"></a><br><sub>Alert list</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-dashboard-list"><img src="docs/gallery/tuiflow-dashlist.png" alt="TUI Dashboard list" width="100%"></a><br><sub>Dashboard list</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-annotations-list"><img src="docs/gallery/tuiflow-annolist.png" alt="TUI Annotations list" width="100%"></a><br><sub>Annotations list</sub></td></tr>
<tr><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-text"><img src="docs/gallery/tuiflow-text.png" alt="TUI Text" width="100%"></a><br><sub>Text</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-news"><img src="docs/gallery/tuiflow-news.png" alt="TUI News" width="100%"></a><br><sub>News</sub></td><td align="center" valign="top" width="25%"><a href="docs/gallery.md#tui-flow-api-gateway-box"><img src="docs/gallery/tuiflow-flow.png" alt="TUI Flow (api-gateway box)" width="100%"></a><br><sub>Flow</sub></td></tr>
</table>
<!-- gallery:end -->

## What is in v0.4

| Path | Contents |
|---|---|
| [`src/tuiflow.js`](src/tuiflow.js) | Core. Zero dependencies, UMD. `bar` `sparkline` `meter` `box` `edge` `vedge` `table` `statusBar` `braillePlot`/`lineChart`/`flame`/`geoPlot` `pie` `Screen` `animate` |
| [`src/tuiflow-helpers.js`](src/tuiflow-helpers.js) · [`tuiflow-dom.js`](src/tuiflow-dom.js) · [`tuiflow.css`](src/tuiflow.css) · [`flow.hbs`](src/flow.hbs) | The `tf*` Handlebars helpers for every official visualization, the after-render animation, the `.tf` stylesheet, the hand-made flow template. Everything a panel plugin needs; UMD, no Grafana imports |
| [`demo/index.html`](demo/index.html) | Standalone demo (fake K8s cluster, 100×36 cells). Three palettes (video/matrix/amber), CRT overlay, fullscreen, copy the frame as text. The font is bundled, so it works on an offline PC |
| [`grafana/`](grafana/) | Business Text delivery: a thin adapter (`business-text/before.js` / `after.js`) that loads the `src/` modules into Volkov Labs' Business Text panel, the TestData dashboards built from it, and a WSL Docker start script. Plugins are downloaded on the host and mounted, so the stack also runs behind a TLS-inspecting proxy and offline. Not part of the panel plugin package |
| [`tuiflow-tui-panel/`](tuiflow-tui-panel/) | Grafana panel plugin. Visualization list name **tuiflow**. `npm run plugin:pack` builds a catalog zip. Not submitted to grafana.com. Install on your own Grafana: [docs/install-grafana-plugin.md](docs/install-grafana-plugin.md) |
| [`grafana/library/`](grafana/library/) | **The 25 official Grafana visualizations, plus Flow and Columns**, in the same TUI tone. Query-agnostic: every numeric field is a series, and Grafana field config is applied as-is. `npm run publish:library` → *Import from library* → swap the query |
| [`grafana/catalog.js`](grafana/catalog.js) | 1:1 catalogue of the [official visualization list](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/) |
| [`echarts/`](echarts/) | **Experimental.** The same look rendered by Apache ECharts: tuiflow strings as rich-text elements on a cell grid, plus a theme for native charts. Standalone — **not** part of the Grafana plugin or its catalog submission |
| [`docs/gallery.md`](docs/gallery.md) | Every library panel: Grafana screenshot, glyph output rendered in node, and the helper call. `npm run gallery` regenerates it and the README grid; `npm run gallery:shots` recaptures the PNGs from the local Grafana |
| [`docs/research.md`](docs/research.md) | Survey of every way to get a TUI look in Grafana (hidden `matrix` theme, animated Canvas connections, plugins, terminal tools, libraries) |
| [`docs/look-spec.md`](docs/look-spec.md) | Look spec — glyph vocabulary, palettes, layout and animation rules, per-target mapping |
| [`test/`](test/) | Core unit tests, plus Business Text templates rendered the way the plugin does, checking width, helpers, and cleanup |

## Quick start

```bash
# 1) Demo (any static server; file:// from a double-click also works)
npm run serve            # python -m http.server 8787
# → http://localhost:8787/demo/index.html   keys: Space pause · T theme · C CRT · F fullscreen

# 2) Grafana — Windows + WSL Docker Engine (Docker Desktop is not required)
.\grafana\fetch-plugins.ps1    # once
.\grafana\up.ps1               # → http://localhost:3000/d/tuiflow-demo/?theme=matrix  (admin/admin)
#    Linux/macOS: bash grafana/fetch-plugins.sh && (cd grafana && docker compose up -d)

# 3) Register library panels (turn an existing chart into the TUI look)
npm run publish:library        # → http://localhost:3000/d/tuiflow-library/?theme=matrix
#    Another Grafana: GRAFANA_URL=https://… GRAFANA_TOKEN=glsa_… npm run publish:library

# 4) Tests / regenerate JSON
npm install && npm test
npm run build                  # dashboards + library
```

## Core example

```html
<script src="src/tuiflow.js"></script>
<pre id="out"></pre>
<script>
  const tf = tuiflow;
  const s = new tf.Screen(60, 7);
  s.putLines(0, 0, tf.box([
    "rps  " + tf.bar(0.62, 10) + "  812",
    "cpu  " + tf.sparkline([3, 5, 9, 4, 7, 8, 6, 2], { min: 0, max: 10 }),
  ], { title: "api-gateway", width: 30, style: "dashed" }), "c-border");
  tf.animate((tick) => {
    s.put(31, 1, tf.edge(10, tick, { speed: 1.2 }), "c-packet");
    s.render(document.getElementById("out"));
  }, 8);
</script>
```

The Handlebars helpers (`{{{tfTimeseries}}}`, `{{{tfPie 6 0}}}`, …) live next to it in [`src/tuiflow-helpers.js`](src/tuiflow-helpers.js), the animation in [`src/tuiflow-dom.js`](src/tuiflow-dom.js), the styles in [`src/tuiflow.css`](src/tuiflow.css). The panel plugins bundle those `src/` modules and nothing else; [`grafana/business-text/`](grafana/business-text/) is only the thin adapter that loads the same modules into a Business Text panel for the provisioned dashboards.

## Roadmap

- [x] 0.1 — Research notes, core primitives, standalone demo, Business Text recipe + TestData dashboard
- [x] 0.2 — Braille line chart (`lineChart`), five query-agnostic generic helpers, six library panels + API publish script, WSL Docker start script
- [x] 0.3 — Braille line / pie / scatter, generic helpers, library panels + before/after dashboard
- [x] 0.4 — All 25 official Grafana visualizations in the same TUI tone (including Flame / Canvas / Geomap / Annotations / Text / News)
- [x] 0.4.1 — Pie redrawn with best-fit Block Elements (eighth / quadrant blocks, two colours per cell): round rim, straight cuts, any radius
- [ ] 0.5 — Presentations: slide mode (scene changes, typing effect, scripted events), a deterministic seed for recording, PNG/SVG export
- [ ] 0.6 — VS Code extension: webview panel with `tuiflow.js` + `--vscode-*` theme-token mapping, preview of workspace JSON scene files
- [ ] 0.7 — Panel plugin `yangkangsung-tuiflow-panel` (one visualization, kind is an option). The code is in the repo; catalog submission still needs a public repository and a Grafana Cloud login
- [ ] 1.0 — A live cluster (direct Prometheus HTTP API mode), a config schema, a docs site

## License

[Apache-2.0](LICENSE). The bundled JetBrains Mono font is [SIL OFL 1.1](demo/fonts/OFL.txt).
