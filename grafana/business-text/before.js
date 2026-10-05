// Business Text panel → "JavaScript code before content rendering"
//
// Loads the tuiflow core from Grafana's static folder (mounted there by
// grafana/docker-compose.yml) and registers Handlebars helpers that the
// Content template (content.hbs) uses.
//
// The panel wraps this code in a plain `new Function('context', code)`, so
// top-level `await` is not available; returning a Promise is fine because the
// panel awaits the return value before compiling the template.

return import("/public/tuiflow.js").then(() => {
  const tf = window.tuiflow;
  const hb = context.handlebars;

  // {{tfBar value max width}} → "█████▎░░░░"
  hb.registerHelper("tfBar", (value, max, width) => tf.bar(Number(value) / Number(max), Number(width)));

  // {{tfSpark rows "field" width}} → "▁▂▃▅▇" (long series are resampled to `width`)
  hb.registerHelper("tfSpark", (rows, field, width) =>
    tf.sparkline((rows || []).map((r) => Number(r[field])), { width: Number(width) || undefined })
  );

  // {{tfLast rows "field"}} → last value of a column
  hb.registerHelper("tfLast", (rows, field) => (rows && rows.length ? rows[rows.length - 1][field] : ""));

  // {{tfMax rows "field"}} / {{tfAvg rows "field"}}
  hb.registerHelper("tfMax", (rows, field) => Math.max(...(rows || []).map((r) => Number(r[field])).filter(Number.isFinite)));
  hb.registerHelper("tfAvg", (rows, field) => {
    const v = (rows || []).map((r) => Number(r[field])).filter(Number.isFinite);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
  });

  // {{tfFixed value decimals}} / {{tfPadL value width}} / {{tfPadR value width}}
  hb.registerHelper("tfFixed", (value, decimals) => Number(value).toFixed(Number(decimals) || 0));
  hb.registerHelper("tfPadL", (value, width) => tf.padLeft(value, Number(width)));
  hb.registerHelper("tfPadR", (value, width) => tf.padRight(value, Number(width)));

  // {{tfStatus value warn crit}} → "[ok]" | "[warn]" | "[crit]" with a colour class
  hb.registerHelper("tfStatus", (value, warn, crit) => {
    const v = Number(value);
    const cls = v >= Number(crit) ? "tf-crit" : v >= Number(warn) ? "tf-warn" : "tf-ok";
    const label = cls === "tf-crit" ? "[crit]" : cls === "tf-warn" ? "[warn]" : "[ok]  ";
    return new hb.SafeString('<span class="' + cls + '">' + label + "</span>");
  });

  // {{tfPhase status width}} → kubernetes pod phase, coloured, padded
  hb.registerHelper("tfPhase", (status, width) => {
    const s = String(status || "");
    const cls = /Running|Succeeded/.test(s) ? "tf-ok" : /Pending|ContainerCreating|Terminating/.test(s) ? "tf-warn" : "tf-crit";
    return new hb.SafeString('<span class="' + cls + '">' + tf.escapeHtml(tf.padRight(s, Number(width) || s.length)) + "</span>");
  });
});
