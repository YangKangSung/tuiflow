// echarts/tuiflow-echarts.js — option builders are pure functions, so most of
// this runs without ECharts. The last test renders through ECharts' SSR SVG
// renderer to make sure the options are accepted and the glyphs come out.
const test = require("node:test");
const assert = require("node:assert/strict");
const tf = require("../src/tuiflow.js");
const tfe = require("../echarts/tuiflow-echarts.js");

const width = (s) => Array.from(s).length;
// strip rich markup: "{dim|abc}{bar|█░}" → "abc█░"
const plain = (markup) => markup.replace(/\{[a-z]+\|([^}]*)\}/g, "$1");

test("theme carries the palette, monospace font, dashed axes and radius 0", () => {
  const t = tfe.theme("video");
  assert.equal(t.backgroundColor, "#0f1218");
  assert.equal(t.color[0], "#e8a06a");
  assert.match(t.textStyle.fontFamily, /JetBrains Mono/);
  assert.equal(t.valueAxis.splitLine.lineStyle.type, "dashed");
  assert.equal(t.bar.itemStyle.borderRadius, 0);
  assert.equal(t.pie.animation, false);
  assert.equal(t.pie.itemStyle.borderRadius, 0);
  assert.equal(t.pie.itemStyle.borderColor, "#0f1218");
  assert.equal(tfe.theme("matrix").backgroundColor, "#000000");
  assert.equal(tfe.theme("nope").backgroundColor, "#0f1218"); // falls back to video
});

test("registerThemes registers one theme per palette", () => {
  const seen = [];
  const names = tfe.registerThemes({ registerTheme: (n, obj) => seen.push([n, obj.backgroundColor]) });
  assert.deepEqual(names, ["tuiflow-video", "tuiflow-matrix", "tuiflow-amber"]);
  assert.equal(seen.length, 3);
  assert.equal(seen[2][1], "#0a0700");
});

test("metrics: one axis unit is one cell, fit by cols or rows", () => {
  const m = tfe.metrics(600, 300, { cols: 100 });
  assert.equal(m.cellW, 6);
  assert.equal(m.fontSize, 10);
  assert.equal(m.lineHeight, 12.5);
  assert.equal(m.cols, 100);
  assert.equal(m.rows, 24);
  assert.equal(m.xMax, 100);
  assert.equal(m.yMax, 24);
  const byRows = tfe.metrics(2000, 250, { cols: 100, rows: 20 });
  assert.equal(byRows.fontSize, 10); // rows constraint wins
  const fixed = tfe.metrics(600, 300, { fontSize: 13, ratio: 0.5 });
  assert.equal(fixed.cellW, 6.5);
  const axes = tfe.cellAxes(m);
  assert.equal(axes.yAxis.inverse, true);
  assert.equal(axes.xAxis.max, 100);
});

test("rich: tuiflow classes → rich keys, braces are made safe", () => {
  assert.equal(tfe.rich([["rps  ", "c-dim"], ["██░░", "c-bar"], ["", "c-x"]]), "{dim|rps  }{bar|██░░}");
  assert.equal(tfe.rich("plain"), "{fg|plain}");
  assert.equal(tfe.rich([["{a|b}", "c-unknown"]]), "{fg|｛a|b｝}");
  assert.equal(tfe.richKey("c-packet"), "packet");
  assert.equal(tfe.richKey(""), "fg");
  const styles = tfe.richStyles("video", tfe.metrics(600, 300, { cols: 100 }));
  assert.equal(styles.border.fill, "#3a4150");
  assert.equal(styles.packet.fontWeight, "bold");
  assert.equal(styles.dim.lineHeight, 12.5);
});

test("boxLines: every line is `width` cells wide and matches tf.box", () => {
  const b = tfe.boxLines({
    x: 1, y: 2, width: 26, title: "api-gateway", titleCls: "c-blue",
    rows: [[["p95  ", "c-dim"], [tf.bar(0.5, 10), "c-bar"], ["  48ms", "c-title"]], [["pods ", "c-dim"], ["[ok]", "c-ok"]]],
  });
  assert.equal(b.height, 4);
  const texts = b.lines.map((segs) => plain(tfe.rich(segs)));
  texts.forEach((t) => assert.equal(width(t), 26));
  assert.ok(texts[0].startsWith("┌ api-gateway ╌"));
  assert.ok(texts[1].startsWith("┆ p95  "));
  assert.equal(texts[3], tf.box(["", ""], { width: 26, style: "dashed" })[3]);
});

