// English-sub collection from the javenglish network
// (javsubbed.net / javenglish.cc / javx.cc / javx.org / javflix.cc).
// All five sites run ONE shared WordPress catalogue with an open REST API:
//   catalogue + metadata: {base}/wp-json/wp/v2/posts?_embed=1
//   video sources:        the post's own page HTML, in its "sourcetabs"
//                         block (StreamST/VOE/SO/VS/DS embed anchors)
// Live-fetched like the AVDB fallback — no database or setup needed.
// javenglish.cc is primary; the other four are mirrors of the same
// catalogue and are tried in order if the primary fails.
import type { PlaySource, Video, VideoPage } from "./types";
import { PAGE_SIZE } from "./types";

export const ENGSUB_BASES = [
  "https://javenglish.cc",
  "https://javsubbed.net",
  "https://javx.cc",
  "https://javx.org",
  "https://javflix.cc",
];

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/html, */*",
  "Accept-Language": "en-US,en;q=0.9",
};

// Categories on those posts that are NOT a studio name.
const NON_STUDIO = new Set([
  "hardsub", "english-subbed", "eng-sub", "english-subtitle", "english-subtitles",
  "censored", "uncensored", "english-sub", "subbed", "new-releases", "new-release",
]);

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(html: string): string {
  return decodeEntities(String(html || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeWpPost(post: any): Video | null {
  if (!post || !post.slug) return null;
  const slug = String(post.slug);
  const codeMatch = slug.match(/^([a-z]{2,10}-\d{2,6}[a-z]?)/i) || String(post.title?.rendered || "").match(/([A-Za-z]{2,10}-\d{2,6}[A-Za-z]?)/);
  const code = codeMatch ? codeMatch[1].toUpperCase() : "";
  const title = stripTags(post.title?.rendered || slug);
  const emb = post._embedded || {};
  const media = Array.isArray(emb["wp:featuredmedia"]) ? emb["wp:featuredmedia"][0] : null;
  const poster = media?.source_url || "";
  const terms: { taxonomy: string; name: string }[] = (Array.isArray(emb["wp:term"]) ? emb["wp:term"] : [])
    .flat()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((t: any) => ({ taxonomy: String(t.taxonomy || ""), name: decodeEntities(String(t.name || "")) }));
  const actresses = terms.filter((t) => t.taxonomy === "actors").map((t) => t.name).filter(Boolean);
  const catNames = terms.filter((t) => t.taxonomy === "category").map((t) => t.name).filter(Boolean);
  const studio = catNames.find((n) => !NON_STUDIO.has(n.toLowerCase().replace(/\s+/g, "-")) && !NON_STUDIO.has(n.toLowerCase())) || "";
  const tags = terms.filter((t) => t.taxonomy === "post_tag").map((t) => t.name).filter(Boolean);
  const description = stripTags(post.excerpt?.rendered || post.content?.rendered || "");
  return {
    id: Number(post.id) || 0,
    code,
    slug,
    title,
    poster,
    thumb: poster,
    actresses,
    studio,
    series: "",
    director: "",
    categories: catNames,
    tags,
    description,
    duration: "",
    releaseDate: String(post.date || "").slice(0, 10),
    year: post.date ? Number(String(post.date).slice(0, 4)) || null : null,
    type: { id: 7, name: "English subtitle" },
    sources: [],
    playUrl: "",
    source: "engsub",
  };
}

interface WpListResult extends VideoPage {
  base: string;
}

// The network's catalogue also holds older non-subbed posts. English-sub
// videos are exactly the ones in their "Hardsub" category — resolve its ID
// per base (mirrors are separate installs) and filter every query by it.
const hardsubIdCache = new Map<string, number | null>();

async function resolveHardsubId(base: string): Promise<number | null> {
  if (hardsubIdCache.has(base)) return hardsubIdCache.get(base) ?? null;
  let id: number | null = null;
  try {
    const res = await fetch(`${base}/wp-json/wp/v2/categories?slug=hardsub&_fields=id`, {
      headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const arr = await res.json();
      if (Array.isArray(arr) && arr[0]?.id) id = Number(arr[0].id);
    }
  } catch { /* leave null: fall back to unfiltered for this base */ }
  hardsubIdCache.set(base, id);
  return id;
}

