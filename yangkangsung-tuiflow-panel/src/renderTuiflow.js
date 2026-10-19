// Runs the tuiflow helpers (vendor/tuiflow-helpers.js) against Grafana data
// frames and returns the HTML for one drawing kind.

const KINDS = [
  { value: 'timeseries', label: 'Time series' },
  { value: 'trend', label: 'Trend' },
  { value: 'barchart', label: 'Bar chart' },
  { value: 'columns', label: 'Columns' },
  { value: 'stat', label: 'Stat' },
  { value: 'gauge', label: 'Gauge' },
  { value: 'bargauge', label: 'Bar gauge' },
  { value: 'table', label: 'Table' },
  { value: 'pie', label: 'Pie chart' },
  { value: 'stateTimeline', label: 'State timeline' },
  { value: 'statusHistory', label: 'Status history' },
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'histogram', label: 'Histogram' },
  { value: 'candlestick', label: 'Candlestick' },
  { value: 'xy', label: 'XY chart' },
  { value: 'logs', label: 'Logs' },
  { value: 'nodegraph', label: 'Node graph' },
  { value: 'traces', label: 'Traces' },
  { value: 'flame', label: 'Flame graph' },
  { value: 'canvas', label: 'Canvas' },
  { value: 'geomap', label: 'Geomap' },
  { value: 'alertlist', label: 'Alert list' },
  { value: 'dashlist', label: 'Dashboard list' },
  { value: 'annotations', label: 'Annotations list' },
  { value: 'text', label: 'Text' },
  { value: 'news', label: 'News' },
];

function htmlOf(value) {
  if (value && typeof value.toHTML === 'function') {
    return value.toHTML();
  }
  return String(value ?? '');
}

function callKind(helpers, kind, cols, rows) {
  const h = helpers;
  switch (kind) {
    case 'timeseries':
      return h.tfTimeseries(cols, rows);
    case 'trend':
      return h.tfTrend(cols, rows);
    case 'barchart':
      return h.tfBarChart(cols);
    case 'columns':
      return h.tfColumns(rows, Math.max(3, Math.round(cols / 10)));
    case 'stat':
      return h.tfStat(Math.min(cols, 48));
    case 'gauge':
      return h.tfGauge(Math.min(cols, 32));
    case 'bargauge':
      return h.tfBarGauge(cols);
    case 'table':
      return h.tfTable(rows);
    case 'pie':
      return h.tfPie(Math.max(4, Math.min(12, Math.floor(rows / 2) || 6)), 0);
    case 'stateTimeline':
      return h.tfStateTimeline(cols);
    case 'statusHistory':
      return h.tfStatusHistory(cols);
    case 'heatmap':
      return h.tfHeatmap(cols, rows);
    case 'histogram':
      return h.tfHistogram(cols, rows);
    case 'candlestick':
      return h.tfCandlestick(cols, rows);
    case 'xy':
      return h.tfXY(cols, rows);
    case 'logs':
      return h.tfLogs(rows);
    case 'nodegraph':
      return h.tfNodeGraph();
    case 'traces':
      return h.tfTraces(cols, rows);
    case 'flame':
      return h.tfFlame(cols);
    case 'canvas':
      return h.tfCanvas(Math.min(cols, 36));
    case 'geomap':
      return h.tfGeomap(cols, rows);
    case 'alertlist':
      return h.tfAlertList(rows);
    case 'dashlist':
      return h.tfDashboardList(rows);
    case 'annotations':
      return h.tfAnnotations(rows);
    case 'text':
      return h.tfText(cols);
    case 'news':
      return h.tfNews(rows);
    default:
      return h.tfTimeseries(cols, rows);
  }
}

function renderTuiflow({ tf, helpers, Handlebars, series, kind, cols, rows }) {
  const hb = Handlebars.create();
  helpers.register(hb, tf, { panelData: { series: series || [] } });
  return '<pre class="tf">' + htmlOf(callKind(hb.helpers, kind, cols, rows)) + '</pre>';
}

function startAfter(dom, tf, element) {
  // Packet animation, flame scan, async alert / dashboard / annotation lists.
  const cleanup = dom.animate(element, [], tf);
  return typeof cleanup === 'function' ? cleanup : function noop() {};
}

module.exports = { KINDS, renderTuiflow, startAfter };
