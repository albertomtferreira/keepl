import { Timestamp } from "firebase/firestore";

import type { GoogleIntegrationStatus } from "@/services/google/integration-status";
import type { PhotoReference } from "@/types";

export const googlePhotosPickerScope =
  "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";

let accountId: string | null = null;
let credential: {
  accessToken: string;
  ownerId: string;
  expiresAt: number;
} | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
let revision = 0;
const objectUrls = new Set<string>();
const listeners = new Set<() => void>();
export function subscribeGooglePhotos(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function setGooglePhotosAccount(ownerId: string | null) {
  if (ownerId !== accountId) {
    clearGooglePhotosAccess();
    accountId = ownerId;
  }
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem("keepl.googlePhotos.accessToken");
    } catch {
      /* Storage may be disabled; credentials are never read from it. */
    }
  }
}
export function getGooglePhotosSnapshot() {
  return revision;
}
const pickerApiBaseUrl = "/api/google/photos/picker";

export function getGooglePhotosIntegrationStatus(): GoogleIntegrationStatus {
  if (hasGooglePhotosAccessToken()) {
    return {
      state: "connected",
      label: "Google Photos connected",
      detail:
        "Keepl can launch the Google Photos picker. Selected photos are saved as references only.",
    };
  }

  return {
    state: "permission-required",
    label: "Google Photos needs permission",
    detail:
      "Photo references are supported, but Google Photos access is intentionally separate from sign-in.",
  };
}

export type GooglePhotosPickerMedia = {
  id: string;
  baseUrl?: string;
  mimeType?: string;
  filename?: string;
  description?: string;
  mediaMetadata?: {
    creationTime?: string;
  };
  productUrl?: string;
};

export type GooglePhotosPickerResult = {
  mediaItems: GooglePhotosPickerMedia[];
};

export type GooglePhotosAccess = {
  accessToken: string;
};

type PickingSession = {
  id: string;
  pickerUri: string;
  mediaItemsSet?: boolean;
  pollingConfig?: {
    pollInterval?: string;
    timeoutIn?: string;
  };
};

type PickedMediaItem = {
  id: string;
  createTime?: string;
  type?: "TYPE_UNSPECIFIED" | "PHOTO" | "VIDEO";
  mediaFile?: {
    baseUrl?: string;
    mimeType?: string;
    filename?: string;
  };
};

type PickedMediaItemsResponse = {
  mediaItems?: PickedMediaItem[];
  nextPageToken?: string;
};

export function saveGooglePhotosAccess(
  access: GooglePhotosAccess & { ownerId: string; expiresAt: number },
) {
  if (
    !accountId ||
    access.ownerId !== accountId ||
    access.expiresAt <= Date.now()
  )
    throw new Error("permission-required");
  clearGooglePhotosAccess();
  credential = access;
  expiryTimer = setTimeout(
    clearGooglePhotosAccess,
    access.expiresAt - Date.now(),
  );
  revision += 1;
  listeners.forEach((listener) => listener());
}

export function clearGooglePhotosAccess() {
  credential = null;
  clearTimeout(expiryTimer);
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls.clear();
  revision += 1;
  listeners.forEach((listener) => listener());
}

export function hasGooglePhotosAccessToken() {
  return Boolean(getGooglePhotosAccessToken());
}

export function isGooglePhotosPickerAvailable() {
  return hasGooglePhotosAccessToken();
}

export async function fetchGooglePhotoObjectUrl(mediaUrl: string) {
  const current = credential;
  const blob = await fetchGooglePhotoBlob(mediaUrl);
  if (!current || credential !== current)
    throw new Error("permission-required");
  const url = URL.createObjectURL(blob);
  objectUrls.add(url);
  return url;
}

export function releaseGooglePhotoObjectUrl(url: string) {
  objectUrls.delete(url);
  URL.revokeObjectURL(url);
}

export function getGooglePhotoDownloadUrl(photo: PhotoReference) {
  if (photo.url) {
    return withGooglePhotosDownloadParameter(photo.url);
  }

  return photo.thumbnailUrl;
}

