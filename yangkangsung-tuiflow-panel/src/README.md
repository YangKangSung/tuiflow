# Tuiflow

Terminal-style charts for Grafana. One panel, every core visualization: braille time series, bars, gauges, tables, logs, flame graphs, maps and the rest. The drawing is text, so the same picture works in a dashboard, a kiosk and a copy-paste.

## Installation

```bash
grafana-cli plugins install yangkangsung-tuiflow-panel
```

Restart Grafana, then pick **Tuiflow** in the visualization list.

## How to use

1. Add a panel and choose **Tuiflow**.
2. Attach any query. The fields the drawing reads are listed below; field unit, decimals, min/max, thresholds, display name and overrides are applied through Grafana's field config.
3. Under **Visualization**, pick the drawing (Time series, Stat, Gauge, Table, …).
4. **Columns** and **Rows** are character cells. Leave them at 0 to fit the panel.

Colours follow the active Grafana theme (success / warning / error and the visualization palette). `?theme=matrix` turns the whole panel green.

## Data frame fields

Most drawings are query-agnostic: **every numeric field in every frame becomes one series**, named by display name, labels or the frame name. The rest look for specific fields by name (case-insensitive) or by type in the **first frame**.

| Visualization | Reads |
|---|---|
| Time series, Stat, Gauge, Bar gauge, Heatmap, Histogram | All numeric fields in all frames, one series each; the time field of the frame, when present, labels the x axis. Gauge and Bar gauge use the field `min` / `max` config for the range |
| Bar chart, Columns, Pie chart | First frame: the first string field labels the categories (else `1, 2, 3…`), the numeric fields are the values (Columns and Pie use the first numeric field) |
| Table | Every field of the first frame, in order, with field display formatting |
| State timeline, Status history | All numeric or string fields in all frames, one row per field, resampled along the frame's time field |
| Candlestick | First frame: numeric fields named `open`, `high`, `low`, `close` (fallback: the first four numeric fields in that order) |
| XY chart, Trend | First frame: the first numeric field is x, the remaining numeric fields are y series |
| Logs | First frame: a string field for the line (`line`, `body`, `message`, `msg`, `log`, `content`, else the first string field), the time field, and an optional `level` / `severity` / `lvl` field |
| Node graph | A nodes frame with `id`, `title`, `mainstat` and an edges frame with `source`, `target` (the shape Grafana's Node graph uses) |
| Traces | A frame with `spanID`, `parentSpanID`, `operationName`, `serviceName`, `startTime`, `duration` (Grafana's trace frame) |
| Flame graph | A frame with `label` (or `name` / `function` / `symbol`), `value` (or `total` / `inclusive`) and `level` (or `depth`), the shape profiling data sources return |
| Geomap | First frame: `lat` / `latitude` and `lon` / `lng` / `longitude`, an optional string field as the label and an optional numeric field as the value |
| Canvas | A categorical frame (string field = box title, up to three numeric fields = box rows), else every numeric series becomes one box |
| News | First frame: `title` (or `headline` / `name`, else the first string field), optional `time` / `date` / `published`, optional `source` / `feed` / `site`. Use an RSS → frame data source such as Infinity |
| Annotations list | First frame: `title` / `text` / `annotation` (else the first string field), optional time field, optional `tags`. Without a query it lists `/api/annotations` |
| Alert list, Dashboard list | No query. They read `/api/alertmanager/grafana/api/v2/alerts` and `/api/search` through Grafana's backend service |
| Text | First frame: the first string field, one line per value, in a dashed box |

If a drawing cannot find what it needs it prints `no data` (or a one-line hint saying which fields it looked for) instead of an empty panel.

## Documentation

Project source, the local demo stack and the Business Text variant: https://github.com/YangKangSung/tuiflow
