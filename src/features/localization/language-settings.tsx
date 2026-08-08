"use client";

import { Languages } from "lucide-react";
import { useState } from "react";

import { localeOptions } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { Locale } from "@/types/i18n";

const selectClassName =
  "h-10 rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/30";

export function LanguageSettings() {
  const { locale, setLocale, t } = useI18n();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function handleChange(nextLocale: Locale) {
    setStatus("idle");

    try {
      await setLocale(nextLocale);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Languages className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <label htmlFor="language" className="font-semibold">
            {t("settings", "language")}
          </label>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("settings", "languageHint")}</p>
          <select id="language" value={locale} onChange={(event) => handleChange(event.target.value as Locale)} className={`${selectClassName} mt-4 w-full sm:w-64`}>
            {localeOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.nativeName}
              </option>
            ))}
          </select>
          {status === "saved" ? <p className="mt-2 text-sm text-emerald-700">{t("settings", "languageSaved")}</p> : null}
          {status === "error" ? <p className="mt-2 text-sm text-amber-700">{t("settings", "languageSaveError")}</p> : null}
        </div>
      </div>
    </section>
  );
}
