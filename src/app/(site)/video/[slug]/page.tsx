import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRelated, getVideoBySlug } from "@/lib/data";
import { SITE_URL, displayTitle } from "@/lib/types";
import Player from "@/components/Player";
import ShareEmbed from "@/components/ShareEmbed";
import VideoGrid from "@/components/VideoGrid";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const video = await getVideoBySlug(decodeURIComponent(params.slug));
  if (!video) return { title: "Video not found" };
  const title = displayTitle(video);
  return {
    title,
    description: (video.description || title).slice(0, 160),
    openGraph: { title, images: video.poster ? [video.poster] : [] },
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

export default async function VideoPage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug);
  const video = await getVideoBySlug(slug);
  if (!video) notFound();
  const title = displayTitle(video);
  const related = await getRelated(video, 12).catch(() => []);

  const sources = video.sources?.length
    ? video.sources
    : video.playUrl
      ? [{ from: "", episodes: [{ name: "Full", url: video.playUrl }] }]
      : [];

  return (
    <>
      <h1 className="video-title">{title}</h1>
      <Player sources={sources} poster={video.poster} title={title} />

      <section className="info-block">
        {video.code && <Row label="Code">{video.code}</Row>}
        {video.actresses?.length > 0 && (
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
        {video.series && <Row label="Series">{video.series}</Row>}
        {video.director && <Row label="Director">{video.director}</Row>}
        {video.releaseDate && <Row label="Release date">{video.releaseDate}</Row>}
        {video.duration && <Row label="Duration">{video.duration}</Row>}
        {video.type?.name && (
          <Row label="Category">
            <Link href={`/category/${video.type.id}`}>{video.type.name}</Link>
          </Row>
        )}
        {(video.categories?.length || video.tags?.length) > 0 && (
          <Row label="Tags">
            {[...(video.categories || []), ...(video.tags || [])]
              .filter((t, i, arr) => arr.indexOf(t) === i)
              .slice(0, 20)
              .map((t, i) => (
                <span key={t}>
                  {i > 0 && ", "}
                  <Link href={`/search?q=${encodeURIComponent(t)}`}>{t}</Link>
                </span>
              ))}
          </Row>
        )}
        {video.description && <p className="description">{video.description}</p>}
      </section>

      <ShareEmbed slug={video.slug} title={title} siteUrl={SITE_URL} />

      {related.length > 0 && (
        <>
          <h2 className="section-title">Related Videos</h2>
          <VideoGrid videos={related} />
        </>
      )}
    </>
  );
}
