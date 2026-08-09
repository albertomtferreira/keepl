import { Timestamp } from "firebase/firestore";

import type { GoogleIntegrationStatus } from "@/services/google/integration-status";
import type { PhotoReference } from "@/types";

export const googlePhotosPickerScope = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";

const accessTokenStorageKey = "keepl.googlePhotos.accessToken";
const pickerApiBaseUrl = "/api/google/photos/picker";

export function getGooglePhotosIntegrationStatus(): GoogleIntegrationStatus {
  if (hasGooglePhotosAccessToken()) {
    return {
      state: "connected",
      label: "Google Photos connected",
      detail: "Keepl can launch the Google Photos picker. Selected photos are saved as references only.",
    };
  }

  return {
    state: "permission-required",
    label: "Google Photos needs permission",
    detail: "Photo references are supported, but Google Photos access is intentionally separate from sign-in.",
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

export function saveGooglePhotosAccess(access: GooglePhotosAccess) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(accessTokenStorageKey, access.accessToken);
}

export function clearGooglePhotosAccess() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(accessTokenStorageKey);
}

export function hasGooglePhotosAccessToken() {
  return Boolean(getGooglePhotosAccessToken());
}

export function isGooglePhotosPickerAvailable() {
  return hasGooglePhotosAccessToken() || (typeof window !== "undefined" && Boolean(getGooglePhotosPickerWindowApi()));
}

export async function fetchGooglePhotoObjectUrl(mediaUrl: string) {
  return URL.createObjectURL(await fetchGooglePhotoBlob(mediaUrl));
}

export function getGooglePhotoDownloadUrl(photo: PhotoReference) {
  if (photo.url) {
    return withGooglePhotosDownloadParameter(photo.url);
  }

  return photo.thumbnailUrl;
}

export async function fetchGooglePhotoBlob(mediaUrl: string) {
  const accessToken = getGooglePhotosAccessToken();

  if (!accessToken) {
    throw new Error("Google Photos needs permission.");
  }

  const response = await fetch(`${pickerApiBaseUrl}/media`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accessToken, mediaUrl }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearGooglePhotosAccess();
    }

    throw new Error(await getPickerErrorMessage(response));
  }

  return response.blob();
}

export async function launchGooglePhotosPicker(): Promise<PhotoReference[]> {
  const accessToken = getGooglePhotosAccessToken();

  if (accessToken) {
    return launchGooglePhotosPickerRestFlow(accessToken);
  }

  const pickerApi = getGooglePhotosPickerWindowApi();

  if (!pickerApi) {
    throw new Error("Google Photos picker is not available in this browser session.");
  }

  const result = await pickerApi.pick();
  return result.mediaItems.map(toPhotoReference);
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

export function toPhotoReference(media: GooglePhotosPickerMedia): PhotoReference {
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
    thumbnailUrl: media.mediaFile?.baseUrl ? `${media.mediaFile.baseUrl}=w640-h480` : undefined,
    url: media.mediaFile?.baseUrl,
    description: media.mediaFile?.filename,
    attribution: media.mediaFile?.mimeType ?? media.type,
    capturedAt: media.createTime ? Timestamp.fromDate(new Date(media.createTime)) : undefined,
    providerStatus: "available",
    lastCheckedAt: Timestamp.now(),
  });
}

export function mergePhotoReferences(current: PhotoReference[], incoming: PhotoReference[]) {
  const seen = new Set<string>();

  return [...current, ...incoming].filter((photo) => {
    const key = `${photo.source}:${photo.externalId ?? photo.url ?? photo.thumbnailUrl ?? photo.description ?? ""}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function compactPhotoReference(reference: PhotoReference): PhotoReference {
  return Object.fromEntries(Object.entries(reference).filter(([, value]) => value !== undefined && value !== "")) as PhotoReference;
}

function withGooglePhotosDownloadParameter(mediaUrl: string) {
  return stripGooglePhotosTransform(mediaUrl) + "=d";
}

function stripGooglePhotosTransform(mediaUrl: string) {
  return mediaUrl.replace(/=(?:w\d+(?:-h\d+)?(?:-c)?|h\d+(?:-w\d+)?(?:-c)?|d|dv)$/, "");
}

function getGooglePhotosAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(accessTokenStorageKey);
}

async function launchGooglePhotosPickerRestFlow(accessToken: string) {
  const session = await createPickerSession(accessToken);
  const pickerWindow = window.open(`${session.pickerUri}/autoclose`, "keepl-google-photos-picker", "popup,width=960,height=720");

  if (!pickerWindow) {
    window.location.assign(session.pickerUri);
  }

  try {
    const completedSession = await waitForPickedMedia(accessToken, session);
    return await listPickedMediaReferences(accessToken, completedSession.id);
  } finally {
    await deletePickerSession(accessToken, session.id).catch(() => undefined);
  }
}

async function createPickerSession(accessToken: string): Promise<PickingSession> {
  return fetchPickerApi(`${pickerApiBaseUrl}/sessions`, {
    method: "POST",
    body: JSON.stringify({ accessToken }),
  });
}

async function getPickerSession(accessToken: string, sessionId: string): Promise<PickingSession> {
  const url = new URL(`${pickerApiBaseUrl}/sessions/${sessionId}`, window.location.origin);
  url.searchParams.set("accessToken", accessToken);
  return fetchPickerApi(url.toString());
}

async function deletePickerSession(accessToken: string, sessionId: string) {
  await fetch(`${pickerApiBaseUrl}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });
}

async function waitForPickedMedia(accessToken: string, session: PickingSession) {
  const startedAt = Date.now();
  let currentSession = session;

  while (!currentSession.mediaItemsSet) {
    const pollInterval = durationToMilliseconds(currentSession.pollingConfig?.pollInterval, 3000);
    const timeoutIn = durationToMilliseconds(currentSession.pollingConfig?.timeoutIn, 180000);

    if (Date.now() - startedAt > timeoutIn) {
      throw new Error("Google Photos picker timed out before selection finished.");
    }

    await wait(pollInterval);
    currentSession = await getPickerSession(accessToken, session.id);
  }

  return currentSession;
}

async function listPickedMediaReferences(accessToken: string, sessionId: string) {
  const photos: PhotoReference[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${pickerApiBaseUrl}/media-items`, window.location.origin);
    url.searchParams.set("accessToken", accessToken);
    url.searchParams.set("sessionId", sessionId);
    url.searchParams.set("pageSize", "100");

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response: PickedMediaItemsResponse = await fetchPickerApi(url.toString());
    photos.push(...(response.mediaItems ?? []).map(toPickedPhotoReference));
    pageToken = response.nextPageToken;
  } while (pageToken);

  return photos;
}

async function fetchPickerApi<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearGooglePhotosAccess();
    }

    throw new Error(await getPickerErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

async function getPickerErrorMessage(response: Response) {
  const fallback = `Google Photos request failed with status ${response.status}.`;

  try {
    const body = (await response.json()) as { error?: { message?: string; status?: string } | string };

    if (typeof body.error === "string") {
      return body.error;
    }

    return body.error?.message ?? body.error?.status ?? fallback;
  } catch {
    return fallback;
  }
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

function getGooglePhotosPickerWindowApi() {
  if (typeof window === "undefined") {
    return null;
  }

  return (window as Window & { googlePhotosPicker?: { pick: () => Promise<GooglePhotosPickerResult> } }).googlePhotosPicker ?? null;
}
