# echarts/ — tuiflow's look, rendered by Apache ECharts (experimental)

A second render path next to the string renderer (`src/tuiflow.js` → `<pre>`).
tuiflow still generates every glyph (`┌ ╌ ┐`, `█░`, `▁▂▃`, `.o@▶`); ECharts positions
them on a cell grid, adds tooltips / emphasis / events, and renders native charts (step
line) through a theme with the same palette, monospace font, dashed axes and radius 0.

**Not part of the Grafana plugin.** Nothing in this directory is bundled, vendored or
packed by `tuiflow-tui-panel/` or `yangkangsung-tuiflow-panel/` (`sync-vendor.js` copies
only the tuiflow modules from `src/`; `pack.js` zips only `dist/`). What
gets submitted to the Grafana catalog is unchanged. If this path ever moves into a
panel, that is a separate, explicit step.

```
echarts/
├─ tuiflow-echarts.js   UMD adapter: theme(), metrics(), rich(), flowOption(), lineOption(), barOption(), pieOption()
├─ demo.html            Flow + p95 step line + node bars, three palettes, svg/canvas renderer
└─ README.md
test/echarts-adapter.test.js   option builders + an ECharts SSR render to SVG
```

## Run

```bash
npm install          # echarts is a devDependency (6.x); demo.html loads ../node_modules/echarts/dist/echarts.min.js
npm run serve        # → http://localhost:8787/echarts/demo.html   keys: Space pause · T theme
npm test             # includes test/echarts-adapter.test.js
```

Offline PC: copy `node_modules/echarts/dist/echarts.min.js` along with the repo (the font is
already in `demo/fonts/`).

## How it maps

| tuiflow | ECharts | Notes |
|---|---|---|
| Palette tokens (`docs/look-spec.md` §3) | `theme("video" \| "matrix" \| "amber")` → `registerThemes(echarts)` | `backgroundColor`, series `color`, dashed `splitLine`, `borderRadius: 0`, tooltip in `statusBg` |
| Cell grid (cols × rows) | `metrics(width, height, { cols, rows \| fontSize, ratio })` + `cellAxes(m)` | Hidden value axes where **one unit = one cell**, y inverted, (0,0) top-left. `ratio` is the measured glyph width / font size (0.6 for JetBrains Mono) |
| `[text, cls]` segments (as in `demo/index.html`) | `rich(segments)` → `{dim|rps  }{bar|████░░}` + `richStyles(palette, m)` | Every colour class is a zrender rich style with the same font and `lineHeight`, so multi-line labels keep the grid |
| `tf.box(...)` node | `boxLines(node)` → one text item, one rich line per row | Hover = `emphasis` background, tooltip per node |
| `tf.edge` / `tf.vedge` | `edgeItem(edge, tick)` | Dashes in `border`, `.o@` + head in `packet`. Redrawn per tick with `animation: false` (no interpolation — look-spec §5) |
| Flow diagram | `flowOption(spec, m, palette, tick)` | Three `custom` series (nodes, edges, texts) + status bar on the last row |
| Time series | `lineOption(spec, m, palette, { step })` | Native `line` series, `step: "end"`, 1px, no symbols; `┄ title ┄┄` as a `graphic` text (the `title` component ignores rich fills) |
| Bars | `barOption(spec, m, palette)` | `label  ████░░░░  value` rows as text, tooltip per row |
| Pie | `pieOption(spec, m, palette)` | Native pie (or donut when `donut: true`). Palette slices, radius 0, monospace percent labels, names in the legend, no animation |

## What you gain / what you give up

- Gain: tooltips, hover emphasis, click events, dataZoom/legend, SVG or canvas output, and
  everything else ECharts does once the glyphs are on its stage.
- Give up: `toText()`. The output is SVG/canvas, not a string you can paste into a README
  or a slide. Keep the string renderer for that; use this path where interaction matters.
- Font first: measure the cell ratio and build charts only after `document.fonts.ready`
  (see `demo.html`). A fallback font changes glyph widths and the boxes drift.
- zrender has no escape for `{name|…}` in rich text; `rich()` turns literal braces into `｛ ｝`.

## Ideas not done yet

- `graph` series with force layout for nodes (today nodes are fixed cells, like the string renderer).
- Braille `lineChart` as a text series when the chart is small; native `line` when it is large.
- Candlestick / heatmap through the theme.
