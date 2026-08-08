import type { UserOwnedEntity } from "@/types/common";

export type UserProfile = UserOwnedEntity & {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  providerId: string;
  timezone?: string;
  locale?: string;
  onboardingCompletedAt?: Date;
};
