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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function avdbFetch(params: Record<string, string | number | undefined>): Promise<any> {
  const u = new URL(AVDB_BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
  }
  const res = await fetch(u.toString(), {
    headers: { "User-Agent": "javenglish-avdb-site/1.0", Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AVDB HTTP ${res.status}`);
  return res.json();
}

interface ListOpts {
  page?: number;
  pagesize?: number;
  typeId?: number;
  search?: string;
}

async function liveList({ page = 1, pagesize = PAGE_SIZE, typeId, search }: ListOpts): Promise<VideoPage> {
  const data = await avdbFetch({ ac: "videolist", pg: page, pagesize, t: typeId, wd: search });
  const videos = (Array.isArray(data.list) ? data.list : [])
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
