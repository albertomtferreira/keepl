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
import { safeSocialProfileUrl } from "./social-profile";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { RelationshipGraphView } from "@/features/graph/relationship-graph-view";
import { MemoryCard } from "@/features/memories/memory-card";
import { InteractionManager } from "@/features/interactions/interaction-manager";
import { formatLastInteraction } from "@/features/interactions/interaction-format";
import { ImportantDateManager } from "@/features/important-dates/important-date-manager";
import { PersonNotesManager } from "@/features/notes/person-notes-manager";
import { RelationshipManager } from "@/features/relationships/relationship-manager";
import { LifecycleReview } from "@/features/lifecycle/lifecycle-review";
import { LoadState } from "@/components/ui/load-state";
import { ReadFailure, settleReads } from "@/lib/async/settle";
import { useMutation, MutationError } from "@/lib/async/use-mutation";
import { useAuth } from "@/lib/auth/auth-context";
import { deriveRelationshipGraph } from "@/lib/graph/relationship-graph";
import { useI18n } from "@/lib/i18n/i18n-context";
import { groupsRepository } from "@/repositories/groups";
import { importantDatesRepository } from "@/repositories/important-dates";
import { interactionsRepository } from "@/repositories/interactions";
import { memoriesRepository } from "@/repositories/memories";
import { personNotesRepository } from "@/repositories/person-notes";
import { peopleRepository } from "@/repositories/people";
import { relationshipsRepository } from "@/repositories/relationships";
import type {
  Group,
  ImportantDate,
  Interaction,
  Memory,
  Person,
  PersonNote,
  Relationship,
} from "@/types";
import {
  formatBirthday,
  getPersonInitials,
  groupNamesForPerson,
} from "./person-format";

