"use client";

import { Bell, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/i18n-context";
import { buildUpcomingItems } from "@/features/important-dates/upcoming-items";
import { formatRelativeDateLabel, type UpcomingDateGroup } from "@/lib/dates/flexible-date";
import { importantDatesRepository } from "@/repositories/important-dates";
import { peopleRepository } from "@/repositories/people";
import { remindersRepository } from "@/repositories/reminders";
import type { ImportantDate, Person, Reminder } from "@/types";

const groups: { id: UpcomingDateGroup; labelKey: "today" | "thisWeek" | "thisMonth" | "later" }[] = [
  { id: "today", labelKey: "today" },
  { id: "this-week", labelKey: "thisWeek" },
  { id: "this-month", labelKey: "thisMonth" },
  { id: "later", labelKey: "later" },
];

export function UpcomingClient() {
  const { user } = useAuth();
  const { locale, t } = useI18n();
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [today] = useState(() => new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }
    const ownerId = user.uid;

    async function loadUpcoming() {
      setLoading(true);
      const [datesResult, peopleResult, remindersResult] = await Promise.all([
        importantDatesRepository.listForOwner(ownerId).catch(() => []),
        peopleRepository.listActive(ownerId).catch(() => []),
        remindersRepository.listScheduled(ownerId).catch(() => []),
      ]);
      setImportantDates(datesResult);
      setPeople(peopleResult);
      setReminders(remindersResult);
      setLoading(false);
    }

    void loadUpcoming();
  }, [user]);

  const upcoming = useMemo(() => buildUpcomingItems(importantDates, people, today, locale), [importantDates, people, today, locale]);

  if (loading) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">{t("upcomingPage", "loading")}</div>;
  }

  if (!upcoming.length && !reminders.length) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <CalendarDays className="mb-4 size-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{t("upcomingPage", "empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {reminders.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">{t("upcomingPage", "reminders")}</h2>
          <div className="space-y-2">
            {reminders.map((reminder) => {
              const person = reminder.personId ? people.find((item) => item.id === reminder.personId) : undefined;
              const daysUntil = Math.max(0, Math.ceil((reminder.remindAt.toDate().getTime() - today.getTime()) / 86400000));

              return (
                <div key={reminder.id} className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 font-medium">
                        <Bell className="size-4 text-muted-foreground" aria-hidden="true" />
                        {reminder.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{person?.displayName ?? t("upcomingPage", "personalReminder")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatRelativeDateLabel(daysUntil, locale)}</span>
                      {person ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/people/${person.id}`}>{t("upcomingPage", "open")}</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      {groups.map((group) => {
        const dates = upcoming.filter((date) => date.group === group.id);
        if (!dates.length) {
          return null;
        }

        return (
          <section key={group.id} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">{t("upcomingPage", group.labelKey)}</h2>
            <div className="space-y-2">
              {dates.map((date) => (
                <div key={date.id} className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{date.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {date.person?.displayName ?? t("upcomingPage", "someone")} - {date.dateLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatRelativeDateLabel(date.daysUntil, locale)}</span>
                      {date.person ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/people/${date.person.id}`}>{t("upcomingPage", "open")}</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
