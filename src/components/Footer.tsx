import Link from "next/link";
import { SITE_NAME } from "@/lib/types";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p><strong>{SITE_NAME}</strong> — English-subtitled JAV, updated daily.</p>
        <p className="footer-links">
          <Link href="/dmca">DMCA / Content Removal</Link>
        </p>
        <p className="footer-note">
          All models appearing on this website are 18 years or older. This site contains adult content and is
          intended only for adults. Records required under 18 U.S.C. § 2257 are held by the respective producers.
        </p>
      </div>
    </footer>
  );
}
