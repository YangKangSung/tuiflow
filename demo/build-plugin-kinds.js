// Builds demo/plugin-kinds.html: one card per Tuiflow panel visualization,
// drawn by the same runner the Grafana plugin uses.
const fs = require("fs");
const path = require("path");
const hb = require("handlebars");
const tf = require("../src/tuiflow.js");
const { KINDS, renderTuiflow } = require("../yangkangsung-tuiflow-panel/src/renderTuiflow.js");
const catalog = require("../grafana/catalog.js");

const root = path.join(__dirname, "..");
const before = fs.readFileSync(path.join(root, "grafana/business-text/before.js"), "utf8");

const t0 = Date.UTC(2026, 9, 6, 9, 0, 0);
const num = (text) => (v) => ({ text: typeof text === "function" ? text(v) : text });
const fixed = (digits, suffix) => (v) => ({
  text: Number(v).toFixed(digits) + (suffix || ""),
});
const int = (suffix) => (v) => ({ text: String(Math.round(Number(v))) + (suffix || "") });

function field(name, type, values, extra) {
  return Object.assign({ name, type, values, config: {} }, extra || {});
}

function seriesFrame(name, base, opts) {
  const n = (opts && opts.n) || 48;
  const times = Array.from({ length: n }, (_, i) => t0 + i * 60e3);
  const values = Array.from({ length: n }, (_, i) => {
    const wave = Math.sin(i / 6 + (opts && opts.phase ? opts.phase : 0)) * base * 0.28;
    const drift = ((i * 17) % 9) - 4;
    return Math.max(1, base + wave + drift);
  });
  return {
    name,
    length: n,
    fields: [
      field("Time", "time", times),
      field("Value", "number", values, {
        config: Object.assign({ displayNameFromDS: name, unit: "reqps", min: 0, max: 600 }, (opts && opts.config) || {}),
        display: (v) => ({
          text: Math.round(v) + " req/s",
          color: v > 450 ? "#e06c75" : v > 300 ? "#e8a06a" : "#86d28a",
        }),
      }),
    ],
  };
}

function csvFrame(name, lines) {
  const rows = lines.map((line) => line.split(","));
  const headers = rows[0];
  const body = rows.slice(1);
  const fields = headers.map((header, ci) => {
    const raw = body.map((row) => (row[ci] == null ? "" : row[ci]));
    const asTime = /^(time|date)$/i.test(header) && raw.every((v) => v === "" || !Number.isNaN(Date.parse(v)));
    const asNum = raw.every((v) => v !== "" && Number.isFinite(Number(v)));
    if (asTime) return field(header, "time", raw.map((v) => Date.parse(v)));
    if (asNum) {
      const values = raw.map(Number);
      const digits = values.some((v) => !Number.isInteger(v)) ? 1 : 0;
      return field(header, "number", values, { display: fixed(digits) });
    }
    return field(header, "string", raw);
  });
  return { name, length: body.length, fields };
}

function logsFrame() {
  const lines = [
    ["info", "gateway", "accepted checkout from 10.0.4.12"],
    ["info", "orders", "created order 88421"],
    ["debug", "orders", "cache miss on sku-441"],
    ["warn", "payments", "stripe latency 1.8s"],
    ["info", "postgres", "autovacuum finished on orders"],
    ["error", "payments", "connection refused to stripe"],
    ["warn", "worker-3", "memory pressure 85%"],
    ["info", "ingress", "cert renewed shop.example.com"],
  ];
  return {
    name: "logs",
    length: lines.length,
    fields: [
      field("time", "time", lines.map((_, i) => t0 + i * 45e3)),
      field("level", "string", lines.map((row) => row[0])),
      field("message", "string", lines.map((row) => row[1] + ": " + row[2])),
    ],
  };
}

function nodeFrames() {
  const nodes = {
    name: "nodes",
    length: 5,
    fields: [
      field("id", "string", ["ing", "gw", "ord", "pay", "db"]),
      field("title", "string", ["ingress", "api-gateway", "orders", "payments", "postgres"]),
      field("mainstat", "number", [812, 640, 431, 268, 120], { display: int(" req/s") }),
    ],
  };
  const edges = {
    name: "edges",
    length: 4,
    fields: [
      field("id", "string", ["e1", "e2", "e3", "e4"]),
      field("source", "string", ["ing", "gw", "gw", "ord"]),
      field("target", "string", ["gw", "ord", "pay", "db"]),
    ],
  };
  return [nodes, edges];
}

