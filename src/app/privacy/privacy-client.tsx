"use client";

import Link from "next/link";
import { LocalizedPageHeader } from "@/components/layout/localized-page-header";
import { useI18n } from "@/lib/i18n/i18n-context";
import { formatDate } from "@/lib/i18n/format";

const sections = [
  "data",
  "use",
  "google",
  "storage",
  "device",
  "control",
  "retention",
  "changes",
] as const;
const contactEmail = "albertomtferreira@gmail.com";

export function PrivacyClient() {
  const { t, locale } = useI18n();
  return (
    <main className="min-h-dvh bg-[#fbfaf7] px-5 py-10 text-foreground sm:px-8">
      <article className="mx-auto max-w-3xl space-y-7 rounded-lg border bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="font-semibold underline underline-offset-4">
          Keepl
        </Link>
        <LocalizedPageHeader page="privacy" />
        <p className="text-sm text-muted-foreground">
          {t("privacy", "updated", {
            date: formatDate(new Date("2026-10-25T00:00:00Z"), locale, {
              dateStyle: "long",
              timeZone: "UTC",
            }),
          })}
        </p>
        <p className="leading-7">{t("privacy", "intro")}</p>
        {sections.map((section) => (
          <section key={section} className="space-y-2">
            <h2 className="text-lg font-semibold">
              {t("privacy", `${section}Title`)}
            </h2>
            <p className="whitespace-pre-line leading-7 text-muted-foreground">
              {t("privacy", `${section}Body`)}
            </p>
          </section>
        ))}
        <p className="leading-7 text-muted-foreground">
          {t("privacy", "limitedUse")}{" "}
          <a
            className="underline underline-offset-4"
            href="https://developers.google.com/terms/api-services-user-data-policy"
          >
            {t("privacy", "googlePolicy")}
          </a>
        </p>
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            {t("privacy", "contactTitle")}
          </h2>
          <p className="leading-7 text-muted-foreground">
            {t("privacy", "contactBody")}{" "}
            <a
              className="break-all underline underline-offset-4"
              href={`mailto:${contactEmail}`}
            >
              {contactEmail}
            </a>
          </p>
        </section>
      </article>
    </main>
  );
}
