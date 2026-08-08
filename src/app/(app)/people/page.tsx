import { Plus, Search } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "People",
};

export default function PeoplePage() {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="People"
          description="The people you want to remember, with profiles coming in the next phase."
        />
        <Button asChild className="hidden gap-2 sm:inline-flex">
          <Link href="/people/new">
            <Plus className="size-4" aria-hidden="true" />
            Add
          </Link>
        </Button>
      </div>
      <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed bg-white/70 p-8 text-center">
        <div>
          <Search className="mx-auto mb-3 size-5 text-muted-foreground" aria-hidden="true" />
          <h2 className="font-semibold">Your people list is ready</h2>
          <p className="mt-2 text-sm text-muted-foreground">Search and person creation arrive in Phase 3.</p>
        </div>
      </div>
    </>
  );
}
