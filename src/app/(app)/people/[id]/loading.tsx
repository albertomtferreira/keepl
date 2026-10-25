"use client";
import { useI18n } from "@/lib/i18n/i18n-context";
export default function LoadingPerson() {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">
      {t("personProfile", "loading")}
    </div>
  );
}
