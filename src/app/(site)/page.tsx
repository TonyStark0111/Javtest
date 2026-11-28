import type { Metadata } from "next";
import Link from "next/link";
import { getVideos } from "@/lib/data";
import { DEFAULT_TYPE_ID, SITE_NAME } from "@/lib/types";
import VideoGrid from "@/components/VideoGrid";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Latest English Subtitled JAV`,
  description: `Latest English-subtitled JAV videos in HD, updated daily on ${SITE_NAME}.`,
};

export default async function HomePage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const res = await getVideos({ page, typeId: DEFAULT_TYPE_ID });
  return (
    <>
      <Link href="/engsub" className="collection-banner">
        <span className="collection-banner-title">English Sub Collection</span>
        <span className="collection-banner-sub">11,000+ videos — 5 servers per video »</span>
      </Link>
      <h1 className="page-title">Latest English Subtitled JAV</h1>
      <VideoGrid videos={res.videos} />
      <Pagination page={res.page} pagecount={res.pagecount} basePath="/" />
    </>
  );
}
