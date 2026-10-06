export const KINDS: Array<{ value: string; label: string }>;

export function renderTuiflow(opts: {
  tf: object;
  Handlebars: { create: () => unknown };
  beforeSource: string;
  series: unknown[];
  kind: string;
  cols: number;
  rows: number;
}): Promise<string>;

export function startAfter(afterSource: string, element: HTMLElement): () => void;
