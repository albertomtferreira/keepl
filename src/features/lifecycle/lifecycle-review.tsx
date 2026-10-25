"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/i18n-context";
import {
  confirmLifecycle,
  previewLifecycle,
  type Plan,
  type Target,
} from "@/services/lifecycle";

export function LifecycleReview({
  target,
  onComplete,
}: {
  target?: Target;
  onComplete?: () => void;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [preview, setPreview] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const owner = useRef(user?.uid);
  useEffect(() => {
    owner.current = user?.uid;
    return () => {
      owner.current = undefined;
    };
  }, [user?.uid]);

  async function review() {
    if (!user || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    setDone(false);
    setProgress(0);
    const uid = user.uid;
    try {
      const plan = await previewLifecycle(uid, target);
      if (owner.current === uid) setPreview(plan);
    } catch {
      if (owner.current === uid) setError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function apply() {
    if (!user || preview?.ownerId !== user.uid || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    const uid = user.uid;
    try {
      await confirmLifecycle(preview, (count) => {
        if (owner.current === uid) setProgress(count);
      });
      if (owner.current === uid) {
        setPreview(null);
        setDone(true);
        onComplete?.();
      }
    } catch {
      if (owner.current === uid) {
        setError(true);
        setPreview(null);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const visible = preview?.ownerId === user?.uid ? preview : null;
  function recordLabel(
    record: Plan["actions"][number]["record"],
    collection: string,
  ) {
    if (collection === "interactions")
      return String(record.summary ?? t("interactions", record.kind as "call"));
    return String(
      record.title ??
        record.displayName ??
        record.name ??
        record.label ??
        record.body ??
        "",
    );
  }
  return (
    <section className="space-y-3 rounded-lg border bg-white p-4">
      <h2 className="font-semibold">
        {t("lifecycle", target ? "deleteTitle" : "repairTitle")}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t("lifecycle", target ? "deletePolicy" : "repairPolicy")}
      </p>
      {visible ? (
        <>
          <p className="text-sm">
            {t("lifecycle", "counts", {
              count:
                visible.actions.filter((action) => !action.patch).length +
                (visible.root ? 1 : 0),
              memories: visible.actions.filter((action) => action.patch).length,
            })}
          </p>
          {visible.root ? (
            <p className="font-medium">
              {recordLabel(visible.root, visible.target!.collection)}
            </p>
          ) : null}
          <ul className="max-h-56 overflow-auto text-sm">
            {visible.actions.map((action) => (
              <li key={`${action.collection}/${action.record.id}`}>
                {t(
                  "exportImportPage",
                  `collection${action.collection[0].toUpperCase()}${action.collection.slice(1)}` as "collectionPeople",
                )}{" "}
                — {recordLabel(action.record, action.collection)} —{" "}
                {t("lifecycle", action.patch ? "detach" : "remove")}
              </li>
            ))}
          </ul>
          {!visible.actions.length && !target ? (
            <p>{t("lifecycle", "noOrphans")}</p>
          ) : (
            <Button variant="destructive" disabled={busy} onClick={apply}>
              {t("lifecycle", "confirm")}
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => setPreview(null)}
          >
            {t("common", "cancel")}
          </Button>
        </>
      ) : (
        <Button variant="outline" onClick={review} disabled={busy}>
          {t("lifecycle", "review")}
        </Button>
      )}
      {busy ? (
        <p role="status">{t("lifecycle", "progress", { count: progress })}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {t("lifecycle", "error")}
        </p>
      ) : null}
      {done ? <p role="status">{t("lifecycle", "done")}</p> : null}
    </section>
  );
}
