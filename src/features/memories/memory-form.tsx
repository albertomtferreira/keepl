"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Timestamp } from "firebase/firestore";
import { ArrowLeft, Image as PhotoIcon, Save, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { memoriesRepository } from "@/repositories/memories";
import { peopleRepository } from "@/repositories/people";
import { getGooglePhotosIntegrationStatus } from "@/services/google/photos";
import type { Memory, Person } from "@/types";
import { dateInputValue } from "./memory-format";

const memorySchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    location: z.string().trim().optional(),
    description: z.string().trim().optional(),
    tags: z.string().trim().optional(),
  })
  .refine((values) => !values.endDate || values.endDate >= values.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

type MemoryFormValues = z.infer<typeof memorySchema>;

export function MemoryForm({ memory, preselectedPersonId }: { memory?: Memory; preselectedPersonId?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>(memory?.peopleIds ?? (preselectedPersonId ? [preselectedPersonId] : []));
  const [personQuery, setPersonQuery] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const photosStatus = getGooglePhotosIntegrationStatus();

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

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<MemoryFormValues>({
    resolver: zodResolver(memorySchema),
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
      setFormError("Sign in again before saving.");
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
        photos: memory?.photos ?? [],
      };

      if (memory) {
        await memoriesRepository.update(user.uid, memory.id, payload);
        router.push(`/memories/${memory.id}`);
      } else {
        const id = await memoriesRepository.create(user.uid, payload);
        router.push(`/memories/${id}`);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save this memory.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" error={errors.title?.message}>
          <input className={inputClassName} {...register("title")} />
        </Field>
        <Field label="Location" error={errors.location?.message}>
          <input className={inputClassName} {...register("location")} />
        </Field>
        <Field label="Start date" error={errors.startDate?.message}>
          <input className={inputClassName} type="date" {...register("startDate")} />
        </Field>
        <Field label="End date" error={errors.endDate?.message}>
          <input className={inputClassName} type="date" {...register("endDate")} />
        </Field>
      </div>

      <Field label="Description" error={errors.description?.message}>
        <textarea className={`${inputClassName} min-h-28 py-2`} {...register("description")} />
      </Field>

      <Field label="Tags" hint="Separate tags with commas." error={errors.tags?.message}>
        <input className={inputClassName} placeholder="holiday, birthday, Porto" {...register("tags")} />
      </Field>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">People</h2>
          <p className="text-xs text-muted-foreground">Connect this memory to everyone who was part of it.</p>
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={personQuery} onChange={(event) => setPersonQuery(event.target.value)} placeholder="Search people" className={`${inputClassName} pl-9`} />
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
            <p className="p-3 text-sm text-muted-foreground">No people found.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-dashed bg-white p-4">
        <div className="flex items-start gap-3">
          <PhotoIcon className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-medium">Photos</h2>
            <p className="mt-1 text-sm text-muted-foreground">{photosStatus.label}. Photo references can be added after the Google Photos integration is connected.</p>
          </div>
        </div>
      </section>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button asChild variant="ghost">
          <Link href={memory ? `/memories/${memory.id}` : "/memories"}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Link>
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="size-4" aria-hidden="true" />
          {saving ? "Saving" : "Save memory"}
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
