import type { FlexibleDate, UserOwnedEntity } from "@/types/common";

export type ImportantDateKind =
  | "birthday"
  | "anniversary"
  | "holiday"
  | "custom";

export type ImportantDate = UserOwnedEntity & {
  personId: string;
  title: string;
  date: FlexibleDate;
  kind: ImportantDateKind;
  repeatsAnnually: boolean;
  notes?: string;
};
