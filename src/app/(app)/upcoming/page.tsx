import { CalendarDays } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

export const metadata = {
  title: "Upcoming",
};

export default function UpcomingPage() {
  return (
    <>
      <PageHeader
        title="Upcoming"
        description="Birthdays, anniversaries, reminders, and other important dates will gather here."
      />
      <div className="rounded-lg border bg-white p-6">
        <CalendarDays className="mb-4 size-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Upcoming date calculations arrive in Phase 4.</p>
      </div>
    </>
  );
}
