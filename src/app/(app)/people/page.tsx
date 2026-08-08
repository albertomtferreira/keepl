import { Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PeopleListClient } from "@/features/people/people-list-client";

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
            Add person
          </Link>
        </Button>
      </div>
      <PeopleListClient />
    </>
  );
}
