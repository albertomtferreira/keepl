import { Library } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

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
      <div className="rounded-lg border bg-white p-6">
        <Library className="mb-4 size-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Memory creation begins in Phase 6.</p>
      </div>
    </>
  );
}
