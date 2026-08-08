import {
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isToday,
  startOfDay,
} from "date-fns";

import type { FlexibleDate, ImportantDate, Person } from "@/types";

export type UpcomingDate = {
  importantDate: ImportantDate;
  person?: Person;
  nextOccurrence: Date;
  daysUntil: number;
  group: UpcomingDateGroup;
};

export type UpcomingDateGroup = "today" | "this-week" | "this-month" | "later";

export function flexibleDateFromInput(value: string, includeYear: boolean): FlexibleDate | undefined {
  if (!value) {
    return undefined;
  }

  if (includeYear) {
    const [year, month, day] = value.split("-").map(Number);
    return year && month && day ? { year, month, day, precision: "full" } : undefined;
  }

  const [, month, day] = value.split("-").map(Number);
  return month && day ? { month, day, precision: "month-day" } : undefined;
}

export function flexibleDateInputValue(date?: FlexibleDate) {
  if (!date?.month || !date.day) {
    return "";
  }

  const year = date.year ?? 2000;
  return `${year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function formatFlexibleDate(date?: FlexibleDate) {
  if (!date?.month || !date.day) {
    return "Date not set";
  }

  const occurrence = new Date(date.year ?? 2000, date.month - 1, date.day);
  return date.year ? format(occurrence, "PPP") : format(occurrence, "MMMM d");
}

export function getNextAnnualOccurrence(date: FlexibleDate, from = new Date()) {
  if (!date.month || !date.day) {
    return null;
  }

  const today = startOfDay(from);
  const baseYear = date.year && date.year > today.getFullYear() ? date.year : today.getFullYear();
  let occurrence = new Date(baseYear, date.month - 1, date.day);

  if (isBefore(occurrence, today)) {
    occurrence = addYears(occurrence, 1);
  }

  return startOfDay(occurrence);
}

export function buildUpcomingDates(importantDates: ImportantDate[], people: Person[], from = new Date()) {
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

export function formatRelativeDateLabel(daysUntil: number) {
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
  if (isToday(date)) {
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
