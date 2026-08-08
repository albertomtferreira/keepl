"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { groupsRepository } from "@/repositories/groups";
import { peopleRepository } from "@/repositories/people";
import type { Group, Person } from "@/types";
import { birthdayInputValue, parseBirthdayInput } from "./person-format";

const personSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().optional(),
  nickname: z.string().trim().optional(),
  birthday: z.string().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Use a valid email").or(z.literal("")),
  groups: z.string().trim().optional(),
});

type PersonFormValues = z.infer<typeof personSchema>;

type PersonFormProps = {
  person?: Person;
};

export function PersonForm({ person }: PersonFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    groupsRepository.listByName(user.uid).then(setGroups).catch(() => setGroups([]));
  }, [user]);

  const defaultGroupNames = useMemo(() => {
    if (!person?.groupIds?.length) {
      return "";
    }

    const groupMap = new Map(groups.map((group) => [group.id, group.name]));
    return person.groupIds.map((id) => groupMap.get(id)).filter(Boolean).join(", ");
  }, [groups, person]);

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    values: {
      firstName: person?.firstName ?? "",
      lastName: person?.lastName ?? "",
      nickname: person?.nickname ?? "",
      birthday: birthdayInputValue(person?.birthday),
      phone: person?.phoneNumbers?.find((phone) => phone.primary)?.value ?? person?.phoneNumbers?.[0]?.value ?? "",
      email: person?.emails?.find((email) => email.primary)?.value ?? person?.emails?.[0]?.value ?? "",
      groups: defaultGroupNames,
    },
  });

  async function resolveGroupIds(ownerId: string, rawGroups?: string) {
    const names = [...new Set((rawGroups ?? "").split(",").map((name) => name.trim()).filter(Boolean))];
    const knownGroups = groups.length ? groups : await groupsRepository.listByName(ownerId);
    const existingByName = new Map(knownGroups.map((group) => [group.name.toLowerCase(), group]));
    const groupIds: string[] = [];

    for (const name of names) {
      const existing = existingByName.get(name.toLowerCase());
      if (existing) {
        groupIds.push(existing.id);
      } else {
        const id = await groupsRepository.create(ownerId, { name });
        groupIds.push(id);
      }
    }

    return groupIds;
  }

  async function onSubmit(values: PersonFormValues) {
    if (!user) {
      setFormError("Sign in again before saving.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const displayName = [values.firstName, values.lastName].filter(Boolean).join(" ");
      const groupIds = await resolveGroupIds(user.uid, values.groups);
      const optionalFields = {
        ...(values.lastName ? { lastName: values.lastName } : {}),
        ...(values.nickname ? { nickname: values.nickname } : {}),
        ...(values.birthday ? { birthday: parseBirthdayInput(values.birthday) } : {}),
        ...(person?.sourceId ? { sourceId: person.sourceId } : {}),
        ...(person?.photo ? { photo: person.photo } : {}),
      };
      const payload = {
        displayName: values.nickname ? `${displayName} (${values.nickname})` : displayName,
        firstName: values.firstName,
        phoneNumbers: values.phone ? [{ value: values.phone, primary: true }] : [],
        emails: values.email ? [{ value: values.email, primary: true }] : [],
        socialProfiles: person?.socialProfiles ?? [],
        groupIds,
        source: person?.source ?? "manual",
        archivedAt: person?.archivedAt ?? null,
        ...optionalFields,
      };

      if (person) {
        await peopleRepository.update(user.uid, person.id, payload);
        router.push(`/people/${person.id}`);
      } else {
        const id = await peopleRepository.create(user.uid, payload);
        router.push(`/people/${id}`);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save this person.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" error={errors.firstName?.message}>
          <input className={inputClassName} autoComplete="given-name" {...register("firstName")} />
        </Field>
        <Field label="Last name" error={errors.lastName?.message}>
          <input className={inputClassName} autoComplete="family-name" {...register("lastName")} />
        </Field>
        <Field label="Nickname" error={errors.nickname?.message}>
          <input className={inputClassName} {...register("nickname")} />
        </Field>
        <Field label="Birthday" error={errors.birthday?.message}>
          <input className={inputClassName} type="date" {...register("birthday")} />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input className={inputClassName} type="tel" autoComplete="tel" {...register("phone")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input className={inputClassName} type="email" autoComplete="email" {...register("email")} />
        </Field>
      </div>

      <Field label="Groups" hint="Separate group names with commas." error={errors.groups?.message}>
        <input className={inputClassName} placeholder="Family, Porto friends" {...register("groups")} />
      </Field>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button asChild variant="ghost">
          <Link href={person ? `/people/${person.id}` : "/people"}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Link>
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="size-4" aria-hidden="true" />
          {saving ? "Saving" : "Save person"}
        </Button>
      </div>
    </form>
  );
}

const inputClassName =
  "h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/30";

function Field({
  children,
  error,
  hint,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  hint?: string;
  label: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && !error ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      {error ? <span className="block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}
