import { LocalizedPageHeader } from "@/components/layout/localized-page-header";
import { UpcomingClient } from "@/features/important-dates/upcoming-client";

export const metadata = {
  title: "Upcoming",
};

export default function UpcomingPage() {
  return (
    <>
      <LocalizedPageHeader page="upcoming" />
      <UpcomingClient />
    </>
  );
}
