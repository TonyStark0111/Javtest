# JAV English — AVDB-powered JAV tube site

A simple WordPress-style JAV tube modelled on the javenglish.cc layout type:
poster grid homepage, one page per video, visible "Watch Sources" pills, an info
block under the player, and a Share & Embed panel. Content comes from
[AVDB](https://avdbapi.com) (avdbapi.com, MacCMS API — free, no key).

- **Stack:** Next.js 14 (App Router) + TypeScript, plain CSS, hls.js. SSR for SEO.
- **Default niche:** English-subtitled JAV (AVDB type 7). The category nav also
  exposes all 7 AVDB types: Censored, Uncensored, Uncensored Leaked, Amateur,
  Chinese AV, Hentai, English subtitle.

## Run it

```bash
npm install
npm run build
npm start          # http://localhost:3000
# or for development:
npm run dev
```

## Zero-setup mode (no database)

Copy `.env.example` to `.env.local` — or don't create one at all. If
`MONGODB_URI` is empty or unreachable, the server reads the **live AVDB API**
directly (`ac=videolist` / `ac=detail`) and normalizes records on the fly, so
the site works immediately. This is fine for a demo; for production, import
into Mongo (below) so pages don't depend on AVDB uptime and load faster.

## Fill MongoDB with the bundled importer

The importer from the standalone `avdb-importer` project is bundled under
`scripts/` (`avdb.mjs`, `normalize.mjs`, `import.mjs`):

```bash
# English-subtitled titles only (the site's niche), first 5 pages as a sample:
npm run import -- --type 7 --pages 5 --out data/videos.ndjson

# Whole English-subtitle catalogue:
npm run import -- --type 7 --out data/videos.ndjson

# Daily sync of new/updated titles:
npm run import -- --type 7 --hours 24 --out data/videos.ndjson

# Other types: --type 1..6, or search one code: --search SONE-978
```

Then load the NDJSON into Mongo with an **upsert on `id`** (so re-imports
update instead of duplicating):

```bash
mongoimport --uri "$MONGODB_URI" --collection videos \
  --file data/videos.ndjson --mode upsert --upsertFields id
```

Suggested indexes once imported:

```js
db.videos.createIndex({ slug: 1 }, { unique: true })
db.videos.createIndex({ "type.id": 1, id: -1 })
db.videos.createIndex({ actresses: 1 })
db.videos.createIndex({ studio: 1 })
db.videos.createIndex({ title: "text", code: "text" })
```

Set `MONGODB_URI` in `.env.local` and restart — the site now reads the
`videos` collection and only falls back to the live API when Mongo has no
match for a video slug.

## Environment (kept minimal)

| Var | Purpose |
| --- | --- |
| `MONGODB_URI` | Optional. Mongo connection string; empty = live AVDB mode. |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the site, used for share/embed links and SEO metadata. |
| `NEXT_PUBLIC_SITE_NAME` | Site name in the header and page titles (default "JAV English"). |

## Pages

| Route | What |
| --- | --- |
| `/` | Latest English-subtitle grid + pagination |
| `/category/[id]` | Grid per AVDB type (1–7), paginated |
| `/actress/[name]`, `/studio/[name]` | Listing pages |
| `/search?q=` | Search (AVDB `wd` / Mongo text match) |
| `/video/[slug]` | Player, source pills, info block, Share & Embed, related videos |
| `/e/[slug]` | Bare embed player (no header/footer) — target of the EMBED iframe |
| `/dmca` | DMCA placeholder page |

Also included: an 18+ age-gate overlay (first visit, `localStorage`), the RTA
meta label, code-led SEO titles, and per-video Open Graph metadata.

## Notes / limits

- Playback: if AVDB's play URL is a direct `.m3u8`/`.mp4` stream it plays in
  the built-in hls.js player; if it is a player-page URL (e.g.
  `upload18.to/play/index/<slug>`) it is shown in an iframe instead.
- Source choice is always visible tappable pills — no dropdowns.
- Hosting: it deploys on Netlify as-is — see `DEPLOY-NETLIFY.md`.
  Netlify staff state legal adult (18+) content is allowed as long as it's
  legal in the US, but they reserve sole-discretion removal and their AUP
  bans IP-infringing content; since AVDB indexes third-party rips, DMCA
  takedown/suspension risk is real. An adult-tolerant host/VPS avoids that
  platform risk.
- Replace the placeholder DMCA text and the placeholder site name before
  going live.
