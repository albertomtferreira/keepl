import type { FirestoreTimestamp, UserOwnedEntity } from "@/types/common";

export type InteractionKind =
  | "call"
  | "message"
  | "email"
  | "visit"
  | "event"
  | "other";

export type Interaction = UserOwnedEntity & {
  personId: string;
  kind: InteractionKind;
  occurredAt: FirestoreTimestamp;
  summary?: string;
  notes?: string;
};
