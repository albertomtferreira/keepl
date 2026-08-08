"use client";

import { ArrowLeft, CalendarDays, Edit, Image as PhotoIcon, MapPin, Trash2, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { memoriesRepository } from "@/repositories/memories";
import { peopleRepository } from "@/repositories/people";
import { getGooglePhotosIntegrationStatus } from "@/services/google/photos";
import type { Memory, Person } from "@/types";
import { formatMemoryDate, memoryPeopleNames } from "./memory-format";

export function MemoryDetailClient({ memoryId }: { memoryId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const photosStatus = getGooglePhotosIntegrationStatus();

  useEffect(() => {
    if (!user) {
      return;
    }
    const ownerId = user.uid;

    async function loadMemory() {
      setLoading(true);
      const [memoryResult, peopleResult] = await Promise.all([
        memoriesRepository.getById(ownerId, memoryId),
        peopleRepository.listActive(ownerId),
      ]);
      setMemory(memoryResult);
      setPeople(peopleResult);
      setLoading(false);
    }

    void loadMemory();
  }, [memoryId, user]);

  async function deleteMemory() {
    if (!user || !memory || !confirm(`Delete "${memory.title}"? This cannot be undone.`)) {
      return;
    }

    await memoriesRepository.delete(user.uid, memory.id);
    router.push("/memories");
  }

  if (loading) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">Loading memory...</div>;
  }

  if (!memory) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h1 className="font-semibold">Memory not found</h1>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/memories">Back to memories</Link>
        </Button>
      </div>
    );
  }

  const names = memoryPeopleNames(memory, people);

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href="/memories">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Memories
        </Link>
      </Button>

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{memory.title}</h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" aria-hidden="true" />
                {formatMemoryDate(memory)}
              </span>
              {memory.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4" aria-hidden="true" />
                  {memory.location}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/memories/${memory.id}/edit`}>
                <Edit className="size-4" aria-hidden="true" />
                Edit
              </Link>
            </Button>
            <Button type="button" variant="destructive" onClick={deleteMemory}>
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>
      </section>

      {memory.description ? <section className="rounded-lg border bg-white p-4 text-sm leading-6 shadow-sm">{memory.description}</section> : null}

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <UsersRound className="size-4 text-muted-foreground" aria-hidden="true" />
          People
        </h2>
        {names.length ? (
          <div className="flex flex-wrap gap-2">
            {memory.peopleIds.map((personId) => {
              const person = people.find((item) => item.id === personId);
              return person ? (
                <Link key={person.id} href={`/people/${person.id}`} className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
                  {person.displayName}
                </Link>
              ) : null;
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No people connected yet.</p>
        )}
      </section>

      {memory.tags?.length ? (
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {memory.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
                {tag}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-dashed bg-white p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <PhotoIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          Photos
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {memory.photos?.length ? `${memory.photos.length} photo reference saved.` : `${photosStatus.label}. Memories work without photos for now.`}
        </p>
      </section>
    </div>
  );
}
