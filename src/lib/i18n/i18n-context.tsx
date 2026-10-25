"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useAuth } from "@/lib/auth/auth-context";
import { defaultLocale, normalizeLocale } from "@/lib/i18n/config";
import { createTranslator, type Translator } from "./translate";
import { readDeviceLocale, persistDeviceLocale } from "./locale-storage";
import { userProfilesRepository } from "@/repositories/users";
import type { Locale } from "@/types/i18n";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: Translator;
};

const subscribeToDeviceLocale = () => () => {};
const getServerLocale = () => defaultLocale;

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const deviceLocale = useSyncExternalStore(
    subscribeToDeviceLocale,
    readDeviceLocale,
    getServerLocale,
  );
  const [selectedLocale, setLocaleState] = useState<Locale | null>(null);
  const locale = selectedLocale ?? deviceLocale;
  const revision = useRef(0);

  useEffect(() => {
    const requestRevision = ++revision.current;
    let cancelled = false;
    if (user) {
      userProfilesRepository
        .get(user.uid)
        .then((profile) => {
          if (
            !cancelled &&
            revision.current === requestRevision &&
            profile?.locale
          ) {
            const restored = normalizeLocale(profile.locale);
            setLocaleState(restored);
            persistDeviceLocale(restored);
          }
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: async (nextLocale) => {
        ++revision.current;
        setLocaleState(nextLocale);
        persistDeviceLocale(nextLocale);

        if (user) {
          await userProfilesRepository.updateLocale(user.uid, nextLocale);
        }
      },
      t: createTranslator(locale),
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
