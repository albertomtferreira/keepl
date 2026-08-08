import type { UserOwnedEntity } from "@/types/common";

export type Group = UserOwnedEntity & {
  name: string;
  description?: string;
  color?: string;
  sortOrder?: number;
};
