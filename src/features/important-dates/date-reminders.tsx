"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/i18n-context";
import { formatRelativeDateLabel } from "@/lib/dates/flexible-date";
import { buildDueDateReminders, type UpcomingItem } from "./upcoming-items";

export function DateReminders({ items }: { items: UpcomingItem[] }) {
  const { t, locale } = useI18n();
  const reminders = buildDueDateReminders(items);
  if (!reminders.length) return null;
  return (
    <section
      className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
      aria-labelledby="date-reminders-title"
    >
      <h2
        id="date-reminders-title"
        className="flex items-center gap-2 font-semibold"
      >
        <Bell className="size-4" aria-hidden="true" />
        {t("dateReminders", "title")}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t("dateReminders", "description")}
      </p>
      <ul className="space-y-2">
        {reminders.map((item) => (
          <li key={item.id}>
            <Link
              href={`/people/${item.person.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3 hover:border-primary"
            >
              <span className="min-w-0">
                <span className="block break-words font-medium">
                  {item.person.displayName}
                </span>
                <span className="block break-words text-sm text-muted-foreground">
                  {item.title} · {item.dateLabel}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold">
                {formatRelativeDateLabel(item.daysUntil, locale)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
