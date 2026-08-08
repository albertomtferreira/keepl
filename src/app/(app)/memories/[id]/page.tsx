import { MemoryDetailClient } from "@/features/memories/memory-detail-client";

export const metadata = {
  title: "Memory",
};

type MemoryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemoryPage(props: MemoryPageProps) {
  const { id } = await props.params;

  return <MemoryDetailClient memoryId={id} />;
}