test("edgeItem: packet moves with tick, dashes are border and packet is accent", () => {
  const a = tfe.edgeItem({ x: 28, y: 3, length: 8, speed: 1 }, 0);
  const b = tfe.edgeItem({ x: 28, y: 3, length: 8, speed: 1 }, 1);
  assert.equal(plain(tfe.rich(a.text)), tf.edge(8, 0));
  assert.equal(plain(tfe.rich(b.text)), tf.edge(8, 1));
  assert.deepEqual(a.text, [[".o@", "c-packet"], ["╌╌╌╌╌", "c-border"], ["▶", "c-packet"]]);
  assert.deepEqual(b.text[0], ["╌", "c-border"]);
  assert.deepEqual(b.text[1], [".o@", "c-packet"]);
  const v = tfe.edgeItem({ x: 50, y: 7, length: 3, dir: "v" }, 0);
  assert.equal(v.lines.length, 4); // 3 cells + head
  assert.deepEqual(v.lines[3], [["▼", "c-packet"]]);
});

test("flowOption: nodes/edges/texts become three custom series on the cell grid", () => {
  const m = tfe.metrics(1200, 450, { cols: 100 });
  const opt = tfe.flowOption(
    {
      nodes: [{ id: "gw", x: 1, y: 2, title: "gw", rows: [[["a", ""]]] }],
      edges: [{ x: 28, y: 3, length: 8 }],
      texts: [{ x: 1, y: 0, text: [["TUIFLOW", "c-title"]] }],
      status: [{ label: "cluster", value: "demo" }],
    },
    m, "video", 5
  );
  assert.equal(opt.animation, false);
  assert.equal(opt.series.length, 3);
  assert.deepEqual(opt.series.map((s) => s.type), ["custom", "custom", "custom"]);
  assert.deepEqual(opt.series[0].data[0].value, [1, 2]);
  assert.equal(opt.series[0].data[0].name, "gw");
  assert.equal(opt.series[2].data.length, 2); // header + status bar
  assert.deepEqual(opt.series[2].data[1].value, [0, m.rows - 1]);
  // renderItem produces a text element at the cell's pixel position
  const el = opt.series[0].renderItem({ dataIndex: 0 }, { value: (i) => [1, 2][i], coord: ([x, y]) => [x * m.cellW, y * m.lineHeight] });
  assert.equal(el.type, "text");
  assert.equal(el.style.x, m.cellW);
  assert.equal(el.style.y, 2 * m.lineHeight);
  assert.equal(el.style.lineHeight, m.lineHeight);
  assert.ok(plain(el.style.text).startsWith("┌ gw ╌"));
});

test("lineOption: step line, divider title, monospace legend", () => {
  const m = tfe.metrics(600, 300, { cols: 100 });
  const opt = tfe.lineOption({ title: "p95", x: ["a", "b"], series: [{ name: "gw", values: [1, 2] }], unit: "ms" }, m, "video");
  assert.equal(opt.series[0].type, "line");
  assert.equal(opt.series[0].step, "end");
  assert.equal(opt.series[0].lineStyle.color, "#e8a06a");
  assert.equal(opt.graphic[0].type, "text");
  assert.equal(width(plain(opt.graphic[0].style.text)), 100);
  assert.ok(plain(opt.graphic[0].style.text).startsWith("┄ p95 ┄┄"));
  assert.equal(opt.yAxis.axisLabel.formatter(1500), "1.5kms");
  assert.equal(opt.yAxis.axisLabel.formatter(20), "20ms");
  assert.equal(opt.yAxis.axisLabel.formatter(2.5), "2.5ms");
  assert.equal(tfe.lineOption({ series: [] }, m, "video", { step: false }).series.length, 0);
});

