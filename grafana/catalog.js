/**
 * The catalogue of TUI panels: for every Grafana core visualization that can
 * be rendered from query data there is one entry with
 *   - the Business Text content (one helper call),
 *   - the stock Grafana panel it mirrors (type + options) for before/after,
 *   - sample TestData targets + fieldConfig so it renders without a cluster.
 * build-library.js and build-dashboard.js both read this file.
 */
const TESTDATA = { type: "grafana-testdata-datasource", uid: "testdata" };

const walk = (refId, alias, startValue, spread, noise, min, max, extra) =>
  Object.assign({ refId, datasource: TESTDATA, scenarioId: "random_walk", alias, startValue, spread, noise, min, max }, extra || {});
const csv = (refId, lines) => ({ refId, datasource: TESTDATA, scenarioId: "csv_content", csvContent: lines.join("\n") });

const svcTargets = [
  walk("A", "api-gateway", 300, 30, 10, 50, 600),
  walk("B", "orders-svc", 180, 20, 8, 20, 400),
  walk("C", "payments-svc", 90, 15, 5, 10, 250),
];
const thresholds = { mode: "absolute", steps: [{ color: "green", value: null }, { color: "orange", value: 300 }, { color: "red", value: 450 }] };
const rateField = (colorMode, extra) => ({
  defaults: Object.assign({ unit: "reqps", decimals: 0, min: 0, max: 600, thresholds, color: { mode: colorMode } }, extra || {}),
  overrides: [],
});
const plain = { defaults: {}, overrides: [] };
const reduceLast = { reduceOptions: { calcs: ["lastNotNull"], fields: "", values: false } };

const PODS_CSV = [
  "pod,ready,restarts,cpu_m,mem_mi,status",
  "ingress-nginx-controller-6b8f-x2k1,1/1,0,120,210,Running",
  "ingress-nginx-controller-6b8f-p9zq,1/1,0,98,205,Running",
  "api-gateway-7d9f8c-4hv2x,1/1,0,310,540,Running",
  "api-gateway-7d9f8c-m8ql7,1/1,1,290,512,Running",
  "orders-svc-5c6b7d-abc12,1/1,0,180,420,Running",
  "orders-svc-5c6b7d-def34,1/1,0,175,415,Running",
  "orders-svc-5c6b7d-ghi56,1/1,0,190,430,Running",
  "orders-svc-5c6b7d-jkl78,0/1,0,0,0,Pending",
  "payments-svc-69fd4-q2wer,1/1,3,220,980,Running",
  "payments-svc-69fd4-t5yui,0/1,7,15,1010,CrashLoopBackOff",
  "postgres-0,1/1,0,410,1800,Running",
];
const SERVICES_CSV = [
  "service,requests,errors",
  "api-gateway,812,12",
  "orders-svc,431,3",
  "payments-svc,268,9",
  "auth-svc,190,1",
  "search-svc,122,0",
];
// deterministic OHLC series (40 x 15 min) so the candlestick example is stable
const ohlcCsv = () => {
  const rows = ["time,open,high,low,close"];
  let price = 120;
  const t0 = Date.UTC(2026, 9, 5, 0, 0, 0);
  for (let i = 0; i < 40; i++) {
    const open = price;
    const drift = Math.sin(i / 5) * 4 + ((i * 7919) % 11) / 5 - 1;
    const close = +(open + drift).toFixed(2);
    const high = +(Math.max(open, close) + ((i * 31) % 5) / 2 + 0.5).toFixed(2);
    const low = +(Math.min(open, close) - ((i * 17) % 5) / 2 - 0.5).toFixed(2);
    rows.push(new Date(t0 + i * 15 * 60e3).toISOString() + "," + open + "," + high + "," + low + "," + close);
    price = close;
  }
  return rows;
};
const xyCsv = () => {
  const rows = ["latency_ms,rps,errors"];
  for (let i = 0; i < 60; i++) {
    const x = 20 + i * 4 + ((i * 13) % 7);
    rows.push(x + "," + Math.round(900 - x * 2.5 + ((i * 29) % 40)) + "," + +(Math.max(0, (x - 120) / 30 + ((i * 11) % 5) / 10)).toFixed(2));
  }
  return rows;
};
const trendCsv = () => {
  const rows = ["rpm,torque_nm,power_kw"];
  for (let rpm = 1000; rpm <= 7000; rpm += 250) {
    const torque = Math.round(180 + 60 * Math.sin((rpm - 1000) / 2200) - ((rpm - 4000) / 1000) ** 2 * 6);
    rows.push(rpm + "," + torque + "," + +((torque * rpm) / 9549).toFixed(1));
  }
  return rows;
};