export async function fetchGooglePhotoBlob(mediaUrl: string) {
  const currentCredential = credential;
  const accessToken = getGooglePhotosAccessToken();

  if (!accessToken) {
    throw new Error("Google Photos needs permission.");
  }

  const response = await fetch(`${pickerApiBaseUrl}/media`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
    body: JSON.stringify({ mediaUrl }),
  });

  if (!response.ok) {
    if (
      (response.status === 401 || response.status === 403) &&
      credential === currentCredential
    ) {
      clearGooglePhotosAccess();
    }

    throw new Error(await getPickerErrorMessage(response));
  }

  const blob = await response.blob();
  if (
    getGooglePhotosAccessToken() !== accessToken ||
    credential !== currentCredential
  )
    throw new Error("permission-required");
  return blob;
}

export async function launchGooglePhotosPicker(): Promise<PhotoReference[]> {
  const accessToken = getGooglePhotosAccessToken();

  if (accessToken) {
    return launchGooglePhotosPickerRestFlow(accessToken);
  }

  throw new Error("permission-required");
}

export function createManualGooglePhotoReference(input: {
  externalId: string;
  url?: string;
  thumbnailUrl?: string;
  description?: string;
}): PhotoReference {
  return compactPhotoReference({
    source: "google-photos",
    externalId: input.externalId.trim(),
    url: input.url?.trim(),
    thumbnailUrl: input.thumbnailUrl?.trim() || input.url?.trim(),
    description: input.description?.trim(),
    providerStatus: "available",
  });
}

export function toPhotoReference(
  media: GooglePhotosPickerMedia,
): PhotoReference {
  return compactPhotoReference({
    source: "google-photos",
    externalId: media.id,
    url: media.productUrl,
    thumbnailUrl: media.baseUrl,
    description: media.description || media.filename,
    attribution: media.mimeType,
    providerStatus: "available",
  });
}

export function toPickedPhotoReference(media: PickedMediaItem): PhotoReference {
  return compactPhotoReference({
    source: "google-photos",
    externalId: media.id,
    thumbnailUrl: media.mediaFile?.baseUrl
      ? `${media.mediaFile.baseUrl}=w640-h480`
      : undefined,
    url: media.mediaFile?.baseUrl,
    description: media.mediaFile?.filename,
    attribution: media.mediaFile?.mimeType ?? media.type,
    capturedAt: media.createTime
      ? Timestamp.fromDate(new Date(media.createTime))
      : undefined,
    providerStatus: "available",
    lastCheckedAt: Timestamp.now(),
  });
}

