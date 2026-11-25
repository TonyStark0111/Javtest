import type { Metadata } from "next";
import { getVideos } from "@/lib/data";
import VideoGrid from "@/components/VideoGrid";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: { q?: string } }): Promise<Metadata> {
  return { title: searchParams.q ? `Search: ${searchParams.q}` : "Search" };
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const q = (searchParams.q || "").trim();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const res = q ? await getVideos({ page, search: q }) : { videos: [], total: 0, page: 1, pagecount: 0 };
  return (
    <>
      <h1 className="page-title">{q ? `Search results for “${q}”` : "Search"}</h1>
      {q && <p className="page-sub">{res.total.toLocaleString()} videos found</p>}
      <VideoGrid videos={res.videos} />
      {q && (
        <Pagination page={res.page} pagecount={res.pagecount} basePath={`/search?q=${encodeURIComponent(q)}`} />
      )}
    </>
  );
}
