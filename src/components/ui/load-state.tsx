"use client";
import { Button } from "./button";
import { useI18n } from "@/lib/i18n/i18n-context";
export function LoadState({
  loading,
  partial = false,
  retry,
}: {
  loading?: boolean;
  partial?: boolean;
  retry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="space-y-3 rounded-lg border bg-white p-5"
      role={loading ? "status" : "alert"}
    >
      <p
        className={
          loading ? "text-sm text-muted-foreground" : "text-sm text-destructive"
        }
      >
        {t(
          "lifecycle",
          loading ? "loading" : partial ? "partialError" : "loadError",
        )}
      </p>
      {!loading && retry ? (
        <Button variant="outline" onClick={retry}>
          {t("lifecycle", "retry")}
        </Button>
      ) : null}
    </div>
  );
}
