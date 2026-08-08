"use client";

import { CalendarHeart, Library, MessageCircle, NotebookText, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { buildUpcomingItems } from "@/features/important-dates/upcoming-items";
import { formatLastInteraction, interactionKindLabels } from "@/features/interactions/interaction-format";
import { MemoryCard } from "@/features/memories/memory-card";
import { useAuth } from "@/lib/auth/auth-context";
import { formatRelativeDateLabel } from "@/lib/dates/flexible-date";
import { useI18n } from "@/lib/i18n/i18n-context";
import { importantDatesRepository } from "@/repositories/important-dates";
import { interactionsRepository } from "@/repositories/interactions";
import { memoriesRepository } from "@/repositories/memories";
import { personNotesRepository } from "@/repositories/person-notes";
import { peopleRepository } from "@/repositories/people";
import type { ImportantDate, Interaction, Memory, Person, PersonNote } from "@/types";

export function HomeClient() {
  const { user } = useAuth();
  const { locale, t } = useI18n();
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
  const upcomingItems = useMemo(() => buildUpcomingItems(importantDates, people, today, locale).slice(0, 3), [importantDates, people, today, locale]);
  const notesSummary = pinnedNotes.length
    ? pinnedNotes.length === 1
      ? t("home", "onePinnedNote")
      : t("home", "pinnedNotes", { count: pinnedNotes.length })
    : notes.length
      ? notes.length === 1
        ? t("home", "oneNoteSaved")
        : t("home", "notesSaved", { count: notes.length })
      : t("home", "pinnedNotesGentle");

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: UsersRound,
            label: t("home", "people"),
            value: people.length
              ? people.length === 1
                ? t("home", "onePersonKeptClose")
                : t("home", "peopleKeptClose", { count: people.length })
              : t("home", "readyForFirstPeople"),
          },
          {
            icon: CalendarHeart,
            label: t("home", "upcoming"),
            value: upcomingItems.length
              ? `${upcomingItems[0]?.person?.displayName ?? upcomingItems[0]?.title} ${formatRelativeDateLabel(upcomingItems[0]?.daysUntil ?? 0, locale).toLocaleLowerCase()}`
              : t("home", "birthdaysAndDates"),
          },
          { icon: NotebookText, label: t("home", "notes"), value: notesSummary },
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
            {t("home", "comingUp")}
          </h2>
          <Link href="/upcoming" className="text-sm font-medium text-primary hover:underline">
            {t("home", "viewAll")}
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
                  <span className="shrink-0 text-sm font-medium">{formatRelativeDateLabel(item.daysUntil, locale)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-white/70 p-6 text-sm text-muted-foreground">
            {t("home", "birthdaysAndDatesSentence")}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <NotebookText className="size-4 text-muted-foreground" aria-hidden="true" />
          {t("home", "worthRemembering")}
        </h2>
        {pinnedNotes.length || olderInteractions.length ? (
          <div className="grid gap-2">
            {pinnedNotes.map((note) => {
              const person = peopleById.get(note.personId);

              return (
                <Link key={note.id} href={`/people/${note.personId}`} className="rounded-lg border bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium">{person?.displayName ?? t("home", "someoneClose")}</p>
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
                    <p className="text-sm font-medium">{person?.displayName ?? t("home", "someoneClose")}</p>
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
            {t("home", "worthRememberingEmpty")}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Library className="size-4 text-muted-foreground" aria-hidden="true" />
            {t("home", "recentMemories")}
          </h2>
          <Link href="/memories" className="text-sm font-medium text-primary hover:underline">
            {t("home", "viewAll")}
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
            {t("home", "recentMemoriesEmpty")}
          </div>
        )}
      </section>
    </div>
  );
}
