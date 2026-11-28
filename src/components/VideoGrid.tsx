import Link from "next/link";
import type { Video } from "@/lib/types";
import { displayTitle } from "@/lib/types";

export function VideoCard({ video, basePath = "/video" }: { video: Video; basePath?: string }) {
  const img = video.thumb || video.poster;
  const href = `${basePath}/${encodeURIComponent(video.slug)}`;
  return (
    <article className="card">
      <Link href={href} className="card-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={displayTitle(video)} loading="lazy" referrerPolicy="no-referrer" />
        {video.duration ? <span className="duration-badge">{video.duration}</span> : null}
      </Link>
      <h3 className="card-title">
        <Link href={href}>{video.source === "engsub" ? video.title : displayTitle(video)}</Link>
      </h3>
      <div className="card-meta">
        {video.releaseDate ? <span>{video.releaseDate}</span> : null}
        {video.studio ? (
          <Link href={`/studio/${encodeURIComponent(video.studio)}`} className="card-studio">{video.studio}</Link>
        ) : null}
      </div>
    </article>
  );
}

export default function VideoGrid({ videos, basePath }: { videos: Video[]; basePath?: string }) {
  if (!videos.length) return <p className="empty">No videos found.</p>;
  return (
    <div className="grid">
      {videos.map((v) => (
        <VideoCard key={`${v.id}-${v.slug}`} video={v} basePath={basePath} />
      ))}
    </div>
  );
}
