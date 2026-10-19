/*!
 * tuiflow dom — what happens after a tuiflow panel's HTML is in the page:
 *
 * 1. Animates packets on .tf-packet (canvas / service flow) and the empty
 *    .tf-edge (flow). Node-graph arrows also use .tf-edge but already have
 *    text — left alone.
 * 2. Walks .tf-flame rows so the hottest stack is scanned.
 * 3. Fills async placeholders (alerts / dashboards / annotations) from the
 *    Grafana HTTP API. Only panels that emit those placeholders make requests.
 *
 * UMD: CommonJS require(), bundler import, or dynamic import() (then it
 * registers itself as globalThis.tuiflowDom).
 *
 *   const stop = tuiflowDom.animate(element, rows, tuiflow);  // call stop() before re-render
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.tuiflowDom = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /**
   * root: the element that contains the rendered <pre class="tf">
   * data: the panel's rows (packet speed follows the last `rps`), may be []
   * tf:   the tuiflow core module
   * Returns a cleanup function that stops every timer and pending fill.
   */
  function animate(root, data, tf) {
    if (!tf || !root) {
      return function noop() {};
    }
    const cleanups = [];
    const esc = tf.escapeHtml;
    const span = (text, cls, style) => "<span" + (cls ? ' class="' + cls + '"' : "") + (style ? ' style="' + style + '"' : "") + ">" + esc(text) + "</span>";

    // ---- packet animation ------------------------------------------------------
    const frames = Array.isArray(data) ? data : [];
    const rows = Array.isArray(frames[0]) ? frames[0] : frames;
    const last = rows.length ? Number(rows[rows.length - 1].rps) : NaN;
    const speed = Number.isFinite(last) ? 0.5 + last / 600 : 1;
    root.querySelectorAll(".tf-packet").forEach((edge, i) => {
      const n = Number(edge.dataset.width) || 16;
      const phase = edge.dataset.phase !== undefined && edge.dataset.phase !== "" ? Number(edge.dataset.phase) : i * 4;
      const dir = edge.dataset.dir || "";
      cleanups.push(tf.animate((tick) => {
        if (dir === "v" || dir === "up") {
          const cells = tf.vedge(n, tick + phase, { speed, head: edge.dataset.head || "▼" });
          const row = Number(edge.dataset.row) || 0;
          const idx = dir === "up" ? cells.length - 1 - row : row;
          edge.textContent = cells[idx] || " ";
        } else {
          edge.textContent = tf.edge(n, tick + phase, { speed });
        }
      }, 8));
    });
    const flowEdge = Array.from(root.querySelectorAll(".tf-edge:not(.tf-packet)")).find((el) => !el.textContent.trim());
    if (flowEdge) {
      cleanups.push(tf.animate((tick) => { flowEdge.textContent = tf.edge(16, tick, { speed }); }, 8));
    }

    // ---- flame scan ------------------------------------------------------------
    const flames = root.querySelectorAll(".tf-flame");
    if (flames.length) {
      cleanups.push(tf.animate((tick) => {
        const on = tick % flames.length;
        flames.forEach((el, i) => el.classList.toggle("tf-scan", i === on));
      }, 4));
    }

    // ---- async lists -----------------------------------------------------------
    const win = typeof window !== "undefined" ? window : {};
    const base = (win.grafanaBootData && win.grafanaBootData.settings && win.grafanaBootData.settings.appSubUrl) || "";
    const api = (p) => fetch(base + p, { headers: { Accept: "application/json" }, credentials: "same-origin" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status + " " + r.statusText))));
    let alive = true;
    cleanups.push(() => { alive = false; });

    root.querySelectorAll(".tf-async").forEach((el) => {
      const max = Number(el.dataset.max) || 20;
      const kind = el.dataset.tf;
      const render = (html) => { if (alive) el.innerHTML = html; };
      const fail = (e) => render(span("fetch failed: " + e.message, "tf-crit"));

      if (kind === "alerts") {
        api("/api/alertmanager/grafana/api/v2/alerts").then((alerts) => {
          if (!alerts.length) return render(span("[ok]", "tf-ok") + " no active alerts");
          const w = Math.min(32, Math.max(...alerts.map((a) => (a.labels.alertname || "").length)));
          render(alerts.slice(0, max).map((a) => {
            const sev = (a.labels.severity || "").toLowerCase();
            const state = (a.status && a.status.state) || "active";
            const cls = state !== "active" ? "tf-dim" : /crit|fatal|page/.test(sev) ? "tf-crit" : /warn/.test(sev) ? "tf-warn" : "tf-crit";
            const since = a.startsAt ? new Date(a.startsAt).toTimeString().slice(0, 5) : "";
            const summary = (a.annotations && (a.annotations.summary || a.annotations.description)) || "";
            return span(tf.padRight("[" + (state === "active" ? "firing" : state) + "]", 12), cls) + " " + esc(tf.padRight(a.labels.alertname || "?", w)) + "  " + span(tf.padRight(sev, 8), "tf-dim") + " " + span(since, "tf-dim") + "  " + esc(summary);
          }).join("\n") + (alerts.length > max ? "\n" + span("… " + (alerts.length - max) + " more", "tf-dim") : ""));
        }).catch(fail);
      } else if (kind === "dashboards") {
        api("/api/search?type=dash-db&limit=" + max).then((items) => {
          if (!items.length) return render(span("no dashboards", "tf-dim"));
          const w = Math.min(40, Math.max(...items.map((d) => d.title.length)));
          render(items.map((d) =>
            '<a href="' + esc(base + d.url) + '" style="color:inherit;text-decoration:none">' + span("▸ ", "tf-edge") + esc(tf.padRight(d.title, w)) + "</a>  " +
            span(tf.padRight(d.folderTitle || "General", 16), "tf-dim") + " " + span((d.tags || []).map((t) => "#" + t).join(" "), "tf-s1")
          ).join("\n"));
        }).catch(fail);
      } else if (kind === "annotations") {
        api("/api/annotations?limit=" + max).then((items) => {
          if (!items.length) return render(span("[ok]", "tf-ok") + " no annotations in range");
          const w = Math.min(36, Math.max(...items.map((a) => (a.title || a.text || "").length)));
          render(items.slice(0, max).map((a) => {
            const ts = a.time ? new Date(a.time).toTimeString().slice(0, 5) : "";
            const title = a.title || a.text || "?";
            const tags = (a.tags || []).map((t) => "#" + t).join(" ");
            return span("※ ", "tf-s0") + span(tf.padRight(ts, 5), "tf-dim") + " " + esc(tf.padRight(title, w)) + (tags ? "  " + span(tags, "tf-s1") : "");
          }).join("\n") + (items.length > max ? "\n" + span("… " + (items.length - max) + " more", "tf-dim") : ""));
        }).catch(fail);
      }
    });

    return () => cleanups.forEach((fn) => fn());
  }

  return { animate: animate };
});
