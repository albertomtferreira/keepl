"use client";

import { CalendarDays, MapPin, UsersRound } from "lucide-react";
import Link from "next/link";

import { useI18n } from "@/lib/i18n/i18n-context";
import type { Memory, Person } from "@/types";
import { formatMemoryDate, memoryPeopleNames } from "./memory-format";

export function MemoryCard({ memory, people }: { memory: Memory; people: Person[] }) {
  const { locale } = useI18n();
  const names = memoryPeopleNames(memory, people);

  return (
    <Link href={`/memories/${memory.id}`} className="block rounded-lg border bg-white p-4 shadow-sm transition hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{memory.title}</h2>
          {memory.description ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{memory.description}</p> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {formatMemoryDate(memory, locale)}
        </span>
        {memory.location ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden="true" />
            {memory.location}
          </span>
        ) : null}
        {names.length ? (
          <span className="inline-flex items-center gap-1">
            <UsersRound className="size-3.5" aria-hidden="true" />
            {names.join(", ")}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
