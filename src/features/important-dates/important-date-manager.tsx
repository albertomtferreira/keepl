"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  addYears,
  differenceInCalendarDays,
  startOfDay,
  subDays,
} from "date-fns";
import { Timestamp } from "firebase/firestore";
import { CalendarPlus, Pencil, Save, Trash2, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Controller, useWatch, useForm } from "react-hook-form";
import type { z } from "zod";
import { createDateSchema, reminderPresetValues } from "./validation";

import { FlexibleDatePicker } from "@/components/ui/flexible-date-picker";
import { Button } from "@/components/ui/button";
import { useMutation, MutationError } from "@/lib/async/use-mutation";
import { LoadState } from "@/components/ui/load-state";
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

type ReminderPresetValue = (typeof reminderPresetValues)[number];

type DateFormValues = z.infer<ReturnType<typeof createDateSchema>>;

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
  const mutation = useMutation();
  const requestId = useRef<string | null>(null);
  const editRevision = useRef(0);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderFailed, setReminderFailed] = useState(false);
  const { locale, t } = useI18n();
  const [today] = useState(() => new Date());
  const [editing, setEditing] = useState<ImportantDate | "new" | null>(null);
  const [error, setError] = useState<
    | keyof (typeof import("@/lib/i18n/messages/en.json"))["importantDates"]
    | "signInSave"
    | null
  >(null);
  const {
    formState: { errors, isSubmitting, isSubmitted },
    handleSubmit,
    trigger,
    register,
    control,
    setValue,
    reset,
  } = useForm<DateFormValues>({
    resolver: zodResolver(
      createDateSchema({
        validationTitle: t("importantDates", "validationTitle"),
        validationDate: t("importantDates", "validationDate"),
      }),
    ),
    values: formValues(editing),
  });

  const includeYear = useWatch({ control, name: "includeYear" });

  useEffect(
    () => () => {
      ++editRevision.current;
    },
    [],
  );

  useEffect(() => {
    if (isSubmitted) void trigger();
  }, [isSubmitted, t, trigger]);

  function startEditing(date: ImportantDate | "new") {
    const revision = ++editRevision.current;
    setReminderFailed(false);
    setReminderLoading(false);
    requestId.current = null;
    setError(null);
    setEditing(date);
    reset(formValues(date));

    if (!user || date === "new") {
      return;
    }

    setReminderLoading(true);
    void remindersRepository
      .listForImportantDate(user.uid, date.id)
      .then((reminders) => {
        if (editRevision.current !== revision) return;
        const scheduledReminder = reminders.find(
          (reminder) => reminder.status === "scheduled",
        );
        reset(formValues(date, scheduledReminder?.remindAt.toDate()));
      })
      .catch(() => {
        if (editRevision.current === revision) setReminderFailed(true);
      })
      .finally(() => {
        if (editRevision.current === revision) setReminderLoading(false);
      });
  }

  async function onSubmit(values: DateFormValues) {
    await mutation.run(async () => {
      if (!user) {
        setError("signInSave");
        return;
      }

      const date = flexibleDateFromInput(values.date, values.includeYear);
      if (!date) {
        setError("invalidDate");
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
        await importantDatesRepository.update(
          user.uid,
          importantDateId,
          payload,
        );
      } else {
        importantDateId = await importantDatesRepository.create(
          user.uid,
          payload,
          (requestId.current ??= crypto.randomUUID()),
        );
      }

      await replaceReminderForImportantDate(user.uid, importantDateId, {
        date,
        personId,
        reminderPreset: values.reminderPreset,
        repeatsAnnually: values.repeatsAnnually,
        title: values.title,
      });

      onChange(
        await importantDatesRepository.listForPerson(user.uid, personId),
      );
      setEditing(null);
    });
  }

  async function deleteDate(date: ImportantDate) {
    await mutation.run(async () => {
      if (
        !user ||
        !confirm(t("lifecycle", "dateDelete", { name: date.title }))
      ) {
        return;
      }

      await importantDatesRepository.delete(user.uid, date.id);
      onChange(dates.filter((item) => item.id !== date.id));
    });
  }

  return (
    <fieldset
      disabled={mutation.pending || reminderLoading}
      className="min-w-0 space-y-3"
    >
      {reminderLoading ? (
        <p role="status">{t("lifecycle", "loading")}</p>
      ) : null}
      {reminderFailed ? (
        <LoadState retry={() => editing && startEditing(editing)} />
      ) : null}
      {dates.map((date) => {
        const next = getNextAnnualOccurrence(date.date);
        const daysUntil = next
          ? Math.max(0, differenceInCalendarDays(next, today))
          : null;
        return (
          <div key={date.id} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{date.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFlexibleDate(date.date, locale)}
                  {daysUntil !== null
                    ? ` Â· ${formatRelativeDateLabel(daysUntil, locale)}`
                    : ""}
                </p>
                {date.notes ? (
                  <p className="mt-2 text-sm">{date.notes}</p>
                ) : null}
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("importantDates", "edit")}
                  onClick={() => startEditing(date)}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("importantDates", "delete")}
                  onClick={() => deleteDate(date)}
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
            label={t("importantDates", "title")}
            error={errors.title?.message}
          >
            <input className={inputClassName} {...register("title")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <FlexibleDatePicker
                  value={field.value}
                  onChange={field.onChange}
                  includeYear={includeYear}
                  onYearChange={(value) =>
                    setValue("includeYear", value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  label={t("importantDates", "date")}
                  error={errors.date?.message}
                  required
                />
              )}
            />
            <Field
              label={t("importantDates", "kind")}
              error={errors.kind?.message}
            >
              <select className={inputClassName} {...register("kind")}>
                <option value="birthday">
                  {t("importantDates", "birthday")}
                </option>
                <option value="anniversary">
                  {t("importantDates", "anniversary")}
                </option>
                <option value="holiday">
                  {t("importantDates", "holiday")}
                </option>
                <option value="custom">{t("importantDates", "custom")}</option>
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("repeatsAnnually")} />
            {t("importantDates", "repeatsAnnually")}
          </label>
          <Field
            label={t("importantDates", "reminder")}
            error={errors.reminderPreset?.message}
          >
            <select className={inputClassName} {...register("reminderPreset")}>
              <option value="none">{t("importantDates", "none")}</option>
              <option value="0">{t("importantDates", "sameDay")}</option>
              <option value="1">{t("importantDates", "dayBefore")}</option>
              <option value="7">{t("importantDates", "weekBefore")}</option>
              <option value="14">
                {t("importantDates", "twoWeeksBefore")}
              </option>
              <option value="30">{t("importantDates", "monthBefore")}</option>
            </select>
          </Field>
          <Field
            label={t("importantDates", "notes")}
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
                : t("importantDates", error)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                ++editRevision.current;
                setEditing(null);
                setReminderFailed(false);
              }}
            >
              <X className="size-4" aria-hidden="true" />
              {t("common", "cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || reminderFailed}>
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
          <CalendarPlus className="size-4" aria-hidden="true" />
          {t("importantDates", "add")}
        </Button>
      )}
      <MutationError failed={mutation.failed} />
    </fieldset>
  );
}

