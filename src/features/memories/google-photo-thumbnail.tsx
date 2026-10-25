"use client";

import { Image as PhotoIcon } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { useI18n } from "@/lib/i18n/i18n-context";
import {
  fetchGooglePhotoObjectUrl,
  subscribeGooglePhotos,
  getGooglePhotosSnapshot,
  hasGooglePhotosAccessToken,
  releaseGooglePhotoObjectUrl,
} from "@/services/google/photos";

export function GooglePhotoThumbnail({
  alt,
  className = "aspect-video w-full object-cover",
  mediaUrl,
}: {
  alt: string;
  className?: string;
  mediaUrl?: string;
}) {
  const { t } = useI18n();
  const revision = useSyncExternalStore(
    subscribeGooglePhotos,
    getGooglePhotosSnapshot,
    () => 0,
  );
  const connected = hasGooglePhotosAccessToken();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!mediaUrl || !connected) {
      return;
    }

    let active = true;
    let nextObjectUrl: string | null = null;

    fetchGooglePhotoObjectUrl(mediaUrl)
      .then((url) => {
        nextObjectUrl = url;

        if (active) {
          setObjectUrl(url);
          setFailed(false);
        } else {
          releaseGooglePhotoObjectUrl(url);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });

    return () => {
      active = false;

      if (nextObjectUrl) {
        releaseGooglePhotoObjectUrl(nextObjectUrl);
      }
    };
  }, [mediaUrl, connected, revision]);

  if (connected && objectUrl && !failed && mediaUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={objectUrl} alt={alt} className={className} />;
  }

  return (
    <div className="flex aspect-video items-center justify-center bg-muted text-muted-foreground">
      <PhotoIcon className="size-6" aria-hidden="true" />
      <span className="p-2 text-xs">{t("memoryForm", "photosRecovery")}</span>
    </div>
  );
}
