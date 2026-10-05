/*!
 * tuiflow core — text-only primitives for TUI-style dashboards:
 * box-drawing frames, block bars, block sparklines, braille line charts,
 * dashed edges with a travelling packet, status bars and a cell grid
 * ("Screen") that renders to plain text or colour-classed HTML.
 *
 * Zero dependencies. UMD: usable as <script src>, CommonJS require(), or
 * dynamic import() (then it registers itself as globalThis.tuiflow so it can
 * be loaded from a Grafana Business Text panel).
 *
 * Every public function works on strings only, so the same code runs in a
 * browser, Node, a Grafana panel, a VS Code webview or a slide deck.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.tuiflow = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "0.2.0";

  // Eight vertical block levels, used by sparklines.
  const BLOCKS = "▁▂▃▄▅▆▇█";
  // Eight horizontal partial fills, used for sub-cell bar precision.
  const EIGHTHS = " ▏▎▍▌▋▊▉";

  const BORDERS = {
    single: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" },
    dashed: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "╌", v: "┆" },
    round: { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" },
    double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
    heavy: { tl: "┏", tr: "┓", bl: "┗", br: "┛", h: "━", v: "┃" },
  };

  // --- string helpers -----------------------------------------------------

  // All glyphs are assumed to occupy one cell. Pick a monospace font with
  // box-drawing + block + braille coverage (JetBrains Mono, Cascadia, Fira Code...).
  function padRight(value, width, ch) {
    const s = String(value);
    ch = ch || " ";
    return s.length >= width ? s.slice(0, width) : s + ch.repeat(width - s.length);
  }

  function padLeft(value, width, ch) {
    const s = String(value);
    ch = ch || " ";
    return s.length >= width ? s.slice(0, width) : ch.repeat(width - s.length) + s;
  }

  function center(value, width, ch) {
    const s = String(value);
    ch = ch || " ";
    if (s.length >= width) return s.slice(0, width);
    const left = Math.floor((width - s.length) / 2);
    return ch.repeat(left) + s + ch.repeat(width - s.length - left);
  }

  function clamp01(x) {
    return x < 0 || !Number.isFinite(x) ? 0 : x > 1 ? 1 : x;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /** Compact number: 1234 → "1.2k", 0.123 → "0.12". */
  function formatNumber(v, decimals) {
    if (!Number.isFinite(v)) return "-";
    const abs = Math.abs(v);
    const units = [["T", 1e12], ["G", 1e9], ["M", 1e6], ["k", 1e3]];
    for (let i = 0; i < units.length; i++) {
      if (abs >= units[i][1]) return (v / units[i][1]).toFixed(decimals === undefined ? 1 : decimals) + units[i][0];
    }
    if (abs >= 100) return v.toFixed(0);
    if (abs >= 10) return v.toFixed(decimals === undefined ? 1 : decimals);
    return v.toFixed(decimals === undefined ? 2 : decimals);
  }

  /** "HH:MM" from a ms timestamp (local time). */
  function formatTime(ms) {
    const d = new Date(ms);
    return padLeft(d.getHours(), 2, "0") + ":" + padLeft(d.getMinutes(), 2, "0");
  }

  // --- data glyphs --------------------------------------------------------

  /**
   * Horizontal block bar. `ratio` 0..1, `width` in cells.
   * opts: { fill:"█", empty:"░", partial:true }
   * partial=true uses eighth-blocks for the last cell so the bar moves
   * smoothly instead of jumping one cell at a time.
   */
  function bar(ratio, width, opts) {
    opts = opts || {};
    const fill = opts.fill || "█";
    const empty = opts.empty || "░";
    const partial = opts.partial !== false;
    const cells = clamp01(ratio) * width;
    let n = Math.floor(cells);
    let out = fill.repeat(n);
    if (partial && n < width) {
      const idx = Math.round((cells - n) * 8); // 0..8
      if (idx >= 8) {
        out += fill;
        n++;
      } else if (idx > 0) {
        out += EIGHTHS[idx];
        n++;
      }
    }
    return out + empty.repeat(Math.max(0, width - n));
  }

  /**
   * Resample `values` to `width` points by bucket averaging (or keep as is
   * when it already fits). Non-finite values are skipped inside a bucket.
   */
  function resample(values, width) {
    if (!width || values.length <= width) return values.slice();
    const out = [];
    const step = values.length / width;
    for (let i = 0; i < width; i++) {
      const from = Math.floor(i * step);
      const to = Math.max(from + 1, Math.floor((i + 1) * step));
      let sum = 0;
      let count = 0;
      for (let j = from; j < to && j < values.length; j++) {
        const v = Number(values[j]);
        if (Number.isFinite(v)) {
          sum += v;
          count++;
        }
      }
      out.push(count ? sum / count : NaN);
    }
    return out;
  }

  /**
   * Block sparkline ▁▂▃▅▇. opts: { min, max, width }
   * `width` resamples long series (e.g. a Prometheus range query) down to
   * a fixed number of cells so the surrounding box keeps its alignment.
   */
  function sparkline(values, opts) {
    opts = opts || {};
    const vals = resample(values.map(Number), opts.width);
    const finite = vals.filter(Number.isFinite);
    if (!finite.length) return " ".repeat(opts.width || vals.length);
    const min = opts.min !== undefined ? opts.min : Math.min.apply(null, finite);
    const max = opts.max !== undefined ? opts.max : Math.max.apply(null, finite);
    const span = max - min || 1;
    return vals
      .map((v) => (Number.isFinite(v) ? BLOCKS[Math.round(clamp01((v - min) / span) * 7)] : " "))
      .join("");
  }

  /**
   * "[█████░░░] 62%" style meter. opts: { label, bracket:true, fill, empty }
   */
  function meter(ratio, width, opts) {
    opts = opts || {};
    const pct = Math.round(clamp01(ratio) * 100);
    const body = bar(ratio, width, opts);
    const label = opts.label !== undefined ? opts.label : padLeft(pct + "%", 4);
    return (opts.bracket === false ? body : "[" + body + "]") + (label ? " " + label : "");
  }

  /**
   * Dashed horizontal edge with a travelling packet.
   * opts: { packet:".o@", dash:"╌", head:"▶", reverse:false, speed:1 }
   * `tick` is any increasing integer (frame counter); speed scales it.
   */
  function edge(length, tick, opts) {
    opts = opts || {};
    const packet = opts.packet || ".o@";
    const dash = opts.dash || "╌";
    const head = opts.head !== undefined ? opts.head : "▶";
    const reverse = !!opts.reverse;
    const speed = opts.speed || 1;
    const cells = dash.repeat(length).split("");
    const span = length - packet.length + 1;
    if (span > 0) {
      let p = Math.floor((tick || 0) * speed) % span;
      if (p < 0) p += span;
      if (reverse) p = span - 1 - p;
      for (let i = 0; i < packet.length; i++) {
        cells[p + i] = reverse ? packet[packet.length - 1 - i] : packet[i];
      }
    }
    const line = cells.join("");
    if (!head) return line;
    return reverse ? (opts.reverseHead || "◀") + line : line + head;
  }

  /**
   * Vertical edge: returns an array of 1-cell strings, top to bottom.
   * opts: { packet:".o@", dash:"┆", head:"▼", speed:1 }
   */
  function vedge(length, tick, opts) {
    opts = opts || {};
    const packet = opts.packet || ".o@";
    const dash = opts.dash || "┆";
    const head = opts.head !== undefined ? opts.head : "▼";
    const speed = opts.speed || 1;
    const cells = new Array(length).fill(dash);
    const span = length - packet.length + 1;
    if (span > 0) {
      let p = Math.floor((tick || 0) * speed) % span;
      if (p < 0) p += span;
      for (let i = 0; i < packet.length; i++) cells[p + i] = packet[i];
    }
    if (head) cells.push(head);
    return cells;
  }

  // --- braille line charts ------------------------------------------------

  // Dot bits of a braille cell (U+2800 + bits), indexed [row 0..3][col 0..1].
  const BRAILLE_BITS = [
    [0x01, 0x08],
    [0x02, 0x10],
    [0x04, 0x20],
    [0x40, 0x80],
  ];

  /**
   * Plot several numeric series as braille dots (2x4 sub-cells per cell).
   * series: number[][]   opts: { width, height, min, max }
   * Returns { rows: string[], owner: number[][], min, max } where owner[y][x]
   * is the index of the series that drew most dots in that cell (-1 = empty),
   * so a renderer can colour each cell by series.
   */
  function braillePlot(series, opts) {
    opts = opts || {};
    const width = opts.width || 60;
    const height = opts.height || 10;
    const W = width * 2;
    const H = height * 4;
    const all = [].concat.apply([], series).map(Number).filter(Number.isFinite);
    const min = opts.min !== undefined ? opts.min : all.length ? Math.min.apply(null, all) : 0;
    let max = opts.max !== undefined ? opts.max : all.length ? Math.max.apply(null, all) : 1;
    if (max === min) max = min + 1;

    // one bitmask grid per series, so overlapping lines can still be attributed
    const layers = series.map(() => new Uint8Array(width * height));
    const plot = (layer, px, py) => {
      if (px < 0 || px >= W || py < 0 || py >= H) return;
      layer[(py >> 2) * width + (px >> 1)] |= BRAILLE_BITS[py & 3][px & 1];
    };
    const line = (layer, x0, y0, x1, y1) => {
      // Bresenham so consecutive samples form a continuous stroke
      const dx = Math.abs(x1 - x0);
      const dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        plot(layer, x0, y0);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) {
          err += dy;
          x0 += sx;
        }
        if (e2 <= dx) {
          err += dx;
          y0 += sy;
        }
      }
    };

    series.forEach((values, si) => {
      const n = values.length;
      let prev = null;
      for (let i = 0; i < n; i++) {
        const v = Number(values[i]);
        if (!Number.isFinite(v)) {
          prev = null;
          continue;
        }
        const px = n === 1 ? W - 1 : Math.round((i / (n - 1)) * (W - 1));
        const py = Math.round((1 - clamp01((v - min) / (max - min))) * (H - 1));
        if (prev) line(layers[si], prev[0], prev[1], px, py);
        else plot(layers[si], px, py);
        prev = [px, py];
      }
    });

    const popcount = (b) => {
      let c = 0;
      while (b) {
        c += b & 1;
        b >>= 1;
      }
      return c;
    };
    const rows = [];
    const owner = [];
    for (let y = 0; y < height; y++) {
      let row = "";
      const own = [];
      for (let x = 0; x < width; x++) {
        let bits = 0;
        let best = -1;
        let bestCount = 0;
        for (let si = 0; si < layers.length; si++) {
          const b = layers[si][y * width + x];
          bits |= b;
          const c = popcount(b);
          if (c > 0 && c >= bestCount) {
            bestCount = c;
            best = si;
          }
        }
        row += bits ? String.fromCharCode(0x2800 + bits) : " ";
        own.push(best);
      }
      rows.push(row);
      owner.push(own);
    }
    return { rows: rows, owner: owner, min: min, max: max };
  }

  /**
   * Full line chart as "segment rows": each row is an array of [text, cls]
   * pairs so it can be coloured per series in HTML and flattened to text.
   *
   * series: [{ name, values: number[], times?: number[] }]
   * opts: { width, height, min, max, format(v) → string, formatLast(v),
   *         legend:true, seriesClass(i) → cls, axisClass:"tf-axis", labelWidth }
   */
  function lineChart(series, opts) {
    opts = opts || {};
    const width = opts.width || 72;
    const height = opts.height || 12;
    const fmt = opts.format || ((v) => formatNumber(v));
    const seriesClass = opts.seriesClass || ((i) => "tf-s" + (i % 6));
    const axisCls = opts.axisClass || "tf-axis";

    // y range first, so the labels and the plot agree
    const all = [].concat.apply([], series.map((s) => s.values)).map(Number).filter(Number.isFinite);
    const yMin = opts.min !== undefined ? opts.min : all.length ? Math.min.apply(null, all) : 0;
    let yMax = opts.max !== undefined ? opts.max : all.length ? Math.max.apply(null, all) : 1;
    if (yMax === yMin) yMax = yMin + 1;
    const labels = [];
    for (let y = 0; y < height; y++) {
      labels.push(fmt(yMax - ((yMax - yMin) * y) / (height - 1)));
    }
    const labelWidth = opts.labelWidth || Math.max.apply(null, labels.map((l) => l.length));
    const chartWidth = Math.max(10, width - labelWidth - 2);
    const chart = braillePlot(series.map((s) => s.values), { width: chartWidth, height: height, min: yMin, max: yMax });

    const rows = [];
    for (let y = 0; y < height; y++) {
      const segs = [[padLeft(labels[y], labelWidth) + " " + (y === height - 1 ? "┼" : "┤"), axisCls]];
      // split the braille row into runs of equal owner so each run gets its series colour
      let run = "";
      let runOwner = null;
      for (let x = 0; x < chartWidth; x++) {
        const o = chart.owner[y][x];
        if (o !== runOwner && run) {
          segs.push([run, runOwner >= 0 ? seriesClass(runOwner) : ""]);
          run = "";
        }
        runOwner = o;
        run += chart.rows[y][x];
      }
      if (run) segs.push([run, runOwner >= 0 ? seriesClass(runOwner) : ""]);
      rows.push(segs);
    }
    // x axis
    rows.push([[" ".repeat(labelWidth + 1) + "└" + "─".repeat(chartWidth), axisCls]]);
    const times = (series.find((s) => s.times && s.times.length) || {}).times;
    if (times && times.length > 1) {
      const t0 = formatTime(times[0]);
      const t1 = formatTime(times[Math.floor((times.length - 1) / 2)]);
      const t2 = formatTime(times[times.length - 1]);
      const mid = Math.floor(chartWidth / 2) - Math.floor(t1.length / 2);
      let axis = padRight(t0, Math.max(0, mid)) + t1;
      axis = padRight(axis, Math.max(axis.length, chartWidth - t2.length)) + t2;
      rows.push([[" ".repeat(labelWidth + 2) + axis, axisCls]]);
    }
    if (opts.legend !== false && series.length) {
      const legend = [];
      series.forEach((s, i) => {
        const last = [].concat(s.values).reverse().find(Number.isFinite);
        legend.push(["■ ", seriesClass(i)], [s.name + " " + (opts.formatLast || fmt)(last) + "   ", ""]);
      });
      rows.push([[" ".repeat(labelWidth + 2), ""]].concat(legend));
    }
    return rows;
  }

  function segmentsToText(rows) {
    return rows.map((r) => r.map((s) => s[0]).join("").replace(/\s+$/, "")).join("\n");
  }

  function segmentsToHTML(rows) {
    return rows
      .map((r) =>
        r
          .map((s) => (s[1] ? '<span class="' + s[1] + '">' + escapeHtml(s[0]) + "</span>" : escapeHtml(s[0])))
          .join("")
      )
      .join("\n");
  }

  // --- layout -------------------------------------------------------------

  /**
   * Frame `lines` in a box. Returns an array of equal-length strings.
   * opts: { title, width, style:"single"|"dashed"|"round"|"double"|"heavy", padding:1 }
   */
  function box(lines, opts) {
    opts = opts || {};
    const b = BORDERS[opts.style] || BORDERS.single;
    const padding = opts.padding === undefined ? 1 : opts.padding;
    const title = opts.title ? " " + opts.title + " " : "";
    const contentWidth = Math.max.apply(
      null,
      [title.length].concat(lines.map((l) => String(l).length + padding * 2))
    );
    const inner = opts.width ? opts.width - 2 : contentWidth;
    const top = b.tl + title + b.h.repeat(Math.max(0, inner - title.length)) + b.tr;
    const body = lines.map((l) => b.v + padRight(" ".repeat(padding) + l, inner) + b.v);
    const bottom = b.bl + b.h.repeat(inner) + b.br;
    return [top].concat(body, [bottom]);
  }

  /**
   * Fixed-width text table.
   * columns: [{ key, header, width, align:"left"|"right" }]
   * opts: { header:true, separator:"─" }
   */
  function table(rows, columns, opts) {
    opts = opts || {};
    const fmt = (row) =>
      columns
        .map((c) => {
          const v = row[c.key] === undefined || row[c.key] === null ? "" : row[c.key];
          return c.align === "right" ? padLeft(v, c.width) : padRight(v, c.width);
        })
        .join(" ");
    const out = [];
    if (opts.header !== false) {
      out.push(columns.map((c) => padRight(c.header || c.key, c.width)).join(" "));
      if (opts.separator !== false) {
        out.push(columns.map((c) => (opts.separator || "─").repeat(c.width)).join(" "));
      }
    }
    rows.forEach((r) => out.push(fmt(r)));
    return out;
  }

  /**
   * tmux-style status bar: items are strings or { label, value }.
   * Renders " label:[value]  label:[value] " padded/truncated to width.
   */
  function statusBar(items, width, opts) {
    opts = opts || {};
    const sep = opts.separator || "  ";
    const text = items
      .map((it) => (typeof it === "string" ? it : it.label + ":[" + it.value + "]"))
      .join(sep);
    return padRight(" " + text, width);
  }

  // --- screen -------------------------------------------------------------

  /**
   * A fixed-size cell grid. Each cell has a character and an optional CSS
   * class so that `toHTML()` can colour runs of cells while `toText()` stays
   * plain (copy-paste into a slide, a README or a terminal).
   */
  function Screen(width, height, fill) {
    this.width = width;
    this.height = height;
    this.fill = fill || " ";
    this.clear();
  }

  Screen.prototype.clear = function () {
    this.cells = [];
    this.classes = [];
    for (let y = 0; y < this.height; y++) {
      this.cells.push(new Array(this.width).fill(this.fill));
      this.classes.push(new Array(this.width).fill(""));
    }
    return this;
  };

  /** Write a string at (x, y); clipped to the grid. */
  Screen.prototype.put = function (x, y, str, cls) {
    if (y < 0 || y >= this.height) return this;
    const chars = Array.from(String(str));
    for (let i = 0; i < chars.length; i++) {
      const cx = x + i;
      if (cx < 0 || cx >= this.width) continue;
      this.cells[y][cx] = chars[i];
      this.classes[y][cx] = cls || "";
    }
    return this;
  };

  /** Write several lines starting at (x, y). */
  Screen.prototype.putLines = function (x, y, lines, cls) {
    lines.forEach((l, i) => this.put(x, y + i, l, cls));
    return this;
  };

  /** Write a vertical run of 1-cell strings starting at (x, y). */
  Screen.prototype.putColumn = function (x, y, cells, cls) {
    cells.forEach((c, i) => this.put(x, y + i, c, cls));
    return this;
  };

  Screen.prototype.toText = function () {
    return this.cells.map((row) => row.join("").replace(/\s+$/, "")).join("\n");
  };

  /** HTML with <span class="..."> around runs of equally-classed cells. */
  Screen.prototype.toHTML = function () {
    const out = [];
    for (let y = 0; y < this.height; y++) {
      let line = "";
      let runCls = null;
      let run = "";
      const flush = () => {
        if (!run) return;
        line += runCls ? '<span class="' + runCls + '">' + escapeHtml(run) + "</span>" : escapeHtml(run);
        run = "";
      };
      for (let x = 0; x < this.width; x++) {
        const cls = this.classes[y][x];
        if (cls !== runCls) {
          flush();
          runCls = cls;
        }
        run += this.cells[y][x];
      }
      flush();
      out.push(line);
    }
    return out.join("\n");
  };

  /** Render into a <pre> (or any element) via innerHTML. */
  Screen.prototype.render = function (el) {
    el.innerHTML = this.toHTML();
    return this;
  };

  // --- animation ----------------------------------------------------------

  /**
   * Call `fn(tick)` at `fps` frames per second. Returns a stop() function,
   * which is also the shape Grafana Business Text expects as an
   * "unsubscribe" return value from its after-render code.
   */
  function animate(fn, fps) {
    let tick = 0;
    const id = setInterval(() => fn(tick++), 1000 / (fps || 8));
    return () => clearInterval(id);
  }

  return {
    VERSION: VERSION,
    BLOCKS: BLOCKS,
    EIGHTHS: EIGHTHS,
    BORDERS: BORDERS,
    padLeft: padLeft,
    padRight: padRight,
    center: center,
    escapeHtml: escapeHtml,
    formatNumber: formatNumber,
    formatTime: formatTime,
    bar: bar,
    meter: meter,
    sparkline: sparkline,
    resample: resample,
    edge: edge,
    vedge: vedge,
    braillePlot: braillePlot,
    lineChart: lineChart,
    segmentsToText: segmentsToText,
    segmentsToHTML: segmentsToHTML,
    box: box,
    table: table,
    statusBar: statusBar,
    Screen: Screen,
    animate: animate,
  };
});
