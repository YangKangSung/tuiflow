import React, { useEffect, useMemo, useRef } from 'react';
import { PanelProps } from '@grafana/data';
import { css } from '@emotion/css';
import { TuiflowOptions, VIEWS } from '../types';
import { applyTuiflowFieldConfig } from '../applyFieldConfig';
import { renderTuiflow, startAnimation } from '../renderTuiflow';
import '../../../grafana/business-text/styles.css';

interface Props extends PanelProps<TuiflowOptions> {}

const wrap = css`
  overflow: auto;
  margin: 0;
`;

export const TuiflowPanel: React.FC<Props> = ({ options, data, width, height, fieldConfig, replaceVariables, timeZone }) => {
  const ref = useRef<HTMLDivElement>(null);
  const view = VIEWS.find((v) => v.id === options.view) || VIEWS[0];
  const framed = useMemo(
    () => applyTuiflowFieldConfig(data, fieldConfig, replaceVariables, timeZone),
    [data, fieldConfig, replaceVariables, timeZone]
  );
  const html = useMemo(() => {
    try {
      return renderTuiflow(view, framed, width, height);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return '<pre class="tf"><span class="tf-crit">' + message.replace(/[<>&]/g, '') + '</span></pre>';
    }
  }, [view, framed, width, height]);

  useEffect(() => {
    const root = ref.current;
    if (!root) {
      return;
    }
    return startAnimation(root, framed.series || []);
  }, [html, framed.series]);

  return <div ref={ref} className={wrap} style={{ width, height }} dangerouslySetInnerHTML={{ __html: html }} />;
};
