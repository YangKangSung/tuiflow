# Changelog

## 1.0.2

Address the second catalog review.

- Security: field display colours are reduced to a plain CSS colour (`tf.safeColor`) and attribute-escaped before they reach a `style` attribute; `escapeHtml` now escapes `"` and `'` as well.
- The tuiflow modules are imported as ES modules (no `new Function`, no `window.tuiflow`); Handlebars is loaded from `handlebars/runtime`, so the template compiler is not bundled.
- Alert list, Dashboard list and Annotations list call the Grafana API through `getBackendSrv()`; dashboard links honour `appSubUrl`.
- Panel colours come from the Grafana theme (`success` / `warning` / `error` and the visualization palette) via `--tf-*` CSS variables; the video palette remains the fallback for hosts that do not set them.
- News no longer leaves a `loading news…` placeholder: it draws the panel query and, without one, says which fields it needs.
- README: the panel is called Tuiflow everywhere and the data frame fields each drawing reads are documented.

## 1.0.1

Address the Grafana catalog review: drop the UTF-8 BOM so the source map matches `vendor/tuiflow.js`, pin `basic-ftp` to 6.2.1, replace `braces` with a depth-limited 3.0.4 (upstream has not published a fix), fill in the Apache copyright line, and add catalog screenshots.

## 1.0.0 (Unreleased)

First catalog release. One TUI panel covers the core Grafana visualizations (time series, stat, gauge, table, logs, flame graph, geomap and the rest). Columns and rows of 0 fit the panel.
