// Business Text panel → "JavaScript code before content rendering"
//
// Business Text adapter only. The drawing code lives in src/ (tuiflow.js,
// tuiflow-helpers.js, tuiflow-dom.js) and is served from Grafana's static
// folder (mounted there by grafana/docker-compose.yml). This file just loads
// those modules and registers the tf* Handlebars helpers on the panel.
//
// The panel wraps this code in a plain `new Function('context', code)`, so
// top-level `await` is not available; returning a Promise is fine because the
// panel awaits the return value before compiling the template.

// __TF_VERSION__ is replaced by the build scripts with package.json's version so
// browsers refetch the modules after an upgrade instead of using a cached copy.
return Promise.all([
  import("/public/tuiflow.js?v=__TF_VERSION__"),
  import("/public/tuiflow-helpers.js?v=__TF_VERSION__"),
  import("/public/tuiflow-dom.js?v=__TF_VERSION__"),
]).then(() => {
  window.tuiflowHelpers.register(context.handlebars, window.tuiflow, context);
});