async function wpFetchPosts(
  params: Record<string, string | number>,
  filterSub = false
): Promise<{ posts: unknown[]; total: number; pagecount: number; base: string; hardsubId: number | null }> {
  let lastErr: unknown = null;
  for (const base of ENGSUB_BASES) {
    try {
      const hardsubId = filterSub ? await resolveHardsubId(base) : null;
      const u = new URL(`${base}/wp-json/wp/v2/posts`);
      for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
      if (hardsubId) u.searchParams.set("categories", String(hardsubId));
      const res = await fetch(u.toString(), { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`WP HTTP ${res.status}`);
      const posts = await res.json();
      if (!Array.isArray(posts)) throw new Error("WP response not a list");
      return {
        posts,
        total: Number(res.headers.get("x-wp-total")) || posts.length,
        pagecount: Number(res.headers.get("x-wp-totalpages")) || 1,
        base,
        hardsubId,
      };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All engsub sources unreachable");
}

export async function getEngsubVideos(opts: { page?: number; pagesize?: number; search?: string } = {}): Promise<WpListResult> {
  const page = Math.max(1, opts.page || 1);
  const pagesize = Math.min(100, Math.max(1, opts.pagesize || PAGE_SIZE));
  const params: Record<string, string | number> = { page, per_page: pagesize, _embed: 1 };
  if (opts.search) params.search = opts.search;
  const { posts, total, pagecount, base } = await wpFetchPosts(params, true);
  const videos = posts.map(normalizeWpPost).filter((v: Video | null): v is Video => !!v);
  return { videos, total, page, pagecount, base };
}

// Extract the server tabs from a video page's HTML:
// <a class="myLink" href="https://voe.sx/e/xxxx" ...><li class="SourceButtons">... StreamVOE</li></a>
export function extractSources(html: string): PlaySource[] {
  const out: PlaySource[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]*class="myLink"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/g, "&");
    if (!/\/e\//.test(url) || seen.has(url)) continue;
    seen.add(url);
    const label = stripTags(m[2]) || (() => { try { return new URL(url).hostname; } catch { return "Server"; } })();
    out.push({ from: label, episodes: [{ name: "Full", url }] });
  }
  return out;
}

const sourceCache = new Map<string, { at: number; sources: PlaySource[] }>();
const SOURCE_TTL = 30 * 60 * 1000;

export async function getEngsubVideo(slug: string): Promise<Video | null> {
  const { posts, base, hardsubId } = await wpFetchPosts({ slug, _embed: 1 }, true).catch(
    () => ({ posts: [] as unknown[], base: "", hardsubId: null as number | null })
  );
  const post = posts[0];
  if (!post) return null;
  // English-sub only: if this base's Hardsub category is known and the post
  // is not in it, the title is not part of the collection.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const catIds: number[] = Array.isArray((post as any).categories) ? (post as any).categories.map(Number) : [];
  const knownId = hardsubId ?? (base ? await resolveHardsubId(base) : null);
  if (knownId && catIds.length && !catIds.includes(knownId)) return null;
  const video = normalizeWpPost(post);
  if (!video) return null;

  const cached = sourceCache.get(slug);
  if (cached && Date.now() - cached.at < SOURCE_TTL) {
    video.sources = cached.sources;
    video.playUrl = cached.sources[0]?.episodes[0]?.url || "";
    return video;
  }
  // The embeds live in the page HTML on the same base that served the post.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const link = String((post as any).link || `${base}/video/${slug}/`);
  try {
    const res = await fetch(link, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (res.ok) {
      const html = await res.text();
      const sources = extractSources(html);
      if (sources.length) {
        sourceCache.set(slug, { at: Date.now(), sources });
        video.sources = sources;
        video.playUrl = sources[0].episodes[0].url;
      }
    }
  } catch { /* sources stay empty; page shows a clear message */ }
  return video;
}

export async function getEngsubRelated(video: Video, limit = 12): Promise<Video[]> {
  const res = await getEngsubVideos({ page: 1, pagesize: limit + 6 }).catch(
    () => ({ videos: [] as Video[] })
  );
  return res.videos.filter((v) => v.slug !== video.slug).slice(0, limit);
}
