import { LocalizedPageHeader } from "@/components/layout/localized-page-header";
import { PeopleListClient } from "@/features/people/people-list-client";

export const metadata = {
  title: "People",
};

export default function PeoplePage() {
  return (
    <>
      <LocalizedPageHeader page="people" />
      <PeopleListClient />
    </>
  );
}
