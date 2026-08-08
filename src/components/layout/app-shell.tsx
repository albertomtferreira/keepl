"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";

import { AppNav } from "@/components/layout/app-nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/i18n-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { signOutUser, user } = useAuth();
  const { t } = useI18n();

  return (
    <div className="flex min-h-dvh bg-[#fbfaf7] text-foreground">
      <AppNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-[#fbfaf7]/90 px-4 backdrop-blur md:px-8">
          <Link href="/home" className="text-lg font-semibold tracking-normal md:hidden">
            Keepl
          </Link>
          <div className="hidden text-sm text-muted-foreground md:block">
            {user?.displayName || user?.email}
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label={t("app", "settings")}>
              <Link href="/settings">
                <Settings className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={signOutUser} aria-label={t("app", "signOut")}>
              <LogOut className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
