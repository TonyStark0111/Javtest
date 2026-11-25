"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import type { PlaySource } from "@/lib/types";
import { isStreamUrl } from "@/lib/types";

interface FlatEp {
  label: string;
  url: string;
}

export default function Player({ sources, poster, title }: { sources: PlaySource[]; poster?: string; title: string }) {
  const episodes: FlatEp[] = useMemo(() => {
    const out: FlatEp[] = [];
    for (const s of sources || []) {
      for (const ep of s.episodes || []) {
        out.push({ label: [s.from, ep.name].filter(Boolean).join(" · ") || "Full", url: ep.url });
      }
    }
    return out;
  }, [sources]);

  const [idx, setIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const current = episodes[idx];

  useEffect(() => {
    setIdx(0);
  }, [episodes.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !current || !isStreamUrl(current.url)) return;
    let hls: Hls | null = null;
    if (/\.m3u8($|\?)/i.test(current.url) && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(current.url);
      hls.attachMedia(video);
    } else {
      video.src = current.url;
    }
    return () => {
      if (hls) hls.destroy();
    };
  }, [current]);

  if (!current) return <div className="player-empty">No playable source available for this video.</div>;

  return (
    <div className="player-block">
      <div className="player-stage">
        {isStreamUrl(current.url) ? (
          <video ref={videoRef} controls playsInline poster={poster} className="player-video" aria-label={title} />
        ) : (
          <iframe
            key={current.url}
            src={current.url}
            className="player-iframe"
            allowFullScreen
            allow="autoplay; fullscreen"
            referrerPolicy="no-referrer"
            title={title}
          />
        )}
      </div>
      {episodes.length > 1 && (
        <div className="source-row">
          <span className="source-label">Watch Sources:</span>
          {episodes.map((ep, i) => (
            <button
              key={`${ep.url}-${i}`}
              type="button"
              className={i === idx ? "source-pill active" : "source-pill"}
              onClick={() => setIdx(i)}
            >
              {ep.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
