import { PanelPlugin } from '@grafana/data';
import { TuiflowOptions } from './types';
import { TuiflowPanel } from './components/TuiflowPanel';
import { KINDS } from './renderTuiflow';

export const plugin = new PanelPlugin<TuiflowOptions>(TuiflowPanel).setPanelOptions((builder) => {
  return builder
    .addSelect({
      path: 'kind',
      name: 'Visualization',
      description: 'Which TUI drawing to use for the queries on this panel.',
      defaultValue: 'timeseries',
      settings: {
        options: KINDS.map((kind) => ({ value: kind.value, label: kind.label })),
      },
    })
    .addNumberInput({
      path: 'columns',
      name: 'Columns',
      description: 'Character columns. 0 fits the panel width.',
      defaultValue: 0,
    })
    .addNumberInput({
      path: 'rows',
      name: 'Rows',
      description: 'Character rows. 0 fits the panel height.',
      defaultValue: 0,
    });
});
