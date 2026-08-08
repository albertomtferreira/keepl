import type { Locale, LocaleOption } from "@/types/i18n";

export const defaultLocale: Locale = "en";

export const supportedLocales = ["en", "pt", "fr", "es"] as const satisfies readonly Locale[];

export const localeOptions: LocaleOption[] = [
  { code: "en", nativeName: "English", englishName: "English" },
  { code: "pt", nativeName: "Português", englishName: "Portuguese" },
  { code: "fr", nativeName: "Français", englishName: "French" },
  { code: "es", nativeName: "Español", englishName: "Spanish" },
];

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && supportedLocales.includes(value as Locale));
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) {
    return defaultLocale;
  }

  const shortCode = value.toLowerCase().split("-")[0];
  return isSupportedLocale(shortCode) ? shortCode : defaultLocale;
}
