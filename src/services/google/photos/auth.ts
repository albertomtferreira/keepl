"use client";

import {
  GoogleAuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
  signInWithPopup,
  type User,
} from "firebase/auth";

import { auth } from "@/lib/firebase/client";
import { googlePhotosPickerScope, saveGooglePhotosAccess } from "@/services/google/photos";

export async function connectGooglePhotos(user: User | null) {
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
    : await signInWithPopup(auth, provider);

  const credential = GoogleAuthProvider.credentialFromResult(result);

  if (!credential?.accessToken) {
    throw new Error("Google Photos did not return an access token.");
  }

  saveGooglePhotosAccess({ accessToken: credential.accessToken });
  return credential.accessToken;
}