function formValues(
  editing: ImportantDate | "new" | null,
  reminderDate?: Date,
): DateFormValues {
  const date = editing && editing !== "new" ? editing : null;
  return {
    title: date?.title ?? "",
    date: flexibleDateInputValue(date?.date),
    includeYear: Boolean(date?.date.year),
    kind: date?.kind ?? "custom",
    repeatsAnnually: date?.repeatsAnnually ?? true,
    reminderPreset:
      date && reminderDate
        ? getReminderPresetValue(date.date, reminderDate, date.repeatsAnnually)
        : "none",
    notes: date?.notes ?? "",
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

  const remindAt = getReminderDate(
    values.date,
    Number(values.reminderPreset),
    values.repeatsAnnually,
  );

  if (!remindAt) {
    return;
  }

  await remindersRepository.create(
    ownerId,
    {
      title: values.title,
      remindAt: Timestamp.fromDate(remindAt),
      status: "scheduled",
      personId: values.personId,
      importantDateId,
    },
    `date-reminder-${importantDateId}`,
  );
}

async function deleteRemindersForImportantDate(
  ownerId: string,
  importantDateId: string,
) {
  const reminders = await remindersRepository.listForImportantDate(
    ownerId,
    importantDateId,
  );
  await Promise.all(
    reminders.map((reminder) =>
      remindersRepository.delete(ownerId, reminder.id),
    ),
  );
}

function getReminderDate(
  date: FlexibleDate,
  offsetDays: number,
  repeatsAnnually: boolean,
) {
  const today = startOfDay(new Date());
  let occurrence = repeatsAnnually
    ? getNextAnnualOccurrence(date, today)
    : getOneTimeOccurrence(date, today);

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

function getReminderPresetValue(
  date: FlexibleDate,
  reminderDate: Date,
  repeatsAnnually: boolean,
): ReminderPresetValue {
  const occurrence = repeatsAnnually
    ? getNextAnnualOccurrence(date, reminderDate)
    : getOneTimeOccurrence(date, reminderDate);

  if (!occurrence) {
    return "none";
  }

  const daysBefore = differenceInCalendarDays(occurrence, reminderDate);
  return reminderPresetValues.includes(
    String(daysBefore) as ReminderPresetValue,
  )
    ? (String(daysBefore) as ReminderPresetValue)
    : "none";
}
