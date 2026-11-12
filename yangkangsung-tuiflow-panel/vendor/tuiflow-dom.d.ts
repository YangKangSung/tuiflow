declare const tuiflowDom: {
  animate: (
    root: HTMLElement,
    data: unknown[],
    tf: object,
    opts?: { request?: (path: string) => Promise<unknown>; linkBase?: string }
  ) => () => void;
};
export default tuiflowDom;
