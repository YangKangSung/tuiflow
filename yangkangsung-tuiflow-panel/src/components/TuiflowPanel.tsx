import React, { useEffect, useMemo, useRef } from 'react';
import { GrafanaTheme2, PanelProps } from '@grafana/data';
import { config, getBackendSrv } from '@grafana/runtime';
import { useTheme2 } from '@grafana/ui';
// Only SafeString / registerHelper are needed: the helpers are called
// directly, no template is compiled, so the runtime build is enough.
import Handlebars from 'handlebars/runtime';
import { TuiflowOptions } from 'types';
// Vendored UMD builds of the tuiflow modules (scripts/sync-vendor.js copies
// them from the monorepo's src/). They are imported as modules; nothing is
// evaluated at runtime and no global is created.
import tf from '../../vendor/tuiflow.js';
import helpers from '../../vendor/tuiflow-helpers.js';
import dom from '../../vendor/tuiflow-dom.js';
import cssSource from '../../vendor/tuiflow.css.txt';
import { renderTuiflow, startAfter } from '../renderTuiflow';

interface Props extends PanelProps<TuiflowOptions> {}

const cellWidth = 8;
const lineHeight = 16;

/** Map the tuiflow accent classes (--tf-*) onto the active Grafana theme. */
function themeVariables(theme: GrafanaTheme2): React.CSSProperties {
  const v = theme.visualization;
  const vars: Record<string, string> = {
    '--tf-edge': v.getColorByName('orange'),
    '--tf-ok': theme.colors.success.text,
    '--tf-warn': theme.colors.warning.text,
    '--tf-crit': theme.colors.error.text,
    '--tf-h1': theme.colors.text.disabled,
    '--tf-h4': v.getColorByName('yellow'),
    '--tf-s0': v.getColorByName('orange'),
    '--tf-s1': v.getColorByName('blue'),
    '--tf-s2': v.getColorByName('green'),
    '--tf-s3': v.getColorByName('purple'),
    '--tf-s4': v.getColorByName('red'),
    '--tf-s5': theme.colors.text.secondary,
  };
  return vars as React.CSSProperties;
}

export const TuiflowPanel: React.FC<Props> = ({ options, data, width, height }) => {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useTheme2();
  const cols = options.columns > 0 ? options.columns : Math.max(24, Math.floor((width - 20) / cellWidth));
  const rows = options.rows > 0 ? options.rows : Math.max(6, Math.floor((height - 16) / lineHeight));
  const style = useMemo(
    () => ({ width, height, overflow: 'auto' as const, ...themeVariables(theme) }),
    [width, height, theme]
  );

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
    // Alert / dashboard / annotation lists go through Grafana's backendSrv.
    return startAfter(dom, tf, root, {
      request: (path: string) => getBackendSrv().get(path),
      linkBase: config.appSubUrl,
    });
  }, [cols, data.series, options.kind, rows]);

  return <div ref={ref} data-testid="tuiflow-panel" style={style} />;
};
