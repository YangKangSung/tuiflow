import { PanelPlugin } from '@grafana/data';
import { TuiflowOptions, VIEWS } from './types';
import { TuiflowPanel } from './components/TuiflowPanel';

type RegistryHost = {
  panel?: unknown;
  meta?: { id?: string };
  useFieldConfig: (config?: object) => unknown;
  _fieldConfigRegistry?: { list: () => unknown[] };
};

const registryDesc = Object.getOwnPropertyDescriptor(PanelPlugin.prototype, 'fieldConfigRegistry');
if (registryDesc?.get) {
  Object.defineProperty(PanelPlugin.prototype, 'fieldConfigRegistry', {
    configurable: true,
    enumerable: registryDesc.enumerable,
    get(this: RegistryHost) {
      const ours = this.panel === TuiflowPanel || this.meta?.id === 'tuiflow-tui-panel';
      if (ours && (!this._fieldConfigRegistry || this._fieldConfigRegistry.list().length === 0)) {
        this.useFieldConfig();
        this._fieldConfigRegistry = undefined;
      }
      return registryDesc.get!.call(this);
    },
  });
}

export const plugin = new PanelPlugin<TuiflowOptions>(TuiflowPanel).useFieldConfig().setPanelOptions((builder) => {
  return builder.addSelect({
    path: 'view',
    name: 'View',
    description: 'Which terminal drawing to use. The query and field config stay as they are.',
    defaultValue: 'timeseries',
    settings: {
      options: VIEWS.map((view) => ({ value: view.id, label: view.label })),
    },
  });
});
