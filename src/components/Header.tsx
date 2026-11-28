"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SITE_NAME } from "@/lib/types";

// Menu exactly as javenglish.cc (screenshot, 28 Nov 2026):
// Home / NEW RELEASES / VIDEOS / CHANNELS / ENGLISH SUBTITLE / ACTRESS / STUDIOS / CATEGORIES
const NAV: { label: string; href: string; icon?: "home" | "star" }[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "NEW RELEASES", href: "/" },
  { label: "VIDEOS", href: "/category/7" },
  { label: "CHANNELS", href: "/category/1" },
  { label: "ENGLISH SUBTITLE", href: "/category/7" },
  { label: "ACTRESS", href: "/actress", icon: "star" },
  { label: "STUDIOS", href: "/studio" },
  { label: "CATEGORIES", href: "/category/2" },
];

function Logo() {
  const parts = SITE_NAME.trim().split(/\s+/);
  const first = (parts[0] || "JAV").toUpperCase();
  const rest = parts.slice(1).join(" ").toUpperCase();
  return (
    <Link href="/" className="logo" aria-label={SITE_NAME}>
      <span className="logo-first">{first}</span>
      {rest ? <span className="logo-rest">{rest}</span> : null}
    </Link>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (item: (typeof NAV)[number]) =>
    item.label === "Home" && pathname === "/";

  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Logo />
        <button
          type="button"
          className="menu-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          )}
        </button>
        <form className="search-form" action="/search" method="get" role="search">
          <input type="search" name="q" placeholder="Search..." aria-label="Search" />
          <button type="submit" aria-label="Search">
            <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="#fff" strokeWidth="2.4" />
              <path d="M15.5 15.5L21 21" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </form>
      </div>

      {/* Desktop / tablet: horizontal bar */}
      <nav className="cat-nav">
        <div className="wrap cat-nav-inner">
          {NAV.map((item) => (
            <Link key={item.label} href={item.href} className={isActive(item) ? "active" : undefined}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile: full-width dropdown panel, exactly like the screenshot */}
      {open ? (
        <nav className="mobile-nav">
          {NAV.map((item) => (
            <Link key={item.label} href={item.href} className={isActive(item) ? "active" : undefined}>
              {item.icon === "home" ? (
                <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" className="nav-icon">
                  <path d="M3 11.5L12 4l9 7.5V21a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill="#fff" />
                </svg>
              ) : null}
              {item.icon === "star" ? (
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="nav-icon">
                  <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" fill="#fff" />
                </svg>
              ) : null}
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
