"use client";

import {
  ArrowLeft,
  CalendarDays,
  Edit,
  Expand,
  Image as PhotoIcon,
  MapPin,
  Trash2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { LoadState } from "@/components/ui/load-state";
import { ReadFailure, settleReads } from "@/lib/async/settle";
import { useMutation, MutationError } from "@/lib/async/use-mutation";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/i18n-context";
import { memoriesRepository } from "@/repositories/memories";
import { peopleRepository } from "@/repositories/people";
import { getGooglePhotosIntegrationStatus } from "@/services/google/photos";
import type { Memory, Person } from "@/types";
import { GooglePhotoThumbnail } from "./google-photo-thumbnail";
import { formatMemoryDate, memoryPeopleNames } from "./memory-format";
import { PhotoViewerDialog } from "./photo-viewer-dialog";

export function MemoryDetailClient({ memoryId }: { memoryId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const mutation = useMutation();
  const [attempt, setAttempt] = useState(0);
  const [loadFailure, setLoadFailure] = useState<boolean | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const { locale, t } = useI18n();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const photosStatus = getGooglePhotosIntegrationStatus();

  useEffect(() => {
    if (!user) {
      return;
    }
    const ownerId = user.uid;
    const requestKey = `${user?.uid}/${memoryId}`;
    let cancelled = false;

    async function loadMemory() {
      setLoading(true);
      setLoadFailure(null);
      try {
        const [memoryResult, peopleResult] = await settleReads([
          memoriesRepository.getById(ownerId, memoryId),
          peopleRepository.listActive(ownerId),
        ]);
        if (cancelled) return;
        setMemory(memoryResult);
        setPeople(peopleResult);
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

    void loadMemory();
    return () => {
      cancelled = true;
    };
  }, [memoryId, user, attempt]);

  async function deleteMemory() {
    await mutation.run(async () => {
      if (
        !user ||
        !memory ||
        !confirm(t("lifecycle", "memoryDelete", { name: memory.title }))
      ) {
        return;
      }

      await memoriesRepository.delete(user.uid, memory.id);
      router.push("/memories");
    });
  }

  if (loading || loadedKey !== `${user?.uid}/${memoryId}`)
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
        {t("memoryDetail", "loading")}
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h1 className="font-semibold">{t("memoryDetail", "notFound")}</h1>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/memories">{t("memoryDetail", "back")}</Link>
        </Button>
      </div>
    );
  }

  const names = memoryPeopleNames(memory, people);

  return (
    <fieldset disabled={mutation.pending} className="min-w-0 space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href="/memories">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("nav", "memories")}
        </Link>
      </Button>

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{memory.title}</h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" aria-hidden="true" />
                {formatMemoryDate(memory, locale)}
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
                {t("common", "edit")}
              </Link>
            </Button>
            <Button type="button" variant="destructive" onClick={deleteMemory}>
              <Trash2 className="size-4" aria-hidden="true" />
              {t("common", "delete")}
            </Button>
          </div>
        </div>
      </section>

      {memory.description ? (
        <section className="rounded-lg border bg-white p-4 text-sm leading-6 shadow-sm">
          {memory.description}
        </section>
      ) : null}

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <UsersRound
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          {t("memoryForm", "people")}
        </h2>
        {names.length ? (
          <div className="flex flex-wrap gap-2">
            {memory.peopleIds.map((personId) => {
              const person = people.find((item) => item.id === personId);
              return person ? (
                <Link
                  key={person.id}
                  href={`/people/${person.id}`}
                  className="rounded-full bg-secondary px-3 py-1 text-sm font-medium"
                >
                  {person.displayName}
                </Link>
              ) : null;
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("memoryDetail", "noPeople")}
          </p>
        )}
      </section>

      {memory.tags?.length ? (
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">{t("memoryForm", "tags")}</h2>
          <div className="flex flex-wrap gap-2">
            {memory.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-3 py-1 text-sm font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-dashed bg-white p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <PhotoIcon
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          {t("memoryForm", "photos")}
        </h2>
        {memory.photos?.length ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {memory.photos.map((photo, index) => (
              <div
                key={`${photo.source}-${photo.externalId ?? index}`}
                className="overflow-hidden rounded-md border bg-white"
              >
                <div className="relative">
                  <GooglePhotoThumbnail
                    alt={photo.description ?? t("memoryForm", "photoReference")}
                    mediaUrl={photo.thumbnailUrl ?? photo.url}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-2"
                    aria-label={t("memoryForm", "expandPhoto")}
                    onClick={() => setPhotoViewerIndex(index)}
                  >
                    <Expand className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="space-y-2 p-3 text-sm">
                  <p className="font-medium">
                    {photo.description ||
                      photo.externalId ||
                      t("memoryForm", "photoReference")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {photo.providerStatus === "expired" ||
                    photo.providerStatus === "unavailable"
                      ? t("memoryForm", "photoUnavailable")
                      : t("memoryForm", "photoReferenceSaved")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {photosStatus.state === "permission-required"
              ? t("memoryForm", "photosPermissionRequired")
              : t("common", "connected")}
            . {t("memoryForm", "memoryWorksWithoutPhotos")}
          </p>
        )}
      </section>

      {photoViewerIndex !== null && memory.photos?.length ? (
        <PhotoViewerDialog
          currentIndex={photoViewerIndex}
          onChangeIndex={setPhotoViewerIndex}
          onClose={() => setPhotoViewerIndex(null)}
          photos={memory.photos}
        />
      ) : null}
      <MutationError failed={mutation.failed} />
    </fieldset>
  );
}
