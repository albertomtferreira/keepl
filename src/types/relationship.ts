import type { UserOwnedEntity } from "@/types/common";

export type Relationship = UserOwnedEntity & {
  fromPersonId: string;
  toPersonId: string;
  label: string;
  inverseLabel?: string;
  notes?: string;
};
