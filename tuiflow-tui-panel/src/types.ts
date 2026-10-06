export interface TuiflowOptions {
  view: string;
}

export interface TuiflowView {
  id: string;
  label: string;
  /** Handlebars helper name, or "flow" for the hand-made api-gateway box. */
  helper: string;
  /** How panel size maps onto the helper arguments. */
  dims: 'wh' | 'w' | 'hw' | 'rows' | 'pie' | 'bins' | 'none' | 'flow';
}

export const VIEWS: TuiflowView[] = [
  { id: 'timeseries', label: 'Time series', helper: 'tfTimeseries', dims: 'wh' },
  { id: 'trend', label: 'Trend', helper: 'tfTrend', dims: 'wh' },
  { id: 'barchart', label: 'Bar chart', helper: 'tfBarChart', dims: 'w' },
  { id: 'columns', label: 'Columns', helper: 'tfColumns', dims: 'hw' },
  { id: 'stat', label: 'Stat', helper: 'tfStat', dims: 'w' },
  { id: 'gauge', label: 'Gauge', helper: 'tfGauge', dims: 'w' },
  { id: 'bargauge', label: 'Bar gauge', helper: 'tfBarGauge', dims: 'w' },
  { id: 'table', label: 'Table', helper: 'tfTable', dims: 'rows' },
  { id: 'pie', label: 'Pie chart', helper: 'tfPie', dims: 'pie' },
  { id: 'state', label: 'State timeline', helper: 'tfStateTimeline', dims: 'w' },
  { id: 'status', label: 'Status history', helper: 'tfStatusHistory', dims: 'w' },
  { id: 'heatmap', label: 'Heatmap', helper: 'tfHeatmap', dims: 'wh' },
  { id: 'histogram', label: 'Histogram', helper: 'tfHistogram', dims: 'bins' },
  { id: 'candlestick', label: 'Candlestick', helper: 'tfCandlestick', dims: 'wh' },
  { id: 'xy', label: 'XY chart', helper: 'tfXY', dims: 'wh' },
  { id: 'logs', label: 'Logs', helper: 'tfLogs', dims: 'rows' },
  { id: 'nodegraph', label: 'Node graph', helper: 'tfNodeGraph', dims: 'none' },
  { id: 'traces', label: 'Traces', helper: 'tfTraces', dims: 'wh' },
  { id: 'flame', label: 'Flame graph', helper: 'tfFlame', dims: 'w' },
  { id: 'canvas', label: 'Canvas', helper: 'tfCanvas', dims: 'w' },
  { id: 'geomap', label: 'Geomap', helper: 'tfGeomap', dims: 'wh' },
  { id: 'alerts', label: 'Alert list', helper: 'tfAlertList', dims: 'rows' },
  { id: 'dashboards', label: 'Dashboard list', helper: 'tfDashboardList', dims: 'rows' },
  { id: 'annotations', label: 'Annotations', helper: 'tfAnnotations', dims: 'rows' },
  { id: 'text', label: 'Text', helper: 'tfText', dims: 'w' },
  { id: 'news', label: 'News', helper: 'tfNews', dims: 'rows' },
  { id: 'flow', label: 'Flow', helper: 'flow', dims: 'flow' },
];
