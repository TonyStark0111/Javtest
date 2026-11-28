import type { Metadata } from "next";
import { getEngsubVideos } from "@/lib/engsub";
import VideoGrid from "@/components/VideoGrid";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "English Sub Collection",
  description: "English-subtitled JAV collection with 5 streaming servers per video.",
};

export default async function EngsubPage({ searchParams }: { searchParams: { page?: string; q?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const q = searchParams.q || "";
  const res = await getEngsubVideos({ page, search: q || undefined }).catch(() => ({
    videos: [], total: 0, page, pagecount: 0,
  }));
  const basePath = q ? `/engsub?q=${encodeURIComponent(q)}` : "/engsub";
  return (
    <>
      <h1 className="page-title">English Sub Collection</h1>
      <p className="page-sub">
        {res.total.toLocaleString()} videos — 5 servers per video (Streamtape, VOE, Doodstream &amp; more)
      </p>
      <form className="index-search" action="/engsub" method="get" role="search">
        <input type="search" name="q" defaultValue={q} placeholder="Search code, title, actress..." aria-label="Search collection" />
        <button type="submit" aria-label="Search">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="#fff" strokeWidth="2.4" />
            <path d="M15.5 15.5L21 21" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      </form>
      <VideoGrid videos={res.videos} basePath="/engsub" />
      <Pagination page={res.page} pagecount={res.pagecount} basePath={basePath} />
    </>
  );
}
