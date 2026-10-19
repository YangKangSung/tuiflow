/*
 * tuiflow-echarts — draw tuiflow's terminal look with Apache ECharts.
 *
 * Standalone adapter. It depends on src/tuiflow.js (for the glyph strings)
 * and on an `echarts` instance that the caller provides. It is NOT bundled
 * into the Grafana panel plugins (tuiflow-tui-panel, yangkangsung-tuiflow-panel)
 * and is not part of what gets submitted to the Grafana catalog.
 *
 * Idea: tuiflow generates the strings (boxes, bars, `.o@` edges); ECharts
 * positions them on a cell grid (custom series with text elements), adds
 * tooltips / emphasis / events, and renders native charts (line) through a
 * theme that uses the same palette, monospace font, dashed axes, radius 0.
 *
 * Every builder is a pure function → ECharts `option` object, so it can be
 * unit-tested in Node without a browser.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../src/tuiflow.js"));
  } else {
    root.tuiflowEcharts = factory(root.tuiflow);
  }
})(typeof self !== "undefined" ? self : this, function (tf) {
  "use strict";

  const VERSION = "0.1.0";
  const FONT_FAMILY = '"JetBrains Mono", "Cascadia Mono", Consolas, "DejaVu Sans Mono", monospace';
  const CELL_RATIO = 0.6; // cell width / font size  (docs/look-spec.md §1)
  const LEADING = 1.25; // line height / font size

  // Palettes from docs/look-spec.md §3 and demo/index.html.
  const PALETTES = {
    video: {
      bg: "#0f1218", fg: "#c9ced6", dim: "#5c6370", border: "#3a4150",
      orange: "#e8a06a", blue: "#8fb3ff", green: "#86d28a", red: "#e06c75", gray: "#9aa0a6",
      statusBg: "#171b23",
    },
    matrix: {
      bg: "#000000", fg: "#00c017", dim: "#006a0c", border: "#008910",
      orange: "#00ff41", blue: "#7cff8e", green: "#00ff41", red: "#b6ff00", gray: "#008910",
      statusBg: "#040804",
    },
    amber: {
      bg: "#0a0700", fg: "#ffb000", dim: "#7a5400", border: "#a86f00",
      orange: "#ffd27a", blue: "#ffc34d", green: "#ffe08a", red: "#ff8c42", gray: "#a86f00",
      statusBg: "#130d00",
    },
  };

  function palette(name) {
    if (name && typeof name === "object") return name;
    return PALETTES[name] || PALETTES.video;
  }

  /** Series colour order: orange, blue, green, gray, red, dim (look-spec §3). */
  function seriesColors(p) {
    return [p.orange, p.blue, p.green, p.gray, p.red, p.dim];
  }

  // --- theme ----------------------------------------------------------------

  /**
   * ECharts theme object for a palette. Register with `registerThemes(echarts)`
   * and init with `echarts.init(el, "tuiflow-video", { renderer: "svg" })`.
   */
  function theme(name) {
    const p = palette(name);
    const axis = {
      axisLine: { show: true, lineStyle: { color: p.border, width: 1 } },
      axisTick: { show: false },
      axisLabel: { color: p.dim, fontFamily: FONT_FAMILY },
      splitLine: { show: true, lineStyle: { color: p.border, type: "dashed", opacity: 0.6 } },
      splitArea: { show: false },
      nameTextStyle: { color: p.dim, fontFamily: FONT_FAMILY },
    };
    return {
      backgroundColor: p.bg,
      color: seriesColors(p),
      textStyle: { fontFamily: FONT_FAMILY, color: p.fg },
      title: {
        textStyle: { color: p.fg, fontFamily: FONT_FAMILY, fontWeight: "bold" },
        subtextStyle: { color: p.dim, fontFamily: FONT_FAMILY },
      },
      legend: {
        textStyle: { color: p.dim, fontFamily: FONT_FAMILY },
        inactiveColor: p.border,
        icon: "rect",
      },
      tooltip: {
        backgroundColor: p.statusBg,
        borderColor: p.border,
        borderWidth: 1,
        padding: [4, 8],
        textStyle: { color: p.fg, fontFamily: FONT_FAMILY },
        extraCssText: "border-radius:0;box-shadow:none;",
        axisPointer: {
          lineStyle: { color: p.border, type: "dashed" },
          crossStyle: { color: p.border, type: "dashed" },
          shadowStyle: { color: p.statusBg },
        },
      },
      categoryAxis: axis,
      valueAxis: axis,
      timeAxis: axis,
      logAxis: axis,
      line: { symbol: "none", smooth: false, lineStyle: { width: 1 } },
      bar: { itemStyle: { borderRadius: 0 } },
      pie: {
        animation: false,
        itemStyle: { borderRadius: 0, borderColor: p.bg, borderWidth: 2 },
        label: { color: p.fg, fontFamily: FONT_FAMILY },
        labelLine: { lineStyle: { color: p.border, width: 1 } },
      },
      scatter: { symbol: "rect" },
      graph: { lineStyle: { color: p.border, type: "dashed" } },
      dataZoom: {
        borderColor: p.border,
        fillerColor: "rgba(0,0,0,0)",
        handleStyle: { color: p.dim, borderColor: p.border },
        textStyle: { color: p.dim, fontFamily: FONT_FAMILY },
        dataBackground: { lineStyle: { color: p.border }, areaStyle: { color: p.statusBg } },
      },
    };
  }

  function themeName(name) {
    return "tuiflow-" + (typeof name === "string" ? name : "video");
  }

  function registerThemes(echarts) {
    Object.keys(PALETTES).forEach((n) => echarts.registerTheme(themeName(n), theme(n)));
    return Object.keys(PALETTES).map(themeName);
  }

  // --- cell grid metrics ------------------------------------------------------

  /**
   * Fit a cell grid into a pixel box.
   * opts: { cols, rows, fontSize, ratio (cell width / font size), leading }
   * Pass cols and/or rows to fit, or fontSize to fix the glyph size.
   * `ratio` should be measured for the loaded font (demo measures it); 0.6 is JetBrains Mono.
   */
  function metrics(width, height, opts) {
    opts = opts || {};
    const ratio = opts.ratio || CELL_RATIO;
    const leading = opts.leading || LEADING;
    let fontSize = opts.fontSize;
    if (!fontSize) {
      const byCols = opts.cols ? width / opts.cols / ratio : Infinity;
      const byRows = opts.rows ? height / opts.rows / leading : Infinity;
      fontSize = Math.min(byCols, byRows);
      if (!Number.isFinite(fontSize)) fontSize = 13;
    }
    const cellW = fontSize * ratio;
    const lineHeight = fontSize * leading;
    return {
      width: width,
      height: height,
      fontSize: fontSize,
      cellW: cellW,
      lineHeight: lineHeight,
      cols: Math.floor(width / cellW),
      rows: Math.floor(height / lineHeight),
      // axis extents so that 1 data unit == 1 cell, anchored top-left
      xMax: width / cellW,
      yMax: height / lineHeight,
    };
  }

  /** Hidden value axes where one unit is one cell; (0,0) is the top-left cell. */
  function cellAxes(m) {
    return {
      grid: { left: 0, right: 0, top: 0, bottom: 0, containLabel: false },
      xAxis: { type: "value", min: 0, max: m.xMax, show: false },
      yAxis: { type: "value", min: 0, max: m.yMax, inverse: true, show: false },
    };
  }

  // --- rich text ----------------------------------------------------------------

  // tuiflow CSS class → rich style key. "c-dim" → "dim". Unknown/empty → "fg".
  const CLASS_KEYS = ["fg", "dim", "border", "orange", "blue", "green", "red", "gray", "bar", "packet", "ok", "warn", "status", "title"];

  function richKey(cls) {
    const k = String(cls || "").replace(/^c-/, "");
    return CLASS_KEYS.indexOf(k) >= 0 ? k : "fg";
  }

  /**
   * zrender rich-text styles for every tuiflow colour class.
   * Each style repeats font + lineHeight so multi-line labels keep the cell grid.
   */
  function richStyles(p, m) {
    p = palette(p);
    const base = { fontFamily: FONT_FAMILY, fontSize: m.fontSize, lineHeight: m.lineHeight };
    const st = (fill, extra) => Object.assign({ fill: fill }, base, extra || {});
    return {
      fg: st(p.fg),
      dim: st(p.dim),
      border: st(p.border),
      orange: st(p.orange),
      blue: st(p.blue),
      green: st(p.green),
      red: st(p.red),
      gray: st(p.gray),
      bar: st(p.orange),
      packet: st(p.orange, { fontWeight: "bold" }),
      ok: st(p.green),
      warn: st(p.red),
      status: st(p.dim, { backgroundColor: p.statusBg }),
      title: st(p.fg, { fontWeight: "bold" }),
    };
  }

  /**
   * Segments → zrender rich markup. Segments are tuiflow's `[text, cls]` pairs
   * (as used by demo/index.html) or plain strings.
   *   rich([["rps  ", "c-dim"], ["████░░", "c-bar"]]) → "{dim|rps  }{bar|████░░}"
   * Note: zrender has no escape for `{name|…}`, so literal braces in data are
   * replaced by full-width ｛ ｝.
   */
  function rich(segments) {
    if (typeof segments === "string") segments = [[segments, ""]];
    return segments
      .map((s) => {
        const text = String(typeof s === "string" ? s : s[0]).replace(/\{/g, "｛").replace(/\}/g, "｝");
        return text ? "{" + richKey(typeof s === "string" ? "" : s[1]) + "|" + text + "}" : "";
      })
      .join("");
  }

  /** Visible cell width of a segment list. */
  function segWidth(segments) {
    if (typeof segments === "string") return Array.from(segments).length;
    return segments.reduce((n, s) => n + Array.from(typeof s === "string" ? s : s[0]).length, 0);
  }

  // --- text items / custom series ------------------------------------------------

  /**
   * A text item placed on the cell grid:
   *   { x, y, text: string | segments, tooltip?: string, name?: string }
   *   { x, y, lines: [segments, ...], ... }   → one rich line per entry
   */
  function itemMarkup(it) {
    return it.lines ? it.lines.map(rich).join("\n") : rich(it.text);
  }

  /**
   * Custom series that draws text items at cell coordinates.
   * opts: { name, tooltip: true|false, emphasis: true|false, z }
   */
  function textSeries(items, m, p, opts) {
    opts = opts || {};
    p = palette(p);
    const styles = richStyles(p, m);
    const markups = items.map(itemMarkup);
    return {
      type: "custom",
      name: opts.name || "tui",
      coordinateSystem: "cartesian2d",
      clip: false,
      z: opts.z === undefined ? 2 : opts.z,
      data: items.map((it) => ({ name: it.name || "", value: [it.x, it.y], tip: it.tooltip || "" })),
      tooltip: {
        show: opts.tooltip !== false,
        trigger: "item",
        formatter: (params) => {
          const it = items[params.dataIndex];
          return it && it.tooltip ? it.tooltip : "";
        },
      },
      renderItem: (params, api) => {
        const idx = params.dataIndex;
        const pos = api.coord([api.value(0), api.value(1)]);
        const it = items[idx];
        const el = {
          type: "text",
          silent: !(it && it.tooltip) && opts.emphasis === false,
          style: {
            x: pos[0],
            y: pos[1],
            text: markups[idx],
            rich: styles,
            fill: p.fg,
            fontFamily: FONT_FAMILY,
            fontSize: m.fontSize,
            lineHeight: m.lineHeight,
            align: "left",
            verticalAlign: "top",
          },
        };
        if (opts.emphasis !== false) {
          el.emphasis = { style: { backgroundColor: p.statusBg } };
        }
        return el;
      },
    };
  }

  // --- node boxes -------------------------------------------------------------------

  /**
   * One dashed tuiflow box as rich lines.
   * node: { x, y, width, title, titleCls, rows: [segments...], style }
   * Returns { x, y, width, height, lines }
   */
  function boxLines(node) {
    const width = node.width || 26;
    const style = node.style || "dashed";
    const frame = tf.box(node.rows.map(() => ""), { width: width, style: style });
    const b = tf.BORDERS[style] || tf.BORDERS.single;
    const inner = width - 2;
    const lines = [];
    // top: ┌ title ╌╌╌┐ — title coloured, rest border
    if (node.title) {
      const t = " " + node.title + " ";
      lines.push([[b.tl, "c-border"], [t, node.titleCls || "c-title"], [b.h.repeat(Math.max(0, inner - t.length)) + b.tr, "c-border"]]);
    } else {
      lines.push([[frame[0], "c-border"]]);
    }
    node.rows.forEach((segs) => {
      const w = segWidth(segs);
      const pad = Math.max(0, inner - 1 - w);
      lines.push([[b.v + " ", "c-border"]].concat(segs, [[" ".repeat(pad) + b.v, "c-border"]]));
    });
    lines.push([[frame[frame.length - 1], "c-border"]]);
    return { x: node.x, y: node.y, width: width, height: lines.length, lines: lines };
  }

  /** Colour each glyph of an edge string and merge runs: dashes are border, packet + head are accent. */
  function edgeSegments(s) {
    const out = [];
    Array.from(s).forEach((ch) => {
      const cls = ch === "╌" || ch === "┆" ? "c-border" : "c-packet";
      const last = out[out.length - 1];
      if (last && last[1] === cls) last[0] += ch;
      else out.push([ch, cls]);
    });
    return out;
  }

  /** Edge item for the text series: horizontal `.o@▶` or vertical `.o@▼`, moving with tick. */
  function edgeItem(e, tick) {
    const t = (tick || 0) + (e.offset || 0);
    const opts = { speed: e.speed, reverse: e.reverse, packet: e.packet, head: e.head };
    if (e.dir === "v") {
      const cells = tf.vedge(e.length, t, opts);
      return { x: e.x, y: e.y, lines: cells.map((c) => edgeSegments(c)) };
    }
    return { x: e.x, y: e.y, text: edgeSegments(tf.edge(e.length, t, opts)) };
  }

  /**
   * Flow diagram option: nodes (dashed boxes), edges (dashed lines with a
   * travelling packet), free texts, status bar.
   * spec: { nodes: [...], edges: [...], texts: [{x,y,text|lines,tooltip}], status: items[] }
   */
  function flowOption(spec, m, p, tick) {
    p = palette(p);
    const nodeItems = (spec.nodes || []).map((n) => {
      const b = boxLines(n);
      return { x: b.x, y: b.y, lines: b.lines, name: n.id || n.title, tooltip: n.tooltip };
    });
    const edgeItems = (spec.edges || []).map((e) => edgeItem(e, tick));
    const texts = (spec.texts || []).slice();
    if (spec.status) {
      texts.push({ x: 0, y: m.rows - 1, text: [[tf.statusBar(spec.status, m.cols), "c-status"]] });
    }
    const axes = cellAxes(m);
    return {
      animation: false,
      backgroundColor: p.bg,
      tooltip: { show: true, textStyle: { fontSize: m.fontSize } },
      grid: axes.grid,
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [
        textSeries(nodeItems, m, p, { name: "nodes", z: 3 }),
        textSeries(edgeItems, m, p, { name: "edges", tooltip: false, emphasis: false, z: 2 }),
        textSeries(texts, m, p, { name: "texts", tooltip: false, emphasis: false, z: 1 }),
      ],
    };
  }

  // --- native ECharts charts under the theme -----------------------------------------

  /** `┄ title ┄┄┄┄` the width of the grid, as segments (row 0 of a cell grid). */
  function dividerSegments(title, cols) {
    const head = "┄ " + title + " ";
    return [["┄ ", "c-border"], [title, "c-title"], [" " + "┄".repeat(Math.max(0, cols - Array.from(head).length)), "c-border"]];
  }

  /**
   * Divider title as a `graphic` text element (ECharts' `title` component
   * ignores rich fills, `graphic` does not).
   */
  function dividerTitle(title, m, p) {
    return {
      type: "text",
      left: 0,
      top: 0,
      silent: true,
      style: {
        text: rich(dividerSegments(title, m.cols)),
        rich: richStyles(p, m),
        fill: palette(p).fg,
        fontFamily: FONT_FAMILY,
        fontSize: m.fontSize,
        lineHeight: m.lineHeight,
      },
    };
  }

  /** Axis label: integers stay integers, big numbers get k/M, the rest one decimal. */
  function axisNumber(v, unit) {
    const s = Math.abs(v) >= 1000 ? tf.formatNumber(v) : Number.isInteger(v) ? String(v) : v.toFixed(1);
    return s + (unit || "");
  }

  /**
   * Step line chart (ECharts `line` series) in the terminal tone.
   * spec: { title, x: [...labels], series: [{ name, values, color? }], unit }
   * opts: { step: "end" | false, legend: true|false }
   */
  function lineOption(spec, m, p, opts) {
    opts = opts || {};
    p = palette(p);
    const colors = seriesColors(p);
    return {
      animation: false,
      backgroundColor: p.bg,
      graphic: [dividerTitle(spec.title || "", m, p)],
      grid: {
        left: m.cellW * 8,
        right: m.cellW * 2,
        top: m.lineHeight * 2,
        bottom: m.lineHeight * (opts.legend === false ? 2 : 3.5),
      },
      tooltip: {
        trigger: "axis",
        textStyle: { fontSize: m.fontSize },
        valueFormatter: (v) => axisNumber(v, spec.unit),
      },
      legend:
        opts.legend === false
          ? { show: false }
          : {
              bottom: 0,
              left: m.cellW * 8,
              itemWidth: m.cellW * 2,
              itemHeight: m.lineHeight * 0.5,
              itemGap: m.cellW * 2,
              textStyle: { fontSize: m.fontSize },
            },
      xAxis: {
        type: "category",
        data: spec.x,
        boundaryGap: false,
        axisLabel: { fontSize: m.fontSize, margin: m.lineHeight * 0.4 },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          fontSize: m.fontSize,
          formatter: (v) => axisNumber(v, spec.unit),
        },
      },
      series: (spec.series || []).map((s, i) => ({
        type: "line",
        name: s.name,
        data: s.values,
        step: opts.step === undefined ? "end" : opts.step,
        symbol: "none",
        lineStyle: { width: 1, color: s.color || colors[i % colors.length] },
        itemStyle: { color: s.color || colors[i % colors.length] },
        areaStyle: s.area ? { opacity: 0.08 } : undefined,
      })),
    };
  }

  /**
   * Horizontal glyph bars: `label  ████░░░░  value`, one row per item.
   * spec: { title, items: [{ label, value, max, text?, warn?: bool, tooltip? }], barWidth, labelWidth, valueWidth }
   */
  function barOption(spec, m, p) {
    p = palette(p);
    const barW = spec.barWidth || Math.max(4, m.cols - (spec.labelWidth || 10) - (spec.valueWidth || 7) - 5);
    const labelW = spec.labelWidth || 10;
    const valueW = spec.valueWidth || 7;
    const items = [];
    if (spec.title) items.push({ x: 0, y: 0, text: dividerSegments(spec.title, m.cols) });
    (spec.items || []).forEach((it, i) => {
      const ratio = it.max ? it.value / it.max : it.value;
      const value = it.text !== undefined ? it.text : tf.formatNumber(it.value);
      items.push({
        x: 1,
        y: (spec.title ? 1 : 0) + i,
        name: it.label,
        tooltip: it.tooltip || it.label + ": " + value,
        text: [
          [tf.padRight(it.label, labelW), "c-dim"],
          [" ", ""],
          [tf.bar(ratio, barW), it.warn ? "c-warn" : "c-bar"],
          [" ", ""],
          [tf.padLeft(value, valueW), "c-title"],
        ],
      });
    });
    const axes = cellAxes(m);
    return {
      animation: false,
      backgroundColor: p.bg,
      tooltip: { show: true, textStyle: { fontSize: m.fontSize } },
      grid: axes.grid,
      xAxis: axes.xAxis,
      yAxis: axes.yAxis,
      series: [textSeries(items, m, p, { name: "bars" })],
    };
  }

  /**
   * Pie (or donut) in the terminal tone. Native ECharts pie: square legend,
   * monospace labels, no slice corner radius, no animation.
   * spec: { title, unit?, donut?: bool, items: [{ name, value, color? }] }
   */
  function pieOption(spec, m, p) {
    p = palette(p);
    const colors = seriesColors(p);
    const donut = !!spec.donut;
    return {
      animation: false,
      backgroundColor: p.bg,
      graphic: spec.title ? [dividerTitle(spec.title, m, p)] : [],
      tooltip: {
        trigger: "item",
        textStyle: { fontSize: m.fontSize },
        formatter: (params) => params.name + "  " + params.percent.toFixed(1) + "%" + (spec.unit ? "  " + axisNumber(params.value, spec.unit) : ""),
      },
      legend: {
        bottom: 0,
        left: m.cellW,
        icon: "rect",
        itemWidth: m.cellW * 2,
        itemHeight: Math.max(4, m.lineHeight * 0.45),
        itemGap: m.cellW * 2,
        textStyle: { fontSize: m.fontSize, fontFamily: FONT_FAMILY, color: p.dim },
      },
      series: [
        {
          type: "pie",
          name: spec.title || "",
          radius: donut ? ["36%", "58%"] : "58%",
          center: ["50%", "46%"],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 0, borderColor: p.bg, borderWidth: 2 },
          label: {
            color: p.fg,
            fontFamily: FONT_FAMILY,
            fontSize: m.fontSize,
            formatter: "{d}%",
          },
          labelLine: { length: 8, length2: 6, lineStyle: { color: p.border, width: 1 } },
          data: (spec.items || []).map((it, i) => ({
            name: it.name,
            value: it.value,
            itemStyle: { color: it.color || colors[i % colors.length] },
          })),
        },
      ],
    };
  }

  return {
    VERSION: VERSION,
    FONT_FAMILY: FONT_FAMILY,
    CELL_RATIO: CELL_RATIO,
    LEADING: LEADING,
    PALETTES: PALETTES,
    palette: palette,
    seriesColors: seriesColors,
    theme: theme,
    themeName: themeName,
    registerThemes: registerThemes,
    metrics: metrics,
    cellAxes: cellAxes,
    rich: rich,
    richKey: richKey,
    richStyles: richStyles,
    segWidth: segWidth,
    textSeries: textSeries,
    boxLines: boxLines,
    edgeItem: edgeItem,
    flowOption: flowOption,
    dividerSegments: dividerSegments,
    dividerTitle: dividerTitle,
    axisNumber: axisNumber,
    lineOption: lineOption,
    barOption: barOption,
    pieOption: pieOption,
  };
});
