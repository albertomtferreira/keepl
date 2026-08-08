"use client";

import { CalendarHeart, Library, MessageCircle, NotebookText, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { buildUpcomingItems } from "@/features/important-dates/upcoming-items";
import { formatLastInteraction, interactionKindLabels } from "@/features/interactions/interaction-format";
import { MemoryCard } from "@/features/memories/memory-card";
import { useAuth } from "@/lib/auth/auth-context";
import { formatRelativeDateLabel } from "@/lib/dates/flexible-date";
import { importantDatesRepository } from "@/repositories/important-dates";
import { interactionsRepository } from "@/repositories/interactions";
import { memoriesRepository } from "@/repositories/memories";
import { personNotesRepository } from "@/repositories/person-notes";
import { peopleRepository } from "@/repositories/people";
import type { ImportantDate, Interaction, Memory, Person, PersonNote } from "@/types";

export function HomeClient() {
  const { user } = useAuth();
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [notes, setNotes] = useState<PersonNote[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [olderThanRecentCutoff, setOlderThanRecentCutoff] = useState(0);
  const [today] = useState(() => new Date());

  useEffect(() => {
    if (!user) {
      return;
    }
    const ownerId = user.uid;

    async function loadHome() {
      const [datesResult, interactionsResult, memoriesResult, notesResult, peopleResult] = await Promise.all([
        importantDatesRepository.listForOwner(ownerId).catch(() => []),
        interactionsRepository.listRecent(ownerId, 20).catch(() => []),
        memoriesRepository.listRecent(ownerId, 3).catch(() => []),
        personNotesRepository.list(ownerId).catch(() => []),
        peopleRepository.listActive(ownerId).catch(() => []),
      ]);
      setImportantDates(datesResult);
      setInteractions(interactionsResult);
      setMemories(memoriesResult);
      setNotes(notesResult);
      setPeople(peopleResult);
      setOlderThanRecentCutoff(Date.now() - 1000 * 60 * 60 * 24 * 30);
    }

    void loadHome();
  }, [user]);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const pinnedNotes = useMemo(() => {
    return notes
      .filter((note) => note.pinned)
      .sort((first, second) => second.updatedAt.toMillis() - first.updatedAt.toMillis())
      .slice(0, 3);
  }, [notes]);
  const olderInteractions = useMemo(() => {
    return interactions.filter((interaction) => interaction.occurredAt.toMillis() < olderThanRecentCutoff).slice(0, 3);
  }, [interactions, olderThanRecentCutoff]);
  const upcomingItems = useMemo(() => buildUpcomingItems(importantDates, people, today).slice(0, 3), [importantDates, people, today]);
  const notesSummary = pinnedNotes.length
    ? `${pinnedNotes.length} pinned ${pinnedNotes.length === 1 ? "note" : "notes"}`
    : notes.length
      ? `${notes.length} ${notes.length === 1 ? "note" : "notes"} saved`
      : "Pinned notes will surface gently";

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: UsersRound, label: "People", value: people.length ? `${people.length} people kept close` : "Ready for your first people" },
          {
            icon: CalendarHeart,
            label: "Upcoming",
            value: upcomingItems.length
              ? `${upcomingItems[0]?.person?.displayName ?? upcomingItems[0]?.title} ${formatRelativeDateLabel(upcomingItems[0]?.daysUntil ?? 0).toLowerCase()}`
              : "Birthdays and dates will appear here",
          },
          { icon: NotebookText, label: "Notes", value: notesSummary },
        ].map((item) => (
          <section key={item.label} className="rounded-lg border bg-white p-5 shadow-sm">
            <item.icon className="mb-4 size-5 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-medium text-muted-foreground">{item.label}</h2>
            <p className="mt-2 text-base font-semibold">{item.value}</p>
          </section>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <CalendarHeart className="size-4 text-muted-foreground" aria-hidden="true" />
            Coming up
          </h2>
          <Link href="/upcoming" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {upcomingItems.length ? (
          <div className="grid gap-2">
            {upcomingItems.map((item) => (
              <Link key={item.id} href={item.person ? `/people/${item.person.id}` : "/upcoming"} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.person?.displayName ?? item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.title} - {item.dateLabel}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium">{formatRelativeDateLabel(item.daysUntil)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-white/70 p-6 text-sm text-muted-foreground">
            Birthdays and dates will appear here.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <NotebookText className="size-4 text-muted-foreground" aria-hidden="true" />
          Worth remembering
        </h2>
        {pinnedNotes.length || olderInteractions.length ? (
          <div className="grid gap-2">
            {pinnedNotes.map((note) => {
              const person = peopleById.get(note.personId);

              return (
                <Link key={note.id} href={`/people/${note.personId}`} className="rounded-lg border bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium">{person?.displayName ?? "Someone close"}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{note.title ?? note.body}</p>
                </Link>
              );
            })}
            {olderInteractions.map((interaction) => {
              const person = peopleById.get(interaction.personId);

              return (
                <Link key={interaction.id} href={`/people/${interaction.personId}`} className="flex items-start gap-3 rounded-lg border bg-white p-4 shadow-sm">
                  <MessageCircle className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{person?.displayName ?? "Someone close"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {interactionKindLabels[interaction.kind]} {formatLastInteraction(interaction)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-white/70 p-6 text-sm text-muted-foreground">
            Pinned notes and older interactions will appear here.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Library className="size-4 text-muted-foreground" aria-hidden="true" />
            Recent memories
          </h2>
          <Link href="/memories" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {memories.length ? (
          <div className="grid gap-3">
            {memories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} people={people} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-white/70 p-6 text-sm text-muted-foreground">
            Your recent memories will appear here.
          </div>
        )}
      </section>
    </div>
  );
}