export function PersonProfileClient({ personId }: { personId: string }) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const { user } = useAuth();
  const mutation = useMutation();
  const [attempt, setAttempt] = useState(0);
  const [loadFailure, setLoadFailure] = useState<boolean | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const { locale, t } = useI18n();
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
    const requestKey = `${user?.uid}/${personId}`;
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setLoadFailure(null);
      try {
        const [
          personResult,
          peopleResult,
          groupsResult,
          datesResult,
          notesResult,
          relationshipsResult,
          memoriesResult,
          interactionsResult,
        ] = await settleReads([
          peopleRepository.getById(ownerId, personId),
          peopleRepository.listActive(ownerId),
          groupsRepository.listByName(ownerId),
          importantDatesRepository.listForPerson(ownerId, personId),
          personNotesRepository.listForPerson(ownerId, personId),
          relationshipsRepository.listForPerson(ownerId, personId),
          memoriesRepository.listForPerson(ownerId, personId),
          interactionsRepository.listForPerson(ownerId, personId),
        ]);

        if (cancelled) return;
        setPerson(personResult);
        setPeople(peopleResult);
        setGroups(groupsResult);
        setImportantDates(datesResult);
        setNotes(notesResult);
        setRelationships(relationshipsResult);
        setMemories(memoriesResult);
        setInteractions(interactionsResult);
      } catch (error) {
        if (!cancelled)
          setLoadFailure(error instanceof ReadFailure && error.partial);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadedKey(requestKey ?? "");
        }
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [personId, user, attempt]);

  async function archivePerson() {
    await mutation.run(async () => {
      if (
        !user ||
        !person ||
        !confirm(
          t("peoplePage", "archiveConfirm", { name: person.displayName }),
        )
      ) {
        return;
      }

      await peopleRepository.archive(user.uid, person.id);
      router.push("/people");
    });
  }

  if (loading || loadedKey !== `${user?.uid}/${personId}`)
    return <LoadState loading />;
  if (loadFailure !== null)
    return (
      <LoadState
        partial={loadFailure}
        retry={() => setAttempt((value) => value + 1)}
      />
    );
  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">
        {t("personProfile", "loading")}
      </div>
    );
  }

  if (!person) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h1 className="font-semibold">{t("personProfile", "notFound")}</h1>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/people">{t("personProfile", "back")}</Link>
        </Button>
      </div>
    );
  }

  const groupNames = groupNamesForPerson(person, groups);
  const lastInteraction = interactions[0];
  const miniGraph = deriveRelationshipGraph(people, relationships, {
    focusPersonId: person.id,
  });

  return (
    <fieldset disabled={mutation.pending} className="min-w-0 space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href="/people">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("nav", "people")}
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
              {person.nickname ? (
                <p className="text-sm text-muted-foreground">
                  {t("personProfile", "nickname", { name: person.nickname })}
                </p>
              ) : null}
              {lastInteraction ? (
                <p className="text-sm text-muted-foreground">
                  {t("personProfile", "lastInteraction", {
                    date: formatLastInteraction(lastInteraction, locale),
                  })}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/people/${person.id}/edit`}>
                <Edit className="size-4" aria-hidden="true" />
                {t("common", "edit")}
              </Link>
            </Button>
            <Button type="button" variant="outline" onClick={archivePerson}>
              <Archive className="size-4" aria-hidden="true" />
              {t("peoplePage", "archive")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDelete((value) => !value)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {t("common", "delete")}
            </Button>
          </div>
        </div>
      </section>

      <p className="text-sm text-muted-foreground">
        {t("lifecycle", "archivePolicy")}
      </p>
      {person.deletionPending ? (
        <p role="alert">{t("lifecycle", "pending")}</p>
      ) : null}
      {showDelete || person.deletionPending ? (
        <LifecycleReview
          key={person.id}
          target={{ collection: "people", id: person.id }}
          onComplete={() => router.push("/people")}
        />
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        <ProfileSection
          icon={UsersRound}
          title={t("personProfile", "about")}
          actionHref={`/people/${person.id}/edit`}
          actionLabel={t("common", "edit")}
        >
          <Detail icon={Phone} value={person.phoneNumbers?.[0]?.value} />
          <Detail icon={Mail} value={person.emails?.[0]?.value} />
          <Detail
            icon={CalendarHeart}
            label={t("personProfile", "birthday")}
            value={formatBirthday(person.birthday, locale)}
          />
        </ProfileSection>
        <ProfileSection
          icon={CalendarHeart}
          title={t("personProfile", "importantDates")}
        >
          <ImportantDateManager
            dates={importantDates}
            onChange={setImportantDates}
            personId={person.id}
          />
        </ProfileSection>
        <ProfileSection icon={NotebookText} title={t("personProfile", "notes")}>
          <PersonNotesManager
            notes={notes}
            onChange={setNotes}
            personId={person.id}
          />
        </ProfileSection>
        <ProfileSection
          icon={UsersRound}
          title={t("personProfile", "relationships")}
        >
          <RelationshipManager
            currentPerson={person}
            people={people}
            relationships={relationships}
            onChange={setRelationships}
          />
        </ProfileSection>
        <ProfileSection icon={UsersRound} title={t("graphPage", "miniTitle")}>
          <RelationshipGraphView
            compact
            graph={miniGraph}
            relationships={relationships}
            groups={groups}
          />
        </ProfileSection>
        <ProfileSection
          icon={MessageCircle}
          title={t("personProfile", "interactions")}
        >
          <InteractionManager
            personId={person.id}
            interactions={interactions}
            onChange={setInteractions}
          />
        </ProfileSection>
        <ProfileSection
          icon={Library}
          title={t("nav", "memories")}
          actionHref={`/memories/new?personId=${person.id}`}
          actionLabel={t("common", "add")}
        >
          {memories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} people={people} />
          ))}
        </ProfileSection>
        <ProfileSection
          icon={Tags}
          title={t("personProfile", "socialProfiles")}
          actionHref={`/people/${person.id}/edit#social-profiles`}
          actionLabel={t("socialProfiles", "manage")}
        >
          {!person.socialProfiles?.length ? (
            <p className="text-sm text-muted-foreground">
              {t("socialProfiles", "empty")}
            </p>
          ) : null}
          {person.socialProfiles?.map((profile, index) => (
            <p
              key={`${index}-${profile.platform}`}
              className="break-words text-sm"
            >
              {safeSocialProfileUrl(profile.url) ? (
                <a
                  href={safeSocialProfileUrl(profile.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  {profile.platform}: {profile.handle || profile.url}
                  <span className="sr-only">
                    {" "}
                    — {t("socialProfiles", "newTab")}
                  </span>
                </a>
              ) : (
                <>
                  {profile.platform}: {profile.handle || profile.url}
                </>
              )}
            </p>
          ))}
        </ProfileSection>
        <ProfileSection
          icon={Tags}
          title={t("personProfile", "groups")}
          actionHref={`/people/${person.id}/edit`}
          actionLabel={t("common", "edit")}
        >
          {groupNames.map((name) => (
            <span
              key={name}
              className="mr-2 inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-medium"
            >
              {name}
            </span>
          ))}
        </ProfileSection>
      </div>
      <MutationError failed={mutation.failed} />
    </fieldset>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label?: string;
  value?: string | null;
}) {
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
  const { t } = useI18n();
  const hasContent = Array.isArray(children)
    ? children.some(Boolean)
    : Boolean(children);

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
        {hasContent ? (
          children
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("personProfile", "empty")}
          </p>
        )}
      </div>
    </section>
  );
}
