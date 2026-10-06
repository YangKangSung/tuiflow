import type { Configuration } from 'webpack';
import grafanaConfig, { type Env } from './.config/webpack/webpack.config.ts';

const config = async (env: Env): Promise<Configuration> => {
  const base = await grafanaConfig(env);
  base.module?.rules?.unshift({
    test: /[\\/]vendor[\\/].+\.txt$/,
    type: 'asset/source',
  });
  return base;
};

export default config;
