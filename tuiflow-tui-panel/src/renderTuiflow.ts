import Handlebars from 'handlebars';
import tf from 'tuiflow-core';
import beforeSource from '../../grafana/business-text/before.js';
import afterSource from '../../grafana/business-text/after.js';
import flowSource from '../../grafana/business-text/content.hbs';
import { TuiflowView } from './types';

const CELL_W = 7.8;
const CELL_H = 15.6;

export function cellSize(width: number, height: number): { cols: number; rows: number } {
  return {
    cols: Math.max(24, Math.floor((width - 16) / CELL_W)),
    rows: Math.max(6, Math.floor((height - 8) / CELL_H)),
  };
}

function helperCall(view: TuiflowView, cols: number, rows: number): string {
  const w = cols;
  const h = rows;
  switch (view.dims) {
    case 'wh':
      return `${view.helper} ${w} ${h}`;
    case 'w':
      return `${view.helper} ${Math.max(8, w - 18)}`;
    case 'hw':
      return `${view.helper} ${h} ${Math.max(3, Math.floor(w / 10))}`;
    case 'rows':
      return `${view.helper} ${Math.max(8, h)}`;
    case 'pie':
      return `${view.helper} ${Math.max(4, Math.min(12, Math.floor(h / 2)))} 0 ${CELL_H / CELL_W}`;
    case 'bins':
      return `${view.helper} ${Math.max(8, Math.floor(w / 2))} ${h}`;
    case 'none':
      return view.helper;
    default:
      return view.helper;
  }
}

/** The Business Text script is a `return import().then(() => { ... })` wrapper. */
function helperBody(source: string): string {
  const marker = '.then(() => {';
  const start = source.indexOf(marker);
  if (start < 0) {
    throw new Error('tuiflow before.js wrapper not found');
  }
  return source.slice(start + marker.length).replace(/\}\);\s*$/, '');
}

function valuesOf(field: { values?: { toArray?: () => unknown[] } | unknown[] }): unknown[] {
  const v = field.values;
  if (v && typeof (v as { toArray?: () => unknown[] }).toArray === 'function') {
    return (v as { toArray: () => unknown[] }).toArray();
  }
  return Array.isArray(v) ? v : [];
}

function framesToRows(series: Array<{ fields?: Array<{ name: string; values?: unknown; config?: { displayName?: string } }> }>) {
  return (series || []).map((frame) => {
    const fields = frame.fields || [];
    const n = fields.reduce((m, f) => Math.max(m, valuesOf(f).length), 0);
    const rows = [];
    for (let i = 0; i < n; i++) {
      const row: Record<string, unknown> = {};
      for (const f of fields) {
        const value = valuesOf(f)[i];
        row[f.name] = value;
        const display = f.config && f.config.displayName;
        if (display && display !== f.name) {
          row[display] = value;
        }
      }
      rows.push(row);
    }
    return rows;
  });
}

export function renderTuiflow(
  view: TuiflowView,
  panelData: { series?: unknown[] },
  width: number,
  height: number
): string {
  const hb = Handlebars.create();
  const body = helperBody(beforeSource);
  const fakeWindow = { tuiflow: tf };
  new Function('context', 'window', body)({ handlebars: hb, panelData }, fakeWindow);
  const { cols, rows } = cellSize(width, height);
  if (view.dims === 'flow') {
    return hb.compile(flowSource)({ data: framesToRows((panelData && panelData.series) || []) });
  }
  const call = helperCall(view, cols, rows);
  return hb.compile('<pre class="tf">{{{' + call + '}}}</pre>')({});
}

export function startAnimation(root: HTMLElement, series: unknown[]): () => void {
  const fakeWindow = { tuiflow: tf };
  const stop = new Function('context', 'window', afterSource).call({}, { element: root, data: series }, fakeWindow);
  return typeof stop === 'function' ? stop : () => undefined;
}
