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

test("pie fits block glyphs per cell: round edge, straight cuts, two colours per cell", () => {
  const aspect = 16.25 / 7.8;
  const pie = tf.braillePie([3, 1, 1], { radius: 8 });
  assert.equal(pie.rows.length, 16);
  pie.rows.forEach((row) => {
    assert.equal(width(row), pie.rows[0].length);
    assert.match(row, /^[ \u2580-\u259f]*$/, "block elements only");
  });
  // the rim is anti-aliased with eighth blocks, not whole-cell steps
  assert.match(pie.rows[0], /[▁▂▃▅▆▇]/);
  assert.match(pie.rows[pie.rows.length - 1], /[▔▀]/);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  pie.rows.forEach((row, y) => {
    Array.from(row).forEach((ch, x) => {
      if (ch === " ") return;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + 1);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + 1);
    });
  });
  const pixelRatio = (maxX - minX) / aspect / (maxY - minY);
  assert.ok(Math.abs(pixelRatio - 1) < 0.08, "pixel ratio " + pixelRatio);
  // a diagonal cut crosses cells where the upper and lower pixel differ
  const twoTone = pie.bg.flat().filter((b) => b >= 0).length;
  assert.ok(twoTone > 0, "some cells carry a background slice");
  pie.bg.forEach((row, y) => row.forEach((b, x) => { if (b >= 0) assert.notEqual(pie.rows[y][x], "█"); }));

  const halves = tf.braillePie([1, 1], { radius: 8 });
  const cuts = [];
  halves.owner.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const twoTone = halves.bg[y][x] >= 0;
      const change = x > 0 && row[x - 1] >= 0 && row[x] >= 0 && row[x - 1] !== row[x];
      if (twoTone || change) cuts.push(x);
    }
  });
  assert.ok(cuts.length > 8);
  assert.equal(new Set(cuts).size, 1, "vertical cut stays in one column: " + cuts.join(","));
  const cutGlyphs = new Set(halves.rows.map((r) => Array.from(r)[cuts[0]]));
  assert.ok([...cutGlyphs].every((g) => g === "▐" || g === "▌"), "cut through a cell is a half block: " + [...cutGlyphs]);

  const quarters = tf.braillePie([1, 1, 1, 1], { radius: 8 });
  const midX = Math.floor(quarters.rows[0].length / 2);
  const ys = [];
  for (let x = midX + 2; x < quarters.owner[0].length; x++) {
    for (let y = 1; y < quarters.owner.length; y++) {
      if (quarters.owner[y - 1][x] === 0 && quarters.owner[y][x] === 1) ys.push(y);
    }
  }
  assert.ok(ys.length > 4);
  assert.equal(new Set(ys).size, 1, "horizontal cut stays on one row: " + ys.join(","));

  const hole = tf.braillePie([1], { radius: 8, donut: 0.55 });
  assert.equal(Array.from(hole.rows[8])[Math.floor(hole.rows[8].length / 2)], " ");

  const segs = tf.pixelSegments(pie.rows, pie.owner, pie.bg, (i) => "s" + i, (i) => "bg" + i);
  const classes = new Set(segs.flat().map((s) => s[1]));
  assert.ok([...classes].some((c) => /^s\d bg\d$/.test(c)), "two-tone run carries both classes");
  segs.forEach((row, y) => assert.equal(width(row.map((s) => s[0]).join("")), width(pie.rows[y])));
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
