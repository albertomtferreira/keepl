import {
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";

import { createTranslator } from "@/lib/i18n/translate";
import { defaultLocale } from "@/lib/i18n/config";
import {
  formatDate,
  formatMonthDay,
  formatRelativeTime,
} from "@/lib/i18n/format";
import type { FlexibleDate, ImportantDate, Person } from "@/types";
import type { Locale } from "@/types/i18n";

export type UpcomingDate = {
  importantDate: ImportantDate;
  person?: Person;
  nextOccurrence: Date;
  daysUntil: number;
  group: UpcomingDateGroup;
};

export type UpcomingDateGroup = "today" | "this-week" | "this-month" | "later";

export function flexibleDateFromInput(
  value: string,
  includeYear: boolean,
): FlexibleDate | undefined {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!/^\d{0,4}-\d{1,2}-\d{1,2}$/.test(value)) return undefined;
  const validationYear = includeYear ? year : 2000;
  const leapYear =
    validationYear % 4 === 0 &&
    (validationYear % 100 !== 0 || validationYear % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  if (
    !Number.isInteger(validationYear) ||
    validationYear < 1 ||
    validationYear > 9999 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > daysInMonth[month - 1]
  )
    return undefined;
  return includeYear
    ? { year, month, day, precision: "full" }
    : { month, day, precision: "month-day" };
}

export function flexibleDateInputValue(date?: FlexibleDate) {
  if (!date?.month || !date.day) {
    return "";
  }

  const year = date.year ?? "";
  return `${year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function formatFlexibleDate(
  date?: FlexibleDate,
  locale: Locale = defaultLocale,
) {
  if (!date?.month || !date.day) {
    return createTranslator(locale)("dates", "dateNotSet");
  }

  const occurrence = new Date(date.year ?? 2000, date.month - 1, date.day);
  return date.year
    ? formatDate(occurrence, locale, { dateStyle: "long" })
    : formatMonthDay(occurrence, locale);
}

export function getNextAnnualOccurrence(date: FlexibleDate, from = new Date()) {
  if (!date.month || !date.day) {
    return null;
  }

  const today = startOfDay(from);
  const baseYear =
    date.year && date.year > today.getFullYear()
      ? date.year
      : today.getFullYear();
  let occurrence = new Date(baseYear, date.month - 1, date.day);

  if (isBefore(occurrence, today)) {
    occurrence = addYears(occurrence, 1);
  }

  return startOfDay(occurrence);
}

export function buildUpcomingDates(
  importantDates: ImportantDate[],
  people: Person[],
  from = new Date(),
) {
  const today = startOfDay(from);
  const peopleById = new Map(people.map((person) => [person.id, person]));

  return importantDates
    .map((importantDate): UpcomingDate | null => {
      const nextOccurrence = importantDate.repeatsAnnually
        ? getNextAnnualOccurrence(importantDate.date, today)
        : getOneTimeOccurrence(importantDate.date, today);

      if (!nextOccurrence) {
        return null;
      }

      const daysUntil = differenceInCalendarDays(nextOccurrence, today);

      return {
        importantDate,
        person: peopleById.get(importantDate.personId),
        nextOccurrence,
        daysUntil,
        group: getUpcomingDateGroup(nextOccurrence, today),
      };
    })
    .filter((date): date is UpcomingDate => Boolean(date))
    .sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime());
}

export function formatRelativeDateLabel(
  daysUntil: number,
  locale: Locale = defaultLocale,
) {
  return titleCase(formatRelativeTime(daysUntil, locale));
}

function titleCase(value: string) {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

export function formatRelativeDateLabelEnglish(daysUntil: number) {
  if (daysUntil === 0) {
    return "Today";
  }

  if (daysUntil === 1) {
    return "Tomorrow";
  }

  return `In ${daysUntil} days`;
}

function getOneTimeOccurrence(date: FlexibleDate, from: Date) {
  if (!date.year || !date.month || !date.day) {
    return getNextAnnualOccurrence(date, from);
  }

  const occurrence = startOfDay(new Date(date.year, date.month - 1, date.day));
  return isBefore(occurrence, from) ? null : occurrence;
}

function getUpcomingDateGroup(date: Date, from: Date): UpcomingDateGroup {
  const daysUntil = differenceInCalendarDays(date, from);

  if (daysUntil === 0) {
    return "today";
  }

  if (!isAfter(date, endOfWeek(from, { weekStartsOn: 1 }))) {
    return "this-week";
  }

  if (!isAfter(date, endOfMonth(from))) {
    return "this-month";
  }

  return "later";
}
