import type { Metadata } from "next";

export const metadata: Metadata = { title: "DMCA / Content Removal" };

export default function DmcaPage() {
  return (
    <>
      <h1 className="page-title">DMCA / Content Removal</h1>
      <div className="prose">
        <p>
          This website is an index and search engine. It does not host any video files on its own servers;
          all media is provided by third-party services. We respect the intellectual property rights of
          others and comply with the Digital Millennium Copyright Act (17 U.S.C. § 512).
        </p>
        <p>
          If you are a copyright owner (or an agent thereof) and believe that content linked from this site
          infringes your copyright, please send a notice containing: (1) identification of the copyrighted
          work, (2) the URL of the allegedly infringing page on this site, (3) your full name and contact
          information, (4) a good-faith statement, and (5) a statement, under penalty of perjury, that you
          are authorized to act on behalf of the owner.
        </p>
        <p>
          Valid requests are processed promptly and the corresponding links are removed. Note that removing
          a link here does not remove the underlying file from the third-party host — please also contact
          the hosting service identified on the video page.
        </p>
        <p>
          <em>Placeholder text — replace this page with your own legal wording and a real contact address
          before going live.</em>
        </p>
      </div>
    </>
  );
}
