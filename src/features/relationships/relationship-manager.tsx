"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Link2, Pencil, Save, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { relationshipsRepository } from "@/repositories/relationships";
import type { Person, Relationship } from "@/types";
import {
  getOtherRelationshipPersonId,
  getRelationshipLabelFromPerspective,
  resolveInverseRelationshipLabel,
} from "./relationship-labels";

const relationshipSchema = z.object({
  otherPersonId: z.string().min(1, "Choose a person"),
  label: z.string().trim().min(1, "Relationship is required"),
  inverseLabel: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

type RelationshipFormValues = z.infer<typeof relationshipSchema>;

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
  const [editing, setEditing] = useState<Relationship | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    control,
    register,
    reset,
  } = useForm<RelationshipFormValues>({
    resolver: zodResolver(relationshipSchema),
    values: formValues(editing, currentPerson.id),
  });
  const label = useWatch({ control, name: "label" });

  const peopleById = new Map(people.map((person) => [person.id, person]));
  const selectablePeople = people.filter((person) => person.id !== currentPerson.id);

  function startEditing(relationship: Relationship | "new") {
    setError(null);
    setEditing(relationship);
    reset(formValues(relationship, currentPerson.id));
  }

  async function onSubmit(values: RelationshipFormValues) {
    if (!user) {
      setError("Sign in again before saving.");
      return;
    }

    const otherPersonId = values.otherPersonId;
    if (otherPersonId === currentPerson.id) {
      setError("Choose someone else.");
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
      await relationshipsRepository.create(user.uid, payload);
    }

    onChange(await relationshipsRepository.listForPerson(user.uid, currentPerson.id));
    setEditing(null);
  }

  async function deleteRelationship(relationship: Relationship) {
    if (!user || !confirm("Delete this relationship?")) {
      return;
    }

    await relationshipsRepository.delete(user.uid, relationship.id);
    onChange(relationships.filter((item) => item.id !== relationship.id));
  }

  return (
    <div className="space-y-3">
      {relationships.map((relationship) => {
        const otherPersonId = getOtherRelationshipPersonId(relationship, currentPerson.id);
        const otherPerson = otherPersonId ? peopleById.get(otherPersonId) : null;
        const perspectiveLabel = getRelationshipLabelFromPerspective(relationship, currentPerson.id);

        return (
          <div key={relationship.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {otherPerson ? (
                    <Link className="hover:underline" href={`/people/${otherPerson.id}`}>
                      {otherPerson.displayName}
                    </Link>
                  ) : (
                    "Unknown person"
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{perspectiveLabel}</p>
                {relationship.notes ? <p className="mt-2 text-sm">{relationship.notes}</p> : null}
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label="Edit relationship" onClick={() => startEditing(relationship)}>
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Delete relationship" onClick={() => deleteRelationship(relationship)}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {editing ? (
        <form className="space-y-3 rounded-md border p-3" onSubmit={handleSubmit(onSubmit)}>
          <Field label="Person" error={errors.otherPersonId?.message}>
            <select className={inputClassName} {...register("otherPersonId")}>
              <option value="">Choose someone</option>
              {selectablePeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`${currentPerson.displayName} is their`} error={errors.label?.message}>
              <input className={inputClassName} placeholder="Friend, parent, cousin..." {...register("label")} />
            </Field>
            <Field label="They are this person's" error={errors.inverseLabel?.message}>
              <input className={inputClassName} placeholder={label ? resolveInverseRelationshipLabel(label) : "Optional"} {...register("inverseLabel")} />
            </Field>
          </div>
          <Field label="Notes" error={errors.notes?.message}>
            <textarea className={`${inputClassName} h-20 py-2`} {...register("notes")} />
          </Field>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              <X className="size-4" aria-hidden="true" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="size-4" aria-hidden="true" />
              Save
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => startEditing("new")} disabled={selectablePeople.length === 0}>
          <Link2 className="size-4" aria-hidden="true" />
          Add relationship
        </Button>
      )}
    </div>
  );
}

function formValues(editing: Relationship | "new" | null, currentPersonId: string): RelationshipFormValues {
  const relationship = editing && editing !== "new" ? editing : null;
  const otherPersonId = relationship ? getOtherRelationshipPersonId(relationship, currentPersonId) : "";

  return {
    otherPersonId: otherPersonId ?? "",
    label: relationship ? getRelationshipLabelFromPerspective(relationship, currentPersonId) : "",
    inverseLabel: relationship?.inverseLabel ?? "",
    notes: relationship?.notes ?? "",
  };
}

const inputClassName =
  "h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/30";

function Field({ children, error, label }: { children: React.ReactNode; error?: string; label: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}
