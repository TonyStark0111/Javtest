"use client";
import { useEffect, useState } from "react";

export default function ShareEmbed({ slug, title, siteUrl }: { slug: string; title: string; siteUrl: string }) {
  const [origin, setOrigin] = useState(siteUrl);
  const [copied, setCopied] = useState<string>("");
  useEffect(() => {
    if (typeof window !== "undefined" && window.location?.origin) setOrigin(window.location.origin);
  }, []);

  const link = `${origin}/video/${slug}`;
  const bbcode = `[url=${link}]${title}[/url]`;
  const embed = `<iframe width="100%" height="100%" style="aspect-ratio:16/9;border:0" src="${origin}/e/${slug}" frameborder="0" allowfullscreen></iframe>`;

  const rows: { label: string; value: string }[] = [
    { label: "LINK", value: link },
    { label: "BBCODE", value: bbcode },
    { label: "EMBED", value: embed },
  ];

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <section className="share-panel">
      <h2 className="share-title">Share &amp; Embed</h2>
      {rows.map((r) => (
        <div className="share-row" key={r.label}>
          <span className="share-label">{r.label}</span>
          <input className="share-input" readOnly value={r.value} onFocus={(e) => e.target.select()} />
          <button type="button" className="copy-btn" onClick={() => copy(r.label, r.value)}>
            {copied === r.label ? "Copied ✓" : "Copy"}
          </button>
        </div>
      ))}
    </section>
  );
}
