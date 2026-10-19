export const KINDS: Array<{ value: string; label: string }>;

export interface TuiflowHelpers {
  register: (hb: unknown, tf: object, context: { panelData?: { series?: unknown[] } }) => void;
}

export interface TuiflowDom {
  animate: (root: HTMLElement, data: unknown[], tf: object) => () => void;
}

export function renderTuiflow(opts: {
  tf: object;
  helpers: TuiflowHelpers;
  Handlebars: { create: () => unknown };
  series: unknown[];
  kind: string;
  cols: number;
  rows: number;
}): string;

export function startAfter(dom: TuiflowDom, tf: object, element: HTMLElement): () => void;
