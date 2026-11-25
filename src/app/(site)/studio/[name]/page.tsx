import type { Metadata } from "next";
import { getVideos } from "@/lib/data";
import VideoGrid from "@/components/VideoGrid";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }): Promise<Metadata> {
  const name = decodeURIComponent(params.name);
  return { title: `${name} JAV`, description: `Watch JAV videos from ${name}.` };
}

export default async function StudioPage({
  params,
  searchParams,
}: {
  params: { name: string };
  searchParams: { page?: string };
}) {
  const name = decodeURIComponent(params.name);
  const page = Math.max(1, Number(searchParams.page) || 1);
  const res = await getVideos({ page, studio: name });
  return (
    <>
      <h1 className="page-title">{name}</h1>
      <p className="page-sub">{res.total.toLocaleString()} videos</p>
      <VideoGrid videos={res.videos} />
      <Pagination page={res.page} pagecount={res.pagecount} basePath={`/studio/${encodeURIComponent(name)}`} />
    </>
  );
}
