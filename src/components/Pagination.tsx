import Link from "next/link";

export default function Pagination({
  page,
  pagecount,
  basePath,
}: {
  page: number;
  pagecount: number;
  basePath: string; // e.g. "/" , "/category/7", "/search?q=abc"
}) {
  if (pagecount <= 1) return null;
  const sep = basePath.includes("?") ? "&" : "?";
  const href = (p: number) => (p <= 1 ? basePath : `${basePath}${sep}page=${p}`);
  const windowPages: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(pagecount, page + 2); p++) windowPages.push(p);
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 && <Link href={href(page - 1)}>« Prev</Link>}
      {windowPages[0] > 1 && <Link href={href(1)}>1</Link>}
      {windowPages.map((p) =>
        p === page ? (
          <span key={p} className="current">{p}</span>
        ) : (
          <Link key={p} href={href(p)}>{p}</Link>
        ),
      )}
      {windowPages[windowPages.length - 1] < pagecount && (
        <Link href={href(pagecount)}>{pagecount}</Link>
      )}
      {page < pagecount && <Link href={href(page + 1)}>Next »</Link>}
    </nav>
  );
}
