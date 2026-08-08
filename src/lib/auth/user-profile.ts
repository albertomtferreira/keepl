import type { User } from "firebase/auth";

import { userProfilesRepository } from "@/repositories/users";

export async function ensureUserProfile(user: User) {
  const existing = await userProfilesRepository.get(user.uid);

  await userProfilesRepository.upsert(user.uid, {
    uid: user.uid,
    displayName: user.displayName ?? "",
    email: user.email ?? "",
    photoURL: user.photoURL ?? "",
    providerId: user.providerData[0]?.providerId ?? "google.com",
    ...(existing?.locale ? { locale: existing.locale } : {}),
  });
}
