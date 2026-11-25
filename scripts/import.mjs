#!/usr/bin/env node
// AVDB importer — pages avdbapi.com into clean local files for a JAV website.
//
// Usage:
//   node src/import.mjs [options]
//
// Options:
//   --out <file>        Output file (default: data/videos.ndjson)
//   --format <fmt>      ndjson | json | csv   (default: ndjson)
//                       ndjson is mongoimport-ready:  mongoimport --db jav --collection videos --file videos.ndjson
//   --type <id|name>    Category filter: 1 Censored, 2 Uncensored, 3 Uncensored Leaked,
//                       4 Amateur, 5 Chinese AV, 6 Hentai, 7 English subtitle (or the name)
//   --search <word>     Search filter (wd), e.g. a JAV code: --search SONE-978
//   --hours <n>         Only videos updated in the last N hours (daily sync: --hours 24)
//   --ids <a,b,c>       Import only these vod_ids (detail endpoint), ignores paging
//   --pagesize <n>      1-100 (default 100)
//   --from-page <n>     Start page (default: checkpoint / 1)
//   --pages <n>         Max pages this run (default: all)
//   --limit <n>         Max videos this run
//   --delay <ms>        Delay between pages (default 250)
//   --fresh             Ignore checkpoint and existing output ids; overwrite output
//   --help
//
// Resume: a checkpoint file (<out>.checkpoint.json) stores the next page for the
// same filter set, and for ndjson output ids already in the file are skipped —
// so re-running the same command continues instead of duplicating.

import fs from "node:fs";
import path from "node:path";
import { fetchCategories, fetchDetail, fetchPage } from "./avdb.mjs";
import { TYPE_NAMES, normalizeVideo } from "./normalize.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    if (key === "fresh" || key === "help") { args[key] = true; continue; }
    args[key] = argv[++i];
  }
  return args;
}

function resolveType(typeArg, categories) {
  if (!typeArg) return undefined;
  const byId = categories.find((c) => String(c.type_id) === String(typeArg));
  if (byId) return Number(byId.type_id);
  const byName = categories.find(
    (c) => c.type_name.toLowerCase() === String(typeArg).toLowerCase(),
  );
  if (byName) return Number(byName.type_id);
  const known = Object.entries(TYPE_NAMES).find(([, n]) => n.toLowerCase() === String(typeArg).toLowerCase());
  return known ? Number(known[0]) : undefined;
}

const CSV_COLS = ["id","code","slug","title","poster","thumb","actresses","studio","series","director","categories","tags","duration","durationSeconds","releaseDate","year","area","language","typeId","typeName","playUrl","updatedAt"];
function csvCell(v) {
  const s = Array.isArray(v) ? v.join("; ") : String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsvRow(v) {
  const flat = { ...v, typeId: v.type.id, typeName: v.type.name };
  return CSV_COLS.map((c) => csvCell(flat[c])).join(",");
}

function loadExistingIds(outFile) {
  const ids = new Set();
  if (!fs.existsSync(outFile)) return ids;
  for (const line of fs.readFileSync(outFile, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { const o = JSON.parse(line); if (o && o.id != null) ids.add(Number(o.id)); } catch { /* partial last line */ }
  }
  return ids;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(fs.readFileSync(new URL(import.meta.url)).toString().split("\n").slice(1, 30).join("\n")); return; }

  const format = (args.format || "ndjson").toLowerCase();
  if (!["ndjson", "json", "csv"].includes(format)) throw new Error(`Unknown --format ${format}`);
  const outFile = path.resolve(args.out || `data/videos.${format === "json" ? "json" : format === "csv" ? "csv" : "ndjson"}`);
  const checkpointFile = `${outFile}.checkpoint.json`;
  const pagesize = Math.min(100, Math.max(1, Number(args.pagesize) || 100));
  const delayMs = Number(args.delay ?? 250);
  const maxPages = args.pages ? Number(args.pages) : Infinity;
  const maxVideos = args.limit ? Number(args.limit) : Infinity;

  const categories = await fetchCategories().catch(() => []);
  const typeNames = { ...TYPE_NAMES };
  for (const c of categories) typeNames[c.type_id] = c.type_name;
  const typeId = resolveType(args.type, categories);
  if (args.type && !typeId) throw new Error(`Unknown --type "${args.type}". Use 1-7 or: ${Object.values(typeNames).join(", ")}`);

  const filterKey = JSON.stringify({ typeId: typeId || null, search: args.search || null, hours: args.hours || null, ids: args.ids || null, pagesize });

  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  // Resume state
  let startPage = args["from-page"] ? Number(args["from-page"]) : 1;
  let seen = new Set();
  let append = false;
  if (!args.fresh && format === "ndjson" && fs.existsSync(outFile)) {
    seen = loadExistingIds(outFile);
    append = true;
    if (!args["from-page"] && fs.existsSync(checkpointFile)) {
      try {
        const cp = JSON.parse(fs.readFileSync(checkpointFile, "utf8"));
        if (cp.filterKey === filterKey && cp.nextPage) startPage = cp.nextPage;
      } catch { /* ignore corrupt checkpoint */ }
    }
  }
  if (args.fresh && fs.existsSync(checkpointFile)) fs.rmSync(checkpointFile);

  const out = fs.createWriteStream(outFile, { flags: append ? "a" : "w" });
  const jsonItems = [];
  if (format === "csv" && !append) out.write(CSV_COLS.join(",") + "\n");

  let imported = 0, skipped = 0, page = startPage, pagesDone = 0, total = null, pagecount = null;

  const emit = (rawList) => {
    for (const raw of rawList) {
      if (imported >= maxVideos) break;
      const v = normalizeVideo(raw, typeNames);
      if (!v) continue;
      if (seen.has(v.id)) { skipped++; continue; }
      seen.add(v.id);
      if (format === "ndjson") out.write(JSON.stringify(v) + "\n");
      else if (format === "csv") out.write(toCsvRow(v) + "\n");
      else jsonItems.push(v);
      imported++;
    }
  };

  if (args.ids) {
    const ids = String(args.ids).split(",").map((s) => Number(s.trim())).filter(Boolean);
    emit(await fetchDetail(ids));
  } else {
    while (pagesDone < maxPages && imported < maxVideos) {
      const res = await fetchPage({ page, pagesize, typeId, search: args.search, hours: args.hours ? Number(args.hours) : undefined });
      total = res.total; pagecount = res.pagecount;
      if (!res.list.length) break;
      emit(res.list);
      pagesDone++;
      console.log(`page ${page}/${pagecount} — imported ${imported}, skipped ${skipped}, catalogue total ${total}`);
      page++;
      fs.writeFileSync(checkpointFile, JSON.stringify({ filterKey, nextPage: page, imported, updatedAt: new Date().toISOString() }, null, 2));
      if (pagecount && page > pagecount) break;
      if (delayMs) await sleep(delayMs);
    }
  }

  if (format === "json") out.write(JSON.stringify(jsonItems, null, 2));
  await new Promise((r) => out.end(r));
  console.log(`Done. ${imported} new video(s), ${skipped} duplicate(s) skipped -> ${outFile}`);
}

main().catch((err) => { console.error(`Importer failed: ${err.message}`); process.exit(1); });
