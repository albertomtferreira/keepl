"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addYears, differenceInCalendarDays, startOfDay, subDays } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { CalendarPlus, Pencil, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/i18n-context";
import {
  flexibleDateFromInput,
  flexibleDateInputValue,
  formatFlexibleDate,
  formatRelativeDateLabel,
  getNextAnnualOccurrence,
} from "@/lib/dates/flexible-date";
import { importantDatesRepository } from "@/repositories/important-dates";
import { remindersRepository } from "@/repositories/reminders";
import type { FlexibleDate, ImportantDate, ImportantDateKind } from "@/types";

const reminderPresetValues = ["none", "0", "1", "7", "14", "30"] as const;

type ReminderPresetValue = (typeof reminderPresetValues)[number];

const dateSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  includeYear: z.boolean(),
  kind: z.enum(["birthday", "anniversary", "holiday", "custom"]),
  repeatsAnnually: z.boolean(),
  reminderPreset: z.enum(reminderPresetValues),
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
  const { locale } = useI18n();
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

    if (!user || date === "new") {
      return;
    }

    void remindersRepository.listForImportantDate(user.uid, date.id).then((reminders) => {
      const scheduledReminder = reminders.find((reminder) => reminder.status === "scheduled");
      reset(formValues(date, scheduledReminder?.remindAt.toDate()));
    });
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

    let importantDateId: string;

    if (editing && editing !== "new") {
      importantDateId = editing.id;
      await importantDatesRepository.update(user.uid, importantDateId, payload);
    } else {
      importantDateId = await importantDatesRepository.create(user.uid, payload);
    }

    await replaceReminderForImportantDate(user.uid, importantDateId, {
      date,
      personId,
      reminderPreset: values.reminderPreset,
      repeatsAnnually: values.repeatsAnnually,
      title: values.title,
    });

    onChange(await importantDatesRepository.listForPerson(user.uid, personId));
    setEditing(null);
  }

  async function deleteDate(date: ImportantDate) {
    if (!user || !confirm(`Delete ${date.title}?`)) {
      return;
    }

    await importantDatesRepository.delete(user.uid, date.id);
    await deleteRemindersForImportantDate(user.uid, date.id);
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
                  {formatFlexibleDate(date.date, locale)}
                  {daysUntil !== null ? ` · ${formatRelativeDateLabel(daysUntil, locale)}` : ""}
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
          <Field label="Reminder" error={errors.reminderPreset?.message}>
            <select className={inputClassName} {...register("reminderPreset")}>
              <option value="none">No reminder</option>
              <option value="0">Same day</option>
              <option value="1">1 day before</option>
              <option value="7">1 week before</option>
              <option value="14">2 weeks before</option>
              <option value="30">1 month before</option>
            </select>
          </Field>
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

function formValues(editing: ImportantDate | "new" | null, reminderDate?: Date): DateFormValues {
  const date = editing && editing !== "new" ? editing : null;
  return {
    title: date?.title ?? "",
    date: flexibleDateInputValue(date?.date),
    includeYear: Boolean(date?.date.year),
    kind: date?.kind ?? "custom",
    repeatsAnnually: date?.repeatsAnnually ?? true,
    reminderPreset: date && reminderDate ? getReminderPresetValue(date.date, reminderDate, date.repeatsAnnually) : "none",
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

async function replaceReminderForImportantDate(
  ownerId: string,
  importantDateId: string,
  values: {
    date: FlexibleDate;
    personId: string;
    reminderPreset: ReminderPresetValue;
    repeatsAnnually: boolean;
    title: string;
  },
) {
  await deleteRemindersForImportantDate(ownerId, importantDateId);

  if (values.reminderPreset === "none") {
    return;
  }

  const remindAt = getReminderDate(values.date, Number(values.reminderPreset), values.repeatsAnnually);

  if (!remindAt) {
    return;
  }

  await remindersRepository.create(ownerId, {
    title: `Remember ${values.title}`,
    remindAt: Timestamp.fromDate(remindAt),
    status: "scheduled",
    personId: values.personId,
    importantDateId,
  });
}

async function deleteRemindersForImportantDate(ownerId: string, importantDateId: string) {
  const reminders = await remindersRepository.listForImportantDate(ownerId, importantDateId);
  await Promise.all(reminders.map((reminder) => remindersRepository.delete(ownerId, reminder.id)));
}

function getReminderDate(date: FlexibleDate, offsetDays: number, repeatsAnnually: boolean) {
  const today = startOfDay(new Date());
  let occurrence = repeatsAnnually ? getNextAnnualOccurrence(date, today) : getOneTimeOccurrence(date, today);

  if (!occurrence) {
    return null;
  }

  let reminderDate = startOfDay(subDays(occurrence, offsetDays));

  while (repeatsAnnually && reminderDate < today) {
    occurrence = addYears(occurrence, 1);
    reminderDate = startOfDay(subDays(occurrence, offsetDays));
  }

  return reminderDate < today ? null : reminderDate;
}

function getOneTimeOccurrence(date: FlexibleDate, from: Date) {
  if (!date.year || !date.month || !date.day) {
    return getNextAnnualOccurrence(date, from);
  }

  const occurrence = startOfDay(new Date(date.year, date.month - 1, date.day));
  return occurrence < startOfDay(from) ? null : occurrence;
}

function getReminderPresetValue(date: FlexibleDate, reminderDate: Date, repeatsAnnually: boolean): ReminderPresetValue {
  const occurrence = repeatsAnnually ? getNextAnnualOccurrence(date, reminderDate) : getOneTimeOccurrence(date, reminderDate);

  if (!occurrence) {
    return "none";
  }

  const daysBefore = differenceInCalendarDays(occurrence, reminderDate);
  return reminderPresetValues.includes(String(daysBefore) as ReminderPresetValue)
    ? (String(daysBefore) as ReminderPresetValue)
    : "none";
}
