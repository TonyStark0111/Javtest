import type { Metadata } from "next";
import { getNameIndex } from "@/lib/data";
import NameIndex from "@/components/NameIndex";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studios",
  description: "Browse JAV studios and watch their videos.",
};

export default async function StudioIndexPage({ searchParams }: { searchParams: { q?: string } }) {
  const { studios } = await getNameIndex();
  return <NameIndex title="Studios" basePath="/studio" items={studios} q={searchParams.q || ""} />;
}
