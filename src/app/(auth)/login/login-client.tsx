"use client";

import { useI18n } from "@/lib/i18n/i18n-context";
import { ArrowRight, HeartHandshake, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { postLoginPath } from "@/lib/auth/post-login-path";

export function LoginClient() {
  const { t } = useI18n();
  const { loading, signInWithGoogle, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const next = postLoginPath(searchParams.get("next"));

  useEffect(() => {
    if (!loading && user) {
      router.replace(next);
    }
  }, [loading, next, router, user]);

  async function handleSignIn() {
    setSigningIn(true);
    setError(false);
    try {
      await signInWithGoogle();
    } catch {
      setError(true);
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#fbfaf7] text-foreground">
      <section className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between">
          <div className="text-lg font-semibold tracking-normal">Keepl</div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-medium text-muted-foreground">
              {t("login", "tagline")}
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-normal text-balance sm:text-5xl">
              {t("login", "title")}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              {t("login", "description")}
            </p>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {t("login", "error")}
              </p>
            ) : null}
            <Button
              className="mt-8 gap-2"
              onClick={handleSignIn}
              disabled={loading || signingIn}
            >
              {signingIn ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="size-4" aria-hidden="true" />
              )}
              {t("login", "continue")}
            </Button>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <HeartHandshake
              className="mb-5 size-6 text-primary"
              aria-hidden="true"
            />
            <h2 className="text-lg font-semibold">{t("login", "keepClose")}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {t("login", "hint")}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
