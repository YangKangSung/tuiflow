# tuiflow

**Animated terminal-style diagrams and charts on the web — for Grafana dashboards, a VS Code extension, and presentations.**

Dashed box nodes, `.o@` packets flowing between them, `█▓░` bars, `▁▂▃▅▇` sparklines, a session log, and a tmux-style status line.
Every element is a **string**. Color is only a `<span>`. The same code runs in a browser, a Grafana panel, a VS Code webview, and a slide.

Reference look: [X video (eng_khairallah1)](https://x.com/eng_khairallah1/status/2106852012558266388/video/1). The breakdown of its parts is [docs/look-spec.md](docs/look-spec.md).

## What is in v0.4

| Path | Contents |
|---|---|
| [`src/tuiflow.js`](src/tuiflow.js) | Core. Zero dependencies, UMD. `bar` `sparkline` `meter` `box` `edge` `vedge` `table` `statusBar` `braillePlot`/`lineChart`/`flame`/`geoPlot` `Screen` `animate` |
| [`demo/index.html`](demo/index.html) | Standalone demo (fake K8s cluster, 100×36 cells). Three palettes (video/matrix/amber), CRT overlay, fullscreen, copy the frame as text. The font is bundled, so it works on an offline PC |
| [`grafana/`](grafana/) | Business Text panel sources + TestData dashboards + a WSL Docker start script. Plugins are downloaded on the host and mounted, so the stack also runs behind a TLS-inspecting proxy and offline |
| [`tuiflow-tui-panel/`](tuiflow-tui-panel/) | Grafana panel plugin. Visualization list name **tuiflow**. `npm run plugin:pack` builds a catalog zip. Not submitted to grafana.com |
| [`grafana/library/`](grafana/library/) | **The 25 official Grafana visualizations, plus Flow and Columns**, in the same TUI tone. Query-agnostic: every numeric field is a series, and Grafana field config is applied as-is. `npm run publish:library` → *Import from library* → swap the query |
| [`grafana/catalog.js`](grafana/catalog.js) | 1:1 catalogue of the [official visualization list](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/) |
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

In Grafana the same functions are wrapped as Handlebars helpers → [`grafana/business-text/before.js`](grafana/business-text/before.js).

## Roadmap

- [x] 0.1 — Research notes, core primitives, standalone demo, Business Text recipe + TestData dashboard
- [x] 0.2 — Braille line chart (`lineChart`), five query-agnostic generic helpers, six library panels + API publish script, WSL Docker start script
- [x] 0.3 — Braille line / pie / scatter, generic helpers, library panels + before/after dashboard
- [x] 0.4 — All 25 official Grafana visualizations in the same TUI tone (including Flame / Canvas / Geomap / Annotations / Text / News)
- [ ] 0.5 — Presentations: slide mode (scene changes, typing effect, scripted events), a deterministic seed for recording, PNG/SVG export
- [ ] 0.6 — VS Code extension: webview panel with `tuiflow.js` + `--vscode-*` theme-token mapping, preview of workspace JSON scene files
- [ ] 0.7 — Panel plugin `yangkangsung-tuiflow-panel` (one visualization, kind is an option). The code is in the repo; catalog submission still needs a public repository and a Grafana Cloud login
- [ ] 1.0 — A live cluster (direct Prometheus HTTP API mode), a config schema, a docs site

## License

[Apache-2.0](LICENSE). The bundled JetBrains Mono font is [SIL OFL 1.1](demo/fonts/OFL.txt).
