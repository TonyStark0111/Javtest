import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEngsubRelated, getEngsubVideo } from "@/lib/engsub";
import Player from "@/components/Player";
import VideoGrid from "@/components/VideoGrid";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const video = await getEngsubVideo(decodeURIComponent(params.slug)).catch(() => null);
  if (!video) return { title: "Video not found" };
  return {
    title: video.title,
    description: (video.description || video.title).slice(0, 160),
    openGraph: { title: video.title, images: video.poster ? [video.poster] : [] },
  };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="info-row">
      <span className="info-label">{label}:</span>
      <span className="info-value">{children}</span>
    </div>
  );
}

export default async function EngsubVideoPage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug);
  const video = await getEngsubVideo(slug).catch(() => null);
  if (!video) notFound();
  const related = await getEngsubRelated(video, 12).catch(() => []);

  return (
    <>
      <h1 className="video-title">{video.title}</h1>
      {video.sources.length ? (
        <Player sources={video.sources} poster={video.poster} title={video.title} />
      ) : (
        <div className="player-empty">Video servers could not be loaded for this title right now. Please try again shortly.</div>
      )}

      <section className="info-block">
        {video.code && <Row label="Code">{video.code}</Row>}
        {video.actresses.length > 0 && (
          <Row label="Actress">
            {video.actresses.map((a, i) => (
              <span key={a}>
                {i > 0 && ", "}
                <Link href={`/actress/${encodeURIComponent(a)}`}>{a}</Link>
              </span>
            ))}
          </Row>
        )}
        {video.studio && (
          <Row label="Studio">
            <Link href={`/studio/${encodeURIComponent(video.studio)}`}>{video.studio}</Link>
          </Row>
        )}
        {video.releaseDate && <Row label="Date">{video.releaseDate}</Row>}
        {video.tags.length > 0 && (
          <Row label="Tags">
            {video.tags.slice(0, 20).map((t, i) => (
              <span key={t}>
                {i > 0 && ", "}
                <Link href={`/engsub?q=${encodeURIComponent(t)}`}>{t}</Link>
              </span>
            ))}
          </Row>
        )}
        {video.description && <p className="description">{video.description}</p>}
      </section>

      {related.length > 0 && (
        <>
          <h2 className="section-title">Related Videos</h2>
          <VideoGrid videos={related} basePath="/engsub" />
        </>
      )}
    </>
  );
}
