import type { FirestoreTimestamp, UserOwnedEntity } from "@/types/common";

export type ReminderStatus = "scheduled" | "sent" | "dismissed" | "snoozed";

export type Reminder = UserOwnedEntity & {
  title: string;
  remindAt: FirestoreTimestamp;
  status: ReminderStatus;
  personId?: string;
  importantDateId?: string;
  memoryId?: string;
  notes?: string;
};
