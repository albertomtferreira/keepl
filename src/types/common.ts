import type { Timestamp } from "firebase/firestore";

export type FirestoreTimestamp = Timestamp;

export type TimestampFields = {
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
};

export type OwnedRecord = {
  ownerId: string;
};

export type Entity = {
  id: string;
};

export type UserOwnedEntity = Entity & OwnedRecord & TimestampFields;

export type DatePrecision = "full" | "month-day" | "year-month" | "year";

export type FlexibleDate = {
  year?: number;
  month?: number;
  day?: number;
  precision: DatePrecision;
};

export type SocialProfile = {
  platform: string;
  handle?: string;
  url?: string;
};
