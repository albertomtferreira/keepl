import type { FirestoreTimestamp } from "@/types/common";

export type PhotoSource =
  | "google-photos"
  | "external-url"
  | "contact-profile"
  | "manual-reference";

export type PhotoReference = {
  source: PhotoSource;
  externalId?: string;
  url?: string;
  thumbnailUrl?: string;
  description?: string;
  capturedAt?: FirestoreTimestamp;
  attribution?: string;
  providerStatus?: "available" | "expired" | "unavailable";
  lastCheckedAt?: FirestoreTimestamp;
};