function traceFrame() {
  const spans = [
    ["1", "", "GET /checkout", "gateway", 0, 180],
    ["2", "1", "auth.Verify", "gateway", 8, 22],
    ["3", "1", "orders.Create", "orders", 34, 90],
    ["4", "3", "cache.Get", "orders", 40, 12],
    ["5", "3", "db.Insert", "postgres", 58, 48],
    ["6", "1", "payments.Authorize", "payments", 128, 40],
  ];
  return {
    name: "trace",
    length: spans.length,
    fields: [
      field("spanID", "string", spans.map((s) => s[0])),
      field("parentSpanID", "string", spans.map((s) => s[1])),
      field("operationName", "string", spans.map((s) => s[2])),
      field("serviceName", "string", spans.map((s) => s[3])),
      field("startTime", "number", spans.map((s) => s[4]), { display: int() }),
      field("duration", "number", spans.map((s) => s[5]), { display: int() }),
    ],
  };
}

function heatmapFrames() {
  return Array.from({ length: 8 }, (_, s) => {
    const base = 40 + s * 35;
    return seriesFrame("bucket-" + (s + 1), base, { phase: s, n: 36, config: { displayNameFromDS: "p" + (s + 1) } });
  });
}

const svc = [
  seriesFrame("api-gateway", 320),
  seriesFrame("orders-svc", 180, { phase: 1.2 }),
  seriesFrame("payments-svc", 90, { phase: 2.1 }),
];

const frames = {
  timeseries: svc,
  trend: [csvFrame("trend", catalog.CATALOG.find((c) => c.uid === "tuiflow-trend").targets[0].csvContent.split("\n"))],
  barchart: [csvFrame("services", catalog.SERVICES_CSV)],
  columns: [csvFrame("services", catalog.SERVICES_CSV)],
  stat: svc,
  gauge: svc,
  bargauge: svc,
  table: [csvFrame("pods", catalog.PODS_CSV)],
  pie: [csvFrame("services", catalog.SERVICES_CSV)],
  stateTimeline: svc,
  statusHistory: svc,
  heatmap: heatmapFrames(),
  histogram: svc,
  candlestick: [csvFrame("ohlc", catalog.CATALOG.find((c) => c.uid === "tuiflow-candlestick").targets[0].csvContent.split("\n"))],
  xy: [csvFrame("xy", catalog.CATALOG.find((c) => c.uid === "tuiflow-xychart").targets[0].csvContent.split("\n"))],
  logs: [logsFrame()],
  nodegraph: nodeFrames(),
  traces: [traceFrame()],
  flame: [csvFrame("flame", catalog.CATALOG.find((c) => c.uid === "tuiflow-flamegraph").targets[0].csvContent.split("\n"))],
  canvas: [csvFrame("services", catalog.SERVICES_CSV)],
  geomap: [csvFrame("geo", catalog.CATALOG.find((c) => c.uid === "tuiflow-geomap").targets[0].csvContent.split("\n"))],
  alertlist: [],
  dashlist: [],
  annotations: [csvFrame("anno", catalog.CATALOG.find((c) => c.uid === "tuiflow-annolist").targets[0].csvContent.split("\n"))],
  text: [csvFrame("text", catalog.CATALOG.find((c) => c.uid === "tuiflow-text").targets[0].csvContent.split("\n"))],
  news: [csvFrame("news", catalog.CATALOG.find((c) => c.uid === "tuiflow-news").targets[0].csvContent.split("\n"))],
};

// Character size passed into the same helper the panel calls.
const size = {
  timeseries: [72, 10],
  trend: [64, 10],
  barchart: [36, 8],
  columns: [48, 8],
  stat: [40, 6],
  gauge: [32, 6],
  bargauge: [44, 6],
  table: [20, 12],
  pie: [20, 14],
  stateTimeline: [64, 6],
  statusHistory: [64, 6],
  heatmap: [56, 10],
  histogram: [30, 8],
  candlestick: [40, 10],
  xy: [64, 10],
  logs: [20, 8],
  nodegraph: [40, 8],
  traces: [48, 12],
  flame: [48, 8],
  canvas: [32, 8],
  geomap: [56, 10],
  alertlist: [20, 6],
  dashlist: [20, 6],
  annotations: [16, 8],
  text: [52, 10],
  news: [12, 8],
};

const wide = new Set([
  "timeseries", "trend", "heatmap", "candlestick", "xy", "logs", "nodegraph",
  "traces", "geomap", "table", "canvas", "flame", "text",
]);

