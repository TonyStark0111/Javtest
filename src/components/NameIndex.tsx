import Link from "next/link";
import type { NameCount } from "@/lib/data";

export default function NameIndex({
  title,
  basePath,
  items,
  q,
}: {
  title: string;
  basePath: "/actress" | "/studio";
  items: NameCount[];
  q: string;
}) {
  const filtered = q
    ? items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))
    : items;
  return (
    <>
      <h1 className="page-title">{title}</h1>
      <p className="page-sub">
        {filtered.length.toLocaleString()} {title.toLowerCase()} — from the latest catalogue
      </p>
      <form className="index-search" action={basePath} method="get" role="search">
        <input type="search" name="q" defaultValue={q} placeholder={`Search ${title.toLowerCase()}...`} aria-label={`Search ${title}`} />
        <button type="submit" aria-label="Search">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="#fff" strokeWidth="2.4" />
            <path d="M15.5 15.5L21 21" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
      </form>
      {filtered.length ? (
        <div className="name-grid">
          {filtered.map((i) => (
            <Link key={i.name} href={`${basePath}/${encodeURIComponent(i.name)}`} className="name-card">
              <span className="name-card-name">{i.name}</span>
              <span className="name-card-count">{i.count} videos</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="empty">No {title.toLowerCase()} found.</p>
      )}
    </>
  );
}
