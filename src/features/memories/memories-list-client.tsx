"use client";

import { Library, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { MemoryCard } from "@/features/memories/memory-card";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/i18n-context";
import { memoriesRepository } from "@/repositories/memories";
import { peopleRepository } from "@/repositories/people";
import type { Memory, Person } from "@/types";

export function MemoriesListClient() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    const ownerId = user.uid;

    async function loadMemories() {
      setLoading(true);
      setError(null);

      try {
        const [memoriesResult, peopleResult] = await Promise.all([
          memoriesRepository.listRecent(ownerId, 50),
          peopleRepository.listActive(ownerId),
        ]);
        setMemories(memoriesResult);
        setPeople(peopleResult);
      } catch {
        setError(t("memoriesPage", "loadError"));
      } finally {
        setLoading(false);
      }
    }

    void loadMemories();
  }, [t, user]);

  const filteredMemories = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return memories;
    }

    const peopleById = new Map(people.map((person) => [person.id, person.displayName.toLowerCase()]));

    return memories.filter((memory) =>
      [
        memory.title,
        memory.location,
        memory.description,
        ...(memory.tags ?? []),
        ...memory.peopleIds.map((id) => peopleById.get(id)),
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(needle)),
    );
  }, [memories, people, query]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("memoriesPage", "searchPlaceholder")}
            className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/30"
          />
        </label>
        <Button asChild>
          <Link href="/memories/new">
            <Plus className="size-4" aria-hidden="true" />
            {t("memoriesPage", "addMemory")}
          </Link>
        </Button>
      </div>

      {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">{t("memoriesPage", "loading")}</div>
      ) : filteredMemories.length ? (
        <div className="grid gap-3">
          {filteredMemories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} people={people} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed bg-white/70 p-8 text-center">
          <div>
            <Library className="mx-auto mb-3 size-5 text-muted-foreground" aria-hidden="true" />
            <h2 className="font-semibold">{memories.length ? t("memoriesPage", "noMatches") : t("memoriesPage", "addFirstMemory")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {memories.length ? t("memoriesPage", "tryAnotherSearch") : t("memoriesPage", "firstMemoryHint")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
