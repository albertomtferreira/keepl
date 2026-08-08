"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { peopleRepository } from "@/repositories/people";
import type { Person } from "@/types";
import { PersonForm } from "./person-form";

export function PersonEditClient({ personId }: { personId: string }) {
  const { user } = useAuth();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    peopleRepository
      .getById(user.uid, personId)
      .then(setPerson)
      .finally(() => setLoading(false));
  }, [personId, user]);

  if (loading) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">Loading person...</div>;
  }

  if (!person) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <h1 className="font-semibold">Person not found</h1>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/people">Back to people</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Edit person" description={`Update what you keep close about ${person.displayName}.`} />
      <section className="rounded-lg border bg-white p-4 shadow-sm sm:p-6">
        <PersonForm person={person} />
      </section>
    </>
  );
}
