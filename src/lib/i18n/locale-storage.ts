import { defaultLocale, normalizeLocale } from "./config";
import type { Locale } from "@/types/i18n";

const storageKey = "keepl.locale";
export function readDeviceLocale(): Locale {
  try {
    return normalizeLocale(
      window.localStorage.getItem(storageKey) ?? navigator.language,
    );
  } catch {
    return typeof navigator === "undefined"
      ? defaultLocale
      : normalizeLocale(navigator.language);
  }
}

export function persistDeviceLocale(locale: Locale) {
  try {
    window.localStorage.setItem(storageKey, locale);
  } catch {
    /* Storage may be unavailable. */
  }
}
