import type { FirestoreTimestamp, UserOwnedEntity } from "@/types/common";
import type { PhotoReference } from "@/types/photos";

export type Memory = UserOwnedEntity & {
  title: string;
  peopleIds: string[];
  startDate: FirestoreTimestamp;
  endDate?: FirestoreTimestamp;
  location?: string;
  description?: string;
  tags?: string[];
  photos?: PhotoReference[];
};
