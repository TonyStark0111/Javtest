import type { Metadata } from "next";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/types";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: "Watch English-subtitled JAV online in HD. Latest English-subbed Japanese videos, updated daily.",
  other: {
    rating: "RTA-5042-1996-1400-1577-RTA",
    "rating-content": "adult",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="rating" content="RTA-5042-1996-1400-1577-RTA" />
      </head>
      <body>{children}</body>
    </html>
  );
}
