import type { UserOwnedEntity } from "@/types/common";

export type PersonNote = UserOwnedEntity & {
  personId: string;
  body: string;
  title?: string;
  pinned: boolean;
};
