import { PageHeader } from "@/components/layout/page-header";

export const metadata = {
  title: "Add Person",
};

export default function NewPersonPage() {
  return (
    <PageHeader
      title="Add"
      description="The person creation flow is reserved for Phase 3. This route is in place for the shell."
    />
  );
}
