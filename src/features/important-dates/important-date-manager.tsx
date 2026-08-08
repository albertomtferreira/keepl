"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { differenceInCalendarDays } from "date-fns";
import { CalendarPlus, Pencil, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import {
  flexibleDateFromInput,
  flexibleDateInputValue,
  formatFlexibleDate,
  formatRelativeDateLabel,
  getNextAnnualOccurrence,
} from "@/lib/dates/flexible-date";
import { importantDatesRepository } from "@/repositories/important-dates";
import type { ImportantDate, ImportantDateKind } from "@/types";

const dateSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  includeYear: z.boolean(),
  kind: z.enum(["birthday", "anniversary", "holiday", "custom"]),
  repeatsAnnually: z.boolean(),
  notes: z.string().trim().optional(),
});

type DateFormValues = z.infer<typeof dateSchema>;

export function ImportantDateManager({
  dates,
  onChange,
  personId,
}: {
  dates: ImportantDate[];
  onChange: (dates: ImportantDate[]) => void;
  personId: string;
}) {
  const { user } = useAuth();
  const [today] = useState(() => new Date());
  const [editing, setEditing] = useState<ImportantDate | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<DateFormValues>({
    resolver: zodResolver(dateSchema),
    values: formValues(editing),
  });

  function startEditing(date: ImportantDate | "new") {
    setError(null);
    setEditing(date);
    reset(formValues(date));
  }

  async function onSubmit(values: DateFormValues) {
    if (!user) {
      setError("Sign in again before saving.");
      return;
    }

    const date = flexibleDateFromInput(values.date, values.includeYear);
    if (!date) {
      setError("Use a valid date.");
      return;
    }

    const payload = {
      personId,
      title: values.title,
      date,
      kind: values.kind as ImportantDateKind,
      repeatsAnnually: values.repeatsAnnually,
      ...(values.notes ? { notes: values.notes } : {}),
    };

    if (editing && editing !== "new") {
      await importantDatesRepository.update(user.uid, editing.id, payload);
    } else {
      await importantDatesRepository.create(user.uid, payload);
    }

    onChange(await importantDatesRepository.listForPerson(user.uid, personId));
    setEditing(null);
  }

  async function deleteDate(date: ImportantDate) {
    if (!user || !confirm(`Delete ${date.title}?`)) {
      return;
    }

    await importantDatesRepository.delete(user.uid, date.id);
    onChange(dates.filter((item) => item.id !== date.id));
  }

  return (
    <div className="space-y-3">
      {dates.map((date) => {
        const next = getNextAnnualOccurrence(date.date);
        const daysUntil = next ? Math.max(0, differenceInCalendarDays(next, today)) : null;
        return (
          <div key={date.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{date.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFlexibleDate(date.date)}
                  {daysUntil !== null ? ` · ${formatRelativeDateLabel(daysUntil)}` : ""}
                </p>
                {date.notes ? <p className="mt-2 text-sm">{date.notes}</p> : null}
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label="Edit date" onClick={() => startEditing(date)}>
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Delete date" onClick={() => deleteDate(date)}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {editing ? (
        <form className="space-y-3 rounded-md border p-3" onSubmit={handleSubmit(onSubmit)}>
          <Field label="Title" error={errors.title?.message}>
            <input className={inputClassName} {...register("title")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date" error={errors.date?.message}>
              <input className={inputClassName} type="date" {...register("date")} />
            </Field>
            <Field label="Kind" error={errors.kind?.message}>
              <select className={inputClassName} {...register("kind")}>
                <option value="birthday">Birthday</option>
                <option value="anniversary">Anniversary</option>
                <option value="holiday">Holiday</option>
                <option value="custom">Custom</option>
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("includeYear")} />
            Year is known
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("repeatsAnnually")} />
            Repeats annually
          </label>
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
        <Button type="button" variant="outline" size="sm" onClick={() => startEditing("new")}>
          <CalendarPlus className="size-4" aria-hidden="true" />
          Add date
        </Button>
      )}
    </div>
  );
}

function formValues(editing: ImportantDate | "new" | null): DateFormValues {
  const date = editing && editing !== "new" ? editing : null;
  return {
    title: date?.title ?? "",
    date: flexibleDateInputValue(date?.date),
    includeYear: Boolean(date?.date.year),
    kind: date?.kind ?? "custom",
    repeatsAnnually: date?.repeatsAnnually ?? true,
    notes: date?.notes ?? "",
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