const blurb = {
  timeseries: "Braille line chart of every numeric series.",
  trend: "Line over a numeric x axis. The first number column is x.",
  barchart: "Horizontal bars. The first string column is the label.",
  columns: "Vertical columns from the first number column.",
  stat: "Name, sparkline, and last value.",
  gauge: "Meter against the field min and max.",
  bargauge: "Block bar and last value.",
  table: "First frame as a monospace table.",
  pie: "Braille disc and a percent legend.",
  stateTimeline: "One row of threshold-coloured runs per series.",
  statusHistory: "One block per sample.",
  heatmap: "Value buckets over time, shaded by density.",
  histogram: "Distribution of every value.",
  candlestick: "Open, high, low, close. Filled is up, hollow is down.",
  xy: "Scatter. First number column is x.",
  logs: "Newest line first, with a level tag.",
  nodegraph: "Boxes layered from roots, plus the edge list.",
  traces: "Span waterfall indented by parent.",
  flame: "Inclusive stack from label, level, and value.",
  canvas: "Dashed boxes with a packet on each link.",
  geomap: "Lat/lon markers on an equirectangular grid.",
  alertlist: "Sample firing alerts. In Grafana this list comes from Alertmanager.",
  dashlist: "Sample dashboard links. In Grafana this list comes from /api/search.",
  annotations: "Time, title, and tags.",
  text: "Dashed frame around string lines.",
  news: "Date, source, and title, newest first.",
};

function span(text, cls) {
  return '<span class="' + cls + '">' + tf.escapeHtml(text) + "</span>";
}

function sampleAlerts() {
  const rows = [
    ["firing", "PaymentsDown", "critical", "09:12", "stripe connection refused"],
    ["firing", "HighErrorRate", "warning", "09:18", "api-gateway errors above 2%"],
    ["pending", "NodeMemory", "warning", "09:21", "worker-3 memory 85%"],
  ];
  const w = Math.max(...rows.map((r) => r[1].length));
  return rows
    .map((r) => {
      const cls = r[0] !== "firing" ? "tf-dim" : r[2] === "critical" ? "tf-crit" : "tf-warn";
      return (
        span(tf.padRight("[" + r[0] + "]", 12), cls) +
        " " +
        tf.escapeHtml(tf.padRight(r[1], w)) +
        "  " +
        span(tf.padRight(r[2], 8), "tf-dim") +
        " " +
        span(r[3], "tf-dim") +
        "  " +
        tf.escapeHtml(r[4])
      );
    })
    .join("\n");
}

function sampleDashboards() {
  const rows = [
    ["Tuiflow demo", "General", "#kiosk"],
    ["Tuiflow library", "General", "#tui"],
    ["Shop overview", "shop", "#slo"],
  ];
  const w = Math.max(...rows.map((r) => r[0].length));
  return rows
    .map(
      (r) =>
        span("▸ ", "tf-edge") +
        tf.escapeHtml(tf.padRight(r[0], w)) +
        "  " +
        span(tf.padRight(r[1], 16), "tf-dim") +
        " " +
        span(r[2], "tf-s1")
    )
    .join("\n");
}

function fillAsync(html, kind) {
  if (kind === "alertlist") return html.replace(/<span class="tf-async" data-tf="alerts"[\s\S]*?<\/span>/, sampleAlerts());
  if (kind === "dashlist") return html.replace(/<span class="tf-async" data-tf="dashboards"[\s\S]*?<\/span>/, sampleDashboards());
  return html;
}

