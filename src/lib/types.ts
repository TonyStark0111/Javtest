export interface PlayEpisode {
  name: string;
  url: string;
}
export interface PlaySource {
  from: string;
  episodes: PlayEpisode[];
}
export interface VideoType {
  id: number;
  name: string;
}
export interface Video {
  id: number;
  code: string;
  slug: string;
  title: string;
  poster: string;
  thumb: string;
  slide?: string;
  screenshot?: string;
  actresses: string[];
  studio: string;
  series: string;
  director: string;
  categories: string[];
  tags: string[];
  description: string;
  duration: string;
  durationSeconds?: number;
  releaseDate: string;
  year: number | null;
  area?: string;
  language?: string;
  type: VideoType;
  sources: PlaySource[];
  playUrl: string;
  updatedAt?: string;
  source?: string;
}
export interface VideoPage {
  videos: Video[];
  total: number;
  page: number;
  pagecount: number;
}

export const TYPE_NAMES: Record<number, string> = {
  1: "Censored",
  2: "Uncensored",
  3: "Uncensored Leaked",
  4: "Amateur",
  5: "Chinese AV",
  6: "Hentai",
  7: "English subtitle",
};
export const TYPE_IDS = [7, 1, 2, 3, 4, 5, 6];
export const DEFAULT_TYPE_ID = 7;
export const PAGE_SIZE = 24;

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "JAV English";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export function displayTitle(v: Video): string {
  // Titles from AVDB sometimes already start with a bracket tag and/or the code.
  let t = v.title.replace(/^\[[^\]]*\]\s*/, "").trim();
  if (v.code && t.toUpperCase().startsWith(v.code.toUpperCase())) {
    t = t.slice(v.code.length).replace(/^[\s\-—]+/, "").trim();
  }
  const label = v.type?.id === 7 ? "Eng Sub" : v.type?.name || "";
  return v.code ? `${v.code}${label ? ` - ${label}` : ""} - ${t}` : t;
}
export function isStreamUrl(url: string): boolean {
  return /\.m3u8($|\?)/i.test(url || "") || /\.mp4($|\?)/i.test(url || "");
}
