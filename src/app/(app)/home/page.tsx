import { CalendarHeart, NotebookText, UsersRound } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";

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
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: UsersRound, label: "People", value: "Ready for your first people" },
          { icon: CalendarHeart, label: "Upcoming", value: "Birthdays and dates will appear here" },
          { icon: NotebookText, label: "Notes", value: "Pinned notes will surface gently" },
        ].map((item) => (
          <section key={item.label} className="rounded-lg border bg-white p-5 shadow-sm">
            <item.icon className="mb-4 size-5 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-medium text-muted-foreground">{item.label}</h2>
            <p className="mt-2 text-base font-semibold">{item.value}</p>
          </section>
        ))}
      </div>
    </>
  );
}
