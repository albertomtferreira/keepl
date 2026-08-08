"use client";

import { useEffect, useState } from "react";

import { MemoryForm } from "@/features/memories/memory-form";
import { useAuth } from "@/lib/auth/auth-context";
import { memoriesRepository } from "@/repositories/memories";
import type { Memory } from "@/types";

export function MemoryEditClient({ memoryId }: { memoryId: string }) {
  const { user } = useAuth();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    memoriesRepository
      .getById(user.uid, memoryId)
      .then(setMemory)
      .finally(() => setLoading(false));
  }, [memoryId, user]);

  if (loading) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">Loading memory...</div>;
  }

  if (!memory) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-muted-foreground">Memory not found.</div>;
  }

  return <MemoryForm memory={memory} />;
}
