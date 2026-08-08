import { PageHeader } from "@/components/layout/page-header";
import { SearchClient } from "@/features/search/search-client";

export default function SearchPage() {
  return (
    <>
      <PageHeader
        title="Search"
        description="Find people, notes, memories, dates, interactions, and groups from your private records."
      />
      <SearchClient />
    </>
  );
}
