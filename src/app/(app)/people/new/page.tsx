import { LocalizedPageHeader } from "@/components/layout/localized-page-header";
import { PersonForm } from "@/features/people/person-form";

export const metadata = {
  title: "Add Person",
};

export default function NewPersonPage() {
  return (
    <>
      <LocalizedPageHeader page="newPerson" />
      <section className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
        <PersonForm />
      </section>
    </>
  );
}
