"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Link2, Pencil, Save, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { createRelationshipSchema } from "./validation";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";
import { useMutation, MutationError } from "@/lib/async/use-mutation";
import { useAuth } from "@/lib/auth/auth-context";
import { relationshipsRepository } from "@/repositories/relationships";
import type { Person, Relationship } from "@/types";
import {
  getOtherRelationshipPersonId,
  getRelationshipLabelFromPerspective,
  resolveInverseRelationshipLabel,
} from "./relationship-labels";

type RelationshipFormValues = z.infer<
  ReturnType<typeof createRelationshipSchema>
>;

export function RelationshipManager({
  currentPerson,
  onChange,
  people,
  relationships,
}: {
  currentPerson: Person;
  onChange: (relationships: Relationship[]) => void;
  people: Person[];
  relationships: Relationship[];
}) {
  const { user } = useAuth();
  const mutation = useMutation();
  const requestId = useRef<string | null>(null);
  const { locale, t } = useI18n();
  const [editing, setEditing] = useState<Relationship | "new" | null>(null);
  const [error, setError] = useState<
    | keyof (typeof import("@/lib/i18n/messages/en.json"))["relationships"]
    | "signInSave"
    | null
  >(null);
  const {
    formState: { errors, isSubmitting, isSubmitted },
    handleSubmit,
    trigger,
    control,
    register,
    reset,
  } = useForm<RelationshipFormValues>({
    resolver: zodResolver(
      createRelationshipSchema({
        validationPerson: t("relationships", "validationPerson"),
        validationLabel: t("relationships", "validationLabel"),
      }),
    ),
    values: formValues(editing, currentPerson.id),
  });

  useEffect(() => {
    if (isSubmitted) void trigger();
  }, [isSubmitted, t, trigger]);
  const label = useWatch({ control, name: "label" });

  const peopleById = new Map(people.map((person) => [person.id, person]));
  const selectablePeople = people.filter(
    (person) => person.id !== currentPerson.id,
  );

  function startEditing(relationship: Relationship | "new") {
    requestId.current = null;
    setError(null);
    setEditing(relationship);
    reset(formValues(relationship, currentPerson.id));
  }

  async function onSubmit(values: RelationshipFormValues) {
    await mutation.run(async () => {
      if (!user) {
        setError("signInSave");
        return;
      }

      const otherPersonId = values.otherPersonId;
      if (otherPersonId === currentPerson.id) {
        setError("chooseOther");
        return;
      }

      const payload = {
        fromPersonId: currentPerson.id,
        toPersonId: otherPersonId,
        label: values.label,
        ...(values.inverseLabel ? { inverseLabel: values.inverseLabel } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      };

      if (editing && editing !== "new") {
        await relationshipsRepository.update(user.uid, editing.id, payload);
      } else {
        await relationshipsRepository.create(
          user.uid,
          payload,
          (requestId.current ??= crypto.randomUUID()),
        );
      }

      onChange(
        await relationshipsRepository.listForPerson(user.uid, currentPerson.id),
      );
      setEditing(null);
    });
  }

  async function deleteRelationship(relationship: Relationship) {
    await mutation.run(async () => {
      if (!user || !confirm(t("relationships", "deleteConfirm"))) {
        return;
      }

      await relationshipsRepository.delete(user.uid, relationship.id);
      onChange(relationships.filter((item) => item.id !== relationship.id));
    });
  }

  return (
    <fieldset disabled={mutation.pending} className="min-w-0 space-y-3">
      {relationships.map((relationship) => {
        const otherPersonId = getOtherRelationshipPersonId(
          relationship,
          currentPerson.id,
        );
        const otherPerson = otherPersonId
          ? peopleById.get(otherPersonId)
          : null;
        const perspectiveLabel = getRelationshipLabelFromPerspective(
          relationship,
          currentPerson.id,
          locale,
        );

        return (
          <div key={relationship.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {otherPerson ? (
                    <Link
                      className="hover:underline"
                      href={`/people/${otherPerson.id}`}
                    >
                      {otherPerson.displayName}
                    </Link>
                  ) : (
                    t("relationships", "unknown")
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {perspectiveLabel}
                </p>
                {relationship.notes ? (
                  <p className="mt-2 text-sm">{relationship.notes}</p>
                ) : null}
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("relationships", "edit")}
                  onClick={() => startEditing(relationship)}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("relationships", "delete")}
                  onClick={() => deleteRelationship(relationship)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {editing ? (
        <form
          className="space-y-3 rounded-md border p-3"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Field
            label={t("relationships", "person")}
            error={errors.otherPersonId?.message}
          >
            <select className={inputClassName} {...register("otherPersonId")}>
              <option value="">{t("relationships", "choose")}</option>
              {selectablePeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t("relationships", "fromLabel", {
                name: currentPerson.displayName,
              })}
              error={errors.label?.message}
            >
              <input
                className={inputClassName}
                placeholder={t("relationships", "placeholder")}
                {...register("label")}
              />
            </Field>
            <Field
              label={t("relationships", "toLabel")}
              error={errors.inverseLabel?.message}
            >
              <input
                className={inputClassName}
                placeholder={
                  label
                    ? resolveInverseRelationshipLabel(label, locale)
                    : t("relationships", "optional")
                }
                {...register("inverseLabel")}
              />
            </Field>
          </div>
          <Field
            label={t("relationships", "notes")}
            error={errors.notes?.message}
          >
            <textarea
              className={`${inputClassName} h-20 py-2`}
              {...register("notes")}
            />
          </Field>
          {error ? (
            <p className="text-sm text-destructive">
              {error === "signInSave"
                ? t("common", "signInSave")
                : t("relationships", error)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(null)}
            >
              <X className="size-4" aria-hidden="true" />
              {t("common", "cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="size-4" aria-hidden="true" />
              {t("common", "save")}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => startEditing("new")}
          disabled={selectablePeople.length === 0}
        >
          <Link2 className="size-4" aria-hidden="true" />
          {t("relationships", "add")}
        </Button>
      )}
      <MutationError failed={mutation.failed} />
    </fieldset>
  );
}

function formValues(
  editing: Relationship | "new" | null,
  currentPersonId: string,
): RelationshipFormValues {
  const relationship = editing && editing !== "new" ? editing : null;
  const otherPersonId = relationship
    ? getOtherRelationshipPersonId(relationship, currentPersonId)
    : "";

  return {
    otherPersonId: otherPersonId ?? "",
    label: relationship
      ? getRelationshipLabelFromPerspective(relationship, currentPersonId)
      : "",
    inverseLabel: relationship?.inverseLabel ?? "",
    notes: relationship?.notes ?? "",
  };
}

const inputClassName =
  "h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/30";

function Field({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-destructive">{error}</span>
      ) : null}
    </label>
  );
}
