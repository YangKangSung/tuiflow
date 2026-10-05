// Business Text panel → "JavaScript code after content ready"
//
// Animates the packet on the dashed edge under the box. Runs once per render
// with `this` persisted between renders; the returned function is called by
// the panel as cleanup before the next render, so timers never leak.

const tf = window.tuiflow;
const edge = context.element.querySelector(".tf-edge");
if (!tf || !edge) {
  return;
}

// Speed follows the latest rps value; fall back to 1.
// In "All data" mode context.data is an array of frames (each an array of
// rows); in "All rows" mode it is the rows array itself.
const frames = Array.isArray(context.data) ? context.data : [];
const rows = Array.isArray(frames[0]) ? frames[0] : frames;
const last = rows.length ? Number(rows[rows.length - 1].rps) : NaN;
const speed = Number.isFinite(last) ? 0.5 + last / 600 : 1;

return tf.animate((tick) => {
  edge.textContent = tf.edge(16, tick, { speed });
}, 8);
