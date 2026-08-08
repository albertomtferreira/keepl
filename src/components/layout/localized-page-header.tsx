"use client";

import { PageHeader } from "@/components/layout/page-header";
import { useI18n } from "@/lib/i18n/i18n-context";

type PageHeaderKey =
  | "home"
  | "people"
  | "newPerson"
  | "memories"
  | "newMemory"
  | "search"
  | "upcoming"
  | "settings";

export function LocalizedPageHeader({ page }: { page: PageHeaderKey }) {
  const { t } = useI18n();

  return (
    <PageHeader
      title={t("pageHeaders", `${page}Title`)}
      description={t("pageHeaders", `${page}Description`)}
    />
  );
}