const flameCsv = () => [
  "label,level,value,self",
  "total,0,10000,200",
  "runtime.goexit,1,400,400",
  "net/http.(*conn).serve,1,9600,100",
  "net/http.serverHandler.ServeHTTP,2,9500,50",
  "shop/api.(*Gateway).ServeHTTP,3,9400,200",
  "shop/api.auth,4,1200,1200",
  "shop/api.route,4,8000,100",
  "shop/orders.Create,5,5200,200",
  "shop/orders.db.Insert,6,3800,3800",
  "shop/orders.cache.Get,6,800,800",
  "shop/payments.Authorize,5,2700,300",
  "shop/payments.stripe,6,2400,2400",
  "encoding/json.Marshal,5,200,200",
];
const geoCsv = () => [
  "name,lat,lon,rps",
  "Seoul,37.57,126.98,812",
  "Tokyo,35.68,139.69,640",
  "Singapore,1.35,103.82,410",
  "Frankfurt,50.11,8.68,380",
  "Virginia,39.04,-77.49,520",
  "Sao Paulo,-23.55,-46.63,210",
  "Sydney,-33.87,151.21,180",
];
const newsCsv = () => [
  "time,source,title",
  "2026-10-06T08:10:00Z,grafana,Unified alerting grouping is GA",
  "2026-10-05T16:40:00Z,kubernetes,1.32 changelog: in-place resize GA",
  "2026-10-04T11:05:00Z,prometheus,Native histograms default in 3.x",
  "2026-10-03T09:22:00Z,grafana,Canvas connections: packet-style edges",
  "2026-10-02T18:00:00Z,cilium,Kube-proxy-free datapath notes",
  "2026-10-01T07:15:00Z,localai,Backend gallery: ds4 + Metal matrix",
];
const textCsv = () => [
  "line",
  "# shop · on-call runbook",
  "",
  "## payments-svc CrashLoop",
  "1. kubectl logs -p payments-svc",
  "2. check postgres connections",
  "3. page @sre if 3+ restarts",
  "",
  "dash: /d/tuiflow-library  theme=matrix",
];
const annoCsv = () => [
  "time,title,tags",
  "2026-10-06T01:12:00Z,deploy shop v2.4.1,deploy",
  "2026-10-06T02:40:00Z,payments-svc CrashLoop spike,incident",
  "2026-10-06T03:05:00Z,scaled orders-svc 3 → 6,autoscale",
  "2026-10-06T04:18:00Z,postgres failover complete,db",
];

const pre = (helper) => '<pre class="tf">' + helper + "</pre>";
const usage = "Replace the sample queries with your own; Grafana field config (unit, decimals, min/max, thresholds, display names) is honoured. Numbers are cell widths/heights.";

