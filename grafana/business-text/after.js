// Business Text panel → "JavaScript code after content ready"
//
// Business Text adapter only. before.js already loaded /public/tuiflow-dom.js;
// this hands the rendered element to it (packet animation, flame scan, async
// alert / dashboard / annotation lists) and returns its cleanup. The panel
// calls that cleanup before the next render, so timers never leak.

if (!window.tuiflow || !window.tuiflowDom || !context.element) {
  return;
}
return window.tuiflowDom.animate(context.element, context.data, window.tuiflow);
