"use client";

import {
  CalendarDays,
  CircleDot,
  Library,
  MessageCircle,
  NotebookText,
  Search,
  Tags,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { searchLocalRecords } from "@/lib/search/local-search";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/i18n-context";
import {
  groupsRepository,
  importantDatesRepository,
  interactionsRepository,
  memoriesRepository,
  peopleRepository,
  personNotesRepository,
} from "@/repositories";
import type { Group, ImportantDate, Interaction, Memory, Person, PersonNote, SearchResult, SearchScope } from "@/types";

const scopes: { value: SearchScope; labelKey: "scopeAll" | "scopePeople" | "scopeNotes" | "scopeMemories" | "scopeDates" | "scopeInteractions" | "scopeGroups" }[] = [
  { value: "all", labelKey: "scopeAll" },
  { value: "people", labelKey: "scopePeople" },
  { value: "notes", labelKey: "scopeNotes" },
  { value: "memories", labelKey: "scopeMemories" },
  { value: "dates", labelKey: "scopeDates" },
  { value: "interactions", labelKey: "scopeInteractions" },
  { value: "groups", labelKey: "scopeGroups" },
];

type ResultTypeKey =
  | "typePerson"
  | "typeNote"
  | "typeMemory"
  | "typeDate"
  | "typeInteraction"
  | "typeGroup";

const resultTypeKeys = {
  person: "typePerson",
  note: "typeNote",
  memory: "typeMemory",
  date: "typeDate",
  interaction: "typeInteraction",
  group: "typeGroup",
} as const satisfies Record<SearchResult["type"], ResultTypeKey>;

const resultIcons = {
  person: UsersRound,
  note: NotebookText,
  memory: Library,
  date: CalendarDays,
  interaction: MessageCircle,
  group: Tags,
} satisfies Record<SearchResult["type"], typeof CircleDot>;

export function SearchClient() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [people, setPeople] = useState<Person[]>([]);
  const [notes, setNotes] = useState<PersonNote[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const ownerId = user.uid;

    async function loadSearchData() {
      setLoading(true);
      setError(null);

      try {
        const [peopleResult, notesResult, memoriesResult, datesResult, interactionsResult, groupsResult] =
          await Promise.all([
            peopleRepository.listActive(ownerId),
            personNotesRepository.list(ownerId),
            memoriesRepository.list(ownerId),
            importantDatesRepository.listForOwner(ownerId),
            interactionsRepository.list(ownerId),
            groupsRepository.listByName(ownerId),
          ]);

        setPeople(peopleResult);
        setNotes(notesResult);
        setMemories(memoriesResult);
        setImportantDates(datesResult);
        setInteractions(interactionsResult);
        setGroups(groupsResult);
      } catch {
        setError(t("searchPage", "loadError"));
      } finally {
        setLoading(false);
      }
    }

    void loadSearchData();
  }, [t, user]);

  const results = useMemo(
    () =>
      searchLocalRecords(
        {
          people,
          notes,
          memories,
          importantDates,
          interactions,
          groups,
        },
        query,
        scope,
      ),
    [groups, importantDates, interactions, memories, notes, people, query, scope],
  );

  const hasQuery = query.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-3 shadow-sm">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPage", "placeholder")}
            autoFocus
            className="h-11 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/30"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {scopes.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setScope(item.value)}
              className={`h-9 shrink-0 rounded-lg border px-3 text-sm font-medium transition ${
                scope === item.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-white text-muted-foreground hover:bg-muted"
              }`}
            >
              {t("searchPage", item.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">{t("searchPage", "loading")}</div>
      ) : !hasQuery ? (
        <EmptyState title={t("searchPage", "emptyTitle")} description={t("searchPage", "emptyDescription")} />
      ) : results.length ? (
        <div className="grid gap-2">
          {results.map((result) => (
            <ResultRow key={`${result.type}-${result.id}`} result={result} />
          ))}
        </div>
      ) : (
        <EmptyState title={t("searchPage", "noMatchesTitle")} description={t("searchPage", "noMatchesDescription")} />
      )}
    </div>
  );
}

function ResultRow({ result }: { result: SearchResult }) {
  const Icon = resultIcons[result.type];
  const { t } = useI18n();

  return (
    <Link href={result.href} className="flex items-start gap-3 rounded-lg border bg-white p-3 shadow-sm transition hover:bg-muted/50">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate font-semibold">{result.title}</h2>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
            {t("searchPage", resultTypeKeys[result.type])}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {result.subtitle || t("searchPage", "matched", { fields: result.matchedFields.join(", ") })}
        </p>
      </div>
    </Link>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed bg-white/70 p-8 text-center">
      <div>
        <Search className="mx-auto mb-3 size-5 text-muted-foreground" aria-hidden="true" />
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
