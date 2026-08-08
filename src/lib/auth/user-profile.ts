import type { User } from "firebase/auth";

import { userProfilesRepository } from "@/repositories/users";

export async function ensureUserProfile(user: User) {
  await userProfilesRepository.upsert(user.uid, {
    uid: user.uid,
    displayName: user.displayName ?? "",
    email: user.email ?? "",
    photoURL: user.photoURL ?? "",
    providerId: user.providerData[0]?.providerId ?? "google.com",
  });
}
