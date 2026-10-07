// Node's built-in test runner keeps the project dependency-free.
const test = require("node:test");
const assert = require("node:assert/strict");
const tf = require("../src/tuiflow.js");

const width = (s) => Array.from(s).length;

test("bar fills proportionally and keeps its width", () => {
  assert.equal(width(tf.bar(0.62, 10)), 10);
  assert.equal(tf.bar(0, 10), "░".repeat(10));
  assert.equal(tf.bar(1, 10), "█".repeat(10));
  assert.equal(tf.bar(0.37, 10, { partial: false }), "███" + "░".repeat(7));
  assert.equal(tf.bar(NaN, 4), "░░░░");
});

test("sparkline maps to eight block levels and resamples long series", () => {
  assert.equal(tf.sparkline([0, 10], { min: 0, max: 10 }), "▁█");
  const long = Array.from({ length: 300 }, (_, i) => Math.sin(i / 20));
  assert.equal(width(tf.sparkline(long, { width: 20 })), 20);
  assert.equal(tf.sparkline([NaN, NaN]), "  ");
});

test("edge keeps length and moves the packet with tick", () => {
  const a = tf.edge(12, 0);
  const b = tf.edge(12, 1);
  assert.equal(width(a), 13); // 12 cells + head
  assert.ok(a.startsWith(".o@"));
  assert.ok(b.startsWith("╌.o@"));
  assert.ok(tf.edge(12, 3, { reverse: true }).startsWith("◀"));
  assert.equal(tf.edge(12, 99, { head: "" }).length, 12);
});

test("box lines are equal width and honour title/style", () => {
  const lines = tf.box(["a", "bbb"], { title: "t", width: 20, style: "dashed" });
  assert.equal(lines.length, 4);
  lines.forEach((l) => assert.equal(width(l), 20));
  assert.ok(lines[0].startsWith("┌ t ╌"));
  assert.ok(lines[1].startsWith("┆ a"));
});

test("table pads and aligns columns", () => {
  const out = tf.table([{ pod: "api-1", cpu: 120 }], [
    { key: "pod", header: "POD", width: 8 },
    { key: "cpu", header: "CPU", width: 5, align: "right" },
  ]);
  assert.equal(out[0], "POD      CPU  ");
  assert.equal(out[2], "api-1      120");
});

test("Screen renders text and colour-classed HTML with escaping", () => {
  const s = new tf.Screen(12, 2);
  s.put(0, 0, "<b>", "c-x").put(3, 0, "&ok");
  assert.equal(s.toText(), "<b>&ok\n");
  assert.equal(s.toHTML().split("\n")[0], '<span class="c-x">&lt;b&gt;</span>&amp;ok      ');
});

test("flame indents children and keeps bar width = avail", () => {
  const fl = tf.flame(
    [
      { label: "total", level: 0, value: 100 },
      { label: "child", level: 1, value: 40 },
    ],
    { width: 20, labelWidth: 6 }
  );
  assert.equal(fl.total, 100);
  assert.equal(fl.rows[0].indent, 0);
  assert.equal(fl.rows[1].indent, 2);
  assert.equal(width(fl.rows[0].bar), 20);
  assert.equal(width(fl.rows[1].bar), 18);
  assert.ok(fl.rows[0].bar.startsWith("█"));
  assert.ok(fl.rows[1].pct < fl.rows[0].pct);
});

test("geoPlot places * at lat/lon and keeps a rectangular grid", () => {
  const g = tf.geoPlot(
    [
      { label: "Seoul", lat: 37.57, lon: 126.98 },
      { label: "Virginia", lat: 39.04, lon: -77.49 },
    ],
    { width: 36, height: 8 }
  );
  assert.equal(g.rows.length, 8);
  g.rows.forEach((r) => assert.equal(width(r), 36));
  const marks = g.rows.join("").split("*").length - 1;
  assert.equal(marks, 2);
  const owners = g.owner.flat();
  assert.ok(owners.includes(0) && owners.includes(1));
});

test("braillePie canvas matches cell aspect so the disc is round", () => {
  const a = tf.braillePie([1, 1, 1], { radius: 4, aspect: 2 });
  assert.equal(a.rows.length, 8);
  assert.equal(width(a.rows[0]), 16);
  const b = tf.braillePie([1, 1, 1], { radius: 4, aspect: 1 });
  assert.equal(b.rows.length, 8);
  assert.equal(width(b.rows[0]), 8);
  const filled = a.rows.join("").replace(/ /g, "");
  assert.ok(filled.length > 20);
});

test("braillePie draws straight box-drawing radii between slices", () => {
  const pie = tf.braillePie([1, 1], { radius: 6, aspect: 2 });
  const mid = Math.floor(pie.rows[0].length / 2);
  const col = pie.rows.map((row) => row[mid]).join("");
  assert.match(col, /│/);
});
