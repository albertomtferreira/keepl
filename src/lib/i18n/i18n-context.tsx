"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/lib/auth/auth-context";
import { defaultLocale, normalizeLocale } from "@/lib/i18n/config";
import en from "@/lib/i18n/messages/en.json";
import es from "@/lib/i18n/messages/es.json";
import fr from "@/lib/i18n/messages/fr.json";
import pt from "@/lib/i18n/messages/pt.json";
import { userProfilesRepository } from "@/repositories/users";
import type { Locale } from "@/types/i18n";

const messages = { en, pt, fr, es };
const storageKey = "keepl.locale";

type Messages = typeof en;
type Namespace = keyof Messages;
type MessageKey<N extends Namespace> = keyof Messages[N] & string;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: <N extends Namespace>(namespace: N, key: MessageKey<N>, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [locale, setLocaleState] = useState<Locale>(() => {
    const browserLocale = typeof navigator === "undefined" ? defaultLocale : normalizeLocale(navigator.language);
    const storedLocale = typeof window === "undefined" ? null : window.localStorage.getItem(storageKey);
    return normalizeLocale(storedLocale ?? browserLocale);
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    userProfilesRepository
      .get(user.uid)
      .then((profile) => {
        if (profile?.locale) {
          setLocaleState(normalizeLocale(profile.locale));
        }
      })
      .catch(() => undefined);
  }, [user]);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(storageKey, locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: async (nextLocale) => {
        setLocaleState(nextLocale);
        window.localStorage.setItem(storageKey, nextLocale);

        if (user) {
          await userProfilesRepository.updateLocale(user.uid, nextLocale);
        }
      },
      t: (namespace, key, values = {}) => {
        const localized = messages[locale][namespace]?.[key] as string | undefined;
        const fallback = messages.en[namespace][key] as string;
        const template = localized ?? fallback;

        if (process.env.NODE_ENV === "development" && !localized) {
          console.warn(`Missing translation: ${locale}.${namespace}.${key}`);
        }

        return Object.entries(values).reduce(
          (message, [name, replacement]) => message.replaceAll(`{${name}}`, String(replacement)),
          template,
        );
      },
    }),
    [locale, user],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return context;
}
