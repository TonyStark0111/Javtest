import Link from "next/link";
import { SITE_NAME, TYPE_IDS, TYPE_NAMES } from "@/lib/types";

export default function Header() {
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link href="/" className="logo">{SITE_NAME}</Link>
        <form className="search-form" action="/search" method="get">
          <input type="search" name="q" placeholder="Search code, title, actress…" aria-label="Search" />
          <button type="submit">Search</button>
        </form>
      </div>
      <nav className="cat-nav">
        <div className="wrap cat-nav-inner">
          <Link href="/">Latest</Link>
          {TYPE_IDS.map((id) => (
            <Link key={id} href={`/category/${id}`}>{id === 7 ? "English Subtitle" : TYPE_NAMES[id]}</Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
