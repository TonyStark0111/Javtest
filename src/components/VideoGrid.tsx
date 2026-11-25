import Link from "next/link";
import type { Video } from "@/lib/types";
import { displayTitle } from "@/lib/types";

export function VideoCard({ video }: { video: Video }) {
  const img = video.thumb || video.poster;
  return (
    <article className="card">
      <Link href={`/video/${encodeURIComponent(video.slug)}`} className="card-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={displayTitle(video)} loading="lazy" referrerPolicy="no-referrer" />
        {video.duration ? <span className="duration-badge">{video.duration}</span> : null}
      </Link>
      <h3 className="card-title">
        <Link href={`/video/${encodeURIComponent(video.slug)}`}>{displayTitle(video)}</Link>
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

export default function VideoGrid({ videos }: { videos: Video[] }) {
  if (!videos.length) return <p className="empty">No videos found.</p>;
  return (
    <div className="grid">
      {videos.map((v) => (
        <VideoCard key={`${v.id}-${v.slug}`} video={v} />
      ))}
    </div>
  );
}
