"use client";
import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/i18n-context";

export function useMutation() {
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setFailed(false);
    try {
      await work();
    } catch {
      setFailed(true);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return { pending, failed, run };
}
export function MutationError({ failed }: { failed: boolean }) {
  const { t } = useI18n();
  return failed ? (
    <p role="alert" className="text-sm text-destructive">
      {t("lifecycle", "mutationError")}
    </p>
  ) : null;
}
