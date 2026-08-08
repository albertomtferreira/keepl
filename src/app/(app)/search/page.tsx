import { LocalizedPageHeader } from "@/components/layout/localized-page-header";
import { SearchClient } from "@/features/search/search-client";

export default function SearchPage() {
  return (
    <>
      <LocalizedPageHeader page="search" />
      <SearchClient />
    </>
  );
}
