# TUI

Terminal-style charts for Grafana. One panel, every core visualization: braille time series, bars, gauges, tables, logs, flame graphs, maps and the rest. The drawing is text, so the same picture works in a dashboard, a kiosk and a copy-paste.

## Installation

```bash
grafana-cli plugins install yangkangsung-tuiflow-panel
```

Restart Grafana, then pick **TUI** in the visualization list.

## How to use

1. Add a panel and choose **TUI**.
2. Attach any query. Numeric fields become series. Field unit, decimals, min/max and thresholds are kept.
3. Under **Visualization**, pick the drawing (Time series, Stat, Gauge, Table, …).
4. **Columns** and **Rows** are character cells. Leave them at 0 to fit the panel.

Alert list and Dashboard list read Grafana's own APIs. The other drawings use the panel query.

## Documentation

Project source and the local demo stack: https://github.com/YangKangSung/tuiflow
