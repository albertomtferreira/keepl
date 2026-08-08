import {
  buildUpcomingDates,
  formatFlexibleDate,
  getNextAnnualOccurrence,
  type UpcomingDateGroup,
} from "@/lib/dates/flexible-date";
import type { ImportantDate, Person } from "@/types";

export type UpcomingItem = {
  id: string;
  title: string;
  dateLabel: string;
  person?: Person;
  daysUntil: number;
  group: UpcomingDateGroup;
};

export function buildUpcomingItems(importantDates: ImportantDate[], people: Person[], from: Date): UpcomingItem[] {
  const dateItems = buildUpcomingDates(importantDates, people, from).map((date) => ({
    id: date.importantDate.id,
    title: date.importantDate.title,
    dateLabel: formatFlexibleDate(date.importantDate.date),
    person: date.person,
    daysUntil: date.daysUntil,
    group: date.group,
    nextOccurrence: date.nextOccurrence,
  }));

  const birthdayItems = people.flatMap((person) => {
    if (!person.birthday) {
      return [];
    }

    const nextOccurrence = getNextAnnualOccurrence(person.birthday, from);

    if (!nextOccurrence) {
      return [];
    }

    const daysUntil = Math.max(0, Math.ceil((nextOccurrence.getTime() - from.getTime()) / 86400000));

    return [
      {
        id: `person-birthday-${person.id}`,
        title: "Birthday",
        dateLabel: formatFlexibleDate(person.birthday),
        person,
        daysUntil,
        group: getUpcomingGroup(daysUntil),
        nextOccurrence,
      },
    ];
  });

  return [...dateItems, ...birthdayItems]
    .sort((first, second) => first.nextOccurrence.getTime() - second.nextOccurrence.getTime())
    .map((item) => ({
      id: item.id,
      title: item.title,
      dateLabel: item.dateLabel,
      person: item.person,
      daysUntil: item.daysUntil,
      group: item.group,
    }));
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
