"use client";

import { Image as PhotoIcon, Link as LinkIcon, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/i18n-context";
import {
  createManualGooglePhotoReference,
  getGooglePhotosIntegrationStatus,
  isGooglePhotosPickerAvailable,
  launchGooglePhotosPicker,
  mergePhotoReferences,
} from "@/services/google/photos";
import { connectGooglePhotos } from "@/services/google/photos/auth";
import type { PhotoReference } from "@/types";

const inputClassName =
  "h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/30";

export function PhotoReferencePicker({
  photos,
  onChange,
}: {
  photos: PhotoReference[];
  onChange: (photos: PhotoReference[]) => void;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [photosStatus, setPhotosStatus] = useState(() => getGooglePhotosIntegrationStatus());
  const [externalId, setExternalId] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pickerAvailable = isGooglePhotosPickerAvailable();

  async function connectPhotos() {
    setConnecting(true);
    setError(null);

    try {
      await connectGooglePhotos(user);
      setPhotosStatus(getGooglePhotosIntegrationStatus());
    } catch {
      setError(t("memoryForm", "photosConnectError"));
    } finally {
      setConnecting(false);
    }
  }

  async function openPicker() {
    if (!pickerAvailable) {
      await connectPhotos();
    }

    setError(null);
    setPicking(true);

    try {
      const selected = await launchGooglePhotosPicker();
      onChange(mergePhotoReferences(photos, selected));
    } catch (pickerError) {
      const detail = pickerError instanceof Error ? pickerError.message : t("memoryForm", "photosPickerError");
      setError(detail);
    } finally {
      setPicking(false);
    }
  }

  function addManualReference() {
    if (!externalId.trim()) {
      setError(t("memoryForm", "photosExternalIdRequired"));
      return;
    }

    const reference = createManualGooglePhotoReference({
      externalId,
      url,
      thumbnailUrl: url,
      description,
    });

    onChange(mergePhotoReferences(photos, [reference]));
    setExternalId("");
    setUrl("");
    setDescription("");
    setError(null);
  }

  function removePhoto(index: number) {
    onChange(photos.filter((_, photoIndex) => photoIndex !== index));
  }

  return (
    <section className="space-y-4 rounded-lg border border-dashed bg-white p-4">
      <div className="flex items-start gap-3">
        <PhotoIcon className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium">{t("memoryForm", "photos")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {photosStatus.state === "permission-required" ? t("memoryForm", "photosPermissionRequired") : t("common", photosStatus.state === "connected" ? "connected" : "notConnected")}.{" "}
            {t("memoryForm", "photosHint")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={pickerAvailable ? openPicker : connectPhotos} disabled={picking || connecting}>
          <PhotoIcon className="size-4" aria-hidden="true" />
          {picking
            ? t("memoryForm", "photosPicking")
            : pickerAvailable
              ? t("memoryForm", "openPhotosPicker")
              : t("settings", "connectPhotos")}
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          value={externalId}
          onChange={(event) => setExternalId(event.target.value)}
          className={inputClassName}
          placeholder={t("memoryForm", "photosExternalId")}
        />
        <input value={url} onChange={(event) => setUrl(event.target.value)} className={inputClassName} placeholder={t("memoryForm", "photosUrl")} />
        <Button type="button" variant="secondary" onClick={addManualReference}>
          <Plus className="size-4" aria-hidden="true" />
          {t("memoryForm", "addPhotoReference")}
        </Button>
      </div>
      <input
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        className={inputClassName}
        placeholder={t("memoryForm", "photosDescription")}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {photos.length ? (
        <div className="grid gap-2">
          {photos.map((photo, index) => (
            <div key={`${photo.source}-${photo.externalId ?? index}`} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <span className="min-w-0 truncate">
                {photo.description || photo.externalId || t("memoryForm", "photoReference")}
                {photo.url ? <LinkIcon className="ml-2 inline size-3 text-muted-foreground" aria-hidden="true" /> : null}
              </span>
              <Button type="button" variant="ghost" size="icon" aria-label={t("memoryForm", "removePhotoReference")} onClick={() => removePhoto(index)}>
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