(async () => {
  const cards = [];
  for (const kind of KINDS) {
    const [cols, rows] = size[kind.value];
    if (!frames[kind.value]) throw new Error("missing frames for " + kind.value);
    let html = await renderTuiflow({
      tf,
      Handlebars: hb,
      beforeSource: before,
      series: frames[kind.value],
      kind: kind.value,
      cols,
      rows,
    });
    html = fillAsync(html, kind.value);
    const text = html.replace(/<[^>]+>/g, "");
    if (/no data|loading /.test(text)) throw new Error(kind.value + " rendered empty: " + text.slice(0, 120));
    cards.push({ kind, html, wide: wide.has(kind.value) });
  }

  const nav = KINDS.map((k) => '<a href="#k-' + k.value + '">' + tf.escapeHtml(k.label) + "</a>").join("");
  const body = cards
    .map((card) => {
      return (
        '<section class="panel' +
        (card.wide ? " wide" : "") +
        '" id="k-' +
        card.kind.value +
        '"><h2>' +
        tf.escapeHtml(card.kind.label) +
        '</h2><p>' +
        tf.escapeHtml(blurb[card.kind.value]) +
        "</p>" +
        card.html +
        "</section>"
      );
    })
    .join("\n");

  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>tuiflow · all panels</title>
<link rel="stylesheet" href="../grafana/business-text/styles.css" />
<style>
  @font-face { font-family: "JetBrains Mono"; src: url("fonts/JetBrainsMono-Regular.woff2") format("woff2"); font-weight: 400; font-display: block; }
  html, body { margin: 0; background: #111217; color: #c9ced6; }
  body { font-family: "JetBrains Mono", Consolas, monospace; }
  header { position: sticky; top: 0; z-index: 2; background: #111217; border-bottom: 1px solid #2c3235; padding: 10px 16px 8px; }
  header h1 { margin: 0 0 6px; font-size: 16px; font-weight: 500; }
  header p { margin: 0 0 8px; color: #8e8e8e; font-size: 12px; }
  header a { color: #8fb3ff; }
  nav { display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: 12px; }
  nav a { color: #9aa0a6; text-decoration: none; }
  nav a:hover { color: #c9ced6; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px 16px 32px; }
  .panel { background: #181b1f; border: 1px solid #2c3235; min-width: 0; overflow: auto; }
  .panel.wide { grid-column: 1 / -1; }
  .panel h2 { margin: 0; padding: 8px 12px 0; font-size: 14px; font-weight: 500; }
  .panel h2 button { font: inherit; color: #c9ced6; background: transparent; border: 1px solid #3a4150; margin-left: 8px; cursor: pointer; }
  .panel p { margin: 2px 12px 6px; color: #8e8e8e; font-size: 12px; }
  .tf { font-family: "JetBrains Mono", Consolas, monospace; color: #c9ced6; }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } .panel.wide { grid-column: auto; } }
</style>
</head>
<body>
<header>
  <h1>tuiflow panels</h1>
  <p>Every visualization in yangkangsung-tuiflow-panel, drawn from sample frames. The cluster scene is the <a href="index.html">standalone demo</a>.</p>
  <nav>${nav}</nav>
</header>
<div class="grid">
<section class="panel wide" id="k-live">
  <h2>Time series · live <button type="button" id="live-pause">pause</button></h2>
  <p>New samples enter on the right. The clock on the axis moves with them.</p>
  <pre id="live-ts" class="tf"></pre>
</section>
${body}
</div>
<script src="../src/tuiflow.js"></script>
<script>
  const tf = window.tuiflow;
  (function liveSeries() {
    const el = document.getElementById("live-ts");
    const names = ["api-gateway", "orders-svc", "payments-svc"];
    const bases = [320, 180, 90];
    const n = 64;
    let cursor = Date.now();
    const series = names.map((name, i) => ({
      name: name,
      values: Array.from({ length: n }, (_, k) => bases[i] + Math.sin(k / 6 + i) * bases[i] * 0.22),
      times: Array.from({ length: n }, (_, k) => cursor - (n - k) * 60000),
    }));
    let paused = false;
    document.getElementById("live-pause").addEventListener("click", function () {
      paused = !paused;
      this.textContent = paused ? "resume" : "pause";
    });
    function draw() {
      if (!paused) {
        cursor += 60000;
        series.forEach((s) => {
          const prev = s.values[s.values.length - 1];
          const next = Math.max(30, Math.min(580, prev + (Math.random() - 0.48) * 36));
          s.values.push(next);
          s.values.shift();
          s.times.push(cursor);
          s.times.shift();
        });
      }
      el.innerHTML = tf.segmentsToHTML(tf.lineChart(series, {
        width: 78,
        height: 10,
        min: 0,
        max: 600,
        format: function (v) { return Math.round(v) + " req/s"; },
        formatLast: function (v) { return Math.round(v) + " req/s"; },
      }));
    }
    draw();
    tf.animate(draw, 4);
  })();
  document.querySelectorAll(".tf-packet").forEach((edge, i) => {
    const n = Number(edge.dataset.width) || 16;
    tf.animate((tick) => { edge.textContent = tf.edge(n, tick + i * 4); }, 8);
  });
  const flames = document.querySelectorAll(".tf-flame");
  if (flames.length) {
    tf.animate((tick) => {
      const on = tick % flames.length;
      flames.forEach((el, i) => el.classList.toggle("tf-scan", i === on));
    }, 4);
  }
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(__dirname, "plugin-kinds.html"), page);
  console.log("wrote demo/plugin-kinds.html", cards.length, "panels", page.length, "bytes");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
