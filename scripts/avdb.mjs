// Minimal AVDB API client (avdbapi.com, MacCMS "provide1" format).
// No API key, no dependencies — Node >= 18 global fetch.

export const AVDB_BASE = "https://avdbapi.com/api.php/provide1/vod";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchJson(url, { retries = 3, backoffMs = 800 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "avdb-importer/1.0", Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const data = await res.json();
      if (data && data.code !== undefined && Number(data.code) !== 1) {
        throw new Error(`AVDB error code=${data.code} msg=${data.msg || ""} for ${url}`);
      }
      return data;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(backoffMs * 2 ** attempt);
    }
  }
  throw lastErr;
}

export function buildUrl(params = {}) {
  const u = new URL(AVDB_BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
  }
  return u.toString();
}

// Category list: [{ type_id, type_name }] — 1 Censored ... 7 English subtitle
export async function fetchCategories(opts) {
  const data = await fetchJson(buildUrl({ ac: "list" }), opts);
  return data.class || [];
}

// One page of the catalogue. Filters: t (type_id), wd (search word),
// h (only last N hours — for daily sync), pg, pagesize (max ~100).
export async function fetchPage({ page = 1, pagesize = 100, typeId, search, hours } = {}, opts) {
  const data = await fetchJson(
    buildUrl({ ac: "videolist", pg: page, pagesize, t: typeId, wd: search, h: hours }),
    opts,
  );
  return {
    total: Number(data.total) || 0,
    pagecount: Number(data.pagecount) || 0,
    list: Array.isArray(data.list) ? data.list : [],
  };
}

// Full records for specific vod_ids (comma batch works, verified live).
export async function fetchDetail(ids, opts) {
  const data = await fetchJson(buildUrl({ ac: "detail", ids: ids.join(",") }), opts);
  return Array.isArray(data.list) ? data.list : [];
}
