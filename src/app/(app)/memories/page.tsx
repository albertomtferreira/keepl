import { PageHeader } from "@/components/layout/page-header";
import { MemoriesListClient } from "@/features/memories/memories-list-client";

export const metadata = {
  title: "Memories",
};

export default function MemoriesPage() {
  return (
    <>
      <PageHeader
        title="Memories"
        description="Shared moments will collect here, connected back to the people who were part of them."
      />
      <MemoriesListClient />
    </>
  );
}
