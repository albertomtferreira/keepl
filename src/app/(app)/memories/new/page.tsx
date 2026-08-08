import { PageHeader } from "@/components/layout/page-header";
import { MemoryForm } from "@/features/memories/memory-form";

export const metadata = {
  title: "Add Memory",
};

type NewMemoryPageProps = {
  searchParams: Promise<{ personId?: string | string[] }>;
};

export default async function NewMemoryPage(props: NewMemoryPageProps) {
  const searchParams = await props.searchParams;
  const personId = typeof searchParams.personId === "string" ? searchParams.personId : undefined;

  return (
    <>
      <PageHeader title="Add memory" description="Capture the moment, then connect it to the people who were part of it." />
      <section className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
        <MemoryForm preselectedPersonId={personId} />
      </section>
    </>
  );
}
