import { PageHeader } from "@/components/layout/page-header";
import { PersonForm } from "@/features/people/person-form";

export const metadata = {
  title: "Add Person",
};

export default function NewPersonPage() {
  return (
    <>
      <PageHeader
        title="Add person"
        description="Start with the details you know. You can fill in the softer edges later."
      />
      <section className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
        <PersonForm />
      </section>
    </>
  );
}
