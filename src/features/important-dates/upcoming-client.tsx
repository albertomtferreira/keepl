"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { buildUpcomingDates, formatFlexibleDate, formatRelativeDateLabel, type UpcomingDateGroup } from "@/lib/dates/flexible-date";
import { importantDatesRepository } from "@/repositories/important-dates";
import { peopleRepository } from "@/repositories/people";
import type { ImportantDate, Person } from "@/types";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }
    const ownerId = user.uid;

    async function loadUpcoming() {
      setLoading(true);
      const [datesResult, peopleResult] = await Promise.all([
        importantDatesRepository.listForOwner(ownerId).catch(() => []),
        peopleRepository.listActive(ownerId).catch(() => []),
      ]);
      setImportantDates(datesResult);
      setPeople(peopleResult);
      setLoading(false);
    }

    void loadUpcoming();
  }, [user]);

  const upcoming = useMemo(() => buildUpcomingDates(importantDates, people), [importantDates, people]);

  if (loading) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">Loading upcoming dates...</div>;
  }

  if (!upcoming.length) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <CalendarDays className="mb-4 size-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Add birthdays, anniversaries, or important dates from a person profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
                <div key={date.importantDate.id} className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{date.importantDate.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {date.person?.displayName ?? "Someone"} · {formatFlexibleDate(date.importantDate.date)}
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
