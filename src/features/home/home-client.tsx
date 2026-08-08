"use client";

import { CalendarHeart, Library, NotebookText, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { MemoryCard } from "@/features/memories/memory-card";
import { useAuth } from "@/lib/auth/auth-context";
import { memoriesRepository } from "@/repositories/memories";
import { peopleRepository } from "@/repositories/people";
import type { Memory, Person } from "@/types";

export function HomeClient() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const ownerId = user.uid;

    async function loadHome() {
      const [memoriesResult, peopleResult] = await Promise.all([
        memoriesRepository.listRecent(ownerId, 3).catch(() => []),
        peopleRepository.listActive(ownerId).catch(() => []),
      ]);
      setMemories(memoriesResult);
      setPeople(peopleResult);
    }

    void loadHome();
  }, [user]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: UsersRound, label: "People", value: people.length ? `${people.length} people kept close` : "Ready for your first people" },
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
