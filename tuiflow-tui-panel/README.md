# tuiflow panel plugin

Grafana panel plugin `tuiflow-tui-panel`. One visualization-list entry, with a View option for each tuiflow drawing. It renders the same helpers as the Business Text dashboards (`grafana/business-text/before.js`).

Not submitted to grafana.com. Signing and the catalog form stay manual.

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
