# tuiflow

Terminal drawings inside a Grafana panel. Braille line charts, block bars, dashed boxes and a `.o@` packet. The panel reads whatever query is attached and uses Grafana field config (unit, decimals, min, max, thresholds, display name). Grafana's own theme is left alone: the text inherits the panel colour.

Pick **tuiflow** in the visualization list, then choose a view (Time series, Stat, Flow, and the others).

This package is not signed and has not been submitted to grafana.com. Grafana Cloud will not load it. A Grafana you run yourself will, on version 12.0 or newer.

## Install

Copy this folder to the Grafana plugins directory. The folder name must stay `tuiflow-tui-panel`, and `plugin.json` must sit directly inside it.

Allow the unsigned plugin, then restart Grafana.

`grafana.ini`:

```ini
[plugins]
allow_loading_unsigned_plugins = tuiflow-tui-panel
```

Docker:

```text
GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=tuiflow-tui-panel
```

Mount this directory at `/var/lib/grafana/plugins/tuiflow-tui-panel`.

Build it from the source repo with Node 22 (`npm install` and `npm run build` inside `tuiflow-tui-panel`). The full steps, including a package install and how to pick a view for a query, are in `docs/install-grafana-plugin.md` in that repo.

## Use

Add a visualization, keep your query, choose **tuiflow**, then set **View**. Standard field options (unit, min, max, decimals, thresholds) apply to the drawing.

- Source: https://github.com/YangKangSung/tuiflow
- Install guide: https://github.com/YangKangSung/tuiflow/blob/main/docs/install-grafana-plugin.md
- License: https://github.com/YangKangSung/tuiflow/blob/main/tuiflow-tui-panel/LICENSE
