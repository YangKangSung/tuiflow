/**
 * TUI migration of Grafana.com dashboard 15661
 * (K8S Dashboard, English, 2025-01-25 — https://grafana.com/grafana/dashboards/15661).
 *
 * Same three sections, titles, and visualization kinds (bar gauge, stat,
 * time series, table). Each panel is the matching tuiflow library helper
 * (before.js / styles.css), inlined so the page renders without
 * `publish:library`. Series are TestData stand-ins of the original legends:
 * this stack has no Prometheus. Template variables label the view; they do
 * not re-query.
 *
 *   node grafana/k8s-15661.js
 */
const fs = require("fs");
const path = require("path");
const { TESTDATA, walk, csv } = require("./catalog");

const { read } = require("./business-text/sources");

const here = __dirname;

const GiB = 1024 ** 3;
const TiB = 1024 ** 4;

const REF = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const pctUnitSteps = {
  mode: "absolute",
  steps: [
    { color: "green", value: null },
    { color: "orange", value: 0.7 },
    { color: "red", value: 0.85 },
  ],
};
const percentSteps = {
  mode: "absolute",
  steps: [
    { color: "green", value: null },
    { color: "orange", value: 70 },
    { color: "red", value: 85 },
  ],
};

function cfg(unit, extra) {
  extra = extra || {};
  const defaults = { unit, decimals: extra.decimals != null ? extra.decimals : 1 };
  if (extra.min != null) defaults.min = extra.min;
  if (extra.max != null) defaults.max = extra.max;
  if (extra.thresholds) {
    defaults.thresholds = extra.thresholds;
    defaults.color = { mode: "thresholds" };
  }
  return { defaults, overrides: extra.overrides || [] };
}

function unitOverride(name, unit, thresholds) {
  const properties = [
    { id: "unit", value: unit },
    { id: "decimals", value: unit === "percent" || unit === "percentunit" ? 1 : 1 },
  ];
  if (thresholds) {
    properties.push({ id: "color", value: { mode: "thresholds" } });
    properties.push({ id: "thresholds", value: thresholds });
  }
  return { matcher: { id: "byName", options: name }, properties };
}

const percentCols = (...names) => names.map((n) => unitOverride(n, "percent", percentSteps));
const byteCols = (...names) => names.map((n) => unitOverride(n, "bytes"));

function series(specs) {
  return specs.map((s, i) => walk(REF[i], s[0], s[1], s[2], s[2] / 2, s[3], s[4]));
}

function table(headers, rows) {
  return [headers.join(",")].concat(rows.map((r) => r.join(",")));
}

function contentFor(kind, grid) {
  if (kind === "bargauge") return '<pre class="tf">{{{tfBarGauge ' + Math.max(8, grid.w * 3) + "}}}</pre>";
  if (kind === "timeseries") return '<pre class="tf">{{{tfTimeseries ' + Math.max(36, grid.w * 6) + " " + Math.max(6, grid.h - 1) + "}}}</pre>";
  if (kind === "stat") return '<pre class="tf">{{{tfStat 18}}}</pre>';
  return '<pre class="tf">{{{tfTable 40}}}</pre>';
}

