import { notFound } from "next/navigation";
import { getVideoBySlug } from "@/lib/data";
import Player from "@/components/Player";

export const dynamic = "force-dynamic";

// Bare embed player — no header, footer or age gate. Used by the EMBED iframe.
export default async function EmbedPage({ params }: { params: { slug: string } }) {
  const video = await getVideoBySlug(decodeURIComponent(params.slug));
  if (!video) notFound();
  const sources = video.sources?.length
    ? video.sources
    : video.playUrl
      ? [{ from: "", episodes: [{ name: "Full", url: video.playUrl }] }]
      : [];
  return (
    <div className="embed-root">
      <Player sources={sources} poster={video.poster} title={video.title} />
    </div>
  );
}
