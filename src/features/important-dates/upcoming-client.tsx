"use client";

import { Bell, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { buildUpcomingItems } from "@/features/important-dates/upcoming-items";
import { formatRelativeDateLabel, type UpcomingDateGroup } from "@/lib/dates/flexible-date";
import { importantDatesRepository } from "@/repositories/important-dates";
import { peopleRepository } from "@/repositories/people";
import { remindersRepository } from "@/repositories/reminders";
import type { ImportantDate, Person, Reminder } from "@/types";

const groups: { id: UpcomingDateGroup; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this-week", label: "This Week" },
  { id: "this-month", label: "This Month" },
  { id: "later", label: "Later" },
];

export function UpcomingClient() {
  const { user } = useAuth();
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

  const upcoming = useMemo(() => buildUpcomingItems(importantDates, people, today), [importantDates, people, today]);

  if (loading) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">Loading upcoming dates...</div>;
  }

  if (!upcoming.length && !reminders.length) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <CalendarDays className="mb-4 size-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Add birthdays, anniversaries, or important dates from a person profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {reminders.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Reminders</h2>
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
                      <p className="text-sm text-muted-foreground">{person?.displayName ?? "Personal reminder"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatRelativeDateLabel(daysUntil)}</span>
                      {person ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/people/${person.id}`}>Open</Link>
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
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">{group.label}</h2>
            <div className="space-y-2">
              {dates.map((date) => (
                <div key={date.id} className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{date.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {date.person?.displayName ?? "Someone"} - {date.dateLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatRelativeDateLabel(date.daysUntil)}</span>
                      {date.person ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/people/${date.person.id}`}>Open</Link>
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
