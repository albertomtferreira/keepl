"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Timestamp } from "firebase/firestore";
import { ArrowLeft, Save, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/i18n-context";
import { memoriesRepository } from "@/repositories/memories";
import { peopleRepository } from "@/repositories/people";
import type { Memory, Person } from "@/types";
import { dateInputValue } from "./memory-format";
import { PhotoReferencePicker } from "./photo-reference-picker";

function createMemorySchema(messages = {
  titleRequired: "Title is required",
  startDateRequired: "Start date is required",
  endDateAfterStart: "End date must be after the start date",
}) {
  return z
    .object({
    title: z.string().trim().min(1, messages.titleRequired),
    startDate: z.string().min(1, messages.startDateRequired),
    endDate: z.string().optional(),
    location: z.string().trim().optional(),
    description: z.string().trim().optional(),
    tags: z.string().trim().optional(),
  })
  .refine((values) => !values.endDate || values.endDate >= values.startDate, {
    message: messages.endDateAfterStart,
    path: ["endDate"],
  });
}

type MemoryFormValues = z.infer<ReturnType<typeof createMemorySchema>>;

export function MemoryForm({ memory, preselectedPersonId }: { memory?: Memory; preselectedPersonId?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>(memory?.peopleIds ?? (preselectedPersonId ? [preselectedPersonId] : []));
  const [personQuery, setPersonQuery] = useState("");
  const [photos, setPhotos] = useState(memory?.photos ?? []);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    peopleRepository.listActive(user.uid).then(setPeople).catch(() => setPeople([]));
  }, [user]);

  const filteredPeople = useMemo(() => {
    const needle = personQuery.trim().toLowerCase();

    return people.filter((person) =>
      !needle ? true : [person.displayName, person.firstName, person.lastName, person.nickname].filter(Boolean).some((value) => value?.toLowerCase().includes(needle)),
    );
  }, [people, personQuery]);

  const localizedMemorySchema = useMemo(
    () =>
      createMemorySchema({
        titleRequired: t("memoryForm", "validationTitle"),
        startDateRequired: t("memoryForm", "validationStartDate"),
        endDateAfterStart: t("memoryForm", "validationEndDate"),
      }),
    [t],
  );

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<MemoryFormValues>({
    resolver: zodResolver(localizedMemorySchema),
    values: {
      title: memory?.title ?? "",
      startDate: dateInputValue(memory?.startDate),
      endDate: dateInputValue(memory?.endDate),
      location: memory?.location ?? "",
      description: memory?.description ?? "",
      tags: memory?.tags?.join(", ") ?? "",
    },
  });

  function togglePerson(personId: string) {
    setSelectedPeopleIds((current) => (current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId]));
  }

  async function onSubmit(values: MemoryFormValues) {
    if (!user) {
      setFormError(t("memoryForm", "signInSave"));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        title: values.title,
        peopleIds: selectedPeopleIds,
        startDate: Timestamp.fromDate(new Date(`${values.startDate}T00:00:00`)),
        ...(values.endDate ? { endDate: Timestamp.fromDate(new Date(`${values.endDate}T00:00:00`)) } : {}),
        ...(values.location ? { location: values.location } : {}),
        ...(values.description ? { description: values.description } : {}),
        tags: [...new Set((values.tags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean))],
        photos,
      };

      if (memory) {
        await memoriesRepository.update(user.uid, memory.id, payload);
        router.push(`/memories/${memory.id}`);
      } else {
        const id = await memoriesRepository.create(user.uid, payload);
        router.push(`/memories/${id}`);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("memoryForm", "saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("memoryForm", "title")} error={errors.title?.message}>
          <input className={inputClassName} {...register("title")} />
        </Field>
        <Field label={t("memoryForm", "location")} error={errors.location?.message}>
          <input className={inputClassName} {...register("location")} />
        </Field>
        <Field label={t("memoryForm", "startDate")} error={errors.startDate?.message}>
          <input className={inputClassName} type="date" {...register("startDate")} />
        </Field>
        <Field label={t("memoryForm", "endDate")} error={errors.endDate?.message}>
          <input className={inputClassName} type="date" {...register("endDate")} />
        </Field>
      </div>

      <Field label={t("memoryForm", "description")} error={errors.description?.message}>
        <textarea className={`${inputClassName} min-h-28 py-2`} {...register("description")} />
      </Field>

      <Field label={t("memoryForm", "tags")} hint={t("memoryForm", "tagsHint")} error={errors.tags?.message}>
        <input className={inputClassName} placeholder={t("memoryForm", "tagsPlaceholder")} {...register("tags")} />
      </Field>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">{t("memoryForm", "people")}</h2>
          <p className="text-xs text-muted-foreground">{t("memoryForm", "peopleHint")}</p>
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={personQuery} onChange={(event) => setPersonQuery(event.target.value)} placeholder={t("memoryForm", "searchPeople")} className={`${inputClassName} pl-9`} />
        </label>
        <div className="grid max-h-64 gap-2 overflow-auto rounded-lg border bg-white p-2">
          {filteredPeople.length ? (
            filteredPeople.map((person) => (
              <label key={person.id} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted">
                <input type="checkbox" checked={selectedPeopleIds.includes(person.id)} onChange={() => togglePerson(person.id)} className="size-4 accent-primary" />
                <span>{person.displayName}</span>
              </label>
            ))
          ) : (
            <p className="p-3 text-sm text-muted-foreground">{t("memoryForm", "noPeopleFound")}</p>
          )}
        </div>
      </section>

      <PhotoReferencePicker photos={photos} onChange={setPhotos} />

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button asChild variant="ghost">
          <Link href={memory ? `/memories/${memory.id}` : "/memories"}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("common", "back")}
          </Link>
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="size-4" aria-hidden="true" />
          {saving ? t("common", "saving") : t("memoryForm", "saveMemory")}
        </Button>
      </div>
    </form>
  );
}

const inputClassName =
  "h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/30";

function Field({ children, error, hint, label }: { children: React.ReactNode; error?: string; hint?: string; label: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && !error ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      {error ? <span className="block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}
