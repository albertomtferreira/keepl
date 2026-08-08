"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { suggestedGroupNames } from "@/features/groups/group-suggestions";
import { createPersonSchema, type PersonFormValues } from "@/features/people/person-validation";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/i18n-context";
import { groupsRepository } from "@/repositories/groups";
import { peopleRepository } from "@/repositories/people";
import type { Group, Person } from "@/types";
import { birthdayInputValue, parseBirthdayInput } from "./person-format";

type PersonFormProps = {
  person?: Person;
};

export function PersonForm({ person }: PersonFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(person?.groupIds ?? []);
  const [newGroupName, setNewGroupName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    groupsRepository.listByName(user.uid).then(setGroups).catch(() => setGroups([]));
  }, [user]);

  const suggestedGroupsToCreate = useMemo(() => {
    const existing = new Set(groups.map((group) => group.name.toLowerCase()));

    return suggestedGroupNames.filter((name) => !existing.has(name.toLowerCase()));
  }, [groups]);

  const personSchema = useMemo(
    () =>
      createPersonSchema({
        firstNameRequired: t("personForm", "validationFirstName"),
        validEmail: t("personForm", "validationEmail"),
      }),
    [t],
  );

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
    },
  });

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((current) => (current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId]));
  }

  async function createGroup(name: string) {
    if (!user) {
      setFormError(t("personForm", "signInAddGroup"));
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    const existing = groups.find((group) => group.name.toLowerCase() === trimmedName.toLowerCase());

    if (existing) {
      setSelectedGroupIds((current) => (current.includes(existing.id) ? current : [...current, existing.id]));
      setNewGroupName("");
      return;
    }

    const id = await groupsRepository.create(user.uid, { name: trimmedName });
    const created = await groupsRepository.getById(user.uid, id);

    if (created) {
      setGroups((current) => [...current, created].sort((first, second) => first.name.localeCompare(second.name)));
      setSelectedGroupIds((current) => [...current, id]);
    }

    setNewGroupName("");
  }

  async function onSubmit(values: PersonFormValues) {
    if (!user) {
      setFormError(t("personForm", "signInSave"));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const displayName = [values.firstName, values.lastName].filter(Boolean).join(" ");
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
        groupIds: selectedGroupIds,
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
      setFormError(error instanceof Error ? error.message : t("personForm", "saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("personForm", "firstName")} error={errors.firstName?.message}>
          <input className={inputClassName} autoComplete="given-name" {...register("firstName")} />
        </Field>
        <Field label={t("personForm", "lastName")} error={errors.lastName?.message}>
          <input className={inputClassName} autoComplete="family-name" {...register("lastName")} />
        </Field>
        <Field label={t("personForm", "nickname")} error={errors.nickname?.message}>
          <input className={inputClassName} {...register("nickname")} />
        </Field>
        <Field label={t("personForm", "birthday")} error={errors.birthday?.message}>
          <input className={inputClassName} type="date" {...register("birthday")} />
        </Field>
        <Field label={t("personForm", "phone")} error={errors.phone?.message}>
          <input className={inputClassName} type="tel" autoComplete="tel" {...register("phone")} />
        </Field>
        <Field label={t("personForm", "email")} error={errors.email?.message}>
          <input className={inputClassName} type="email" autoComplete="email" {...register("email")} />
        </Field>
      </div>

      <div className="space-y-3 rounded-lg border bg-white p-4">
        <div>
          <h2 className="text-sm font-medium">{t("personForm", "groups")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("personForm", "groupsHint")}</p>
        </div>
        {groups.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {groups.map((group) => (
              <label key={group.id} className="flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm">
                <input type="checkbox" checked={selectedGroupIds.includes(group.id)} onChange={() => toggleGroup(group.id)} className="size-4 accent-primary" />
                <span>{group.name}</span>
              </label>
            ))}
          </div>
        ) : null}
        {suggestedGroupsToCreate.length ? (
          <div className="flex flex-wrap gap-2">
            {suggestedGroupsToCreate.map((name) => (
              <Button key={name} type="button" variant="outline" size="sm" onClick={() => createGroup(name)}>
                {t("personForm", "addSuggestedGroup", { name })}
              </Button>
            ))}
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} className={inputClassName} placeholder={t("personForm", "newGroupName")} />
          <Button type="button" variant="outline" onClick={() => createGroup(newGroupName)}>
            {t("personForm", "addGroup")}
          </Button>
        </div>
      </div>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button asChild variant="ghost">
          <Link href={person ? `/people/${person.id}` : "/people"}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("common", "back")}
          </Link>
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="size-4" aria-hidden="true" />
          {saving ? t("common", "saving") : t("common", "savePerson")}
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
