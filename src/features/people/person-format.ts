import type { FlexibleDate, Group, Person } from "@/types";
import type { Locale } from "@/types/i18n";
import { defaultLocale } from "@/lib/i18n/config";
import { formatDate, formatMonthDay } from "@/lib/i18n/format";

export function getPersonInitials(person: Pick<Person, "displayName" | "firstName" | "lastName">) {
  const initials = [person.firstName, person.lastName]
    .filter(Boolean)
    .map((part) => part?.trim().charAt(0))
    .join("");

  return (initials || person.displayName.trim().charAt(0) || "?").toUpperCase();
}

export function formatBirthday(date?: FlexibleDate, locale: Locale = defaultLocale) {
  if (!date?.month || !date.day) {
    return null;
  }

  const birthday = new Date(date.year ?? 2000, date.month - 1, date.day);

  return date.year ? formatDate(birthday, locale, { dateStyle: "long" }) : formatMonthDay(birthday, locale);
}

export function birthdayInputValue(date?: FlexibleDate) {
  if (!date?.month || !date.day) {
    return "";
  }

  const year = date.year ?? 2000;
  return `${year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function parseBirthdayInput(value: string): FlexibleDate | undefined {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!month || !day) {
    return undefined;
  }

  return { year, month, day, precision: "full" };
}

export function groupNamesForPerson(person: Pick<Person, "groupIds">, groups: Group[]) {
  const groupMap = new Map(groups.map((group) => [group.id, group.name]));
  return person.groupIds?.map((id) => groupMap.get(id)).filter(Boolean) ?? [];
}
