// Diagnostic endpoint: shows what this server actually gets from AVDB,
// and whether Mongo is configured (boolean only — never the URI itself).
// Used to debug the deployed "No videos found" issue: if mongoConfigured
// is true but the database is empty, pages render empty without errors;
// if the AVDB probe returns an empty list or a non-JSON body, the problem
// is on the AVDB/Cloudflare side for this server's requests.
import { NextResponse } from "next/server";
import { probeAvdb } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const avdb = await probeAvdb();
  return NextResponse.json({
    mongoConfigured: Boolean(process.env.MONGODB_URI),
    avdb,
    checkedAt: new Date().toISOString(),
  });
}