test("barOption: label / glyph bar / value rows with a tooltip per row", () => {
  const m = tfe.metrics(600, 300, { cols: 50 });
  const opt = tfe.barOption(
    { title: "nodes", items: [{ label: "worker-1", value: 0.44, max: 1, text: "44%" }, { label: "worker-2", value: 0.9, max: 1, text: "90%", warn: true }], barWidth: 12 },
    m, "video"
  );
  const s = opt.series[0];
  assert.equal(s.type, "custom");
  assert.equal(s.data.length, 3);
  const row = s.renderItem({ dataIndex: 1 }, { value: (i) => s.data[1].value[i], coord: (c) => c });
  const text = plain(row.style.text);
  assert.ok(text.startsWith("worker-1   "));
  assert.ok(text.includes(tf.bar(0.44, 12)));
  assert.ok(text.endsWith("    44%"));
  assert.equal(s.tooltip.formatter({ dataIndex: 2 }), "worker-2: 90%");
  const warnRow = s.renderItem({ dataIndex: 2 }, { value: (i) => s.data[2].value[i], coord: (c) => c });
  assert.match(warnRow.style.text, /\{warn\|/);
});

test("pieOption: square slices, palette colours, monospace labels, no animation", () => {
  const m = tfe.metrics(600, 300, { cols: 40 });
  const opt = tfe.pieOption(
    { title: "pods by ns", items: [{ name: "shop", value: 22 }, { name: "kube-system", value: 18 }] },
    m, "video"
  );
  assert.equal(opt.animation, false);
  assert.equal(opt.series[0].type, "pie");
  assert.equal(opt.series[0].itemStyle.borderRadius, 0);
  assert.equal(opt.series[0].data[0].itemStyle.color, "#e8a06a");
  assert.equal(opt.series[0].data[1].itemStyle.color, "#8fb3ff");
  assert.equal(opt.series[0].label.fontFamily, tfe.FONT_FAMILY);
  assert.equal(opt.legend.icon, "rect");
  assert.equal(width(plain(opt.graphic[0].style.text)), 40);
  const donut = tfe.pieOption({ donut: true, items: [{ name: "a", value: 1 }] }, m, "matrix");
  assert.deepEqual(donut.series[0].radius, ["36%", "58%"]);
  assert.equal(donut.series[0].data[0].itemStyle.color, "#00ff41");
});

test("ECharts SSR renders the options to SVG with the glyphs intact", () => {
  let echarts;
  try {
    echarts = require("echarts");
  } catch (e) {
    test.skip("echarts not installed");
    return;
  }
  tfe.registerThemes(echarts);
  const m = tfe.metrics(1200, 450, { cols: 100 });
  const render = (opt) => {
    const chart = echarts.init(null, "tuiflow-video", { renderer: "svg", ssr: true, width: m.width, height: m.height });
    chart.setOption(opt);
    const svg = chart.renderToSVGString();
    chart.dispose();
    return svg;
  };
  const flow = render(
    tfe.flowOption(
      {
        nodes: [{ id: "gw", x: 1, y: 2, title: "api-gateway", titleCls: "c-blue", rows: [[["p95  ", "c-dim"], [tf.bar(0.4, 10), "c-bar"], ["  48ms", "c-title"]]] }],
        edges: [{ x: 28, y: 3, length: 8 }],
        status: [{ label: "render", value: "echarts" }],
      },
      m, "video", 0
    )
  );
  assert.match(flow, /<svg/);
  // rich text → one <text> per coloured segment
  assert.match(flow, />┌<\/text>/);
  assert.match(flow, /fill="#8fb3ff"> api-gateway <\/text>/);
  assert.match(flow, />╌+┐<\/text>/);
  assert.match(flow, /fill="#e8a06a">\.o@<\/text>/);
  assert.match(flow, /fill="#3a4150">╌+<\/text>/);
  assert.match(flow, /fill="#5c6370"> render:\[echarts\]\s*<\/text>/);
  assert.match(flow, /fill="#171b23"/); // status-bar background
  const line = render(tfe.lineOption({ title: "p95", x: ["00", "01", "02"], series: [{ name: "gw", values: [10, 20, 15] }] }, m, "video"));
  assert.match(line, /fill="#3a4150">┄ <\/text>/);
  assert.match(line, /fill="#c9ced6">p95<\/text>/);
  assert.match(line, /stroke="#e8a06a"/); // series line
  assert.match(line, /stroke="#3a4150"/); // dashed axis / split lines
  const bars = render(tfe.barOption({ title: "nodes", items: [{ label: "w1", value: 0.5, max: 1, text: "50%" }] }, m, "video"));
  assert.match(bars, /█/);
  assert.match(bars, /░/);
  const pie = render(tfe.pieOption({ title: "pods", items: [{ name: "shop", value: 22 }, { name: "kube-system", value: 18 }] }, m, "video"));
  assert.match(pie, /shop/);
  assert.match(pie, /#e8a06a/);
  assert.match(pie, /#8fb3ff/);
});
