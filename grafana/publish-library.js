#!/usr/bin/env node
/**
 * Upsert grafana/library/*.json into a Grafana instance as library panels.
 * Grafana has no file provisioning for library panels (only Git Sync, still
 * off by default), so this uses the HTTP API instead:
 *
 *   GET   /api/library-elements/:uid       → exists?  (404 = create)
 *   POST  /api/library-elements            → create  { uid, name, kind: 1, model }
 *   PATCH /api/library-elements/:uid       → update  { name, model, kind: 1, version }
 *
 *   node grafana/publish-library.js
 *   GRAFANA_URL=https://grafana.example.com GRAFANA_TOKEN=glsa_... node grafana/publish-library.js
 *
 * Defaults match docker-compose.yml: http://localhost:3000, admin / admin.
 */
const fs = require("fs");
const path = require("path");

const url = (process.env.GRAFANA_URL || "http://localhost:3000").replace(/\/$/, "");
const auth = process.env.GRAFANA_TOKEN
  ? "Bearer " + process.env.GRAFANA_TOKEN
  : "Basic " + Buffer.from((process.env.GRAFANA_USER || "admin") + ":" + (process.env.GRAFANA_PASSWORD || "admin")).toString("base64");
const folderUid = process.env.GRAFANA_FOLDER_UID || "";

async function api(method, p, body) {
  const res = await fetch(url + p, {
    method,
    headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

(async () => {
  const dir = path.join(__dirname, "library");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  if (!files.length) throw new Error("no library files; run node grafana/build-library.js first");

  const health = await api("GET", "/api/health");
  if (health.status !== 200) throw new Error(`Grafana not reachable at ${url} (${health.status})`);

  let failed = 0;
  for (const f of files) {
    const el = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const existing = await api("GET", `/api/library-elements/${el.uid}`);
    let res;
    if (existing.status === 404) {
      res = await api("POST", "/api/library-elements", { uid: el.uid, name: el.name, kind: 1, folderUid, model: el.model });
    } else if (existing.status === 200) {
      const cur = existing.json.result;
      res = await api("PATCH", `/api/library-elements/${el.uid}`, {
        name: el.name,
        kind: 1,
        version: cur.version,
        folderUid: cur.meta && cur.meta.folderUid !== undefined ? cur.meta.folderUid : folderUid,
        model: el.model,
      });
    } else {
      res = existing;
    }
    const ok = res.status === 200;
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${el.uid.padEnd(20)} ${existing.status === 404 ? "created" : "updated"} ${ok ? "v" + (res.json.result && res.json.result.version) : JSON.stringify(res.json).slice(0, 200)}`);
  }
  console.log(`${files.length - failed}/${files.length} library panels published to ${url}`);
  if (failed) process.exit(1);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
