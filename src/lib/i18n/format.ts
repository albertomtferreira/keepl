import type { Locale } from "@/types/i18n";

export function formatDate(value: Date, locale: Locale, options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Intl.DateTimeFormat(locale, options).format(value);
}

export function formatMonthDay(value: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { month: "long", day: "numeric" }).format(value);
}

export function formatRelativeTime(daysUntil: number, locale: Locale) {
  if (daysUntil === 0) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "day");
  }

  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(daysUntil, "day");
}
