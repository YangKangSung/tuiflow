// The tuiflow modules are UMD JavaScript in ../src (webpack aliases); these
// declarations describe what the plugin uses from them.
declare module 'tuiflow-core' {
  const tf: Record<string, unknown>;
  export default tf;
}

declare module 'tuiflow-helpers' {
  const helpers: {
    register: (hb: unknown, tf: unknown, context: { panelData?: { series?: unknown[] } }) => void;
  };
  export default helpers;
}

declare module 'tuiflow-dom' {
  const dom: {
    animate: (root: HTMLElement, data: unknown[], tf: unknown) => () => void;
  };
  export default dom;
}

declare module '*.hbs' {
  const source: string;
  export default source;
}
