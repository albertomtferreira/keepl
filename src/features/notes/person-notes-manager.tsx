"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  NotebookPen,
  Pencil,
  Pin,
  PinOff,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { createNoteSchema } from "./validation";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";
import { useMutation, MutationError } from "@/lib/async/use-mutation";
import { useAuth } from "@/lib/auth/auth-context";
import { personNotesRepository } from "@/repositories/person-notes";
import type { PersonNote } from "@/types";

type NoteFormValues = z.infer<ReturnType<typeof createNoteSchema>>;

export function PersonNotesManager({
  notes,
  onChange,
  personId,
}: {
  notes: PersonNote[];
  onChange: (notes: PersonNote[]) => void;
  personId: string;
}) {
  const { user } = useAuth();
  const mutation = useMutation();
  const requestId = useRef<string | null>(null);
  const { t } = useI18n();
  const [editing, setEditing] = useState<PersonNote | "new" | null>(null);
  const [error, setError] = useState<
    | keyof (typeof import("@/lib/i18n/messages/en.json"))["notes"]
    | "signInSave"
    | null
  >(null);
  const {
    formState: { errors, isSubmitting, isSubmitted },
    handleSubmit,
    trigger,
    register,
    reset,
  } = useForm<NoteFormValues>({
    resolver: zodResolver(
      createNoteSchema({ validationBody: t("notes", "validationBody") }),
    ),
    values: formValues(editing),
  });

  useEffect(() => {
    if (isSubmitted) void trigger();
  }, [isSubmitted, t, trigger]);

  function startEditing(note: PersonNote | "new") {
    requestId.current = null;
    setError(null);
    setEditing(note);
    reset(formValues(note));
  }

  async function onSubmit(values: NoteFormValues) {
    await mutation.run(async () => {
      if (!user) {
        setError("signInSave");
        return;
      }

      const payload = {
        personId,
        body: values.body,
        pinned: values.pinned,
        ...(values.title ? { title: values.title } : {}),
      };

      if (editing && editing !== "new") {
        await personNotesRepository.update(user.uid, editing.id, payload);
      } else {
        await personNotesRepository.create(
          user.uid,
          payload,
          (requestId.current ??= crypto.randomUUID()),
        );
      }

      onChange(await personNotesRepository.listForPerson(user.uid, personId));
      setEditing(null);
    });
  }

  async function togglePinned(note: PersonNote) {
    await mutation.run(async () => {
      if (!user) {
        return;
      }

      await personNotesRepository.update(user.uid, note.id, {
        pinned: !note.pinned,
      });
      onChange(
        notes.map((item) =>
          item.id === note.id ? { ...item, pinned: !note.pinned } : item,
        ),
      );
    });
  }

  async function deleteNote(note: PersonNote) {
    await mutation.run(async () => {
      if (!user || !confirm(t("notes", "deleteConfirm"))) {
        return;
      }

      await personNotesRepository.delete(user.uid, note.id);
      onChange(notes.filter((item) => item.id !== note.id));
    });
  }

  const sortedNotes = [...notes].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned),
  );

  return (
    <fieldset disabled={mutation.pending} className="min-w-0 space-y-3">
      {sortedNotes.map((note) => (
        <div key={note.id} className="rounded-md border p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                {note.pinned ? (
                  <Pin
                    className="size-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                ) : null}
                {note.title ? (
                  <p className="font-medium">{note.title}</p>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-sm">{note.body}</p>
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("notes", "togglePinned")}
                onClick={() => togglePinned(note)}
              >
                {note.pinned ? (
                  <PinOff className="size-4" aria-hidden="true" />
                ) : (
                  <Pin className="size-4" aria-hidden="true" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("notes", "edit")}
                onClick={() => startEditing(note)}
              >
                <Pencil className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("notes", "delete")}
                onClick={() => deleteNote(note)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {editing ? (
        <form
          className="space-y-3 rounded-md border p-3"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Field label={t("notes", "title")} error={errors.title?.message}>
            <input className={inputClassName} {...register("title")} />
          </Field>
          <Field label={t("notes", "body")} error={errors.body?.message}>
            <textarea
              className={`${inputClassName} h-24 py-2`}
              {...register("body")}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("pinned")} />
            {t("notes", "pin")}
          </label>
          {error ? (
            <p className="text-sm text-destructive">
              {error === "signInSave"
                ? t("common", "signInSave")
                : t("notes", error)}
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
        >
          <NotebookPen className="size-4" aria-hidden="true" />
          {t("notes", "add")}
        </Button>
      )}
      <MutationError failed={mutation.failed} />
    </fieldset>
  );
}

function formValues(editing: PersonNote | "new" | null): NoteFormValues {
  const note = editing && editing !== "new" ? editing : null;
  return {
    title: note?.title ?? "",
    body: note?.body ?? "",
    pinned: note?.pinned ?? false,
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
