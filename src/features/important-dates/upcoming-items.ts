import { createTranslator } from "@/lib/i18n/translate";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import {
  buildUpcomingDates,
  formatFlexibleDate,
  getNextAnnualOccurrence,
  type UpcomingDateGroup,
} from "@/lib/dates/flexible-date";
import type { ImportantDate, Person } from "@/types";
import type { Locale } from "@/types/i18n";

export type UpcomingItem = {
  id: string;
  title: string;
  dateLabel: string;
  person?: Person;
  daysUntil: number;
  group: UpcomingDateGroup;
};

export function buildUpcomingItems(
  importantDates: ImportantDate[],
  people: Person[],
  from: Date,
  locale?: Locale,
): UpcomingItem[] {
  const activeDates = importantDates.filter(
    (date) =>
      !date.deletionPending &&
      people.some(
        (person) =>
          person.id === date.personId &&
          person.ownerId === date.ownerId &&
          !person.archivedAt &&
          !person.deletionPending,
      ),
  );
  const dateItems = buildUpcomingDates(activeDates, people, from).map(
    (date) => ({
      id: date.importantDate.id,
      title: date.importantDate.title,
      dateLabel: formatFlexibleDate(date.importantDate.date, locale),
      person: date.person,
      daysUntil: date.daysUntil,
      group: date.group,
      nextOccurrence: date.nextOccurrence,
    }),
  );

  const birthdayItems = people.flatMap((person) => {
    if (!person.birthday || person.archivedAt || person.deletionPending) {
      return [];
    }

    const nextOccurrence = getNextAnnualOccurrence(person.birthday, from);

    if (!nextOccurrence) {
      return [];
    }

    const daysUntil = differenceInCalendarDays(
      nextOccurrence,
      startOfDay(from),
    );

    return [
      {
        id: `person-birthday-${person.id}`,
        title: createTranslator(locale ?? "en")("personProfile", "birthday"),
        dateLabel: formatFlexibleDate(person.birthday, locale),
        person,
        daysUntil,
        group: getUpcomingGroup(daysUntil),
        nextOccurrence,
      },
    ];
  });

  return [...dateItems, ...birthdayItems]
    .sort(
      (first, second) =>
        first.nextOccurrence.getTime() - second.nextOccurrence.getTime(),
    )
    .map((item) => ({
      id: item.id,
      title: item.title,
      dateLabel: item.dateLabel,
      person: item.person,
      daysUntil: item.daysUntil,
      group: item.group,
    }));
}

/** Read-only reminders for active, owner-matched people; no notification writes. */
export function buildDueDateReminders(items: UpcomingItem[]) {
  return items.filter((item): item is UpcomingItem & { person: Person } =>
    Boolean(
      item.person &&
      !item.person.archivedAt &&
      (item.daysUntil === 0 || item.daysUntil === 7),
    ),
  );
}

function getUpcomingGroup(daysUntil: number): UpcomingDateGroup {
  if (daysUntil === 0) {
    return "today";
  }

  if (daysUntil <= 7) {
    return "this-week";
  }

  if (daysUntil <= 31) {
    return "this-month";
  }

  return "later";
}
