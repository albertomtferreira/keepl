"use client";

import {
  Archive,
  ArrowLeft,
  CalendarHeart,
  Edit,
  Library,
  Mail,
  MessageCircle,
  NotebookText,
  Phone,
  Tags,
  Trash2,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { MemoryCard } from "@/features/memories/memory-card";
import { InteractionManager } from "@/features/interactions/interaction-manager";
import { formatLastInteraction } from "@/features/interactions/interaction-format";
import { ImportantDateManager } from "@/features/important-dates/important-date-manager";
import { PersonNotesManager } from "@/features/notes/person-notes-manager";
import { RelationshipManager } from "@/features/relationships/relationship-manager";
import { useAuth } from "@/lib/auth/auth-context";
import { groupsRepository } from "@/repositories/groups";
import { importantDatesRepository } from "@/repositories/important-dates";
import { interactionsRepository } from "@/repositories/interactions";
import { memoriesRepository } from "@/repositories/memories";
import { personNotesRepository } from "@/repositories/person-notes";
import { peopleRepository } from "@/repositories/people";
import { relationshipsRepository } from "@/repositories/relationships";
import type { Group, ImportantDate, Interaction, Memory, Person, PersonNote, Relationship } from "@/types";
import { formatBirthday, getPersonInitials, groupNamesForPerson } from "./person-format";

export function PersonProfileClient({ personId }: { personId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [person, setPerson] = useState<Person | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [notes, setNotes] = useState<PersonNote[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }
    const ownerId = user.uid;

    async function loadProfile() {
      setLoading(true);
      const [personResult, peopleResult, groupsResult, datesResult, notesResult, relationshipsResult, memoriesResult, interactionsResult] = await Promise.all([
        peopleRepository.getById(ownerId, personId),
        peopleRepository.listActive(ownerId),
        groupsRepository.listByName(ownerId),
        importantDatesRepository.listForPerson(ownerId, personId).catch(() => []),
        personNotesRepository.listForPerson(ownerId, personId).catch(() => []),
        relationshipsRepository.listForPerson(ownerId, personId).catch(() => []),
        memoriesRepository.listForPerson(ownerId, personId).catch(() => []),
        interactionsRepository.listForPerson(ownerId, personId).catch(() => []),
      ]);

      setPerson(personResult);
      setPeople(peopleResult);
      setGroups(groupsResult);
      setImportantDates(datesResult);
      setNotes(notesResult);
      setRelationships(relationshipsResult);
      setMemories(memoriesResult);
      setInteractions(interactionsResult);
      setLoading(false);
    }

    void loadProfile();
  }, [personId, user]);

  async function archivePerson() {
    if (!user || !person || !confirm(`Archive ${person.displayName}?`)) {
      return;
    }

    await peopleRepository.archive(user.uid, person.id);
    router.push("/people");
  }

  async function deletePerson() {
    if (!user || !person || !confirm(`Delete ${person.displayName}? This cannot be undone.`)) {
      return;
    }

    await peopleRepository.delete(user.uid, person.id);
    router.push("/people");
  }

  if (loading) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">Loading person...</div>;
  }

  if (!person) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h1 className="font-semibold">Person not found</h1>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/people">Back to people</Link>
        </Button>
      </div>
    );
  }

  const groupNames = groupNamesForPerson(person, groups);
  const lastInteraction = interactions[0];

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href="/people">
          <ArrowLeft className="size-4" aria-hidden="true" />
          People
        </Link>
      </Button>

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-secondary text-xl font-semibold">
              {getPersonInitials(person)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{person.displayName}</h1>
              {person.nickname ? <p className="text-sm text-muted-foreground">Goes by {person.nickname}</p> : null}
              {lastInteraction ? <p className="text-sm text-muted-foreground">Last interaction {formatLastInteraction(lastInteraction)}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/people/${person.id}/edit`}>
                <Edit className="size-4" aria-hidden="true" />
                Edit
              </Link>
            </Button>
            <Button type="button" variant="outline" onClick={archivePerson}>
              <Archive className="size-4" aria-hidden="true" />
              Archive
            </Button>
            <Button type="button" variant="destructive" onClick={deletePerson}>
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <ProfileSection icon={UsersRound} title="About" actionHref={`/people/${person.id}/edit`} actionLabel="Edit">
          <Detail icon={Phone} value={person.phoneNumbers?.[0]?.value} />
          <Detail icon={Mail} value={person.emails?.[0]?.value} />
          <Detail icon={CalendarHeart} label="Birthday" value={formatBirthday(person.birthday)} />
        </ProfileSection>
        <ProfileSection icon={CalendarHeart} title="Important Dates">
          <ImportantDateManager dates={importantDates} onChange={setImportantDates} personId={person.id} />
        </ProfileSection>
        <ProfileSection icon={NotebookText} title="Notes">
          <PersonNotesManager notes={notes} onChange={setNotes} personId={person.id} />
        </ProfileSection>
        <ProfileSection icon={UsersRound} title="Relationships">
          <RelationshipManager currentPerson={person} people={people} relationships={relationships} onChange={setRelationships} />
        </ProfileSection>
        <ProfileSection icon={MessageCircle} title="Interactions">
          <InteractionManager personId={person.id} interactions={interactions} onChange={setInteractions} />
        </ProfileSection>
        <ProfileSection icon={Library} title="Memories" actionHref={`/memories/new?personId=${person.id}`} actionLabel="Add">
          {memories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} people={people} />
          ))}
        </ProfileSection>
        <ProfileSection icon={Tags} title="Social Profiles" actionHref={`/people/${person.id}/edit`} actionLabel="Edit">
          {person.socialProfiles?.map((profile) => (
            <p key={`${profile.platform}-${profile.handle ?? profile.url}`} className="text-sm">
              {profile.platform}: {profile.handle ?? profile.url}
            </p>
          ))}
        </ProfileSection>
        <ProfileSection icon={Tags} title="Groups" actionHref={`/people/${person.id}/edit`} actionLabel="Edit">
          {groupNames.map((name) => (
            <span key={name} className="mr-2 inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
              {name}
            </span>
          ))}
        </ProfileSection>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label?: string; value?: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <p className="flex items-center gap-2 text-sm">
      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      {label ? <span className="text-muted-foreground">{label}</span> : null}
      <span>{value}</span>
    </p>
  );
}

function ProfileSection({
  actionHref,
  actionLabel,
  children,
  icon: Icon,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  const hasContent = Array.isArray(children) ? children.some(Boolean) : Boolean(children);

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          {title}
        </h2>
        {actionHref && actionLabel ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : actionLabel ? (
          <Button type="button" variant="ghost" size="sm" disabled>
            {actionLabel}
          </Button>
        ) : null}
      </div>
      <div className="space-y-2">
        {hasContent ? children : <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
      </div>
    </section>
  );
}
