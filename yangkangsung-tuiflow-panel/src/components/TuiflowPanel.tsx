import React, { useEffect, useRef } from 'react';
import { PanelProps } from '@grafana/data';
import Handlebars from 'handlebars';
import { TuiflowOptions } from 'types';
// Vendored UMD builds of the tuiflow modules (scripts/sync-vendor.js copies
// them from the monorepo's src/). The sibling .d.ts files describe them.
import tf from '../../vendor/tuiflow.js';
import helpers from '../../vendor/tuiflow-helpers.js';
import dom from '../../vendor/tuiflow-dom.js';
import cssSource from '../../vendor/tuiflow.css.txt';
import { renderTuiflow, startAfter } from '../renderTuiflow';

interface Props extends PanelProps<TuiflowOptions> {}

const cellWidth = 8;
const lineHeight = 16;

export const TuiflowPanel: React.FC<Props> = ({ options, data, width, height }) => {
  const ref = useRef<HTMLDivElement>(null);
  const cols = options.columns > 0 ? options.columns : Math.max(24, Math.floor((width - 20) / cellWidth));
  const rows = options.rows > 0 ? options.rows : Math.max(6, Math.floor((height - 16) / lineHeight));

  useEffect(() => {
    const root = ref.current;
    if (!root) {
      return;
    }
    const html = renderTuiflow({
      tf,
      helpers,
      Handlebars,
      series: data.series,
      kind: options.kind,
      cols,
      rows,
    });
    root.innerHTML = '<style>' + cssSource + '</style>' + html;
    return startAfter(dom, tf, root);
  }, [cols, data.series, options.kind, rows]);

  return <div ref={ref} data-testid="tuiflow-panel" style={{ width, height, overflow: 'auto' }} />;
};
