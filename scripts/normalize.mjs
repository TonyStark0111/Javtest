// AVDB (MacCMS) record -> clean video document for a JAV website.
//
// Field mapping (verified live against avdbapi.com on 2026-11-25):
//   vod_id          -> id            AVDB internal id (dedupe / detail key)
//   vod_en          -> code          JAV code, e.g. "SONE-978" (may carry a
//                                    prefix like "[UNCENSORED-LEAK] SONE-978")
//   vod_sub         -> slug          e.g. "sone-978-uncensored-leak"
//   vod_name        -> title
//   vod_pic         -> poster        https://upload18.cc/v/<CODE>/poster.jpg
//   vod_pic_thumb   -> thumb         https://upload18.cc/v/<CODE>/thumb.jpg
//   vod_pic_slide / vod_pic_screenshot -> poster fallback
//   vod_actor       -> actresses[]   comma-separated in the raw record
//   vod_writer      -> studio        label/series brand, e.g. "S1 NO.1 STYLE"
//   vod_serial      -> series
//   vod_director    -> director
//   vod_class       -> categories[]  comma-separated
//   vod_tag         -> tags[]        comma-separated
//   vod_blurb/vod_content -> description
//   vod_duration    -> duration ("02:26:13") + durationSeconds
//   vod_pubdate     -> releaseDate, vod_year -> year
//   vod_area/vod_lang -> area / language
//   type_id/type_name -> type { id, name }  1 Censored, 2 Uncensored,
//                        3 Uncensored Leaked, 4 Amateur, 5 Chinese AV,
//                        6 Hentai, 7 English subtitle
//   vod_play_from   -> sources[].from (e.g. "ngm3u8")
//   vod_play_url    -> sources[].episodes[]  MacCMS encoding, see parsePlaySources
//   vod_time        -> updatedAt (source timestamp string)

export const TYPE_NAMES = {
  1: "Censored",
  2: "Uncensored",
  3: "Uncensored Leaked",
  4: "Amateur",
  5: "Chinese AV",
  6: "Hentai",
  7: "English subtitle",
};

export function splitList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function durationToSeconds(duration) {
  if (!duration) return 0;
  const parts = String(duration).split(":").map((p) => parseInt(p, 10));
  if (parts.some(Number.isNaN)) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

// Best-effort JAV code extraction: "SONE-978" out of "[UNCENSORED-LEAK] SONE-978".
export function extractCode(vodEn, vodSub) {
  const en = String(vodEn || "").trim();
  const m = en.match(/[A-Za-z]{2,10}-\d{2,6}[A-Za-z]?\b/);
  if (m) return m[0].toUpperCase();
  if (en && !en.includes(" ")) return en.toUpperCase();
  const sub = String(vodSub || "").trim();
  const m2 = sub.match(/^([a-z]{2,10}-\d{2,6})/i);
  // No code pattern (e.g. Hentai episodes carry a title in vod_en, not a
  // code) -> empty code; the slug is the identifier for those records.
  return m2 ? m2[1].toUpperCase() : "";
}

// Thumbnails follow a fixed pattern on upload18.cc, so a missing/broken one
// can be rebuilt from the code + slug alone:
//   https://upload18.cc/v/<SLUG-UPPERCASE>/poster.jpg | thumb.jpg
export function rebuildImage(slug, kind = "poster") {
  if (!slug) return "";
  return `https://upload18.cc/v/${String(slug).toUpperCase()}/${kind}.jpg`;
}

function cleanUrl(u) {
  return String(u || "").replace(/\\\//g, "/").trim();
}

// MacCMS play-url encoding:
//   sources  separated by "$$$"
//   episodes separated by "#"
//   each episode is "Name$url" (name may be empty -> "Full")
// vod_play_from is "$$$"-separated in the same order as the sources.
export function parsePlaySources(vodPlayFrom, vodPlayUrl) {
  const froms = String(vodPlayFrom || "").split("$$$").map((s) => s.trim());
  const groups = String(vodPlayUrl || "").split("$$$");
  const sources = [];
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

export function normalizeVideo(raw, typeNames = TYPE_NAMES) {
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
    type: { id: typeId, name: raw.type_name || typeNames[typeId] || "" },
    sources,
    playUrl: sources[0]?.episodes[0]?.url || "",
    updatedAt: String(raw.vod_time || "").trim(),
    source: "avdb",
  };
}
