"use client";

import { Archive, Plus, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { groupsRepository } from "@/repositories/groups";
import { peopleRepository } from "@/repositories/people";
import type { Group, Person } from "@/types";
import { getPersonInitials, groupNamesForPerson } from "./person-format";

export function PeopleListClient() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState(searchParams.get("group") ?? "all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    const ownerId = user.uid;

    async function loadPeople() {
      setLoading(true);
      setError(null);

      try {
        const peopleResult = await peopleRepository.listActive(ownerId);
        const groupsResult = await groupsRepository.listByName(ownerId).catch(() => []);
        setPeople(peopleResult);
        setGroups(groupsResult);
      } catch {
        setError("Could not load people.");
      } finally {
        setLoading(false);
      }
    }

    void loadPeople();
  }, [user]);

  const filteredPeople = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return people
      .filter((person) => {
        if (groupId !== "all" && !person.groupIds?.includes(groupId)) {
          return false;
        }

        if (!needle) {
          return true;
        }

        return [person.displayName, person.firstName, person.lastName, person.nickname]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(needle));
      })
      .sort((first, second) => first.displayName.localeCompare(second.displayName));
  }, [groupId, people, query]);

  async function archivePerson(person: Person) {
    if (!user || !confirm(`Archive ${person.displayName}?`)) {
      return;
    }

    await peopleRepository.archive(user.uid, person.id);
    setPeople((current) => current.filter((item) => item.id !== person.id));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people"
            className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/30"
          />
        </label>
        <Button asChild className="w-full gap-2 sm:w-auto">
          <Link href="/people/new">
            <Plus className="size-4" aria-hidden="true" />
            Add person
          </Link>
        </Button>
        <select
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
          className="h-10 rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/30"
        >
          <option value="all">All groups</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">Loading people...</div>
      ) : filteredPeople.length ? (
        <div className="grid gap-2">
          {filteredPeople.map((person) => {
            const groupNames = groupNamesForPerson(person, groups);

            return (
              <div key={person.id} className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm">
                <Link href={`/people/${person.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                    {getPersonInitials(person)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{person.displayName}</h2>
                    <p className="truncate text-sm text-muted-foreground">
                      {groupNames.length ? groupNames.join(", ") : person.emails?.[0]?.value ?? person.phoneNumbers?.[0]?.value ?? "No details yet"}
                    </p>
                  </div>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Archive"
                  aria-label={`Archive ${person.displayName}`}
                  onClick={() => archivePerson(person)}
                >
                  <Archive className="size-4" aria-hidden="true" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed bg-white/70 p-8 text-center">
          <div>
            <UsersRound className="mx-auto mb-3 size-5 text-muted-foreground" aria-hidden="true" />
            <h2 className="font-semibold">{people.length ? "No matches" : "Add your first person"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {people.length ? "Try another search or group." : "Start with a name and add details when they matter."}
            </p>
            {!people.length ? (
              <Button asChild className="mt-4">
                <Link href="/people/new">
                  <Plus className="size-4" aria-hidden="true" />
                  Add person
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
