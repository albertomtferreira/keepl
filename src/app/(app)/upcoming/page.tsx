import { PageHeader } from "@/components/layout/page-header";
import { UpcomingClient } from "@/features/important-dates/upcoming-client";

export const metadata = {
  title: "Upcoming",
};

export default function UpcomingPage() {
  return (
    <>
      <PageHeader
        title="Upcoming"
        description="Birthdays, anniversaries, reminders, and other important dates gathered by when they are next due."
      />
      <UpcomingClient />
    </>
  );
}
