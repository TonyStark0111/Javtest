// Server-side data layer.
// 1) If MONGODB_URI is set and reachable, read the `videos` collection
//    (documents written by the bundled importer, scripts/import.mjs).
// 2) Otherwise fall back to the live AVDB API, normalized on the fly —
//    so the site runs with zero setup.
import type { Video, VideoPage } from "./types";
import { PAGE_SIZE } from "./types";
import { extractCode, normalizeVideo } from "./normalize";

const AVDB_BASE = "https://avdbapi.com/api.php/provide1/vod";

// ---------- live AVDB ----------
// Browser-like headers: AVDB (behind Cloudflare) can answer non-browser
// clients with a challenge/empty body instead of the JSON catalogue.
const AVDB_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://avdbapi.com/",
};

interface AvdbResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  body: string;
  status: number;
  parseError: boolean;
}

// Reads the body as text first, then JSON.parse — so a non-JSON or empty
// response can be logged with a snippet instead of failing silently.
async function avdbFetchRaw(
  params: Record<string, string | number | undefined>
): Promise<AvdbResult> {
  const u = new URL(AVDB_BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
  }
  const res = await fetch(u.toString(), {
    headers: AVDB_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`AVDB HTTP ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = null;
  let parseError = false;
  try {
    data = JSON.parse(body);
  } catch {
    parseError = true;
  }
  return { data, body, status: res.status, parseError };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function avdbFetch(params: Record<string, string | number | undefined>): Promise<any> {
  const { data, body, parseError } = await avdbFetchRaw(params);
  if (parseError) {
    console.error(`AVDB_EMPTY non-JSON response body: ${body.slice(0, 200)}`);
    throw new Error("AVDB response was not JSON");
  }
  return data;
}

// Diagnostic probe used by /api/avdb-check: one videolist request made
// exactly the way avdbFetch makes it, reported raw.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function probeAvdb(): Promise<Record<string, any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = { ok: false, listLength: 0 };
  try {
    const { data, body, status, parseError } = await avdbFetchRaw({
      ac: "videolist",
      pg: 1,
      pagesize: 2,
      t: 7,
    });
    out.httpStatus = status;
    if (parseError) {
      out.bodySnippet = body.slice(0, 300);
      return out;
    }
    out.ok = true;
    out.code = data?.code;
    out.msg = data?.msg;
    out.total = data?.total;
    const list = Array.isArray(data?.list) ? data.list : [];
    out.listLength = list.length;
    if (list.length) {
      out.firstId = list[0]?.vod_id;
      out.firstName = list[0]?.vod_name;
    }
    return out;
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e);
    return out;
  }
}

interface ListOpts {
  page?: number;
  pagesize?: number;
  typeId?: number;
  search?: string;
}

async function liveList({ page = 1, pagesize = PAGE_SIZE, typeId, search }: ListOpts): Promise<VideoPage> {
  const params = { ac: "videolist", pg: page, pagesize, t: typeId, wd: search };
  let { data, body } = await avdbFetchRaw(params);
  if (!Array.isArray(data?.list) || data.list.length === 0) {
    // An empty/missing list from AVDB is how the "No videos found" bug
    // presented on Netlify — log the raw top-level fields and retry once
    // before giving up, so the real cause is visible in the function logs.
    console.error(
      `AVDB_EMPTY code=${data?.code} msg=${data?.msg} total=${data?.total} ` +
        `pagecount=${data?.pagecount} body=${body.slice(0, 200)}`
    );
    ({ data, body } = await avdbFetchRaw(params));
    if (!Array.isArray(data?.list) || data.list.length === 0) {
      console.error(
        `AVDB_EMPTY retry code=${data?.code} msg=${data?.msg} total=${data?.total} ` +
          `pagecount=${data?.pagecount} body=${body.slice(0, 200)}`
      );
    }
  }
  const videos = (Array.isArray(data?.list) ? data.list : [])
    .map(normalizeVideo)
    .filter((v: Video | null): v is Video => !!v);
  return {
    videos,
    total: Number(data.total) || 0,
    page: Number(data.page) || page,
    pagecount: Number(data.pagecount) || 0,
  };
}

async function liveBySlug(slug: string): Promise<Video | null> {
  const code = extractCode(slug.replace(/-/g, " "), slug) || slug.split("-").slice(0, 2).join("-");
  // ac=detail&wd=<CODE> returns every variant of that code; pick the exact slug.
  try {
    const data = await avdbFetch({ ac: "detail", wd: code.toUpperCase() });
    const list = (Array.isArray(data.list) ? data.list : [])
      .map(normalizeVideo)
      .filter((v: Video | null): v is Video => !!v);
    const exact = list.find((v: Video) => v.slug === slug);
    if (exact) return exact;
    if (list.length) return list[0];
  } catch { /* fall through */ }
  // Fallback for code-less slugs (e.g. Hentai): search the words of the slug.
  try {
    const res = await liveList({ page: 1, pagesize: 100, search: slug.replace(/-/g, " ").slice(0, 40) });
    return res.videos.find((v) => v.slug === slug) || null;
  } catch {
    return null;
  }
}

// ---------- MongoDB ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mongoClientPromise: Promise<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getVideosCollection(): Promise<any | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  try {
    if (!mongoClientPromise) {
      const { MongoClient } = await import("mongodb");
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
      mongoClientPromise = client.connect();
    }
    const client = await mongoClientPromise;
    return client.db().collection("videos");
  } catch {
    mongoClientPromise = null;
    return null;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface QueryOpts extends ListOpts {
  actress?: string;
  studio?: string;
}

export async function getVideos(opts: QueryOpts = {}): Promise<VideoPage> {
  const page = Math.max(1, opts.page || 1);
  const pagesize = Math.min(100, Math.max(1, opts.pagesize || PAGE_SIZE));
  const col = await getVideosCollection();
  if (col) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = {};
    if (opts.typeId) q["type.id"] = opts.typeId;
    if (opts.actress) q.actresses = opts.actress;
    if (opts.studio) q.studio = opts.studio;
    if (opts.search) {
      const rx = new RegExp(escapeRegExp(opts.search), "i");
      q.$or = [{ title: rx }, { code: rx }, { actresses: rx }, { studio: rx }];
    }
    const total = await col.countDocuments(q);
    const docs = await col
      .find(q, { projection: { _id: 0 } })
      .sort({ id: -1 })
      .skip((page - 1) * pagesize)
      .limit(pagesize)
      .toArray();
    return { videos: docs as Video[], total, page, pagecount: Math.ceil(total / pagesize) };
  }
  // Live fallback: actress / studio browsing maps to an AVDB word search.
  const search = opts.search || opts.actress || opts.studio || undefined;
  return liveList({ page, pagesize, typeId: opts.typeId, search });
}

export async function getVideoBySlug(slug: string): Promise<Video | null> {
  const col = await getVideosCollection();
  if (col) {
    const doc = await col.findOne({ slug }, { projection: { _id: 0 } });
    if (doc) return doc as Video;
  }
  return liveBySlug(slug);
}

export async function getRelated(video: Video, limit = 12): Promise<Video[]> {
  const res = await getVideos({ page: 1, pagesize: limit + 1, typeId: video.type?.id || undefined });
  return res.videos.filter((v) => v.slug !== video.slug).slice(0, limit);
}

// ---------- Actress / Studio index ----------
// Built from the site's OWN backend data (same source as every other page):
// exact counts from Mongo when configured; in live mode, names are counted
// over a scan of the newest AVDB catalogue pages and cached for 15 minutes.
export interface NameCount {
  name: string;
  count: number;
}

let nameIndexCache: { at: number; actresses: NameCount[]; studios: NameCount[] } | null = null;
const NAME_INDEX_TTL = 15 * 60 * 1000;
const JUNK_ACTORS = new Set([
  "japanese cast", "amateur model", "voice cast", "cast", "unknown", "n/a", "japanese", "amateur",
]);

function toNameCounts(map: Map<string, number>): NameCount[] {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .filter((x) => x.name)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function getNameIndex(): Promise<{ actresses: NameCount[]; studios: NameCount[] }> {
  if (nameIndexCache && Date.now() - nameIndexCache.at < NAME_INDEX_TTL) return nameIndexCache;

  const col = await getVideosCollection();
  if (col) {
    const [actAgg, stuAgg] = await Promise.all([
      col
        .aggregate([
          { $unwind: "$actresses" },
          { $group: { _id: "$actresses", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
        ])
        .toArray(),
      col
        .aggregate([
          { $match: { studio: { $nin: ["", null] } } },
          { $group: { _id: "$studio", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
        ])
        .toArray(),
    ]);
    const out = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actresses: actAgg.map((r: any) => ({ name: String(r._id), count: Number(r.count) || 0 })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      studios: stuAgg.map((r: any) => ({ name: String(r._id), count: Number(r.count) || 0 })),
    };
    nameIndexCache = { at: Date.now(), ...out };
    return out;
  }

  // Live AVDB scan: newest English-subtitle catalogue pages (the site's main
  // catalogue — its actor field carries proper actress names, unlike the
  // amateur/hentai types where it holds junk like "Japanese Cast").
  const actressMap = new Map<string, number>();
  const studioMap = new Map<string, number>();
  const pages = await Promise.all(
    [1, 2, 3, 4, 5, 6, 7, 8].map((pg) =>
      liveList({ page: pg, pagesize: 100, typeId: 7 }).catch(() => ({ videos: [] as Video[] }))
    )
  );
  for (const p of pages) {
    for (const v of p.videos) {
      for (const a of v.actresses || []) {
        // AVDB's actor field sometimes holds generic placeholders, not names.
        if (JUNK_ACTORS.has(a.trim().toLowerCase())) continue;
        actressMap.set(a, (actressMap.get(a) || 0) + 1);
      }
      if (v.studio) studioMap.set(v.studio, (studioMap.get(v.studio) || 0) + 1);
    }
  }
  const out = { actresses: toNameCounts(actressMap), studios: toNameCounts(studioMap) };
  if (out.actresses.length || out.studios.length) nameIndexCache = { at: Date.now(), ...out };
  return out;
}