export function mergePhotoReferences(
  current: PhotoReference[],
  incoming: PhotoReference[],
) {
  const seen = new Set<string>();

  return [
    ...current.filter(
      (photo) =>
        !incoming.some(
          (next) =>
            next.source === photo.source &&
            next.externalId &&
            next.externalId === photo.externalId,
        ),
    ),
    ...incoming,
  ].filter((photo) => {
    const key = `${photo.source}:${photo.externalId ?? photo.url ?? photo.thumbnailUrl ?? photo.description ?? ""}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function compactPhotoReference(reference: PhotoReference): PhotoReference {
  return Object.fromEntries(
    Object.entries(reference).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  ) as PhotoReference;
}

function withGooglePhotosDownloadParameter(mediaUrl: string) {
  return stripGooglePhotosTransform(mediaUrl) + "=d";
}

function stripGooglePhotosTransform(mediaUrl: string) {
  return mediaUrl.replace(
    /=(?:w\d+(?:-h\d+)?(?:-c)?|h\d+(?:-w\d+)?(?:-c)?|d|dv)$/,
    "",
  );
}

function getGooglePhotosAccessToken() {
  if (
    credential &&
    (credential.ownerId !== accountId || credential.expiresAt <= Date.now())
  )
    clearGooglePhotosAccess();
  return credential?.accessToken ?? null;
}

async function launchGooglePhotosPickerRestFlow(accessToken: string) {
  const pickerWindow = window.open(
    "about:blank",
    "_blank",
    "popup,width=960,height=720",
  );
  if (!pickerWindow) throw new Error("popup-blocked");
  let session: PickingSession | undefined;
  try {
    session = await createPickerSession(accessToken);
    const uri = new URL(session.pickerUri);
    if (
      uri.origin !== "https://photos.google.com" ||
      uri.username ||
      uri.password
    )
      throw new Error("invalid-picker");
    pickerWindow.opener = null;
    pickerWindow.location.replace(`${session.pickerUri}/autoclose`);
    const completedSession = await waitForPickedMedia(
      accessToken,
      session,
      pickerWindow,
    );
    return await listPickedMediaReferences(accessToken, completedSession.id);
  } finally {
    pickerWindow.close();
    if (session)
      await deletePickerSession(accessToken, session.id).catch(() => undefined);
  }
}

async function createPickerSession(
  accessToken: string,
): Promise<PickingSession> {
  return fetchPickerApi(`${pickerApiBaseUrl}/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function getPickerSession(
  accessToken: string,
  sessionId: string,
): Promise<PickingSession> {
  const url = new URL(
    `${pickerApiBaseUrl}/sessions/${sessionId}`,
    window.location.origin,
  );

  return fetchPickerApi(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function deletePickerSession(accessToken: string, sessionId: string) {
  await fetch(`${pickerApiBaseUrl}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function waitForPickedMedia(
  accessToken: string,
  session: PickingSession,
  popup: Window,
) {
  const startedAt = Date.now();
  let currentSession = session;

  while (!currentSession.mediaItemsSet) {
    const pollInterval = durationToMilliseconds(
      currentSession.pollingConfig?.pollInterval,
      3000,
    );
    const timeoutIn = durationToMilliseconds(
      currentSession.pollingConfig?.timeoutIn,
      180000,
    );

    if (Date.now() - startedAt > timeoutIn) {
      throw new Error(
        "Google Photos picker timed out before selection finished.",
      );
    }

    if (popup.closed) {
      currentSession = await getPickerSession(accessToken, session.id);
      if (!currentSession.mediaItemsSet) throw new Error("picker-cancelled");
      break;
    }
    if (getGooglePhotosAccessToken() !== accessToken)
      throw new Error("permission-required");
    await wait(pollInterval);
    currentSession = await getPickerSession(accessToken, session.id);
  }

  return currentSession;
}

async function listPickedMediaReferences(
  accessToken: string,
  sessionId: string,
) {
  const photos: PhotoReference[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `${pickerApiBaseUrl}/media-items`,
      window.location.origin,
    );

    url.searchParams.set("sessionId", sessionId);
    url.searchParams.set("pageSize", "100");

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response: PickedMediaItemsResponse = await fetchPickerApi(
      url.toString(),
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    photos.push(...(response.mediaItems ?? []).map(toPickedPhotoReference));
    pageToken = response.nextPageToken;
  } while (pageToken);

  return photos;
}

async function fetchPickerApi<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const currentCredential = credential;
  if (
    new Headers(init.headers).get("Authorization") !==
    `Bearer ${getGooglePhotosAccessToken()}`
  )
    throw new Error("permission-required");
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    if (
      (response.status === 401 || response.status === 403) &&
      credential === currentCredential
    ) {
      clearGooglePhotosAccess();
    }

    throw new Error(await getPickerErrorMessage(response));
  }

  if (
    new Headers(init.headers).get("Authorization") !==
    `Bearer ${getGooglePhotosAccessToken()}`
  )
    throw new Error("permission-required");
  const body = (await response.json()) as T;
  if (credential !== currentCredential) throw new Error("permission-required");
  return body;
}

async function getPickerErrorMessage(response: Response) {
  return response.status === 401 || response.status === 403
    ? "permission-required"
    : "photos-request-failed";
}

function durationToMilliseconds(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const seconds = Number(value.replace(/s$/, ""));
  return Number.isFinite(seconds) ? Math.max(seconds * 1000, 1000) : fallback;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
