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
    // wide frames (several value columns) keep column names; a single-value
    // frame is named after the frame (Prometheus-style "one frame per series")
    const valueFields = frame.fields.filter((x) => x.type !== "time");
    if (valueFields.length > 1) return f.name;
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

  // ------------------------------------------------------------------ more core panels

  const sCls = (i) => "tf-s" + (i % 6);
  const firstFrame = () => frames()[0];
  const fieldsOfType = (frame, type) => (frame ? frame.fields.filter((f) => f.type === type) : []);
  const hashIndex = (s) => {
    let h = 0;
    for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h % 6;
  };
  const legend = (names) => names.map((n, i) => colorSpan("■ ", "", sCls(i)) + tf.escapeHtml(n)).join("   ");
  const yLabels = (f, min, max, height) => {
    const out = [];
    for (let y = 0; y < height; y++) out.push(displayOf(f, max - ((max - min) * y) / (height - 1)).text);
    const w = Math.max(...out.map((l) => l.length));
    return { labels: out.map((l) => tf.padLeft(l, w)), width: w };
  };
  const timeAxis = (times, chartWidth, indent) => {
    if (!times || times.length < 2) return "";
    const t0 = tf.formatTime(times[0]);
    const t2 = tf.formatTime(times[times.length - 1]);
    return "\n" + colorSpan(" ".repeat(indent) + tf.padRight(t0, Math.max(0, chartWidth - t2.length)) + t2, "", "tf-axis");
  };
  // Categorical frame: first string field = labels, numeric fields = values.
  const categorical = () => {
    const frame = firstFrame();
    if (!frame) return null;
    const cat = fieldsOfType(frame, "string")[0];
    const nums = fieldsOfType(frame, "number");
    if (!nums.length) return null;
    const labels = cat ? valuesOf(cat).map(String) : valuesOf(nums[0]).map((_, i) => String(i + 1));
    return { frame, labels, nums };
  };

  // {{{tfBarChart barWidth}}} — horizontal (grouped) bars from a categorical frame
  hb.registerHelper("tfBarChart", (barWidth) => {
    const c = categorical();
    if (!c) return noData();
    const w = Math.min(24, Math.max(4, ...c.labels.map((l) => l.length)));
    const bw = num(barWidth, 30);
    const max = Math.max(0, ...c.nums.flatMap((f) => valuesOf(f).map(Number)).filter(Number.isFinite)) || 1;
    const lines = [];
    c.labels.forEach((label, i) => {
      c.nums.forEach((f, k) => {
        const v = Number(valuesOf(f)[i]);
        const d = displayOf(f, v);
        lines.push(tf.escapeHtml(k === 0 ? tf.padRight(label, w) : " ".repeat(w)) + "  " + colorSpan(tf.bar(v / max, bw), "", sCls(k)) + " " + colorSpan(d.text, d.color, "tf-value"));
      });
    });
    if (c.nums.length > 1) lines.push("", legend(c.nums.map((f) => nameOf(c.frame, f))));
    return safe(lines.join("\n"));
  });

  // {{{tfColumns height barWidth}}} — vertical bars (first numeric field per category)
  hb.registerHelper("tfColumns", (height, barWidth) => {
    const c = categorical();
    if (!c) return noData();
    const h = num(height, 8);
    const bw = num(barWidth, 4);
    const f = c.nums[0];
    const values = valuesOf(f).map(Number);
    const rows = tf.columns(values, { height: h, barWidth: bw, gap: 1 });
    const top = displayOf(f, Math.max(0, ...values.filter(Number.isFinite))).text;
    const lw = top.length;
    const out = rows.map((r, y) => colorSpan(tf.padLeft(y === 0 ? top : y === h - 1 ? displayOf(f, 0).text : "", lw) + (y === h - 1 ? " ┼" : " ┤"), "", "tf-axis") + colorSpan(r, "", sCls(0)));
    out.push(colorSpan(" ".repeat(lw + 2) + c.labels.map((l) => tf.padRight(l.slice(0, bw), bw)).join(" "), "", "tf-dim"));
    return safe(out.join("\n"));
  });

  // {{{tfPie radius donut aspect}}} — braille disc; labels from a string field or one slice per series
  hb.registerHelper("tfPie", (radius, donut, aspect) => {
    const c = categorical();
    let labels, values, fields;
    if (c) {
      labels = c.labels;
      values = valuesOf(c.nums[0]).map(Number);
      fields = values.map(() => c.nums[0]);
    } else {
      const s = numericSeries();
      if (!s.length) return noData();
      labels = s.map((x) => x.name);
      values = s.map((x) => x.last);
      fields = s.map((x) => x.field);
    }
    const aspectN = typeof aspect === "number" && aspect > 0 ? aspect : 2;
    const pie = tf.braillePie(values, { radius: num(radius, 6), donut: num(donut, 0), aspect: aspectN });
    const disc = tf.ownedSegments(pie.rows, pie.owner, sCls).map((segs) => segs.map((s) => colorSpan(s[0], "", s[1])).join(""));
    const total = values.reduce((a, b) => a + (Number.isFinite(b) && b > 0 ? b : 0), 0) || 1;
    const lw = Math.min(24, Math.max(...labels.map((l) => String(l).length)));
    const items = labels.map((l, i) => colorSpan("■ ", "", sCls(i)) + tf.escapeHtml(tf.padRight(l, lw)) + "  " + tf.padLeft(Math.round((values[i] / total) * 100) + "%", 4) + "  " + colorSpan(displayOf(fields[i], values[i]).text, "", "tf-value"));
    const rows = [];
    const n = Math.max(disc.length, items.length);
    const start = Math.max(0, Math.floor((disc.length - items.length) / 2));
    for (let i = 0; i < n; i++) {
      const left = i < disc.length ? disc[i] : " ".repeat(pie.rows[0].length);
      const li = i - start;
      rows.push(left + "   " + (li >= 0 && li < items.length ? items[li] : ""));
    }
    return safe(rows.join("\n"));
  });

  // State timeline / status history share one renderer: one row per series,
  // each cell coloured by the field's display colour (thresholds, mappings);
  // string states get a stable palette colour per distinct value.
  const stateSeries = () => {
    const out = [];
    frames().forEach((frame) => {
      const timeField = frame.fields.find((f) => f.type === "time");
      frame.fields.forEach((f) => {
        if (f.type !== "number" && f.type !== "string") return;
        out.push({ name: nameOf(frame, f), field: f, values: valuesOf(f), times: timeField ? valuesOf(timeField) : null });
      });
    });
    return out;
  };
  const stateColor = (f, v) => {
    if (f.type === "string") return { color: "", cls: sCls(hashIndex(v)) };
    const d = displayOf(f, v);
    return { color: d.color, cls: d.color ? "" : sCls(0) };
  };
  const statesRow = (s, cells, glyph, gap) => {
    const n = s.values.length;
    let html = "";
    let run = "";
    let runKey = null;
    let runStyle = null;
    const flush = () => {
      if (!run) return;
      html += colorSpan(run, runStyle.color, runStyle.cls);
      run = "";
    };
    for (let x = 0; x < cells; x++) {
      const v = s.values[Math.min(n - 1, Math.floor((x / cells) * n))];
      const st = v === null || v === undefined ? { color: "", cls: "tf-dim" } : stateColor(s.field, v);
      const key = st.color + "|" + st.cls;
      if (key !== runKey) {
        flush();
        runKey = key;
        runStyle = st;
      }
      run += glyph + (gap ? " " : "");
    }
    flush();
    return html;
  };
  const timelineHelper = (glyph, gap) => (width) => {
    const series = stateSeries();
    if (!series.length) return noData();
    const w = nameWidth(series);
    const cw = num(width, 60);
    const cells = gap ? Math.floor(cw / 2) : cw;
    const lines = series.map((s) => tf.escapeHtml(tf.padRight(s.name, w)) + " " + statesRow(s, cells, glyph, gap));
    const times = (series.find((s) => s.times && s.times.length) || {}).times;
    return safe(lines.join("\n") + timeAxis(times, cw, w + 1));
  };
  // {{{tfStateTimeline width}}} — contiguous █ runs
  hb.registerHelper("tfStateTimeline", timelineHelper("█", false));
  // {{{tfStatusHistory width}}} — discrete ▇ blocks
  hb.registerHelper("tfStatusHistory", timelineHelper("▇", true));

  // {{{tfHeatmap width height}}} — value buckets (rows) × time buckets (cols), density as ░▒▓█
  hb.registerHelper("tfHeatmap", (width, height) => {
    const series = numericSeries();
    if (!series.length) return noData();
    const cw = num(width, 60);
    const ch = num(height, 10);
    const all = series.flatMap((s) => s.values).filter(Number.isFinite);
    const min = Math.min(...all);
    const max = Math.max(...all) === min ? min + 1 : Math.max(...all);
    const counts = Array.from({ length: ch }, () => new Array(cw).fill(0));
    let peak = 0;
    series.forEach((s) => {
      const n = s.values.length;
      s.values.forEach((v, i) => {
        if (!Number.isFinite(v)) return;
        const x = Math.min(cw - 1, Math.floor((i / n) * cw));
        const y = Math.min(ch - 1, Math.floor((1 - (v - min) / (max - min)) * (ch - 1) + 0.5));
        peak = Math.max(peak, ++counts[y][x]);
      });
    });
    const yl = yLabels(series[0].field, min, max, ch);
    const lines = counts.map((row, y) => {
      let html = "";
      let run = "";
      let runLvl = -1;
      const flush = () => {
        if (run) html += colorSpan(run, "", runLvl > 0 ? "tf-h" + runLvl : "");
        run = "";
      };
      row.forEach((cnt) => {
        const lvl = cnt ? Math.max(1, Math.round((cnt / peak) * 4)) : 0;
        if (lvl !== runLvl) {
          flush();
          runLvl = lvl;
        }
        run += tf.shade(cnt / peak);
      });
      flush();
      return colorSpan(yl.labels[y] + (y === ch - 1 ? " ┼" : " ┤"), "", "tf-axis") + html;
    });
    const times = (series.find((s) => s.times && s.times.length) || {}).times;
    return safe(lines.join("\n") + timeAxis(times, cw, yl.width + 2));
  });

  // {{{tfHistogram bins height}}} — distribution of all values
  hb.registerHelper("tfHistogram", (bins, height) => {
    const series = numericSeries();
    if (!series.length) return noData();
    const nb = num(bins, 24);
    const h = num(height, 8);
    const all = series.flatMap((s) => s.values).filter(Number.isFinite);
    const min = Math.min(...all);
    const max = Math.max(...all) === min ? min + 1 : Math.max(...all);
    const counts = new Array(nb).fill(0);
    all.forEach((v) => counts[Math.min(nb - 1, Math.floor(((v - min) / (max - min)) * nb))]++);
    const rows = tf.columns(counts, { height: h, barWidth: 2, gap: 0 });
    const peak = Math.max(...counts);
    const lw = String(peak).length;
    const out = rows.map((r, y) => colorSpan(tf.padLeft(y === 0 ? String(peak) : y === h - 1 ? "0" : "", lw) + (y === h - 1 ? " ┼" : " ┤"), "", "tf-axis") + colorSpan(r, "", sCls(0)));
    const lo = displayOf(series[0].field, min).text;
    const hi = displayOf(series[0].field, max).text;
    out.push(colorSpan(" ".repeat(lw + 2) + tf.padRight(lo, Math.max(0, nb * 2 - hi.length)) + hi, "", "tf-axis"));
    return safe(out.join("\n"));
  });

  // {{{tfCandlestick width height}}} — open/high/low/close fields (by name, else first four numeric fields)
  hb.registerHelper("tfCandlestick", (width, height) => {
    const frame = firstFrame();
    if (!frame) return noData();
    const nums = fieldsOfType(frame, "number");
    const pick = (re, i) => nums.find((f) => re.test(f.name)) || nums[i];
    const fo = pick(/^open$/i, 0), fh = pick(/^high$/i, 1), fl = pick(/^low$/i, 2), fc = pick(/^close$/i, 3);
    if (!fo || !fh || !fl || !fc) return noData();
    const o = valuesOf(fo), hv = valuesOf(fh), l = valuesOf(fl), c = valuesOf(fc);
    const cw = num(width, 40);
    const h = num(height, 12);
    const n = o.length;
    const per = Math.max(1, Math.ceil(n / cw));
    const items = [];
    for (let i = 0; i < n; i += per) {
      const j = Math.min(n, i + per);
      items.push({ o: Number(o[i]), c: Number(c[j - 1]), h: Math.max(...hv.slice(i, j).map(Number)), l: Math.min(...l.slice(i, j).map(Number)) });
    }
    const cd = tf.candles(items, { height: h, gap: 1 });
    const yl = yLabels(fc, cd.min, cd.max, h);
    const segs = tf.ownedSegments(cd.rows, cd.owner, (i) => (cd.dir[i] > 0 ? "tf-up" : "tf-down"));
    const lines = segs.map((row, y) => colorSpan(yl.labels[y] + (y === h - 1 ? " ┼" : " ┤"), "", "tf-axis") + row.map((s) => colorSpan(s[0], "", s[1])).join(""));
    const timeField = frame.fields.find((f) => f.type === "time");
    const last = items[items.length - 1];
    lines.push(colorSpan(" ".repeat(yl.width + 2), "", "") + colorSpan("last " + displayOf(fc, last.c).text + "  " + (last.c >= last.o ? "▲" : "▼") + " " + displayOf(fc, last.c - last.o).text, "", last.c >= last.o ? "tf-up" : "tf-down"));
    return safe(lines.join("\n") + timeAxis(timeField ? valuesOf(timeField) : null, cd.rows[0].length, yl.width + 2));
  });

  // XY / Trend: first numeric field is x, the others are y series.
  const xyHelper = (lines) => (width, height) => {
    const frame = firstFrame();
    if (!frame) return noData();
    const nums = fieldsOfType(frame, "number");
    if (nums.length < 2) return noData();
    const xf = nums[0];
    const xs = valuesOf(xf).map(Number);
    const ys = nums.slice(1).map((f) => ({ name: nameOf(frame, f), field: f, xs, ys: valuesOf(f).map(Number) }));
    const cw0 = num(width, 72);
    const h = num(height, 12);
    const probe = tf.brailleScatter(ys, { width: 10, height: h, lines });
    const yl = yLabels(ys[0].field, probe.ymin, probe.ymax, h);
    const cw = Math.max(10, cw0 - yl.width - 2);
    const sc = tf.brailleScatter(ys, { width: cw, height: h, lines });
    const segs = tf.ownedSegments(sc.rows, sc.owner, sCls);
    const out = segs.map((row, y) => colorSpan(yl.labels[y] + (y === h - 1 ? " ┼" : " ┤"), "", "tf-axis") + row.map((s) => colorSpan(s[0], "", s[1])).join(""));
    const x0 = displayOf(xf, sc.xmin).text;
    const x1 = displayOf(xf, sc.xmax).text;
    out.push(colorSpan(" ".repeat(yl.width + 2) + tf.padRight(x0, Math.max(0, cw - x1.length)) + x1, "", "tf-axis"));
    out.push(" ".repeat(yl.width + 2) + legend(ys.map((s) => s.name)) + colorSpan("   x: " + nameOf(frame, xf), "", "tf-dim"));
    return safe(out.join("\n"));
  };
  // {{{tfXY width height}}} — scatter
  hb.registerHelper("tfXY", xyHelper(false));
  // {{{tfTrend width height}}} — line over a numeric x axis
  hb.registerHelper("tfTrend", xyHelper(true));

  // {{{tfLogs maxLines}}} — time · [level] · line, newest first
  hb.registerHelper("tfLogs", (maxLines) => {
    const frame = firstFrame();
    if (!frame) return noData();
    const timeField = frame.fields.find((f) => f.type === "time");
    const strings = fieldsOfType(frame, "string");
    const lineField = strings.find((f) => /^(line|body|message|msg|log|content)$/i.test(f.name)) || strings[0];
    if (!lineField) return noData();
    const levelField = frame.fields.find((f) => /^(level|severity|lvl)$/i.test(f.name));
    const lines = valuesOf(lineField);
    const times = timeField ? valuesOf(timeField) : [];
    const levels = levelField ? valuesOf(levelField) : [];
    const limit = num(maxLines, 30);
    const idx = lines.map((_, i) => i).slice(-limit).reverse();
    // canonical short labels so the column stays aligned: crit / error / warn / info / debug / trace
    const canon = (lvl) => {
      const l = String(lvl || "").toLowerCase();
      if (/crit|fatal|emerg|alert|panic/.test(l)) return ["crit", "tf-crit"];
      if (/err/.test(l)) return ["error", "tf-crit"];
      if (/warn/.test(l)) return ["warn", "tf-warn"];
      if (/info|notice/.test(l)) return ["info", "tf-ok"];
      if (/debug/.test(l)) return ["debug", "tf-dim"];
      if (/trace/.test(l)) return ["trace", "tf-dim"];
      return [l.slice(0, 5), "tf-dim"];
    };
    return safe(
      idx
        .map((i) => {
          const text = String(lines[i] === null || lines[i] === undefined ? "" : lines[i]);
          const m = levels[i] || (text.match(/\b(critical|fatal|error|err|warning|warn|info|notice|debug|trace)\b/i) || [])[1] || "";
          const [label, cls] = canon(m);
          const ts = times[i] !== undefined ? new Date(times[i]).toTimeString().slice(0, 8) : "";
          return colorSpan(ts, "", "tf-dim") + " " + colorSpan(tf.padRight(label ? "[" + label + "]" : "", 7), "", cls) + " " + tf.escapeHtml(text);
        })
        .join("\n")
    );
  });

  // {{{tfNodeGraph}}} — layered boxes + edge list (basic). Needs the Grafana node
  // graph frames: nodes (id, title, mainstat…) and edges (id, source, target).
  hb.registerHelper("tfNodeGraph", () => {
    const fr = frames();
    const byName = (frame, re) => frame.fields.find((f) => re.test(f.name));
    const edgesFrame = fr.find((f) => byName(f, /^source$/i) && byName(f, /^target$/i));
    const nodesFrame = fr.find((f) => f !== edgesFrame && byName(f, /^id$/i));
    if (!nodesFrame) return noData();
    const col = (frame, re) => {
      const f = byName(frame, re);
      return f ? valuesOf(f) : [];
    };
    const ids = col(nodesFrame, /^id$/i).map(String);
    const titles = col(nodesFrame, /^title$/i);
    const mains = col(nodesFrame, /^mainstat$/i);
    const mainField = byName(nodesFrame, /^mainstat$/i);
    const nodes = ids.map((id, i) => ({ id, title: String(titles[i] !== undefined ? titles[i] : id), stat: mains[i] !== undefined ? displayOf(mainField, mains[i]).text : "" }));
    const edges = edgesFrame ? col(edgesFrame, /^source$/i).map((s, i) => ({ s: String(s), t: String(col(edgesFrame, /^target$/i)[i]) })) : [];
    // layer = longest path from a root (Kahn's algorithm; back edges on cycles are ignored)
    const indeg = {};
    const out = {};
    nodes.forEach((n) => { indeg[n.id] = 0; out[n.id] = []; });
    edges.forEach((e) => { if (indeg[e.t] !== undefined && out[e.s]) { indeg[e.t]++; out[e.s].push(e.t); } });
    const depth = {};
    const queue = nodes.filter((n) => indeg[n.id] === 0).map((n) => n.id);
    queue.forEach((id) => (depth[id] = 0));
    while (queue.length) {
      const id = queue.shift();
      out[id].forEach((t) => {
        depth[t] = Math.max(depth[t] || 0, depth[id] + 1);
        if (--indeg[t] === 0) queue.push(t);
      });
    }
    nodes.forEach((n) => { if (depth[n.id] === undefined) depth[n.id] = 0; });
    const layers = [];
    nodes.forEach((n) => (layers[depth[n.id]] = layers[depth[n.id]] || []).push(n));
    const boxW = Math.min(26, Math.max(10, ...nodes.map((n) => Math.max(n.title.length, n.stat.length) + 4)));
    const columns = layers.map((layer) => layer.flatMap((n) => tf.box([n.title, n.stat], { width: boxW, style: "dashed" }).concat([""])));
    const height = Math.max(...columns.map((c) => c.length));
    const lines = [];
    for (let y = 0; y < height; y++) {
      let line = "";
      columns.forEach((c, k) => {
        const cell = c[y] || " ".repeat(boxW);
        const isTitle = y % 5 === 0 && c[y] !== undefined && c[y].startsWith("┌");
        line += colorSpan(cell, "", isTitle ? "" : "tf-border");
        if (k < columns.length - 1) line += colorSpan(y % 5 === 1 && c[y] !== undefined ? " ╌╌▶ " : "     ", "", "tf-edge");
      });
      lines.push(line);
    }
    lines.push(colorSpan("edges", "", "tf-dim"));
    const title = (id) => (nodes.find((n) => n.id === id) || { title: id }).title;
    edges.slice(0, 40).forEach((e) => lines.push("  " + tf.escapeHtml(title(e.s)) + colorSpan(" ──▶ ", "", "tf-edge") + tf.escapeHtml(title(e.t))));
    return safe(lines.join("\n"));
  });

  // {{{tfTraces width maxSpans}}} — span waterfall: indent by depth, bar = start offset + duration
  hb.registerHelper("tfTraces", (width, maxSpans) => {
    const frame = fr0WithField(/^spanID$/i);
    if (!frame) return noData();
    const get = (re) => {
      const f = frame.fields.find((x) => re.test(x.name));
      return f ? valuesOf(f) : [];
    };
    const spanIds = get(/^spanID$/i).map(String);
    const parents = get(/^parentSpanID$/i).map((p) => (p === null || p === undefined ? "" : String(p)));
    const names = get(/^operationName$/i);
    const services = get(/^serviceName$/i);
    const starts = get(/^startTime$/i).map(Number);
    const durs = get(/^duration$/i).map(Number);
    const n = spanIds.length;
    if (!n) return noData();
    const parentOf = {};
    spanIds.forEach((id, i) => (parentOf[id] = parents[i]));
    const depthOf = (id, guard) => (!parentOf[id] || parentOf[parentOf[id]] === undefined || guard > 32 ? 0 : 1 + depthOf(parentOf[id], guard + 1));
    const t0 = Math.min(...starts.filter(Number.isFinite));
    const tEnd = Math.max(...starts.map((s, i) => s + (durs[i] || 0)).filter(Number.isFinite));
    const total = tEnd - t0 || 1;
    const cw = num(width, 50);
    const limit = num(maxSpans, 40);
    const order = spanIds.map((_, i) => i).sort((a, b) => starts[a] - starts[b]).slice(0, limit);
    const nameW = Math.min(36, Math.max(...order.map((i) => depthOf(spanIds[i], 0) * 2 + String(names[i] || "").length)));
    return safe(
      order
        .map((i) => {
          const d = depthOf(spanIds[i], 0);
          const label = tf.padRight(" ".repeat(d * 2) + String(names[i] || spanIds[i]), nameW);
          const off = Math.round(((starts[i] - t0) / total) * cw);
          const len = Math.max(1, Math.round(((durs[i] || 0) / total) * cw));
          const bar = " ".repeat(Math.min(off, cw - 1)) + "█".repeat(Math.max(1, Math.min(len, cw - off)));
          return tf.escapeHtml(label) + " " + colorSpan(tf.padRight(bar, cw), "", sCls(hashIndex(services[i] || ""))) + " " + colorSpan(tf.formatNumber(durs[i]) + "ms", "", "tf-dim") + (services[i] ? colorSpan("  " + services[i], "", "tf-dim") : "");
        })
        .join("\n")
    );
  });
  function fr0WithField(re) {
    return frames().find((f) => f.fields.some((x) => re.test(x.name)));
  }

  // Panels that are not query-driven in Grafana either. The helper emits a
  // placeholder; after.js fetches the Grafana API and fills it in.
  // {{{tfAlertList max}}}  {{{tfDashboardList max}}}
  hb.registerHelper("tfAlertList", (max) => safe('<span class="tf-async" data-tf="alerts" data-max="' + num(max, 20) + '">loading alerts…</span>'));
  hb.registerHelper("tfDashboardList", (max) => safe('<span class="tf-async" data-tf="dashboards" data-max="' + num(max, 20) + '">loading dashboards…</span>'));

  // {{{tfFlame width}}} — inclusive bars from label/level/value(/self)
  hb.registerHelper("tfFlame", (width) => {
    const frame = firstFrame();
    if (!frame) return noData();
    const pick = (re, type, i) => frame.fields.find((f) => re.test(f.name)) || fieldsOfType(frame, type)[i];
    const lf = pick(/^(label|name|function|symbol)$/i, "string", 0);
    const vf = pick(/^(value|total|inclusive)$/i, "number", 0);
    const levf = pick(/^(level|depth)$/i, "number", 1);
    const sf = pick(/^self$/i, "number", 2);
    if (!lf || !vf) return noData();
    const labels = valuesOf(lf);
    const values = valuesOf(vf).map(Number);
    const levels = levf ? valuesOf(levf).map(Number) : labels.map(() => 0);
    const selves = sf ? valuesOf(sf).map(Number) : labels.map(() => 0);
    const items = labels.map((label, i) => ({ label: String(label == null ? "" : label), level: levels[i], value: values[i], self: selves[i] }));
    const fl = tf.flame(items, { width: num(width, 48) });
    return safe(
      fl.rows
        .map((r, i) => {
          return (
            '<span class="tf-flame" data-tf-i="' +
            i +
            '">' +
            colorSpan(r.label, "", "") +
            " " +
            " ".repeat(r.indent) +
            colorSpan(r.bar, "", sCls(r.level)) +
            " " +
            colorSpan(tf.padLeft(Math.round(r.pct * 100) + "%", 4), "", "tf-value") +
            "</span>"
          );
        })
        .join("\n")
    );
  });

  // {{{tfCanvas boxWidth}}} — dashed boxes + .o@ packets (Canvas analogue)
  hb.registerHelper("tfCanvas", (boxWidth) => {
    const bw = num(boxWidth, 30);
    const c = categorical();
    let items = [];
    if (c) {
      items = c.labels.map((label, i) => ({
        title: label,
        stats: c.nums.map((f) => {
          const v = Number(valuesOf(f)[i]);
          return { name: nameOf(c.frame, f), text: displayOf(f, v).text, value: v };
        }),
      }));
    } else {
      const s = numericSeries();
      if (!s.length) return noData();
      items = s.map((x) => ({ title: x.name, stats: [{ name: "value", text: displayOf(x.field, x.last).text, value: x.last }] }));
    }
    const maxV = Math.max(1, ...items.flatMap((it) => it.stats.map((s) => s.value)).filter(Number.isFinite));
    const boxes = items.map((it) => {
      const lines = it.stats.slice(0, 3).map((s) => tf.padRight(String(s.name).slice(0, 7), 7) + " " + tf.bar((Number(s.value) || 0) / maxV, 10) + " " + tf.padLeft(s.text, 6));
      return tf.box(lines, { title: String(it.title).slice(0, bw - 4), width: bw, style: "dashed" });
    });
    const gap = 17;
    const rows = [];
    for (let i = 0; i < boxes.length; i += 2) {
      const left = boxes[i];
      const right = boxes[i + 1];
      const h = Math.max(left.length, right ? right.length : 0);
      for (let y = 0; y < h; y++) {
        const L = left[y] || " ".repeat(bw);
        const R = right ? right[y] || " ".repeat(bw) : "";
        const mid = right ? (y === 1 ? '<span class="tf-packet tf-edge">' + tf.escapeHtml(tf.edge(16, 0)) + "</span>" : " ".repeat(gap)) : "";
        rows.push(colorSpan(L, "", "tf-border") + (right ? " " + mid + " " : "") + (right ? colorSpan(R, "", "tf-border") : ""));
      }
      if (i + 2 < boxes.length) rows.push("");
    }
    return safe(rows.join("\n"));
  });

  // {{{tfGeomap width height}}} — lat/lon * markers on meridians
  hb.registerHelper("tfGeomap", (width, height) => {
    const frame = firstFrame();
    if (!frame) return noData();
    const latf = frame.fields.find((f) => /^(lat|latitude)$/i.test(f.name));
    const lonf = frame.fields.find((f) => /^(lon|lng|longitude)$/i.test(f.name));
    if (!latf || !lonf) return noData();
    const namef = fieldsOfType(frame, "string")[0];
    const valf = fieldsOfType(frame, "number").find((f) => f !== latf && f !== lonf);
    const lats = valuesOf(latf).map(Number);
    const lons = valuesOf(lonf).map(Number);
    const names = namef ? valuesOf(namef).map((v) => String(v == null ? "" : v)) : lats.map((_, i) => String(i + 1));
    const vals = valf ? valuesOf(valf).map(Number) : lats.map(() => 0);
    const points = names.map((label, i) => ({ label, lat: lats[i], lon: lons[i], value: vals[i] }));
    const w = num(width, 56);
    const h = num(height, 10);
    const g = tf.geoPlot(points, { width: w, height: h });
    const segs = tf.ownedSegments(g.rows, g.owner, sCls);
    const latsY = [];
    for (let y = 0; y < h; y++) {
      const lat = 90 - (180 * y) / (h - 1);
      latsY.push(lat === 0 ? "0" : lat > 0 ? lat.toFixed(0) + "N" : Math.abs(lat).toFixed(0) + "S");
    }
    const lw = Math.max(...latsY.map((s) => s.length));
    const lines = segs.map((row, y) => {
      const html = row
        .map((s) => (s[1] ? '<span class="tf-ping ' + s[1] + '">' + tf.escapeHtml(s[0]) + "</span>" : colorSpan(s[0], "", "tf-axis")))
        .join("");
      return colorSpan(tf.padLeft(latsY[y], lw) + "┤", "", "tf-axis") + html;
    });
    lines.push(colorSpan(" ".repeat(lw) + "└" + "─".repeat(w), "", "tf-axis"));
    const x0 = "180W";
    const x1 = "180E";
    lines.push(colorSpan(" ".repeat(lw + 1) + tf.padRight(x0, Math.max(0, w - x1.length)) + x1, "", "tf-axis"));
    const nw = Math.min(12, Math.max(...points.map((p) => p.label.length)));
    points.forEach((p, i) => {
      const v = valf ? displayOf(valf, p.value).text : "";
      const lat = Number.isFinite(p.lat) ? p.lat.toFixed(1) : "?";
      const lon = Number.isFinite(p.lon) ? p.lon.toFixed(1) : "?";
      lines.push(
        colorSpan("* ", "", sCls(i)) +
          tf.escapeHtml(tf.padRight(p.label, nw)) +
          "  " +
          colorSpan(tf.padLeft(lat, 5) + "," + tf.padLeft(lon, 7), "", "tf-dim") +
          (v ? "  " + colorSpan(v, "", "tf-value") : "")
      );
    });
    return safe(lines.join("\n"));
  });

  // {{{tfText width}}} — dashed CRT frame around string-field lines
  hb.registerHelper("tfText", (width) => {
    const frame = firstFrame();
    const w = num(width, 52);
    let body = [];
    if (frame) {
      const sf = fieldsOfType(frame, "string")[0];
      if (sf) body = valuesOf(sf).map((v) => String(v == null ? "" : v));
    }
    if (!body.length) body = ["# tuiflow", "", "Attach a string field, or keep this", "as a CRT text widget."];
    const inner = body.map((l) => l.slice(0, Math.max(1, w - 4)));
    const boxed = tf.box(inner, { title: "text", width: w, style: "dashed" });
    return safe(
      boxed
        .map((l, i) => {
          const isLastBody = i === boxed.length - 2;
          if (!isLastBody) return colorSpan(l, "", "tf-border");
          return colorSpan(l.slice(0, -2), "", "tf-border") + '<span class="tf-cursor">█</span>' + colorSpan(l.slice(-1), "", "tf-border");
        })
        .join("\n")
    );
  });

  // {{{tfNews max}}} — time · source · title, newest first
  hb.registerHelper("tfNews", (max) => {
    const frame = firstFrame();
    const limit = num(max, 12);
    if (!frame) return safe('<span class="tf-async" data-tf="news" data-max="' + limit + '">loading news…</span>');
    const titlef = frame.fields.find((f) => /^(title|headline|name)$/i.test(f.name)) || fieldsOfType(frame, "string")[0];
    if (!titlef) return noData();
    const srcf = frame.fields.find((f) => /^(source|feed|site)$/i.test(f.name));
    const timef = frame.fields.find((f) => f.type === "time" || /^(time|date|published)$/i.test(f.name));
    const titles = valuesOf(titlef);
    const idx = titles.map((_, i) => i);
    if (timef) {
      const ts = valuesOf(timef);
      idx.sort((a, b) => {
        const tb = Date.parse(ts[b]) || Number(ts[b]) || 0;
        const ta = Date.parse(ts[a]) || Number(ts[a]) || 0;
        return tb - ta;
      });
    }
    const shown = idx.slice(0, limit);
    const sw = srcf ? Math.min(12, Math.max(4, ...shown.map((i) => String(valuesOf(srcf)[i] || "").length))) : 0;
    const fmtTime = (t) => {
      if (t == null || t === "") return "";
      const d = new Date(typeof t === "number" || /^\d+$/.test(t) ? Number(t) : t);
      return Number.isNaN(d.getTime()) ? String(t).slice(0, 10) : d.toISOString().slice(0, 10);
    };
    return safe(
      shown
        .map((i) => {
          const ts = timef ? fmtTime(valuesOf(timef)[i]) : "";
          const src = srcf ? tf.padRight(String(valuesOf(srcf)[i] || ""), sw) : "";
          return (
            colorSpan("▸ ", "", "tf-edge") +
            colorSpan(tf.padRight(ts, 10), "", "tf-dim") +
            " " +
            (src ? colorSpan(src, "", "tf-s1") + "  " : "") +
            tf.escapeHtml(String(titles[i] || ""))
          );
        })
        .join("\n")
    );
  });

  // {{{tfAnnotations max}}} — query rows, else /api/annotations
  hb.registerHelper("tfAnnotations", (max) => {
    const frame = firstFrame();
    const limit = num(max, 16);
    if (frame) {
      const titlef = frame.fields.find((f) => /^(title|text|annotation)$/i.test(f.name)) || fieldsOfType(frame, "string")[0];
      if (titlef) {
        const timef = frame.fields.find((f) => f.type === "time" || /^time$/i.test(f.name));
        const tagsf = frame.fields.find((f) => /^tags$/i.test(f.name));
        const titles = valuesOf(titlef);
        const n = Math.min(limit, titles.length);
        return safe(
          Array.from({ length: n }, (_, i) => {
            const raw = timef ? valuesOf(timef)[i] : null;
            const d = raw != null ? new Date(typeof raw === "number" || /^\d+$/.test(raw) ? Number(raw) : raw) : null;
            const ts = d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(11, 16) : "";
            const tags = tagsf ? String(valuesOf(tagsf)[i] || "") : "";
            return (
              colorSpan("※ ", "", "tf-s0") +
              colorSpan(tf.padRight(ts, 5), "", "tf-dim") +
              " " +
              tf.escapeHtml(String(titles[i] || "")) +
              (tags ? "  " + colorSpan("#" + tags.replace(/,/g, " #"), "", "tf-s1") : "")
            );
          }).join("\n")
        );
      }
    }
    return safe('<span class="tf-async" data-tf="annotations" data-max="' + limit + '">loading annotations…</span>');
  });
});
