import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVideos } from "@/lib/data";
import { TYPE_NAMES } from "@/lib/types";
import VideoGrid from "@/components/VideoGrid";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const name = TYPE_NAMES[Number(params.id)] || "Category";
  return { title: `${name} JAV`, description: `Watch ${name} JAV videos in HD.` };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { page?: string };
}) {
  const typeId = Number(params.id);
  if (!TYPE_NAMES[typeId]) notFound();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const res = await getVideos({ page, typeId });
  const name = typeId === 7 ? "English Subtitle" : TYPE_NAMES[typeId];
  return (
    <>
      <h1 className="page-title">{name}</h1>
      <p className="page-sub">{res.total.toLocaleString()} videos</p>
      <VideoGrid videos={res.videos} />
      <Pagination page={res.page} pagecount={res.pagecount} basePath={`/category/${typeId}`} />
    </>
  );
}
