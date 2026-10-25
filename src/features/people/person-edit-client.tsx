"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";
import { LoadState } from "@/components/ui/load-state";
import { useAuth } from "@/lib/auth/auth-context";
import { peopleRepository } from "@/repositories/people";
import type { Person } from "@/types";
import { PersonForm } from "./person-form";

export function PersonEditClient({ personId }: { personId: string }) {
  const { user } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loadedKey, setLoadedKey] = useState("");
  const { t } = useI18n();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    peopleRepository
      .getById(user.uid, personId)
      .then((record) => {
        if (!cancelled) setPerson(record);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setLoadedKey(`${user.uid}/${personId}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [personId, user, attempt]);

  if (loading || loadedKey !== `${user?.uid}/${personId}`)
    return <LoadState loading />;
  if (failed)
    return (
      <LoadState
        retry={() => {
          setLoading(true);
          setFailed(false);
          setAttempt((value) => value + 1);
        }}
      />
    );
  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">
        {t("personProfile", "loading")}
      </div>
    );
  }

  if (!person) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h1 className="font-semibold">{t("personProfile", "notFound")}</h1>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/people">{t("personProfile", "back")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t("personProfile", "editTitle")}
        description={t("personProfile", "editDescription", {
          name: person.displayName,
        })}
      />
      <section className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
        <PersonForm person={person} />
      </section>
    </>
  );
}
