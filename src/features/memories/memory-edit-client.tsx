"use client";

import { useEffect, useState } from "react";

import { MemoryForm } from "@/features/memories/memory-form";
import { useI18n } from "@/lib/i18n/i18n-context";
import { LoadState } from "@/components/ui/load-state";
import { useAuth } from "@/lib/auth/auth-context";
import { memoriesRepository } from "@/repositories/memories";
import type { Memory } from "@/types";

export function MemoryEditClient({ memoryId }: { memoryId: string }) {
  const { user } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loadedKey, setLoadedKey] = useState("");
  const { t } = useI18n();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    memoriesRepository
      .getById(user.uid, memoryId)
      .then((record) => {
        if (!cancelled) setMemory(record);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setLoadedKey(`${user.uid}/${memoryId}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [memoryId, user, attempt]);

  if (loading || loadedKey !== `${user?.uid}/${memoryId}`)
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
        {t("memoryDetail", "loading")}
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">
        {t("memoryDetail", "notFound")}
      </div>
    );
  }

  return <MemoryForm memory={memory} />;
}
