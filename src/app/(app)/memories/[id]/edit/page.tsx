import { LocalizedPageHeader } from "@/components/layout/localized-page-header";
import { MemoryEditClient } from "@/features/memories/memory-edit-client";

export const metadata = {
  title: "Edit Memory",
};

type EditMemoryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditMemoryPage(props: EditMemoryPageProps) {
  const { id } = await props.params;

  return (
    <>
      <LocalizedPageHeader page="editMemory" />
      <section className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
        <MemoryEditClient memoryId={id} />
      </section>
    </>
  );
}
