"use client";

import { Image as PhotoIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchGooglePhotoObjectUrl } from "@/services/google/photos";

export function GooglePhotoThumbnail({
  alt,
  className = "aspect-video w-full object-cover",
  mediaUrl,
}: {
  alt: string;
  className?: string;
  mediaUrl?: string;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!mediaUrl) {
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
          URL.revokeObjectURL(url);
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
        URL.revokeObjectURL(nextObjectUrl);
      }
    };
  }, [mediaUrl]);

  if (objectUrl && !failed && mediaUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={objectUrl} alt={alt} className={className} />;
  }

  return (
    <div className="flex aspect-video items-center justify-center bg-muted text-muted-foreground">
      <PhotoIcon className="size-6" aria-hidden="true" />
    </div>
  );
}
