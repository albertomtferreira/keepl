import { PageHeader } from "@/components/layout/page-header";
import { PeopleListClient } from "@/features/people/people-list-client";

export const metadata = {
  title: "People",
};

export default function PeoplePage() {
  return (
    <>
      <PageHeader
        title="People"
        description="The people you want to remember, with profiles coming in the next phase."
      />
      <PeopleListClient />
    </>
  );
}
