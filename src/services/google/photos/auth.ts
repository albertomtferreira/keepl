"use client";

import {
  GoogleAuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
  type User,
} from "firebase/auth";

import { auth } from "@/lib/firebase/client";
import {
  googlePhotosPickerScope,
  saveGooglePhotosAccess,
} from "@/services/google/photos";

export async function connectGooglePhotos(user: User | null) {
  if (!user || auth.currentUser?.uid !== user.uid)
    throw new Error("permission-required");
  const provider = new GoogleAuthProvider();
  provider.addScope(googlePhotosPickerScope);
  provider.setCustomParameters({
    prompt: "consent",
    include_granted_scopes: "true",
  });

  const result = user
    ? user.providerData.some((profile) => profile.providerId === "google.com")
      ? await reauthenticateWithPopup(user, provider)
      : await linkWithPopup(user, provider)
    : await Promise.reject(new Error("permission-required"));

  const credential = GoogleAuthProvider.credentialFromResult(result);

  if (!credential?.accessToken) {
    throw new Error("Google Photos did not return an access token.");
  }

  if (auth.currentUser?.uid !== user.uid)
    throw new Error("permission-required");
  saveGooglePhotosAccess({
    accessToken: credential.accessToken,
    ownerId: user.uid,
    expiresAt: Date.now() + 50 * 60 * 1000,
  });
  return credential.accessToken;
}
