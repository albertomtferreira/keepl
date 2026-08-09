"use client";

import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/i18n-context";
import { fetchGooglePhotoBlob, getGooglePhotoDownloadUrl } from "@/services/google/photos";
import type { PhotoReference } from "@/types";
import { GooglePhotoThumbnail } from "./google-photo-thumbnail";

export function PhotoViewerDialog({
  currentIndex,
  onChangeIndex,
  onClose,
  photos,
}: {
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
  photos: PhotoReference[];
}) {
  const { t } = useI18n();
  const photo = photos[currentIndex];
  const hasMany = photos.length > 1;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft" && hasMany) {
        onChangeIndex(previousIndex(currentIndex, photos.length));
      }

      if (event.key === "ArrowRight" && hasMany) {
        onChangeIndex(nextIndex(currentIndex, photos.length));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, hasMany, onChangeIndex, onClose, photos.length]);

  if (!photo) {
    return null;
  }

  async function savePhoto() {
    const mediaUrl = getGooglePhotoDownloadUrl(photo);

    if (!mediaUrl) {
      return;
    }

    const blob = await fetchGooglePhotoBlob(mediaUrl);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = photo.description || `${photo.externalId ?? "keepl-photo"}.jpg`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3" role="dialog" aria-modal="true" aria-label={t("memoryForm", "photoViewer")}>
      <div className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b p-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{photo.description || photo.externalId || t("memoryForm", "photoReference")}</h2>
            {hasMany ? (
              <p className="text-xs text-muted-foreground">{t("memoryForm", "photoViewerCount", { current: currentIndex + 1, total: photos.length })}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button type="button" variant="ghost" size="icon" aria-label={t("memoryForm", "savePhoto")} onClick={savePhoto}>
              <Download className="size-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label={t("common", "close")} onClick={onClose}>
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black p-3">
          {hasMany ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-3 z-10"
              aria-label={t("memoryForm", "previousPhoto")}
              onClick={() => onChangeIndex(previousIndex(currentIndex, photos.length))}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </Button>
          ) : null}
          <GooglePhotoThumbnail
            alt={photo.description ?? t("memoryForm", "photoReference")}
            mediaUrl={photo.url ?? photo.thumbnailUrl}
            className="max-h-[75vh] w-auto max-w-full object-contain"
          />
          {hasMany ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-3 z-10"
              aria-label={t("memoryForm", "nextPhoto")}
              onClick={() => onChangeIndex(nextIndex(currentIndex, photos.length))}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function previousIndex(currentIndex: number, count: number) {
  return (currentIndex - 1 + count) % count;
}

function nextIndex(currentIndex: number, count: number) {
  return (currentIndex + 1) % count;
}
