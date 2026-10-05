// Business Text panel → "JavaScript code before content rendering"
//
// Loads the tuiflow core from Grafana's static folder (mounted there by
// grafana/docker-compose.yml) and registers Handlebars helpers.
//
// Two families of helpers:
//   1. field helpers   — {{tfBar value max width}} etc. for hand-made templates
//   2. generic panels  — {{{tfTimeseries}}} {{{tfStat}}} {{{tfBarGauge}}}
//                        {{{tfGauge}}} {{{tfTable}}} render *whatever query is
//                        attached* from context.panelData.series, honouring
//                        Grafana field config (unit, decimals, min/max,
//                        thresholds, display name). Attach any query, done.
//
// The panel wraps this code in a plain `new Function('context', code)`, so
// top-level `await` is not available; returning a Promise is fine because the
// panel awaits the return value before compiling the template.

// __TF_VERSION__ is replaced by the build scripts with package.json's version so
// browsers refetch the module after an upgrade instead of using a cached copy.
return import("/public/tuiflow.js?v=__TF_VERSION__").then(() => {
  const tf = window.tuiflow;
  const hb = context.handlebars;
  const safe = (s) => new hb.SafeString(s);
  const num = (v, d) => (v === undefined || v === null || v === "" ? d : Number(v));

  // ------------------------------------------------------------------ field helpers

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
    return safe('<span class="' + cls + '">' + label + "</span>");
  });

  // {{tfPhase status width}} → kubernetes pod phase, coloured, padded
  hb.registerHelper("tfPhase", (status, width) => {
    const s = String(status || "");
    const cls = /Running|Succeeded/.test(s) ? "tf-ok" : /Pending|ContainerCreating|Terminating/.test(s) ? "tf-warn" : "tf-crit";
    return safe('<span class="' + cls + '">' + tf.escapeHtml(tf.padRight(s, Number(width) || s.length)) + "</span>");
  });

  // ------------------------------------------------------------------ generic panels

  // Grafana DataFrame access, tolerant of the old Vector API (values.toArray()).
  const frames = () => (context.panelData && context.panelData.series) || [];
  const valuesOf = (f) => (f.values && typeof f.values.toArray === "function" ? f.values.toArray() : f.values || []);
  const displayOf = (f, v) => {
    if (f.display) {
      const d = f.display(v);
      return { text: (d.prefix || "") + d.text + (d.suffix || ""), color: d.color || "" };
    }
    return { text: tf.formatNumber(Number(v)), color: "" };
  };
  const nameOf = (frame, f) => {
    const cfg = f.config || {};
    if (cfg.displayNameFromDS) return cfg.displayNameFromDS;
    if (cfg.displayName) return cfg.displayName;
    if (f.state && f.state.displayName) return f.state.displayName;
    const labels = f.labels ? Object.values(f.labels) : [];
    if (labels.length && (f.name === "Value" || frames().length > 1)) return labels.join(" ");
    return frame.name || f.name;
  };
  // Every numeric field across all frames becomes one series.
  const numericSeries = () => {
    const out = [];
    frames().forEach((frame) => {
      const timeField = frame.fields.find((f) => f.type === "time");
      frame.fields.forEach((f) => {
        if (f.type !== "number") return;
        const values = valuesOf(f).map(Number);
        out.push({
          name: nameOf(frame, f),
          field: f,
          values,
          times: timeField ? valuesOf(timeField) : null,
          last: [].concat(values).reverse().find(Number.isFinite),
        });
      });
    });
    return out;
  };
  const colorSpan = (text, color, cls) =>
    '<span' + (cls ? ' class="' + cls + '"' : "") + (color ? ' style="color:' + color + '"' : "") + ">" + tf.escapeHtml(text) + "</span>";
  const nameWidth = (series, cap) => Math.min(cap || 24, Math.max(4, ...series.map((s) => s.name.length)));
  const rangeOf = (series) => {
    const cfgMin = series.map((s) => (s.field.config || {}).min).find((v) => v !== undefined && v !== null);
    const cfgMax = series.map((s) => (s.field.config || {}).max).find((v) => v !== undefined && v !== null);
    const lasts = series.map((s) => s.last).filter(Number.isFinite);
    const min = cfgMin !== undefined ? Number(cfgMin) : Math.min(0, ...lasts);
    let max = cfgMax !== undefined ? Number(cfgMax) : Math.max(...lasts);
    if (!Number.isFinite(max) || max === min) max = min + 1;
    return { min, max };
  };
  const noData = () => safe('<span class="tf-dim">no data</span>');

  // {{{tfTimeseries width height}}} — braille line chart of every numeric series
  hb.registerHelper("tfTimeseries", (width, height) => {
    const series = numericSeries();
    if (!series.length) return noData();
    const f0 = series[0].field;
    const rows = tf.lineChart(series, {
      width: num(width, 72),
      height: num(height, 12),
      format: (v) => displayOf(f0, v).text,
      formatLast: (v) => displayOf(f0, v).text,
    });
    return safe(tf.segmentsToHTML(rows));
  });

  // {{{tfStat sparkWidth}}} — one line per series: name, sparkline, value in threshold colour
  hb.registerHelper("tfStat", (sparkWidth) => {
    const series = numericSeries();
    if (!series.length) return noData();
    const w = nameWidth(series);
    const sw = num(sparkWidth, 24);
    return safe(
      series
        .map((s, i) => {
          const d = displayOf(s.field, s.last);
          return (
            colorSpan("■ ", "", "tf-s" + (i % 6)) +
            tf.escapeHtml(tf.padRight(s.name, w)) +
            "  " +
            colorSpan(tf.sparkline(s.values, { width: sw }), "", "tf-s" + (i % 6)) +
            "  " +
            colorSpan(tf.padLeft(d.text, 10), d.color, "tf-value")
          );
        })
        .join("\n")
    );
  });

  // {{{tfBarGauge barWidth}}} — name, block bar on the field's min/max, value
  hb.registerHelper("tfBarGauge", (barWidth) => {
    const series = numericSeries();
    if (!series.length) return noData();
    const w = nameWidth(series);
    const bw = num(barWidth, 30);
    const r = rangeOf(series);
    return safe(
      series
        .map((s) => {
          const d = displayOf(s.field, s.last);
          const ratio = (s.last - r.min) / (r.max - r.min);
          return tf.escapeHtml(tf.padRight(s.name, w)) + "  " + colorSpan(tf.bar(ratio, bw), d.color) + "  " + colorSpan(d.text, d.color, "tf-value");
        })
        .join("\n")
    );
  });

  // {{{tfGauge meterWidth}}} — [████░░░░]  62%  value
  hb.registerHelper("tfGauge", (meterWidth) => {
    const series = numericSeries();
    if (!series.length) return noData();
    const w = nameWidth(series);
    const mw = num(meterWidth, 20);
    const r = rangeOf(series);
    return safe(
      series
        .map((s) => {
          const d = displayOf(s.field, s.last);
          const ratio = (s.last - r.min) / (r.max - r.min);
          return tf.escapeHtml(tf.padRight(s.name, w)) + "  " + colorSpan(tf.meter(ratio, mw), d.color) + "  " + colorSpan(d.text, d.color, "tf-value");
        })
        .join("\n")
    );
  });

  // {{{tfTable maxRows}}} — first frame as a monospace table, numbers via field display
  hb.registerHelper("tfTable", (maxRows) => {
    const frame = frames()[0];
    if (!frame || !frame.fields.length) return noData();
    const limit = num(maxRows, 50);
    const cols = frame.fields.map((f) => {
      const vals = valuesOf(f);
      const cells = vals.slice(0, limit).map((v) => {
        if (f.type === "number") return displayOf(f, v);
        if (f.type === "time") return { text: new Date(v).toLocaleTimeString(), color: "" };
        return { text: v === null || v === undefined ? "" : String(v), color: "" };
      });
      // column headers are field names (frame name would repeat on every column)
      const cfg = f.config || {};
      const header = cfg.displayName || cfg.displayNameFromDS || f.name;
      const width = Math.min(40, Math.max(header.length, ...cells.map((c) => c.text.length)));
      return { header, cells, width, right: f.type === "number" };
    });
    const rows = [];
    rows.push(cols.map((c) => colorSpan(tf.padRight(c.header, c.width), "", "tf-dim")).join("  "));
    rows.push(cols.map((c) => colorSpan("─".repeat(c.width), "", "tf-axis")).join("  "));
    const n = Math.min(limit, ...cols.map((c) => c.cells.length));
    for (let i = 0; i < n; i++) {
      rows.push(
        cols
          .map((c) => {
            const cell = c.cells[i];
            const text = c.right ? tf.padLeft(cell.text, c.width) : tf.padRight(cell.text, c.width);
            return colorSpan(text, cell.color);
          })
          .join("  ")
      );
    }
    return safe(rows.join("\n"));
  });
});
