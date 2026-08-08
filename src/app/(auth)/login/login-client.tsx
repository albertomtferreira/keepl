"use client";

import { ArrowRight, HeartHandshake, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";

export function LoginClient() {
  const { loading, signInWithGoogle, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [signingIn, setSigningIn] = useState(false);
  const next = searchParams.get("next") || "/home";

  useEffect(() => {
    if (!loading && user) {
      router.replace(next);
    }
  }, [loading, next, router, user]);

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signInWithGoogle();
      router.replace(next);
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
              Private, person-centred memory keeping.
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-normal text-balance sm:text-5xl">
              Remember the people and details that make life feel close.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Sign in with Google to keep your people, memories, dates, and notes in
              your own private Keepl space.
            </p>
            <Button className="mt-8 gap-2" onClick={handleSignIn} disabled={loading || signingIn}>
              {signingIn ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="size-4" aria-hidden="true" />
              )}
              Continue with Google
            </Button>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <HeartHandshake className="mb-5 size-6 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Keep people close</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Keepl starts with a gentle home for names, dates, notes, memories,
              and the relationships around them.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
