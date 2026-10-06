import {
  applyFieldOverrides,
  createFieldConfigRegistry,
  FieldConfigSource,
  InterpolateFunction,
  PanelData,
} from '@grafana/data';
import { config } from '@grafana/runtime';

const fieldConfigRegistry = createFieldConfigRegistry({}, 'tuiflow');

const emptyConfig = { defaults: {}, overrides: [] } as FieldConfigSource;

export function applyTuiflowFieldConfig(
  data: PanelData,
  fieldConfig: FieldConfigSource | undefined,
  replaceVariables: InterpolateFunction,
  timeZone?: string
): PanelData {
  const source = fieldConfig && (fieldConfig.defaults || fieldConfig.overrides?.length) ? fieldConfig : emptyConfig;
  if (!data.series?.length) {
    return data;
  }
  try {
    const series = applyFieldOverrides({
      data: data.series,
      fieldConfig: source,
      fieldConfigRegistry,
      replaceVariables,
      theme: config.theme2,
      timeZone: timeZone || config.bootData?.user?.timezone,
    });
    return { ...data, series };
  } catch {
    return data;
  }
}
