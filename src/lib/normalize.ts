// TypeScript port of scripts/normalize.mjs (the AVDB MacCMS -> Video mapping).
// Kept in sync with the importer so live-API documents match Mongo documents.
import type { PlaySource, Video } from "./types";
import { TYPE_NAMES } from "./types";

export function splitList(value: unknown): string[] {
  if (!value) return [];
  return String(value).split(",").map((s) => s.trim()).filter(Boolean);
}
export function durationToSeconds(duration: unknown): number {
  if (!duration) return 0;
  const parts = String(duration).split(":").map((p) => parseInt(p, 10));
  if (parts.some(Number.isNaN)) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}
export function extractCode(vodEn: unknown, vodSub: unknown): string {
  const en = String(vodEn || "").trim();
  const m = en.match(/[A-Za-z]{2,10}-\d{2,6}[A-Za-z]?\b/);
  if (m) return m[0].toUpperCase();
  if (en && !en.includes(" ")) return en.toUpperCase();
  const sub = String(vodSub || "").trim();
  const m2 = sub.match(/^([a-z]{2,10}-\d{2,6})/i);
  return m2 ? m2[1].toUpperCase() : "";
}
export function rebuildImage(slug: string, kind = "poster"): string {
  if (!slug) return "";
  return `https://upload18.cc/v/${String(slug).toUpperCase()}/${kind}.jpg`;
}
function cleanUrl(u: unknown): string {
  return String(u || "").replace(/\\\//g, "/").trim();
}
export function parsePlaySources(vodPlayFrom: unknown, vodPlayUrl: unknown): PlaySource[] {
  const froms = String(vodPlayFrom || "").split("$$$").map((s) => s.trim());
  const groups = String(vodPlayUrl || "").split("$$$");
  const sources: PlaySource[] = [];
  groups.forEach((group, i) => {
    const episodes = group
      .split("#")
      .map((ep) => {
        const idx = ep.indexOf("$");
        if (idx === -1) return { name: "Full", url: cleanUrl(ep) };
        return { name: ep.slice(0, idx).trim() || "Full", url: cleanUrl(ep.slice(idx + 1)) };
      })
      .filter((ep) => ep.url);
    if (episodes.length) sources.push({ from: froms[i] || froms[0] || "", episodes });
  });
  return sources;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeVideo(raw: any): Video | null {
  if (!raw || raw.vod_id == null) return null;
  const slug = String(raw.vod_sub || "").trim();
  const code = extractCode(raw.vod_en, raw.vod_sub);
  const poster = cleanUrl(raw.vod_pic) || rebuildImage(slug, "poster");
  const thumb = cleanUrl(raw.vod_pic_thumb) || rebuildImage(slug, "thumb");
  const sources = parsePlaySources(raw.vod_play_from, raw.vod_play_url);
  const typeId = Number(raw.type_id) || 0;
  return {
    id: Number(raw.vod_id),
    code,
    slug,
    title: String(raw.vod_name || "").trim(),
    poster,
    thumb,
    slide: cleanUrl(raw.vod_pic_slide) || poster,
    screenshot: cleanUrl(raw.vod_pic_screenshot) || poster,
    actresses: splitList(raw.vod_actor),
    studio: String(raw.vod_writer || "").trim(),
    series: String(raw.vod_serial || "").trim(),
    director: String(raw.vod_director || "").trim(),
    categories: splitList(raw.vod_class),
    tags: splitList(raw.vod_tag),
    description: String(raw.vod_content || raw.vod_blurb || "").trim(),
    duration: String(raw.vod_duration || "").trim(),
    durationSeconds: durationToSeconds(raw.vod_duration),
    releaseDate: String(raw.vod_pubdate || "").trim(),
    year: Number(raw.vod_year) || null,
    area: String(raw.vod_area || "").trim(),
    language: String(raw.vod_lang || "").trim(),
    type: { id: typeId, name: raw.type_name || TYPE_NAMES[typeId] || "" },
    sources,
    playUrl: sources[0]?.episodes[0]?.url || "",
    updatedAt: String(raw.vod_time || "").trim(),
    source: "avdb",
  };
}
