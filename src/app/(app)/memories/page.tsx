import { LocalizedPageHeader } from "@/components/layout/localized-page-header";
import { MemoriesListClient } from "@/features/memories/memories-list-client";

export const metadata = {
  title: "Memories",
};

export default function MemoriesPage() {
  return (
    <>
      <LocalizedPageHeader page="memories" />
      <MemoriesListClient />
    </>
  );
}
