"use client";

import { CheckCircle2, Download, FileJson, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/i18n-context";
import { exportKeeplData, getExportCollections, serializeKeeplExport } from "@/services/export/export-data";
import { importKeeplData, parseKeeplImportJson, previewKeeplImport } from "@/services/import/import-data";
import type { ImportPreview, ImportSelection, KeeplExportCollection } from "@/types";

const collectionLabelKeys = {
  people: "collectionPeople",
  groups: "collectionGroups",
  relationships: "collectionRelationships",
  importantDates: "collectionImportantDates",
  personNotes: "collectionPersonNotes",
  memories: "collectionMemories",
  interactions: "collectionInteractions",
  reminders: "collectionReminders",
} as const satisfies Record<KeeplExportCollection, string>;

export function ExportImportClient() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selection, setSelection] = useState<ImportSelection>({});
  const [status, setStatus] = useState<"idle" | "exported" | "preview" | "imported" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedCount = useMemo(() => {
    if (!preview) {
      return 0;
    }

    return getExportCollections().reduce((count, collection) => {
      const selectedIds = selection[collection] ?? preview.exportData.collections[collection].map((record) => record.id);
      return count + selectedIds.length;
    }, 0);
  }, [preview, selection]);

  async function handleExport() {
    if (!user) {
      return;
    }

    setExporting(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      const data = await exportKeeplData(user.uid);
      const blob = new Blob([serializeKeeplExport(data)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `keepl-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus("exported");
    } catch {
      setStatus("error");
      setErrorMessage(t("exportImportPage", "exportError"));
    } finally {
      setExporting(false);
    }
  }

  async function handleFileChange(file: File | null) {
    if (!file || !user) {
      return;
    }

    setStatus("idle");
    setErrorMessage("");
    setPreview(null);
    setSelection({});

    try {
      const parsed = parseKeeplImportJson(await file.text());
      const nextPreview = await previewKeeplImport(user.uid, parsed);
      setPreview(nextPreview);
      setSelection(buildDefaultSelection(nextPreview));
      setStatus("preview");
    } catch {
      setStatus("error");
      setErrorMessage(t("exportImportPage", "importValidationError"));
    }
  }

  async function handleImport() {
    if (!user || !preview) {
      return;
    }

    setImporting(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      await importKeeplData(user.uid, preview.exportData, selection);
      setStatus("imported");
      setPreview(null);
      setSelection({});
    } catch {
      setStatus("error");
      setErrorMessage(t("exportImportPage", "importError"));
    } finally {
      setImporting(false);
    }
  }

  function toggleCollection(collection: KeeplExportCollection, checked: boolean) {
    if (!preview) {
      return;
    }

    const duplicateIds = new Set(
      preview.duplicates.filter((duplicate) => duplicate.collection === collection).map((duplicate) => duplicate.id),
    );

    setSelection((current) => ({
      ...current,
      [collection]: checked
        ? preview.exportData.collections[collection].map((record) => record.id).filter((id) => !duplicateIds.has(id))
        : [],
    }));
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Download className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{t("exportImportPage", "exportTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("exportImportPage", "exportDescription")}</p>
            <Button type="button" onClick={handleExport} disabled={exporting || !user} className="mt-4 gap-2">
              <FileJson className="size-4" aria-hidden="true" />
              {exporting ? t("exportImportPage", "exporting") : t("exportImportPage", "downloadJson")}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Upload className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{t("exportImportPage", "importTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("exportImportPage", "importDescription")}</p>
            <label className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-lg border bg-white px-4 text-sm font-medium hover:bg-muted">
              {t("exportImportPage", "chooseFile")}
              <input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
      </section>

      {preview ? (
        <section className="rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">{t("exportImportPage", "previewTitle")}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t("exportImportPage", "previewDescription", { count: selectedCount })}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {getExportCollections().map((collection) => {
              const records = preview.exportData.collections[collection];
              const selectedIds = selection[collection] ?? records.map((record) => record.id);
              const duplicateCount = preview.duplicates.filter((duplicate) => duplicate.collection === collection).length;

              return (
                <label key={collection} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                  <span>
                    <span className="font-medium">{t("exportImportPage", collectionLabelKeys[collection])}</span>
                    <span className="block text-muted-foreground">
                      {t("exportImportPage", "recordCount", { count: records.length })}
                      {duplicateCount > 0 ? ` · ${t("exportImportPage", "duplicateCount", { count: duplicateCount })}` : ""}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0}
                    disabled={records.length === 0}
                    onChange={(event) => toggleCollection(collection, event.target.checked)}
                  />
                </label>
              );
            })}
          </div>
          {preview.duplicates.length > 0 ? (
            <p className="mt-4 text-sm leading-6 text-amber-800">{t("exportImportPage", "duplicatesHint")}</p>
          ) : null}
          <Button type="button" onClick={handleImport} disabled={importing || selectedCount === 0} className="mt-4 gap-2">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {importing ? t("exportImportPage", "importing") : t("exportImportPage", "confirmImport")}
          </Button>
        </section>
      ) : null}

      {status === "exported" ? <p className="text-sm text-emerald-700">{t("exportImportPage", "exportSuccess")}</p> : null}
      {status === "imported" ? <p className="text-sm text-emerald-700">{t("exportImportPage", "importSuccess")}</p> : null}
      {status === "error" ? <p className="text-sm text-amber-700">{errorMessage}</p> : null}
    </div>
  );
}

function buildDefaultSelection(preview: ImportPreview): ImportSelection {
  return Object.fromEntries(
    getExportCollections().map((collection) => {
      const duplicateIds = new Set(
        preview.duplicates.filter((duplicate) => duplicate.collection === collection).map((duplicate) => duplicate.id),
      );

      return [
        collection,
        preview.exportData.collections[collection].map((record) => record.id).filter((id) => !duplicateIds.has(id)),
      ];
    }),
  );
}
