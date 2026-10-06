# Survey: every way to build a TUI (terminal) look dashboard in Grafana

Surveyed 2026-10-05. Each row is only what was checked directly in that project's docs or source. Stars measure how closely the reference video's look can be reproduced (★5 = nearly the same).

## 0. Summary

1. **Grafana 12 has a built-in `matrix` theme hidden from the theme picker.** `fontFamily: monospace`, `borderRadius: 0`, black/green. Appending `?theme=matrix` turns the whole UI into a terminal. The backend allows it through `IsValidThemeID`, so the preferences API can apply it permanently.
2. **Core Canvas connection lines have Dashed/Dotted plus animation since 11.0, and direction driven by a field value since 12.2.** A "flowing line" is possible with no plugin.
3. Every element of the video look is text. The practical first choice is therefore **filling a `<pre>` from data in a Business Text (or HTML Graphics) panel**, and this repo's `src/tuiflow.js` is the text generator for that.
4. When a real terminal is required, serve **Grafatui / grom** (they read Grafana dashboard JSON and draw Prometheus in a terminal) with ttyd inside a Grafana iframe, or run them inside `cool-retro-term`.

## 1. Inside a Grafana panel

| Approach | Look | Difficulty | Notes |
|---|---|---|---|
| [Business Text](https://grafana.com/docs/plugins/marcusolsson-dynamictext-panel/latest/) (`marcusolsson-dynamictext-panel`) | ★5 | medium | Fill a `<pre>` with Handlebars. Before/After JS runs as `new Function('context', code)`, so a top-level `await` is unavailable and returning a Promise is fine. `context.handlebars`, `context.data` (All rows: row array, All data: frame array), and `context.element` in After. External `<script>` was removed in Grafana 11; only `import()` inside the code works. An external CSS URL works. |
| [HTML Graphics](https://gapit-htmlgraphics-panel.gapit.io/docs/options/) (`gapit-htmlgraphics-panel`) | ★5 | medium | HTML/SVG + CSS + `onInit`/`onRender`. v2.2.3 (2025-11). |
| [Business Charts](https://grafana.com/docs/plugins/volkovlabs-echarts-panel/latest/charts-function/) (Apache ECharts) | ★4 | medium | A `lines` series with `effect.show:true` is a dot traveling along the line. A `graph` series plus a monospace font draws nodes and edges. |
| [Canvas](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/canvas/) (core) | ★3 | low | Boxes, text, metric values, connections. No font control, so pair it with the matrix theme. Connection animation [#85556](https://github.com/grafana/grafana/issues/85556), direction = field [What's new 2025-08](https://grafana.com/whats-new/2025-08-21-dynamic-connection-direction-in-canvas-visualizations/), animation does not stop at value 0 [#112196](https://github.com/grafana/grafana/issues/112196). |
| [Flow panel](https://grafana.com/grafana/plugins/andrewbmchugh-flow-panel/) (`andrewbmchugh-flow-panel`) | ★4 | medium | draw.io SVG + YAML mapping. draw.io "flow animation" edges (Export as SVG is required), speed driven by data. The old FlowCharting (Angular) is effectively dead on 11.x. |
| Text panel + iframe → a real TUI | ★5 | medium | `[panels] disable_sanitize_html=true`, `[security] allow_embedding=true`. Serve k9s, Grafatui, kutop, or a custom Ratatui app with ttyd / textual-serve. https↔https scheme match is required ([notes](https://github.com/jangaraj/grafana-iframe)). |
| [Text panel](https://grafana.com/docs/grafana/latest/panels/visualizations/text-panel/) (Markdown/HTML/Code) | ★3 | low | Variable substitution only. For a static ASCII topology. |
| Custom panel plugin ([@grafana/create-plugin](https://grafana.com/developers/plugin-tools/)) | ★5 | high | Render xterm.js / `@beamterm/renderer` / Ratzilla WASM directly in a React panel. |
| Split Flap (dzaczek) | ★2 | low | Airport flap display. For a retro counter accent. |

## 2. Make Grafana itself look like a terminal

| Approach | Notes |
|---|---|
| Hidden `matrix` theme | [matrix.json](https://github.com/grafana/grafana/blob/main/packages/grafana-data/src/themes/themeDefinitions/matrix.json). Absent from the picker ([getSelectableThemes.ts](https://github.com/grafana/grafana/blob/main/public/app/core/components/ThemeSelector/getSelectableThemes.ts)), but [index.go `getThemeForIndexData`](https://github.com/grafana/grafana/blob/main/pkg/api/index.go) checks a `?theme=` value only with `IsValidThemeID`. Still present in v12.0.0 (`matrix.ts`). `tron`, `synthwave`, `gloom`, `mars`, and others work the same way. |
| Experimental theme picker | Feature toggles `grafanaconThemes` / `extraThemes` ([What's new 2025-04](https://grafana.com/whats-new/2025-04-11-introducing-experimental-themes/)). |
| Inject global CSS | nginx `sub_filter '</head>' '<link rel=stylesheet href=/custom.css></head>'` ([example](https://github.com/Zidichy/GrafOrg)), Business Text external CSS, browser Stylus. Grafana team: "CSS/DOM is not an API contract" ([#71662](https://github.com/grafana/grafana/issues/71662)). For kiosks. |
| CRT overlay CSS | [afterglow-crt](https://github.com/HauntedCrusader/afterglow-crt) (crt-green/amber presets), [ysrtv](https://github.com/Yaser-Allahim/ysrtv), [labcat-crt](https://github.com/andymai/labcat-crt), [vault66-crt-effect](https://github.com/mdombrov-33/vault66-crt-effect) (React). |
| Official custom themes | March 2026 hackathon draft PR [#119725](https://github.com/grafana/grafana/pull/119725), unmerged. |

## 3. Outside Grafana, a real terminal

| Tool | Notes |
|---|---|
| [Grafatui](https://github.com/fedexist/grafatui) (Rust) | Queries Prometheus directly, imports Grafana dashboard JSON (timeseries/stat/gauge/bargauge/table/heatmap, template variables), SVG/PNG snapshots. 2026-06 v0.1.x. |
| [grom](https://github.com/qf-studio/grom) | btop style (braille, gradient meters), Grafana JSON import. Started 2026-07. |
| [sampler](https://github.com/sqshq/sampler) | Shell commands in YAML → runchart/sparkline/barchart/gauge/asciibox. |
| k9s `:pulses`, [kdash](https://github.com/kdash-rs/kdash), [kutop](https://github.com/ken-jo/kutop), kubetui | Kubernetes only. kutop is a Textual btop look. |
| grafterm, ascii-grafana | Legacy (2019). |
| DIY: Ratatui/[Ratzilla](https://github.com/ratatui/ratzilla), [termdash](https://github.com/mum4k/termdash), [ntcharts](https://github.com/NimbleMarkets/ntcharts), Textual+[textual-plotext](https://github.com/textualize/textual-plotext) | termdash SegmentDisplay (16-segment) is especially retro. Ratzilla runs the same Rust code in the browser as WASM (WebGL2). |
| ASCII topology | [kubectl-graph](https://github.com/steveteuber/kubectl-graph) (DOT/mermaid) → graph-easy `--as=boxart` / [D2 0.7.1+ `.txt`](https://d2lang.com/blog/ascii/) / mermaid-ascii. kube-lineage and kubectl tree are trees. CronJob → Infinity datasource → Business Text `<pre>`. |
| [cool-retro-term](https://github.com/Swordfish90/cool-retro-term) | A real CRT shader. The wall-display end look. The reverse also works: render Grafana to PNG and print it in the terminal with chafa. |

## 4. Libraries for assembling it (web)

| Library | Use |
|---|---|
| [WebTUI CSS](https://webtui.ironclad.sh/) (`@webtui/css`) | TUI borders and type via attributes such as `box-="square"`. catppuccin/gruvbox/nord themes. Load as Business Text external CSS. |
| [asciichart](https://github.com/kroitor/asciichart), [chartscii](https://github.com/tool3/chartscii), `@panzi/unicode-bar-chart` | Generate ASCII/Unicode chart strings. Zero dependencies. |
| [xterm.js](https://github.com/xtermjs/xterm.js), [@beamterm/renderer](https://github.com/junkdog/beamterm), Ratzilla, vue-tui | Browser cell renderers. beamterm is a display-only WebGL2 renderer with no PTY. |
| Fonts | JetBrains Mono (OFL, bundled in this repo), Cascadia Mono, Fira Code, IBM Plex Mono. Nerd Font icons via WebTUI plugin-nf. |

## 5. Recommended combinations

- **A. Stay inside Grafana**: `?theme=matrix` + Business Text (`src/tuiflow.js` import, Handlebars helpers, after-render animation) + topology as Canvas (dashed animation, direction = field) or Business Charts (lines effect). → this repo's `grafana/`.
- **B. Embed a real TUI in Grafana**: serve Grafatui or kutop from a ttyd/textual-serve pod in the cluster → Text panel `<iframe>`. Watch authentication (ttyd `-c`, oauth2-proxy) and scheme match.
- **C. Outside Grafana, CRT on the monitor**: cool-retro-term + grom/Grafatui (reuse Grafana JSON) + a tmux pane watching kubectl-graph → D2 `.txt`.

## 6. Caveats

- Global CSS injection and the `matrix` theme are unofficial/experimental. They can break on upgrade.
- Canvas elements cannot set a font (color, size, and alignment only).
- Business Text's Before code is not an async function, so use `return import(...).then(...)` instead of `await import()` (`grafana/business-text/before.js`).
- Keep the iframe approach's shell exposure small. textual-serve does not expose a shell.
