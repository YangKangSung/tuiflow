declare module 'tuiflow-core' {
  const tf: Record<string, unknown>;
  export default tf;
}

declare module '*.hbs' {
  const source: string;
  export default source;
}

declare module '*business-text/before.js' {
  const source: string;
  export default source;
}

declare module '*business-text/after.js' {
  const source: string;
  export default source;
}
