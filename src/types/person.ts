import type { FlexibleDate, SocialProfile, UserOwnedEntity } from "@/types/common";
import type { PhotoReference } from "@/types/photos";

export type PersonSource =
  | "manual"
  | "google-contacts"
  | "import"
  | "seed";

export type ContactPoint = {
  label?: string;
  value: string;
  primary?: boolean;
};

export type Person = UserOwnedEntity & {
  displayName: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  birthday?: FlexibleDate;
  phoneNumbers?: ContactPoint[];
  emails?: ContactPoint[];
  socialProfiles?: SocialProfile[];
  groupIds?: string[];
  photo?: PhotoReference;
  source: PersonSource;
  sourceId?: string;
  archivedAt?: Date | null;
};
