import type { Metadata } from "next";
import { getNameIndex } from "@/lib/data";
import NameIndex from "@/components/NameIndex";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Actress",
  description: "Browse JAV actresses and watch their videos.",
};

export default async function ActressIndexPage({ searchParams }: { searchParams: { q?: string } }) {
  const { actresses } = await getNameIndex();
  return <NameIndex title="Actress" basePath="/actress" items={actresses} q={searchParams.q || ""} />;
}
