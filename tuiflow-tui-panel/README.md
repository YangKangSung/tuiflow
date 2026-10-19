# tuiflow panel plugin

Grafana panel plugin `tuiflow-tui-panel`. One visualization-list entry, with a View option for each tuiflow drawing.

The plugin bundles only the tuiflow modules from the repo's `src/`: `tuiflow.js` (core), `tuiflow-helpers.js` (the `tf*` Handlebars helpers), `tuiflow-dom.js` (packet animation, async lists), `tuiflow.css`, `flow.hbs`. Handlebars is its one runtime dependency.

Not submitted to grafana.com. Signing and the catalog form stay manual.

Two things are kept out of the package, and `npm run pack` refuses a `dist/` that references either:

- the Apache ECharts render path (`echarts/`), a separate experiment;
- the Business Text adapter (`grafana/business-text/`), which wires the same `src/` modules into Volkov Labs' Business Text panel for the provisioned dashboards. That is a different delivery and has no place in this plugin.

## Build

Requires Node 22+ (the scaffold's toolchain).

```bash
cd tuiflow-tui-panel
npm install
npm run build
npm run pack
```

`npm run pack` writes `artifacts/tuiflow-tui-panel.zip`. The zip root folder is the plugin id, which is what the catalog form expects. Submission itself is a form on Grafana Cloud (Org Settings → My Plugins) and is not run from this repo.

Local Grafana in `grafana/docker-compose.yml` loads the unsigned build from `dist/` when that stack is up. Open a dashboard, Add → Visualization → **tuiflow**.

To install the same build on another Grafana you run yourself, follow [docs/install-grafana-plugin.md](../docs/install-grafana-plugin.md). Grafana 12 or newer is required. The plugin is unsigned, so that server has to allow `tuiflow-tui-panel`. Grafana Cloud will not load it.

## License

This plugin directory is Apache-2.0, which the Grafana plugin validator accepts. Confirm that license before a real submission.
