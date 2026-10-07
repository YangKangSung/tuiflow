import React, { useEffect, useRef } from 'react';
import { PanelProps } from '@grafana/data';
import Handlebars from 'handlebars';
import { TuiflowOptions } from 'types';
// Vendored UMD build. The sibling tuiflow.d.ts describes the default export.
import tf from '../../vendor/tuiflow.js';
import beforeSource from '../../vendor/before.js.txt';
import afterSource from '../../vendor/after.js.txt';
import cssSource from '../../vendor/styles.css.txt';
import { renderTuiflow, startAfter } from '../renderTuiflow';

interface Props extends PanelProps<TuiflowOptions> {}

const cellWidth = 8;
const lineHeight = 16;

function measureCellAspect(root: HTMLElement): number {
  const probe = document.createElement('pre');
  probe.className = 'tf';
  probe.style.cssText = 'position:absolute;visibility:hidden;padding:0;margin:0;border:0';
  probe.textContent = '00\n00';
  root.appendChild(probe);
  const box = probe.getBoundingClientRect();
  root.removeChild(probe);
  const aspect = box.height / 2 / (box.width / 2);
  return aspect > 0 && Number.isFinite(aspect) ? aspect : 2;
}

export const TuiflowPanel: React.FC<Props> = ({ options, data, width, height }) => {
  const ref = useRef<HTMLDivElement>(null);
  const cols = options.columns > 0 ? options.columns : Math.max(24, Math.floor((width - 20) / cellWidth));
  const rows = options.rows > 0 ? options.rows : Math.max(6, Math.floor((height - 16) / lineHeight));

  useEffect(() => {
    const root = ref.current;
    if (!root) {
      return;
    }
    let stop = () => {};
    let alive = true;
    root.innerHTML = '<style>' + cssSource + '</style>';
    const aspect = measureCellAspect(root);
    renderTuiflow({
      tf,
      Handlebars,
      beforeSource,
      series: data.series,
      kind: options.kind,
      cols,
      rows,
      aspect,
    }).then((html) => {
      if (!alive || !ref.current) {
        return;
      }
      ref.current.innerHTML = '<style>' + cssSource + '</style>' + html;
      stop = startAfter(afterSource, ref.current);
    });
    return () => {
      alive = false;
      stop();
    };
  }, [cols, data.series, options.kind, rows]);

  return <div ref={ref} data-testid="tuiflow-panel" style={{ width, height, overflow: 'auto' }} />;
};