function k8sDashboard() {
  const helpers = read("before.js");
  const afterRender = read("after.js");
  const styles = read("styles.css");
  const panels = [];
  let id = 1;
  let y = 0;

  function add(panel) {
    panel.id = id++;
    panels.push(panel);
    return panel;
  }

  function viz(kind, title, grid, targets, fieldConfig) {
    return add({
      type: "marcusolsson-dynamictext-panel",
      title,
      description: "tuiflow " + kind + " · migrated from grafana.com dashboard 15661. Sample series stand in for the Prometheus queries.",
      gridPos: grid,
      datasource: TESTDATA,
      targets,
      fieldConfig,
      options: {
        renderMode: "data",
        content: contentFor(kind, grid),
        defaultContent: "The query didn't return any results.",
        helpers,
        afterRender,
        styles,
        externalStyles: [],
        contentPartials: [],
        editors: ["helpers", "afterRender", "styles"],
        editor: { format: "auto", language: "html" },
        wrap: true,
        status: "",
      },
    });
  }

  function band(height, items) {
    items.forEach((item) => viz(item.kind, item.title, { x: item.x, y, w: item.w, h: item.h || height }, item.targets, item.fieldConfig));
    y += height;
  }

  add({
    type: "text",
    title: "",
    gridPos: { x: 0, y, w: 24, h: 3 },
    options: {
      mode: "markdown",
      content: [
        "**K8S Dashboard** — TUI migration of [grafana.com/dashboards/15661](https://grafana.com/grafana/dashboards/15661-k8s-dashboard-en-20250125/) (English, 2025-01-25). Node overview, pod overview, microservice overview. Bar gauge → `tfBarGauge`, stat → `tfStat`, time series → `tfTimeseries`, table → `tfTable`.",
        "",
        "Data is synthetic TestData shaped like the original series (memory / CPU / network / PVC). This Grafana has no cluster, so the dropdowns label the view and do not re-query. Open with [`?theme=matrix`](/d/tuiflow-k8s/?theme=matrix).",
      ].join("\n"),
    },
  });
  y += 3;

  add({
    type: "row",
    title: "Node Resource Overview：Selected Nodes:【$Node】",
    collapsed: false,
    gridPos: { h: 1, w: 24, x: 0, y },
    panels: [],
  });
  y += 1;

  const yGauges = y;
  // Business Text does not copy field min/max onto the frame, so a pinned
  // 100% series is the scale. Its color override keeps the marker neutral.
  const ratio = cfg("percentunit", {
    min: 0,
    max: 1,
    decimals: 1,
    thresholds: pctUnitSteps,
    overrides: [
      {
        matcher: { id: "byName", options: "100%" },
        properties: [{ id: "color", value: { mode: "fixed", fixedColor: "text" } }],
      },
    ],
  });
  const ratioSeries = (rows) => series(rows.concat([["100%", 1, 0, 1, 1]]));
  viz("bargauge", "Node Memory Ratio", { x: 0, y: yGauges, w: 4, h: 5 }, ratioSeries([["util", 0.62, 0.03, 0, 1], ["request", 0.48, 0.02, 0, 1], ["limit", 0.81, 0.02, 0, 1]]), ratio);
  viz("bargauge", "Node CPU Ratio", { x: 4, y: yGauges, w: 4, h: 5 }, ratioSeries([["util", 0.54, 0.04, 0, 1], ["request", 0.41, 0.02, 0, 1], ["limit", 0.73, 0.02, 0, 1]]), ratio);
  viz("bargauge", "Nodes with Pod", { x: 8, y: yGauges, w: 3, h: 5 }, series([["nodes", 3, 0, 0, 110], ["pods", 48, 1, 0, 110], ["cap", 110, 0, 0, 110]]), cfg("short", { min: 0, max: 110, decimals: 0 }));
  viz("bargauge", "Node Memory Information", { x: 0, y: yGauges + 5, w: 4, h: 5 }, series([["total", 80 * GiB, 0, 80 * GiB, 80 * GiB], ["used", 52 * GiB, 0.4 * GiB, 0, 80 * GiB], ["request", 40 * GiB, 0.2 * GiB, 0, 80 * GiB], ["limit", 70 * GiB, 0.2 * GiB, 0, 80 * GiB]]), cfg("bytes", { min: 0, max: 80 * GiB, decimals: 1 }));
  viz("bargauge", "Node CPU Number of cores", { x: 4, y: yGauges + 5, w: 4, h: 5 }, series([["total", 40, 0, 0, 40], ["used", 22.4, 0.4, 0, 40], ["request", 18, 0.2, 0, 40], ["limit", 32, 0.1, 0, 40]]), cfg("short", { min: 0, max: 40, decimals: 1 }));
  viz("bargauge", "Node Storage Information", { x: 8, y: yGauges + 5, w: 3, h: 5 }, series([["used", 1.1 * TiB, 0.02 * TiB, 0, 2.5 * TiB], ["free", 1.4 * TiB, 0.02 * TiB, 0, 2.5 * TiB], ["total", 2.5 * TiB, 0, 0, 2.5 * TiB]]), cfg("bytes", { min: 0, max: 2.5 * TiB, decimals: 1 }));
  viz(
    "table",
    "Namespace Resource Statistics",
    { x: 11, y: yGauges, w: 5, h: 10 },
    [csv("A", table(["namespace", "pods", "configmaps", "services", "workloads", "secrets"], [
      ["shop", 22, 14, 8, 6, 4],
      ["kube-system", 18, 40, 12, 11, 9],
      ["monitoring", 8, 6, 3, 3, 2],
      ["ingress-nginx", 2, 2, 1, 1, 1],
    ]))],
    cfg("short", { decimals: 0 })
  );
  viz(
    "timeseries",
    "$NameSpace：Network Overview（Associable nodes and namespaces）",
    { x: 16, y: yGauges, w: 8, h: 10 },
    series([["Receive", 92e6, 8e6, 0, 2e8], ["Send", 41e6, 5e6, 0, 2e8]]),
    cfg("Bps", { min: 0, decimals: 1 })
  );
  y = yGauges + 10;

  viz(
    "stat",
    "Cluster summary",
    { x: 0, y, w: 24, h: 5 },
    series([["Workload", 12, 0, 0, 40], ["Total Pod", 48, 1, 0, 200], ["Running", 46, 1, 0, 200], ["Total Nodes", 3, 0, 0, 20], ["Ready", 3, 0, 0, 20], ["NotReady", 0, 0, 0, 20]]),
    cfg("short", { decimals: 0 })
  );
  y += 5;

  band(8, [
    { x: 0, w: 8, kind: "timeseries", title: "Memory Usage【$Node】", targets: series([["Total Memory", 80 * GiB, 0.2 * GiB, 0, 96 * GiB], ["Usage", 52 * GiB, 1.5 * GiB, 0, 96 * GiB], ["Requests", 40 * GiB, 0.4 * GiB, 0, 96 * GiB], ["Limit", 70 * GiB, 0.3 * GiB, 0, 96 * GiB]]), fieldConfig: cfg("bytes", { min: 0, decimals: 1 }) },
    { x: 8, w: 8, kind: "timeseries", title: "CPU Used Cores【$Node】", targets: series([["Total Cores", 40, 0, 0, 48], ["Usage", 22.4, 1.2, 0, 48], ["Requests", 18, 0.4, 0, 48], ["Limit", 32, 0.2, 0, 48]]), fieldConfig: cfg("short", { min: 0, decimals: 2 }) },
    { x: 16, w: 8, kind: "timeseries", title: "Pod Number and nodes【$Node】", targets: series([["Number of nodes", 3, 0, 0, 120], ["Pod Number", 48, 2, 0, 120], ["Upper Limit Pod", 110, 0, 0, 120]]), fieldConfig: cfg("short", { min: 0, decimals: 0 }) },
  ]);

  band(8, [
    { x: 0, w: 8, kind: "timeseries", title: "$Node：Nodes CPU Breakdown", targets: series([["node-a", 39, 4, 0, 100], ["node-b", 57, 5, 0, 100], ["node-c", 91, 3, 0, 100]]), fieldConfig: cfg("percent", { min: 0, max: 100, decimals: 1, thresholds: percentSteps }) },
    { x: 8, w: 8, kind: "timeseries", title: "$Node：Node Memory Breakdown", targets: series([["node-a", 62, 3, 0, 100], ["node-b", 71, 3, 0, 100], ["node-c", 88, 2, 0, 100]]), fieldConfig: cfg("percent", { min: 0, max: 100, decimals: 1, thresholds: percentSteps }) },
    { x: 16, w: 8, kind: "timeseries", title: "$Node：Node Network Overview", targets: series([["Inflow:node-a", 48e6, 6e6, 0, 2e8], ["Outflows:node-a", 22e6, 3e6, 0, 2e8], ["Inflow:node-b", 61e6, 7e6, 0, 2e8], ["Outflows:node-b", 30e6, 4e6, 0, 2e8], ["Inflow:node-c", 18e6, 2e6, 0, 2e8], ["Outflows:node-c", 9e6, 1e6, 0, 2e8]]), fieldConfig: cfg("Bps", { min: 0, decimals: 1 }) },
  ]);

  viz(
    "table",
    "$Node：Node Information Detail",
    { x: 0, y, w: 24, h: 8 },
    [csv("A", table(
      ["node", "status", "pods", "cores", "cpu", "cpu%", "mem", "mem_used", "mem%", "disk", "disk_used", "disk%"],
      [
        ["node-a", "Ready", 18, 16, 6.2, 38.8, 32 * GiB, 20 * GiB, 62.5, TiB, 0.42 * TiB, 42],
        ["node-b", "Ready", 16, 16, 9.1, 56.9, 32 * GiB, 23 * GiB, 71.2, TiB, 0.55 * TiB, 55],
        ["node-c", "Ready", 14, 8, 7.3, 91.3, 16 * GiB, 14 * GiB, 87.5, 0.5 * TiB, 0.41 * TiB, 82],
      ]
    ))],
    cfg("short", { decimals: 1, overrides: percentCols("cpu%", "mem%", "disk%").concat(byteCols("mem", "mem_used", "disk", "disk_used")) })
  );
  y += 8;

  band(8, [
    {
      x: 0, w: 6, kind: "table", title: "PVC Storage Usage",
      targets: [csv("A", table(["namespace", "pvc", "used", "total", "used%", "mounts"], [
        ["shop", "pg-data", 80 * GiB, 100 * GiB, 80, 1],
        ["shop", "redis", 10 * GiB, 20 * GiB, 50, 1],
        ["monitoring", "prom-data", 50 * GiB, 100 * GiB, 50, 1],
      ]))],
      fieldConfig: cfg("short", { decimals: 0, overrides: percentCols("used%").concat(byteCols("used", "total")) }),
    },
    { x: 6, w: 9, kind: "timeseries", title: "Namespaces CPU Usage kernel(>0.5)", targets: series([["shop", 2.4, 0.2, 0, 8], ["kube-system", 1.1, 0.1, 0, 8], ["monitoring", 0.8, 0.08, 0, 8], ["ingress-nginx", 0.55, 0.05, 0, 8]]), fieldConfig: cfg("short", { min: 0, decimals: 2 }) },
    { x: 15, w: 9, kind: "timeseries", title: "Namespaces WSS Memory Usage (>1G)", targets: series([["shop postgres-0", 6.2 * GiB, 0.2 * GiB, 0, 16 * GiB], ["shop payments-svc", 1.8 * GiB, 0.1 * GiB, 0, 16 * GiB], ["monitoring prometheus", 3.4 * GiB, 0.15 * GiB, 0, 16 * GiB]]), fieldConfig: cfg("bytes", { min: 0, decimals: 1 }) },
  ]);

  add({
    type: "row",
    title: "Pod Resource Overview：SelectedPod:【$Pod】",
    collapsed: false,
    gridPos: { h: 1, w: 24, x: 0, y },
    panels: [],
  });
  y += 1;

  viz(
    "table",
    "$Node：Pod Resource Detail(Associable Nodes)",
    { x: 0, y, w: 24, h: 9 },
    [csv("A", table(
      ["pod", "namespace", "status", "cpu%", "cpu_req", "cpu_lim", "wss", "wss%", "rss", "rss%", "restarts", "disk"],
      [
        ["api-gateway-7d9f8c-4hv2x", "shop", "Running", 22, 0.2, 1, 540 * 1024 ** 2, 26, 410 * 1024 ** 2, 20, 0, 120 * 1024 ** 2],
        ["api-gateway-7d9f8c-m8ql7", "shop", "Running", 19, 0.2, 1, 512 * 1024 ** 2, 25, 390 * 1024 ** 2, 19, 1, 80 * 1024 ** 2],
        ["orders-svc-5c6b7d-abc12", "shop", "Running", 31, 0.25, 1, 420 * 1024 ** 2, 41, 300 * 1024 ** 2, 29, 0, 40 * 1024 ** 2],
        ["payments-svc-69fd4-q2wer", "shop", "Running", 64, 0.5, 2, 980 * 1024 ** 2, 48, 760 * 1024 ** 2, 37, 3, 200 * 1024 ** 2],
        ["payments-svc-69fd4-t5yui", "shop", "CrashLoopBackOff", 4, 0.5, 2, 1010 * 1024 ** 2, 49, 820 * 1024 ** 2, 40, 7, 20 * 1024 ** 2],
        ["postgres-0", "shop", "Running", 38, 0.5, 2, 1800 * 1024 ** 2, 44, 1600 * 1024 ** 2, 39, 0, 80 * GiB],
      ]
    ))],
    cfg("short", { decimals: 0, overrides: percentCols("cpu%", "wss%", "rss%").concat(byteCols("wss", "rss", "disk")) })
  );
  y += 9;

  band(8, [
    { x: 0, w: 8, kind: "timeseries", title: "Pod Containers CPU Utilization (Maximum100%Associable Nodes)", targets: series([["api-gateway", 22, 3, 0, 100], ["orders-svc", 31, 4, 0, 100], ["payments-svc", 64, 6, 0, 100], ["postgres", 38, 3, 0, 100]]), fieldConfig: cfg("percent", { min: 0, max: 100, decimals: 1, thresholds: percentSteps }) },
    { x: 8, w: 8, kind: "timeseries", title: "Pod Container Memory Usage (Associatable Nodes)", targets: series([["WSS：payments-svc", 48, 3, 0, 100], ["RSS：payments-svc", 37, 2, 0, 100], ["Heap：payments-svc", 22, 2, 0, 100]]), fieldConfig: cfg("percent", { min: 0, max: 100, decimals: 1, thresholds: percentSteps }) },
    { x: 16, w: 8, kind: "timeseries", title: "Pod Network bandwidth per second (Associable Nodes)", targets: series([["Inflow:api-gateway", 28e6, 4e6, 0, 1e8], ["Outflow:api-gateway", 19e6, 3e6, 0, 1e8], ["Inflow:payments-svc", 8e6, 1e6, 0, 1e8], ["Outflow:payments-svc", 6e6, 1e6, 0, 1e8]]), fieldConfig: cfg("Bps", { min: 0, decimals: 1 }) },
  ]);

  band(8, [
    { x: 0, w: 8, kind: "timeseries", title: "Pod Containers CPU Core Usage", targets: series([["CPU Usage：api-gateway", 0.44, 0.05, 0, 4], ["Pod CPU Limitations：api-gateway", 1, 0, 0, 4], ["CPU Usage：payments-svc", 1.28, 0.08, 0, 4], ["Pod CPU Limitations：payments-svc", 2, 0, 0, 4]]), fieldConfig: cfg("short", { min: 0, decimals: 2 }) },
    { x: 8, w: 8, kind: "timeseries", title: "Pod Containers WSS Memory Usage (Associable Nodes)", targets: series([["WSS：payments-svc", 980 * 1024 ** 2, 40 * 1024 ** 2, 0, 4 * GiB], ["PodMemory Limits：payments-svc", 2 * GiB, 0, 0, 4 * GiB], ["WSS：postgres", 1.8 * GiB, 0.05 * GiB, 0, 4 * GiB]]), fieldConfig: cfg("bytes", { min: 0, decimals: 1 }) },
    { x: 16, w: 8, kind: "timeseries", title: "Pod Containers RSS Memory Usage (Associable Nodes)", targets: series([["RSS：api-gateway", 410 * 1024 ** 2, 20 * 1024 ** 2, 0, 4 * GiB], ["RSS：payments-svc", 760 * 1024 ** 2, 30 * 1024 ** 2, 0, 4 * GiB], ["RSS：postgres", 1.6 * GiB, 0.04 * GiB, 0, 4 * GiB]]), fieldConfig: cfg("bytes", { min: 0, decimals: 1 }) },
  ]);

  add({
    type: "row",
    title: "Microservices (Container Name) Resource Overview：Selected Microservices:【$Container】",
    collapsed: false,
    gridPos: { h: 1, w: 24, x: 0, y },
    panels: [],
  });
  y += 1;

  viz(
    "table",
    "Microservices (Container Name) Resource Statistics",
    { x: 0, y, w: 24, h: 8 },
    [csv("A", table(
      ["container", "namespace", "cpu%", "cores", "cpu_req", "cpu_lim", "wss", "wss%", "rss", "rss%", "pods", "disk"],
      [
        ["api-gateway", "shop", 21, 0.82, 0.4, 2, 1.05 * GiB, 26, 0.8 * GiB, 20, 2, 200 * 1024 ** 2],
        ["orders", "shop", 28, 1.1, 1, 4, 1.6 * GiB, 40, 1.2 * GiB, 30, 4, 160 * 1024 ** 2],
        ["payments", "shop", 44, 1.4, 1, 4, 1.9 * GiB, 48, 1.5 * GiB, 38, 2, 220 * 1024 ** 2],
        ["postgres", "shop", 38, 0.76, 0.5, 2, 1.8 * GiB, 44, 1.6 * GiB, 39, 1, 80 * GiB],
      ]
    ))],
    cfg("short", { decimals: 1, overrides: percentCols("cpu%", "wss%", "rss%").concat(byteCols("wss", "rss", "disk")) })
  );
  y += 8;

  band(8, [
    { x: 0, w: 8, kind: "timeseries", title: "Microservices (Container Name) Average CPU Usage (Maximum100%)", targets: series([["api-gateway", 21, 3, 0, 100], ["orders", 28, 3, 0, 100], ["payments", 44, 4, 0, 100], ["postgres", 38, 2, 0, 100]]), fieldConfig: cfg("percent", { min: 0, max: 100, decimals: 1, thresholds: percentSteps }) },
    { x: 8, w: 8, kind: "timeseries", title: "Microservice (Container Name) Average Memory Utilization", targets: series([["WSS：api-gateway", 26, 2, 0, 100], ["RSS：api-gateway", 20, 2, 0, 100], ["WSS：payments", 48, 3, 0, 100], ["RSS：payments", 38, 2, 0, 100]]), fieldConfig: cfg("percent", { min: 0, max: 100, decimals: 1, thresholds: percentSteps }) },
    { x: 16, w: 8, kind: "timeseries", title: "Microservice (Container Name) Network bandwidth per second (Associable Nodes)", targets: series([["Inflow:api-gateway", 28e6, 4e6, 0, 1e8], ["Outflow:api-gateway", 19e6, 3e6, 0, 1e8], ["Inflow:payments", 8e6, 1.5e6, 0, 1e8], ["Outflow:payments", 6e6, 1e6, 0, 1e8]]), fieldConfig: cfg("Bps", { min: 0, decimals: 1 }) },
  ]);

  band(8, [
    { x: 0, w: 8, kind: "timeseries", title: "Microservices (Container Name) Overall CPU Cores Used", targets: series([["CPU Limitations：api-gateway", 2, 0, 0, 8], ["CPU Core Usage：api-gateway", 0.82, 0.08, 0, 8], ["CPU Limitations：payments", 4, 0, 0, 8], ["CPU Core Usage：payments", 1.4, 0.1, 0, 8]]), fieldConfig: cfg("short", { min: 0, decimals: 2 }) },
    { x: 8, w: 8, kind: "timeseries", title: "Microservices (Container Name) Overall Memory Usage", targets: series([["WSS：payments", 1.9 * GiB, 0.08 * GiB, 0, 8 * GiB], ["Memory Limit：payments", 4 * GiB, 0, 0, 8 * GiB], ["RSS：payments", 1.5 * GiB, 0.05 * GiB, 0, 8 * GiB]]), fieldConfig: cfg("bytes", { min: 0, decimals: 1 }) },
    { x: 16, w: 8, kind: "timeseries", title: "Microservice (Container Name) Pod Number", targets: series([["shop：api-gateway", 2, 0, 0, 10], ["shop：orders", 4, 0, 0, 10], ["shop：payments", 2, 0, 0, 10], ["monitoring：prometheus", 1, 0, 0, 10]]), fieldConfig: cfg("short", { min: 0, decimals: 0 }) },
  ]);

  const custom = (name, values) => ({
    name,
    type: "custom",
    label: name,
    query: values.join(","),
    current: { selected: true, text: "All", value: "$__all" },
    options: [{ selected: true, text: "All", value: "$__all" }].concat(values.map((v) => ({ selected: false, text: v, value: v }))),
    includeAll: true,
    multi: true,
    hide: 0,
    skipUrlSync: false,
  });

  return {
    uid: "tuiflow-k8s",
    title: "tuiflow · K8S Dashboard",
    description: "TUI migration of Grafana.com dashboard 15661 (K8S Dashboard, 2025-01-25). Library helpers on TestData stand-ins of the original series.",
    tags: ["tuiflow", "k8s", "demo"],
    timezone: "browser",
    editable: true,
    graphTooltip: 0,
    schemaVersion: 39,
    version: 1,
    refresh: "10s",
    time: { from: "now-1h", to: "now" },
    templating: {
      list: [
        custom("Node", ["node-a", "node-b", "node-c"]),
        custom("NameSpace", ["shop", "kube-system", "monitoring", "ingress-nginx"]),
        custom("Container", ["api-gateway", "orders", "payments", "postgres"]),
        custom("Pod", ["api-gateway-7d9f8c-4hv2x", "orders-svc-5c6b7d-abc12", "payments-svc-69fd4-q2wer", "postgres-0"]),
      ],
    },
    annotations: { list: [] },
    links: [
      { title: "open with matrix theme", type: "link", url: "/d/tuiflow-k8s/?theme=matrix", icon: "external link" },
      { title: "kiosk + matrix", type: "link", url: "/d/tuiflow-k8s/?theme=matrix&kiosk", targetBlank: true, icon: "external link" },
      { title: "source dashboard 15661", type: "link", url: "https://grafana.com/grafana/dashboards/15661-k8s-dashboard-en-20250125/", targetBlank: true, icon: "external link" },
    ],
    panels,
  };
}

function main() {
  const outFile = path.join(here, "provisioning", "dashboards", "tuiflow-k8s.json");
  fs.writeFileSync(outFile, JSON.stringify(k8sDashboard(), null, 2) + "\n");
  console.log("wrote", path.relative(process.cwd(), outFile));
}

if (require.main === module) main();

module.exports = { k8sDashboard };
