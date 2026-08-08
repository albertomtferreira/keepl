import { PageHeader } from "@/components/layout/page-header";
import { HomeClient } from "@/features/home/home-client";

export const metadata = {
  title: "Home",
};

export default function HomePage() {
  return (
    <>
      <PageHeader
        title="Home"
        description="A quiet place for the people, dates, and memories worth keeping close."
      />
      <HomeClient />
    </>
  );
}
