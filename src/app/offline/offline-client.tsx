"use client";
import { useI18n } from "@/lib/i18n/i18n-context";
import { WifiOff } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function OfflineClient() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fbfaf7] px-4 py-10 text-foreground">
      <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
        <WifiOff
          className="mb-4 size-6 text-muted-foreground"
          aria-hidden="true"
        />
        <h1 className="text-xl font-semibold tracking-normal">
          {t("offline", "title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t("offline", "description")}
        </p>
        <Button asChild className="mt-5 w-full">
          <Link href="/home">{t("offline", "home")}</Link>
        </Button>
      </div>
    </main>
  );
}
