/**
 * TUI migration of Grafana.com dashboard 6417
 * (Kubernetes Cluster (Prometheus) — https://grafana.com/grafana/dashboards/6417).
 *
 * Same sections and titles. singlestat → tfStat, graph → tfTimeseries,
 * table → tfTable, using the tuiflow library helpers. Series are TestData
 * stand-ins (no Prometheus). Template variables label the view only.
 *
 * The source panel "Jobs Succeeded" (id 48) queries kube_job_status_active,
 * so this page titles it Jobs Active.
 *
 *   node grafana/k8s-6417.js
 */
const fs = require("fs");
const path = require("path");
const { TESTDATA, walk, csv } = require("./catalog");

const { read } = require("./business-text/sources");

const here = __dirname;

const GiB = 1024 ** 3;
const TiB = 1024 ** 4;
const REF = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const usageSteps = {
  mode: "absolute",
  steps: [
    { color: "green", value: null },
    { color: "orange", value: 0.8 },
    { color: "red", value: 0.9 },
  ],
};
const alertSteps = {
  mode: "absolute",
  steps: [
    { color: "green", value: null },
    { color: "red", value: 1 },
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

function series(specs) {
  return specs.map((s, i) => walk(REF[i], s[0], s[1], s[2], s[2] / 2, s[3], s[4]));
}

function one(alias, value, spread, min, max) {
  return series([[alias, value, spread, min, max]]);
}

function table(headers, rows) {
  return [headers.join(",")].concat(rows.map((r) => r.join(",")));
}

function contentFor(kind, grid) {
  if (kind === "timeseries") return '<pre class="tf">{{{tfTimeseries ' + Math.max(28, grid.w * 5) + " " + Math.max(6, grid.h - 1) + "}}}</pre>";
  if (kind === "stat") return '<pre class="tf">{{{tfStat ' + Math.max(8, grid.w * 2) + "}}}</pre>";
  return '<pre class="tf">{{{tfTable 20}}}</pre>';
}

const usage = cfg("percentunit", { min: 0, max: 1, decimals: 1, thresholds: usageSteps });
const count = cfg("short", { decimals: 0, min: 0 });
const alertCount = cfg("short", { decimals: 0, min: 0, thresholds: alertSteps });
const cores = cfg("short", { decimals: 1, min: 0 });
const bytes = cfg("bytes", { decimals: 1, min: 0 });
const decbytes = cfg("decbytes", { decimals: 1, min: 0 });

function k8sClusterDashboard() {
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

  function viz(kind, title, grid, targets, fieldConfig, description) {
    return add({
      type: "marcusolsson-dynamictext-panel",
      title,
      description: description || "tuiflow " + kind + " · migrated from grafana.com dashboard 6417. Sample series stand in for the Prometheus queries.",
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
    let x = 0;
    items.forEach((item) => {
      const w = item.w;
      const px = item.x != null ? item.x : x;
      viz(item.kind, item.title, { x: px, y, w, h: item.h || height }, item.targets, item.fieldConfig, item.description);
      x = px + w;
    });
    y += height;
  }

  function row(title) {
    add({ type: "row", title, collapsed: false, gridPos: { h: 1, w: 24, x: 0, y }, panels: [] });
    y += 1;
  }

  add({
    type: "text",
    title: "",
    gridPos: { x: 0, y, w: 24, h: 3 },
    options: {
      mode: "markdown",
      content: [
        "**Kubernetes Cluster (Prometheus)** — TUI migration of [grafana.com/dashboards/6417](https://grafana.com/grafana/dashboards/6417-kubernetes-cluster-prometheus/). Cluster health, deployments, nodes, pods, containers, jobs. singlestat → `tfStat`, graph → `tfTimeseries`, table → `tfTable`.",
        "",
        "Data is synthetic TestData shaped like kube-state-metrics (pod capacity, CPU, memory, disk). This Grafana has no cluster, so Node and Namespace label the view and do not re-query. Open with [`?theme=matrix`](/d/tuiflow-k8s-cluster/?theme=matrix).",
      ].join("\n"),
    },
  });
  y += 3;

  row("Cluster Health");
  band(5, [
    { w: 6, kind: "stat", title: "Cluster Pod Usage", targets: one("usage", 0.44, 0.03, 0, 1), fieldConfig: usage },
    { w: 6, kind: "stat", title: "Cluster CPU Usage", targets: one("usage", 0.45, 0.04, 0, 1), fieldConfig: usage },
    { w: 6, kind: "stat", title: "Cluster Memory Usage", targets: one("usage", 0.5, 0.03, 0, 1), fieldConfig: usage },
    { w: 6, kind: "stat", title: "Cluster Disk Usage", targets: one("usage", 0.44, 0.02, 0, 1), fieldConfig: usage },
  ]);
  band(8, [
    { w: 6, kind: "timeseries", title: "Cluster Pod Capacity", targets: series([["allocatable", 110, 0, 0, 160], ["capacity", 110, 0, 0, 160], ["requested", 48, 2, 0, 160]]), fieldConfig: count },
    { w: 6, kind: "timeseries", title: "Cluster CPU Capacity", targets: series([["allocatable", 38, 0, 0, 48], ["capacity", 40, 0, 0, 48], ["requested", 18, 0.6, 0, 48]]), fieldConfig: cores },
    { w: 6, kind: "timeseries", title: "Cluster Mem Capacity", targets: series([["allocatable", 80 * GiB, 0, 0, 96 * GiB], ["capacity", 80 * GiB, 0, 0, 96 * GiB], ["requested", 40 * GiB, 0.8 * GiB, 0, 96 * GiB]]), fieldConfig: bytes },
    { w: 6, kind: "timeseries", title: "Cluster Disk Capacity", targets: series([["usage", 1.1 * TiB, 0.04 * TiB, 0, 3 * TiB], ["limit", 2.5 * TiB, 0, 0, 3 * TiB]]), fieldConfig: bytes },
  ]);

  row("Deployments");
  band(8, [
    {
      w: 12,
      kind: "table",
      title: "Deployment Replicas - Up To Date",
      targets: [
        csv(
          "A",
          table(
            ["deployment", "namespace", "replicas", "updated", "unavailable"],
            [
              ["api-gateway", "shop", 2, 2, 0],
              ["orders", "shop", 4, 4, 0],
              ["payments", "shop", 2, 1, 1],
              ["coredns", "kube-system", 2, 2, 0],
              ["prometheus", "monitoring", 1, 1, 0],
            ]
          )
        ),
      ],
      fieldConfig: count,
    },
    { w: 4, kind: "stat", title: "Deployment Replicas", targets: one("replicas", 11, 0, 0, 40), fieldConfig: count },
    { w: 4, kind: "stat", title: "Deployment Replicas - Updated", targets: one("updated", 10, 0, 0, 40), fieldConfig: count },
    { w: 4, kind: "stat", title: "Deployment Replicas - Unavailable", targets: one("unavailable", 1, 0, 0, 40), fieldConfig: alertCount },
  ]);

  row("Node");
  band(5, [
    { w: 8, kind: "stat", title: "Number Of Nodes", targets: one("nodes", 3, 0, 0, 20), fieldConfig: count },
    { w: 8, kind: "stat", title: "Nodes Out of Disk", targets: one("outOfDisk", 0, 0, 0, 10), fieldConfig: alertCount },
    { w: 8, kind: "stat", title: "Nodes Unavailable", targets: one("unschedulable", 0, 0, 0, 10), fieldConfig: alertCount },
  ]);

  row("Pods");
  band(5, [
    { w: 12, kind: "stat", title: "Pods Running", targets: one("running", 46, 1, 0, 200), fieldConfig: count },
    { w: 12, kind: "stat", title: "Pods Pending", targets: one("pending", 1, 0, 0, 50), fieldConfig: alertCount },
  ]);
  band(5, [
    { w: 8, kind: "stat", title: "Pods Failed", targets: one("failed", 1, 0, 0, 50), fieldConfig: alertCount },
    { w: 8, kind: "stat", title: "Pods Succeeded", targets: one("succeeded", 4, 0, 0, 50), fieldConfig: count },
    { w: 8, kind: "stat", title: "Pods Unknown", targets: one("unknown", 0, 0, 0, 50), fieldConfig: alertCount },
  ]);

  row("Containers");
  band(5, [
    { w: 6, kind: "stat", title: "Containers Running", targets: one("running", 52, 1, 0, 200), fieldConfig: count },
    { w: 6, kind: "stat", title: "Containers Waiting", targets: one("waiting", 2, 0, 0, 50), fieldConfig: alertCount },
    { w: 6, kind: "stat", title: "Containers Terminated", targets: one("terminated", 1, 0, 0, 50), fieldConfig: alertCount },
    { w: 6, kind: "stat", title: "Containers Restarts (Last 30 Minutes)", targets: one("restarts", 3, 0, 0, 50), fieldConfig: alertCount },
  ]);
  band(5, [
    { w: 12, kind: "stat", title: "CPU Cores Requested by Containers", targets: one("cores", 18.4, 0.4, 0, 40), fieldConfig: cores },
    { w: 12, kind: "stat", title: "Memory Requested By Containers", targets: one("memory", 40 * GiB, 0.4 * GiB, 0, 96 * GiB), fieldConfig: decbytes },
  ]);

  row("Jobs");
  band(5, [
    { w: 8, kind: "stat", title: "Jobs Succeeded", targets: one("succeeded", 6, 0, 0, 30), fieldConfig: count },
    {
      w: 8,
      kind: "stat",
      title: "Jobs Active",
      description: "tuiflow stat · migrated from grafana.com dashboard 6417. Source panel id 48 is titled Jobs Succeeded; its query is kube_job_status_active.",
      targets: one("active", 1, 0, 0, 30),
      fieldConfig: count,
    },
    { w: 8, kind: "stat", title: "Jobs Failed", targets: one("failed", 1, 0, 0, 30), fieldConfig: alertCount },
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
    uid: "tuiflow-k8s-cluster",
    title: "tuiflow · Kubernetes Cluster (Prometheus)",
    description: "TUI migration of Grafana.com dashboard 6417 (Kubernetes Cluster, Prometheus). Library helpers on TestData stand-ins of kube-state-metrics.",
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
        custom("node", ["node-a", "node-b", "node-c"]),
        custom("namespace", ["shop", "kube-system", "monitoring", "ingress-nginx"]),
      ],
    },
    annotations: { list: [] },
    links: [
      { title: "open with matrix theme", type: "link", url: "/d/tuiflow-k8s-cluster/?theme=matrix", icon: "external link" },
      { title: "kiosk + matrix", type: "link", url: "/d/tuiflow-k8s-cluster/?theme=matrix&kiosk", targetBlank: true, icon: "external link" },
      { title: "source dashboard 6417", type: "link", url: "https://grafana.com/grafana/dashboards/6417-kubernetes-cluster-prometheus/", targetBlank: true, icon: "external link" },
      { title: "K8S dashboard 15661", type: "link", url: "/d/tuiflow-k8s/?theme=matrix", icon: "external link" },
    ],
    panels,
  };
}

function main() {
  const outFile = path.join(here, "provisioning", "dashboards", "tuiflow-k8s-cluster.json");
  fs.writeFileSync(outFile, JSON.stringify(k8sClusterDashboard(), null, 2) + "\n");
  console.log("wrote", path.relative(process.cwd(), outFile));
}

if (require.main === module) main();

module.exports = { k8sClusterDashboard };