/** @type {Array<{uid, name, stock, description, content, targets, fieldConfig, stockOptions, h, afterRender?}>} */
const CATALOG = [
  { uid: "tuiflow-timeseries", name: "TUI Time series", stock: "timeseries", h: 10, content: pre("{{{tfTimeseries 90 14}}}"), targets: svcTargets, fieldConfig: rateField("palette-classic"), stockOptions: { legend: { displayMode: "list", placement: "bottom" }, tooltip: { mode: "multi" } }, description: "Braille line chart of every numeric series, y axis in the field unit, legend with last values." },
  { uid: "tuiflow-trend", name: "TUI Trend", stock: "trend", h: 9, content: pre("{{{tfTrend 80 12}}}"), targets: [csv("A", trendCsv())], fieldConfig: plain, stockOptions: { xField: "rpm", legend: { displayMode: "list", placement: "bottom" } }, description: "Line over a numeric x axis (first numeric field = x)." },
  { uid: "tuiflow-barchart", name: "TUI Bar chart", stock: "barchart", h: 8, content: pre("{{{tfBarChart 36}}}"), targets: [csv("A", SERVICES_CSV)], fieldConfig: plain, stockOptions: { orientation: "horizontal", legend: { displayMode: "list", placement: "bottom" } }, description: "Horizontal grouped bars from a categorical frame (first string field = labels)." },
  { uid: "tuiflow-columns", name: "TUI Columns (vertical bars)", stock: "barchart", h: 8, content: pre("{{{tfColumns 9 6}}}"), targets: [csv("A", SERVICES_CSV)], fieldConfig: plain, stockOptions: { orientation: "vertical", legend: { displayMode: "list", placement: "bottom" } }, description: "Vertical block columns, first numeric field per category." },
  { uid: "tuiflow-stat", name: "TUI Stat", stock: "stat", h: 6, content: pre("{{{tfStat 40}}}"), targets: svcTargets, fieldConfig: rateField("thresholds"), stockOptions: Object.assign({ graphMode: "area", colorMode: "value", textMode: "value_and_name" }, reduceLast), description: "Name · sparkline · last value per series, coloured by thresholds." },
  { uid: "tuiflow-gauge", name: "TUI Gauge", stock: "gauge", h: 7, content: pre("{{{tfGauge 30}}}"), targets: svcTargets, fieldConfig: rateField("thresholds"), stockOptions: Object.assign({ showThresholdMarkers: true }, reduceLast), description: "[████░░░░] percent meter per series on the field's min/max." },
  { uid: "tuiflow-bargauge", name: "TUI Bar gauge", stock: "bargauge", h: 6, content: pre("{{{tfBarGauge 44}}}"), targets: svcTargets, fieldConfig: rateField("thresholds"), stockOptions: Object.assign({ displayMode: "gradient", orientation: "horizontal" }, reduceLast), description: "Block bar per series on the field's min/max, threshold colour." },
  { uid: "tuiflow-table", name: "TUI Table", stock: "table", h: 8, content: pre("{{{tfTable 40}}}"), targets: [csv("A", PODS_CSV)], fieldConfig: plain, stockOptions: {}, description: "First frame as a monospace table; numeric cells use the field display." },
  { uid: "tuiflow-piechart", name: "TUI Pie chart", stock: "piechart", h: 8, content: pre("{{{tfPie 6 0}}}"), targets: [csv("A", SERVICES_CSV)], fieldConfig: plain, stockOptions: { pieType: "pie", legend: { displayMode: "list", placement: "right", values: ["percent"] }, reduceOptions: { calcs: ["lastNotNull"], fields: "/^requests$/", values: true } }, description: "Braille disc coloured per slice + legend with percentages. Second argument > 0 makes a donut." },
  { uid: "tuiflow-state-timeline", name: "TUI State timeline", stock: "state-timeline", h: 6, content: pre("{{{tfStateTimeline 80}}}"), targets: svcTargets, fieldConfig: rateField("thresholds"), stockOptions: { showValue: "never", mergeValues: true, rowHeight: 0.8 }, description: "One row per series, █ runs coloured by threshold / value mapping (string states get palette colours)." },
  { uid: "tuiflow-status-history", name: "TUI Status history", stock: "status-history", h: 6, content: pre("{{{tfStatusHistory 80}}}"), targets: svcTargets, fieldConfig: rateField("thresholds"), stockOptions: { showValue: "never", rowHeight: 0.8 }, description: "Discrete ▇ blocks per sample bucket, coloured by threshold." },
  { uid: "tuiflow-heatmap", name: "TUI Heatmap", stock: "heatmap", h: 9, content: pre("{{{tfHeatmap 80 12}}}"), targets: [walk("A", "latency", 120, 25, 15, 10, 400, { seriesCount: 12 })], fieldConfig: plain, stockOptions: { calculate: true, color: { mode: "scheme", scheme: "Oranges" }, yAxis: { unit: "ms" } }, description: "Value buckets × time buckets, density as ░▒▓█ with a 4-step colour ramp." },
  { uid: "tuiflow-histogram", name: "TUI Histogram", stock: "histogram", h: 8, content: pre("{{{tfHistogram 30 9}}}"), targets: svcTargets, fieldConfig: rateField("palette-classic"), stockOptions: { bucketCount: 30 }, description: "Distribution of all values as block columns." },
  // sample OHLC rows carry absolute timestamps (today, UTC); the panels widen their own time range so the stock panel sees them too
  { uid: "tuiflow-candlestick", name: "TUI Candlestick", stock: "candlestick", h: 9, content: pre("{{{tfCandlestick 40 12}}}"), targets: [csv("A", ohlcCsv())], fieldConfig: { defaults: { unit: "currencyUSD", decimals: 2 }, overrides: [] }, stockOptions: { mode: "candles", candleStyle: "candles", colorStrategy: "open-close", fields: {} }, panelExtra: { timeFrom: "24h" }, description: "Open/high/low/close fields (by name, else first four numeric fields); █ up, ░ down." },
  { uid: "tuiflow-xychart", name: "TUI XY chart", stock: "xychart", h: 9, content: pre("{{{tfXY 80 12}}}"), targets: [csv("A", xyCsv())], fieldConfig: plain, stockOptions: { mapping: "auto", series: [{}] }, description: "Scatter: first numeric field = x, the rest = y series." },
  { uid: "tuiflow-logs", name: "TUI Logs", stock: "logs", h: 9, content: pre("{{{tfLogs 30}}}"), targets: [{ refId: "A", datasource: TESTDATA, scenarioId: "logs", lines: 30, levelColumn: true }], fieldConfig: plain, stockOptions: { showTime: true, wrapLogMessage: false, sortOrder: "Descending", dedupStrategy: "none", enableLogDetails: true }, description: "time · [level] · line, newest first; level from a level field or detected in the text." },
  { uid: "tuiflow-nodegraph", name: "TUI Node graph", stock: "nodeGraph", h: 10, content: pre("{{{tfNodeGraph}}}"), targets: [{ refId: "A", datasource: TESTDATA, scenarioId: "node_graph" }], fieldConfig: plain, stockOptions: {}, description: "Layered boxes (longest path from roots) + edge list. Basic." },
  { uid: "tuiflow-traces", name: "TUI Traces", stock: "traces", h: 10, content: pre("{{{tfTraces 50 40}}}"), targets: [{ refId: "A", datasource: TESTDATA, scenarioId: "trace", spanCount: 14 }], fieldConfig: plain, stockOptions: {}, description: "Span waterfall: indent by depth, bar = start offset + duration, coloured by service." },
  { uid: "tuiflow-flamegraph", name: "TUI Flame graph", stock: "flamegraph", h: 10, content: pre("{{{tfFlame 48}}}"), targets: [csv("A", flameCsv())], fieldConfig: plain, stockOptions: {}, description: "Inclusive stacked bars from label/level/value(/self) fields; children indent under the parent. Hottest frame is scanned." },
  { uid: "tuiflow-canvas", name: "TUI Canvas", stock: "canvas", h: 11, content: pre("{{{tfCanvas 30}}}"), targets: [csv("A", SERVICES_CSV)], fieldConfig: plain, stockOptions: { inlineEditing: false, showAdvancedTypes: true, elements: [] }, description: "Freeform TUI layout: one dashed box per category (or series), .o@ packets on the links between them." },
  { uid: "tuiflow-geomap", name: "TUI Geomap", stock: "geomap", h: 11, content: pre("{{{tfGeomap 56 10}}}"), targets: [csv("A", geoCsv())], fieldConfig: plain, stockOptions: { view: { id: "coords", lat: 20, lon: 20, zoom: 1 }, controls: { showZoom: true, mouseWheelZoom: true, showAttribution: false }, layers: [{ type: "basemap", config: { basemap: { type: "default" } } }, { type: "markers", location: { mode: "coords", latitude: "lat", longitude: "lon" } }] }, description: "Equirectangular lat/lon grid; * markers from lat/lon fields, pulsing." },
  { uid: "tuiflow-alertlist", name: "TUI Alert list", stock: "alertlist", h: 8, content: pre("{{{tfAlertList 20}}}"), targets: [], fieldConfig: plain, stockOptions: { showInstances: true, maxItems: 20, sortOrder: 1, stateFilter: { firing: true, pending: true, noData: false, normal: false, error: true } }, description: "Active alerts from the Alertmanager API (fetched by the panel itself)." },
  { uid: "tuiflow-dashlist", name: "TUI Dashboard list", stock: "dashlist", h: 8, content: pre("{{{tfDashboardList 20}}}"), targets: [], fieldConfig: plain, stockOptions: { showSearch: true, showStarred: false, showRecentlyViewed: false, maxItems: 20, query: "", tags: [] }, description: "Dashboards from /api/search as links." },
  { uid: "tuiflow-annolist", name: "TUI Annotations list", stock: "annolist", h: 8, content: pre("{{{tfAnnotations 16}}}"), targets: [csv("A", annoCsv())], fieldConfig: plain, stockOptions: { limit: 16, navigateAfter: "10m", navigateBefore: "10m", navigateToPanel: true, onlyFromThisDashboard: false, onlyInTimeRange: false, showTags: true, showUser: true, tags: [] }, description: "time · title · #tags from a frame, or /api/annotations when the query is empty." },
  { uid: "tuiflow-text", name: "TUI Text", stock: "text", h: 9, content: pre("{{{tfText 52}}}"), targets: [csv("A", textCsv())], fieldConfig: plain, stockOptions: { mode: "markdown", content: "# shop · on-call runbook\n\n## payments-svc CrashLoop\n\n1. `kubectl logs -p payments-svc`\n2. check postgres connections\n3. page @sre if 3+ restarts\n" }, description: "Dashed CRT frame around string-field lines (or a default runbook) with a blinking block cursor." },
  { uid: "tuiflow-news", name: "TUI News", stock: "news", h: 8, content: pre("{{{tfNews 12}}}"), targets: [csv("A", newsCsv())], fieldConfig: plain, stockOptions: { feedUrl: "https://grafana.com/blog/news.xml", showImage: false }, description: "time · source · title, newest first. String fields title/source plus a time field." },
  { uid: "tuiflow-flow", name: "TUI Flow (api-gateway box)", stock: null, h: 11, content: null, targets: [walk("A", "rps", 300, 30, 10, 50, 600), walk("B", "p95_ms", 80, 15, 5, 10, 250), walk("C", "err_pct", 0.4, 0.3, 0.1, 0, 5)], fieldConfig: plain, stockOptions: {}, description: "Hand-made box with bars, sparklines and an animated packet edge; template expects fields rps, p95_ms, err_pct." },
];

module.exports = { CATALOG, TESTDATA, PODS_CSV, SERVICES_CSV, walk, csv, rateField, plain, usage };
