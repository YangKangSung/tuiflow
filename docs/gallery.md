# Panel gallery

Every library panel — the 25 official Grafana visualizations plus Flow and Columns — as it renders in the
`tuiflow-gallery` TestData dashboard (`?theme=matrix`), followed by the same helper drawn in node from sample
frames, so the glyph output is readable without a browser. Each panel is one `<pre class="tf">` of strings;
colour is only a `<span>` class.

Regenerate: `npm run gallery` rewrites this file and the README grid; `npm run gallery:shots` recaptures the PNGs
from the local Grafana (`grafana/up.ps1`). The sample frames are the ones behind [`demo/plugin-kinds.html`](../demo/plugin-kinds.html).

[Time series](#tui-time-series) · [Trend](#tui-trend) · [Bar chart](#tui-bar-chart) · [Columns](#tui-columns-vertical-bars) · [Stat](#tui-stat) · [Gauge](#tui-gauge) · [Bar gauge](#tui-bar-gauge) · [Table](#tui-table) · [Pie chart](#tui-pie-chart) · [State timeline](#tui-state-timeline) · [Status history](#tui-status-history) · [Heatmap](#tui-heatmap) · [Histogram](#tui-histogram) · [Candlestick](#tui-candlestick) · [XY chart](#tui-xy-chart) · [Logs](#tui-logs) · [Node graph](#tui-node-graph) · [Traces](#tui-traces) · [Flame graph](#tui-flame-graph) · [Canvas](#tui-canvas) · [Geomap](#tui-geomap) · [Alert list](#tui-alert-list) · [Dashboard list](#tui-dashboard-list) · [Annotations list](#tui-annotations-list) · [Text](#tui-text) · [News](#tui-news) · [Flow](#tui-flow-api-gateway-box)

## TUI Time series

Braille line chart of every numeric series, y axis in the field unit, legend with last values.

![TUI Time series](gallery/tuiflow-timeseries.png)

Business Text: `{{{tfTimeseries 90 14}}}` · plugin visualization: **Time series** · Grafana stock panel: `timeseries`

```text
413 req/s ┤      ⣀⠤⠔⠒⠒⠒⠊⠉⠉⠒⠤⢄⡀                                    ⣀⠤⠔⠊⠉⠉
374 req/s ┤  ⣀⠤⠊⠉            ⠈⠑⠤⣀                             ⣀⠤⠊⠉      
335 req/s ┤⡠⠊                    ⠑⠒⠤⡀                     ⢀⡠⠔⠉          
296 req/s ┤                         ⠈⠒⠤⣀               ⢀⣀⠤⠃             
257 req/s ┤                             ⠑⠢⢄⣀      ⢀⡠⠤⠤⠒⠁                
218 req/s ┤⠒⠉⠉⠉⠉⠉⠒⠤⠤⠤⣀                      ⠉⠑⠊⠉⠉⠉⠁   ⢀⡠⠤⠤⠒⠊⠉⠉⠉⠉⠑⠒⠒⠤⢄⣀⣀⣀
179 req/s ┤           ⠉⠉⠑⠒⠤⣀⡀                   ⣀⠤⠔⠒⠒⠉⠁                 
140 req/s ┤                 ⠈⠉⠒⠤⢄⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⠤⠔⠊⠉                        
101 req/s ┤⠤⠒⠤⠤⢄⣀⣀                            ⢀⠤⠤⠤⠔⠒⠒⠒⠒⠒⠒⠤⠒⠒⠢⠤⠤⢄⣀⣀      
 62 req/s ┼       ⠉⠑⠒⠒⠤⠔⠢⠤⠤⠤⢄⣀⣀⣀⣀⣀⣀⠤⠤⠔⠒⠒⠒⠒⠊⠉⠉⠉⠁                   ⠉⠉⠑⠊⠉⠒
          └─────────────────────────────────────────────────────────────
           18:00                       18:23                       18:47
           ■ api-gateway 413 req/s   ■ orders-svc 202 req/s   ■ payments-svc 81 req/s
```

## TUI Trend

Line over a numeric x axis (first numeric field = x).

![TUI Trend](gallery/tuiflow-trend.png)

Business Text: `{{{tfTrend 80 12}}}` · plugin visualization: **Trend** · Grafana stock panel: `trend`

```text
239 ┤                  ⢀⣀⣀⠤⠤⠔⠒⠒⠉⠉⠉⠉⠉⠉⠉⠉⠉⠑⠒⠒⠒⠒⠢⠤⠤⣀⣀              
214 ┤             ⣀⠤⠔⠊⠉⠁                          ⠉⠒⠒⠤⢄⡀        
189 ┤        ⢀⡠⠔⠊⠉                                     ⠈⠑⠢⢄⡀    
164 ┤    ⣀⠤⠒⠉⠁                                             ⠈⠑⠒⠤⣀
139 ┤⢀⡠⠔⠉                                       ⣀⣀⣀⣀⣀⣀⣀         
114 ┤⠁                             ⢀⣀⣀⠤⠤⠔⠒⠒⠉⠉⠉⠉⠉       ⠉⠉⠉⠉⠉⠒⠒⠢⠤
 88 ┤                       ⢀⣀⡠⠔⠒⠊⠉⠁                            
 63 ┤                ⣀⣀⠤⠒⠒⠉⠉⠁                                   
 38 ┤         ⣀⡠⠔⠒⠊⠉⠉                                           
 13 ┼⣀⡠⠤⠤⠒⠒⠊⠉⠉                                                  
     1000                                                   7000
     ■ torque_nm   ■ power_kw   x: rpm
```

## TUI Bar chart

Horizontal grouped bars from a categorical frame (first string field = labels).

![TUI Bar chart](gallery/tuiflow-barchart.png)

Business Text: `{{{tfBarChart 36}}}` · plugin visualization: **Bar chart** · Grafana stock panel: `barchart`

```text
api-gateway   ████████████████████████████████████ 812
              ▌░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 12
orders-svc    ███████████████████▏░░░░░░░░░░░░░░░░ 431
              ▏░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 3
payments-svc  ███████████▉░░░░░░░░░░░░░░░░░░░░░░░░ 268
              ▍░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 9
auth-svc      ████████▍░░░░░░░░░░░░░░░░░░░░░░░░░░░ 190
              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 1
search-svc    █████▍░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 122
              ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0

■ requests   ■ errors
```

## TUI Columns (vertical bars)

Vertical block columns, first numeric field per category.

![TUI Columns (vertical bars)](gallery/tuiflow-columns.png)

Business Text: `{{{tfColumns 9 6}}}` · plugin visualization: **Columns** · Grafana stock panel: `barchart`

```text
812 ┤█████                        
    ┤█████                        
    ┤█████                        
    ┤█████ ▂▂▂▂▂                  
    ┤█████ █████                  
    ┤█████ █████ ▅▅▅▅▅            
    ┤█████ █████ █████ ▇▇▇▇▇ ▂▂▂▂▂
  0 ┼█████ █████ █████ █████ █████
     api-g order payme auth- searc
```

## TUI Stat

Name · sparkline · last value per series, coloured by thresholds.

![TUI Stat](gallery/tuiflow-stat.png)

Business Text: `{{{tfStat 40}}}` · plugin visualization: **Stat** · Grafana stock panel: `stat`

```text
■ api-gateway   ▄▅▆▆▇▇█████▇▇▆▆▅▅▄▃▃▂▁▁▁▁▁▁▂▂▃▃▄▅▅▆▇▇▇██   413 req/s
■ orders-svc    ▇████▇▇▆▆▅▄▄▃▂▂▁▁▁▁▁▁▁▂▂▃▄▅▅▆▆▇█████▇▇▆▆   202 req/s
■ payments-svc  ▇█▇▆▆▅▄▃▃▃▂▂▁▁▁▁▂▂▃▃▄▄▅▅▇▇▇▇█▇▇██▇▆▅▅▄▃▄    81 req/s
```

## TUI Gauge

[████░░░░] percent meter per series on the field's min/max.

![TUI Gauge](gallery/tuiflow-gauge.png)

Business Text: `{{{tfGauge 30}}}` · plugin visualization: **Gauge** · Grafana stock panel: `gauge`

```text
api-gateway   [██████████████████████░░░░░░░░░░]  69%  413 req/s
orders-svc    [██████████▊░░░░░░░░░░░░░░░░░░░░░]  34%  202 req/s
payments-svc  [████▎░░░░░░░░░░░░░░░░░░░░░░░░░░░]  13%  81 req/s
```

## TUI Bar gauge

Block bar per series on the field's min/max, threshold colour.

![TUI Bar gauge](gallery/tuiflow-bargauge.png)

Business Text: `{{{tfBarGauge 44}}}` · plugin visualization: **Bar gauge** · Grafana stock panel: `bargauge`

```text
api-gateway   ██████████████████████████████▎░░░░░░░░░░░░░  413 req/s
orders-svc    ██████████████▉░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  202 req/s
payments-svc  █████▉░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  81 req/s
```

## TUI Table

First frame as a monospace table; numeric cells use the field display.

![TUI Table](gallery/tuiflow-table.png)

Business Text: `{{{tfTable 40}}}` · plugin visualization: **Table** · Grafana stock panel: `table`

```text
pod                                 ready  restarts  cpu_m  mem_mi  status          
──────────────────────────────────  ─────  ────────  ─────  ──────  ────────────────
ingress-nginx-controller-6b8f-x2k1  1/1           0    120     210  Running         
ingress-nginx-controller-6b8f-p9zq  1/1           0     98     205  Running         
api-gateway-7d9f8c-4hv2x            1/1           0    310     540  Running         
api-gateway-7d9f8c-m8ql7            1/1           1    290     512  Running         
orders-svc-5c6b7d-abc12             1/1           0    180     420  Running         
orders-svc-5c6b7d-def34             1/1           0    175     415  Running         
orders-svc-5c6b7d-ghi56             1/1           0    190     430  Running         
orders-svc-5c6b7d-jkl78             0/1           0      0       0  Pending         
payments-svc-69fd4-q2wer            1/1           3    220     980  Running         
payments-svc-69fd4-t5yui            0/1           7     15    1010  CrashLoopBackOff
postgres-0                          1/1           0    410    1800  Running
```

## TUI Pie chart

Block-glyph disc (eighth/quadrant blocks, two colours per cell) + legend with percentages. First argument is the radius in rows (4 small … 12 large); second > 0 makes a donut.

![TUI Pie chart](gallery/tuiflow-piechart.png)

Business Text: `{{{tfPie 6 0}}}` · plugin visualization: **Pie chart** · Grafana stock panel: `piechart`

```text
       ▁▃▅▆▇██▐██▇▆▅▃▁          
    ▁▄▇██▜████▐███████▇▄▁       
   ▄██████▜███▐██████████▄      
 ▗▁████████▜██▐████████████▖    
▗██▇▅▃██████▜█▐█████████████▖   ■ api-gateway    45%  812
▟██████▆▄▂███▜▐█████████████▊   ■ orders-svc     24%  431
███████████▆▄▂▐██████████████   ■ payments-svc   15%  268
██████████▁▃▄▆▙██████████████   ■ auth-svc       10%  190
▜█████▂▀▅▇█████▙████████████▊   ■ search-svc      7%  122
▝▁▃▅▆███████████▜███████████▘   
 ▝███████████████▜█████████▘    
   ▀█████████████▙███████▀      
    ▔▀████████████▙████▀▔       
       ▔▀▀▀███████▀▀▀▔
```

## TUI State timeline

One row per series, █ runs coloured by threshold / value mapping (string states get palette colours).

![TUI State timeline](gallery/tuiflow-state-timeline.png)

Business Text: `{{{tfStateTimeline 80}}}` · plugin visualization: **State timeline** · Grafana stock panel: `state-timeline`

```text
api-gateway  ████████████████████████████████████████████████████████████████
orders-svc   ████████████████████████████████████████████████████████████████
payments-svc ████████████████████████████████████████████████████████████████
             18:00                                                      18:47
```

## TUI Status history

Discrete ▇ blocks per sample bucket, coloured by threshold.

![TUI Status history](gallery/tuiflow-status-history.png)

Business Text: `{{{tfStatusHistory 80}}}` · plugin visualization: **Status history** · Grafana stock panel: `status-history`

```text
api-gateway  ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ 
orders-svc   ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ 
payments-svc ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ ▇ 
             18:00                                                      18:47
```

## TUI Heatmap

Value buckets × time buckets, density as ░▒▓█ with a 4-step colour ramp.

![TUI Heatmap](gallery/tuiflow-heatmap.png)

Business Text: `{{{tfHeatmap 80 12}}}` · plugin visualization: **Heatmap** · Grafana stock panel: `heatmap`

```text
365 req/s ┤ ░ ░░ ░░ ░░ ░                                           
327 req/s ┤░             ▒▒ ▒▒ ░░                                  
289 req/s ┤      ░░ ░░ ░       ░░ ▓▒ ▒ ▒▒ ░                   ░░ ░ 
252 req/s ┤ ░ ░░          ░ ░░ ░░  ░ ░ ░░ ░▒ ▒░ ░       ░░ ░░      
214 req/s ┤░        ░░ ░ ░         ░ ░ ░░ ▒▒ ▒▓ ▓█ ▓ ▓▓ ░░       ░ 
176 req/s ┤ ░ ░░ ░░         ░░ ░░ ░          ░░ ░░ ▒ ▒▒ ▓▓ ██ █▓ ░ 
138 req/s ┤█▓ ▓▓ ▓░ ░░ ░ ░░        ░ ░ ░░ ░░          ░ ░░ ░░ ░▒ ▓ 
101 req/s ┤░░ ░░ ░▓ ▓▓ ▓ ▓▓ ▓▒ ▒░ ░     ░ ░░ ░░ ░░ ░ ░           ░ 
 63 req/s ┤ ░ ░░ ░░ ░░ ░ ░░ ░▒ ▒▓ ▓▒ ▒ ▒░ ░░ ░░ ░░ ░ ░░ ░░ ░░ ░░   
 25 req/s ┼░                       ░ ░ ░░ ░░ ░░ ░░ ░ ░░ ░░ ░░ ░░ ░ 
           18:00                                              18:35
```

## TUI Histogram

Distribution of all values as block columns.

![TUI Histogram](gallery/tuiflow-histogram.png)

Business Text: `{{{tfHistogram 30 9}}}` · plugin visualization: **Histogram** · Grafana stock panel: `histogram`

```text
15 ┤                            ██                              
   ┤  ▃▃    ▃▃                  ██                              
   ┤  ██    ██                  ██                              
   ┤▆▆██▂▂  ██                  ██                              
   ┤██████▆▆██  ▂▂          ▂▂▂▂██                            ▆▆
   ┤██████████▁▁██    ▁▁  ▅▅██████                      ▁▁  ▅▅██
   ┤██████████████▅▅▁▁██▁▁████████▅▅▁▁▁▁▁▁▁▁  ▁▁▅▅▁▁▅▅▁▁██▅▅████
 0 ┼████████████████████████████████████████▄▄██████████████████
    62 req/s                                           413 req/s
```

## TUI Candlestick

Open/high/low/close fields (by name, else first four numeric fields); █ up, ░ down.

![TUI Candlestick](gallery/tuiflow-candlestick.png)

Business Text: `{{{tfCandlestick 40 12}}}` · plugin visualization: **Candlestick** · Grafana stock panel: `candlestick`

```text
163.3 ┤                          │ █ █ ░ ░ │ │                                        
158.2 ┤                        █ █ █ │ │ ░ ░ ░ ░                                      
153.1 ┤                      █ █ │           │ ░ ░                                    
148.0 ┤                │ █ █ █ │                 ░ ░                                  
142.9 ┤              │ █ █                         ░ ░ │                           │ █
137.9 ┤            █ █ █                             ░ ░ ░                       │ █ █
132.8 ┤        │ █ █ │                                 │ ░ ░ ░                 █ █ █  
127.7 ┤      █ █ █                                         │ ░ ░ ░         │ █ █ │    
122.6 ┤│ █ █ █ │                                               │ ░ ░ ░ ░ █ █ █        
117.5 ┼░ █ │                                                         │ │ │ │          
       last 142.8  ▲ 4.0
       09:00                                                                     18:45
```

## TUI XY chart

Scatter: first numeric field = x, the rest = y series.

![TUI XY chart](gallery/tuiflow-xychart.png)

Business Text: `{{{tfXY 80 12}}}` · plugin visualization: **XY chart** · Grafana stock panel: `xychart`

```text
854 ┤⠁ ⠈⠂⠔⠠⠄⡀ ⢀                                                 
759 ┤          ⠑⠈⠂⠢  ⠄⡀                                         
664 ┤                 ⠈⠐⠉⠐  ⠢⢀ ⡀                                
569 ┤                         ⠁⠈⠈ ⠠⠐⠄⡠⢀⡀                        
474 ┤                                    ⠐⠈⠂⢄⠄⡀  ⡀              
380 ┤                                           ⠈ ⠑⠠⠂⠄ ⡀⢄       
285 ┤                                                    ⠈⠂⠑  ⠄⡠
190 ┤                                                           
 95 ┤                                                           
  0 ┼⡀ ⢀⡀⣀⢀⡀⡀ ⢀⣀⢀⡀⣀  ⡀⣀⢀⣀⢀  ⣀⢀⡀⣀⢀ ⢀⢀⡀⣀⢀⡀ ⢀⢀⡀⣀⡀⡀ ⢀⡀⣀⢀⡀⡀ ⡀⣀⢀⡀⣀  ⡀⣀
     20                                                      260
     ■ rps   ■ errors   x: latency_ms
```

## TUI Logs

time · [level] · line, newest first; level from a level field or detected in the text.

![TUI Logs](gallery/tuiflow-logs.png)

Business Text: `{{{tfLogs 30}}}` · plugin visualization: **Logs** · Grafana stock panel: `logs`

```text
18:05:15 [info]  ingress: cert renewed shop.example.com
18:04:30 [warn]  worker-3: memory pressure 85%
18:03:45 [error] payments: connection refused to stripe
18:03:00 [info]  postgres: autovacuum finished on orders
18:02:15 [warn]  payments: stripe latency 1.8s
18:01:30 [debug] orders: cache miss on sku-441
18:00:45 [info]  orders: created order 88421
18:00:00 [info]  gateway: accepted checkout from 10.0.4.12
```

## TUI Node graph

Layered boxes (longest path from roots) + edge list. Basic.

![TUI Node graph](gallery/tuiflow-nodegraph.png)

Business Text: `{{{tfNodeGraph}}}` · plugin visualization: **Node graph** · Grafana stock panel: `nodeGraph`

```text
┌╌╌╌╌╌╌╌╌╌╌╌╌╌┐     ┌╌╌╌╌╌╌╌╌╌╌╌╌╌┐     ┌╌╌╌╌╌╌╌╌╌╌╌╌╌┐     ┌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
┆ ingress     ┆ ╌╌▶ ┆ api-gateway ┆ ╌╌▶ ┆ orders      ┆ ╌╌▶ ┆ postgres    ┆
┆ 812 req/s   ┆     ┆ 640 req/s   ┆     ┆ 431 req/s   ┆     ┆ 120 req/s   ┆
└╌╌╌╌╌╌╌╌╌╌╌╌╌┘     └╌╌╌╌╌╌╌╌╌╌╌╌╌┘     └╌╌╌╌╌╌╌╌╌╌╌╌╌┘     └╌╌╌╌╌╌╌╌╌╌╌╌╌┘
                                                                           
                                        ┌╌╌╌╌╌╌╌╌╌╌╌╌╌┐                    
                                        ┆ payments    ┆ ╌╌▶                
                                        ┆ 268 req/s   ┆                    
                                        └╌╌╌╌╌╌╌╌╌╌╌╌╌┘                    
                                                                           
edges
  ingress ──▶ api-gateway
  api-gateway ──▶ orders
  api-gateway ──▶ payments
  orders ──▶ postgres
```

## TUI Traces

Span waterfall: indent by depth, bar = start offset + duration, coloured by service.

![TUI Traces](gallery/tuiflow-traces.png)

Business Text: `{{{tfTraces 50 40}}}` · plugin visualization: **Traces** · Grafana stock panel: `traces`

```text
GET /checkout        ████████████████████████████████████████████████ 180ms  gateway
  auth.Verify          ██████                                         22.0ms  gateway
  orders.Create               ████████████████████████                90.0ms  orders
    cache.Get                   ███                                   12.0ms  orders
    db.Insert                       █████████████                     48.0ms  postgres
  payments.Authorize                                   ███████████    40.0ms  payments
```

## TUI Flame graph

Inclusive stacked bars from label/level/value(/self) fields; children indent under the parent. Hottest frame is scanned.

![TUI Flame graph](gallery/tuiflow-flamegraph.png)

Business Text: `{{{tfFlame 48}}}` · plugin visualization: **Flame graph** · Grafana stock panel: `flamegraph`

```text
total                        ████████████████████████████████████████████████ 100%
runtime.goexit                 ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   4%
net/http.(*conn).serve         ████████████████████████████████████████████░░  96%
net/http.serverHandler.Serve     ██████████████████████████████████████████░░  95%
shop/api.(*Gateway).ServeHTT       ███████████████████████████████████████░░░  94%
shop/api.auth                        █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  12%
shop/api.route                       ████████████████████████████████░░░░░░░░  80%
shop/orders.Create                     ████████████████████░░░░░░░░░░░░░░░░░░  52%
shop/orders.db.Insert                    ██████████████░░░░░░░░░░░░░░░░░░░░░░  38%
shop/orders.cache.Get                    ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   8%
shop/payments.Authorize                ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  27%
shop/payments.stripe                     █████████░░░░░░░░░░░░░░░░░░░░░░░░░░░  24%
encoding/json.Marshal                  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   2%
```

## TUI Canvas

Freeform TUI layout: one dashed box per category (or series), .o@ packets on the links between them.

![TUI Canvas](gallery/tuiflow-canvas.png)

Business Text: `{{{tfCanvas 30}}}` · plugin visualization: **Canvas** · Grafana stock panel: `canvas`

```text
┌ api-gateway ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐                   ┌ orders-svc ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
┆ request ██████████    812    ┆ .o@╌╌╌╌╌╌╌╌╌╌╌╌╌▶ ┆ request █████▎░░░░    431    ┆
┆ errors  ▏░░░░░░░░░     12    ┆                   ┆ errors  ░░░░░░░░░░      3    ┆
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘                   └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘

┌ payments-svc ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐                   ┌ auth-svc ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
┆ request ███▎░░░░░░    268    ┆ .o@╌╌╌╌╌╌╌╌╌╌╌╌╌▶ ┆ request ██▍░░░░░░░    190    ┆
┆ errors  ▏░░░░░░░░░      9    ┆                   ┆ errors  ░░░░░░░░░░      1    ┆
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘                   └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘

┌ search-svc ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
┆ request █▌░░░░░░░░    122    ┆
┆ errors  ░░░░░░░░░░      0    ┆
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
```

## TUI Geomap

Equirectangular lat/lon grid; * markers from lat/lon fields, pulsing.

![TUI Geomap](gallery/tuiflow-geomap.png)

Business Text: `{{{tfGeomap 56 10}}}` · plugin visualization: **Geomap** · Grafana stock panel: `geomap`

```text
90N┤·                           ·                          ·
70N┤·                           ·                          ·
50N┤·                           ·*                         ·
30N┤·               *           ·                  * *     ·
10N┤·                           ·              *           ·
10S┤+╌╌╌╌╌╌╌+╌╌╌╌╌╌╌+╌╌╌╌╌╌╌+╌╌╌╌╌╌╌+╌╌╌╌╌╌╌+╌╌╌╌╌╌╌+╌╌╌╌╌╌╌
30S┤·                   *       ·                      *   ·
50S┤·                           ·                          ·
70S┤·                           ·                          ·
90S┤·                           ·                          ·
   └────────────────────────────────────────────────────────
    180W                                                180E
* Seoul       37.6,  127.0  812
* Tokyo       35.7,  139.7  640
* Singapore    1.4,  103.8  410
* Frankfurt   50.1,    8.7  380
* Virginia    39.0,  -77.5  520
* Sao Paulo  -23.6,  -46.6  210
* Sydney     -33.9,  151.2  180
```

## TUI Alert list

Active alerts from the Alertmanager API (fetched by the panel itself).

![TUI Alert list](gallery/tuiflow-alertlist.png)

Business Text: `{{{tfAlertList 20}}}` · plugin visualization: **Alert list** · Grafana stock panel: `alertlist`

```text
[firing]     PaymentsDown   critical 09:12  stripe connection refused
[firing]     HighErrorRate  warning  09:18  api-gateway errors above 2%
[pending]    NodeMemory     warning  09:21  worker-3 memory 85%
```

## TUI Dashboard list

Dashboards from /api/search as links.

![TUI Dashboard list](gallery/tuiflow-dashlist.png)

Business Text: `{{{tfDashboardList 20}}}` · plugin visualization: **Dashboard list** · Grafana stock panel: `dashlist`

```text
▸ Tuiflow demo     General          #kiosk
▸ Tuiflow library  General          #tui
▸ Shop overview    shop             #slo
```

## TUI Annotations list

time · title · #tags from a frame, or /api/annotations when the query is empty.

![TUI Annotations list](gallery/tuiflow-annolist.png)

Business Text: `{{{tfAnnotations 16}}}` · plugin visualization: **Annotations list** · Grafana stock panel: `annolist`

```text
※ 01:12 deploy shop v2.4.1  #deploy
※ 02:40 payments-svc CrashLoop spike  #incident
※ 03:05 scaled orders-svc 3 → 6  #autoscale
※ 04:18 postgres failover complete  #db
```

## TUI Text

Dashed CRT frame around string-field lines (or a default runbook) with a blinking block cursor.

![TUI Text](gallery/tuiflow-text.png)

Business Text: `{{{tfText 52}}}` · plugin visualization: **Text** · Grafana stock panel: `text`

```text
┌ text ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
┆ # shop · on-call runbook                         ┆
┆                                                  ┆
┆ ## payments-svc CrashLoop                        ┆
┆ 1. kubectl logs -p payments-svc                  ┆
┆ 2. check postgres connections                    ┆
┆ 3. page @sre if 3+ restarts                      ┆
┆                                                  ┆
┆ dash: /d/tuiflow-library  theme=matrix          █┆
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
```

## TUI News

time · source · title, newest first. String fields title/source plus a time field.

![TUI News](gallery/tuiflow-news.png)

Business Text: `{{{tfNews 12}}}` · plugin visualization: **News** · Grafana stock panel: `news`

```text
▸ 2026-10-06 grafana     Unified alerting grouping is GA
▸ 2026-10-05 kubernetes  1.32 changelog: in-place resize GA
▸ 2026-10-04 prometheus  Native histograms default in 3.x
▸ 2026-10-03 grafana     Canvas connections: packet-style edges
▸ 2026-10-02 cilium      Kube-proxy-free datapath notes
▸ 2026-10-01 localai     Backend gallery: ds4 + Metal matrix
```

## TUI Flow (api-gateway box)

Hand-made box with bars, sparklines and an animated packet edge; template expects fields rps, p95_ms, err_pct.

![TUI Flow (api-gateway box)](gallery/tuiflow-flow.png)

Business Text: template [`src/flow.hbs`](../src/flow.hbs) · plugin: not a visualization kind (template only)

```text
┌ api-gateway ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
┆ rps    █████████▎░░░░   398 [ok]               ┆
┆ p95    ██████▎░░░░░░░ 112ms [ok]               ┆
┆ err    ██▊░░░░░░░░░░░ 1.00% [ok]               ┆
┆                                                ┆
┆ rps    ▅▇███▇▆▄▃▁▁▁▂▃▅▆▇██▇▆▄▃▂▁▁▂▃▅▆          ┆
┆ p95    ▅▇███▇▆▄▃▁▁▁▂▃▅▆▇██▇▆▄▃▂▁▁▂▃▅▆          ┆
┆ err    ▅▇███▇▆▄▃▁▁▁▂▃▅▆▇██▇▆▄▃▂▁▁▂▃▅▆          ┆
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
          [orders-svc]   packet speed follows rps · range  322 avg /  448 max
```
