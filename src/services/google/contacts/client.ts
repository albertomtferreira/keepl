"use client";
import {
  GoogleAuthProvider,
  linkWithPopup,
  reauthenticateWithPopup,
  type User,
} from "firebase/auth";
import { z } from "zod";
import { auth } from "@/lib/firebase/client";
import {
  assertContactsAccess,
  clearContactsAccess,
  contactsSnapshot,
  getContactsAccess,
  saveContactsAccess,
  type ContactsAccess,
} from "./access";
import { mapGoogleContact, type GoogleContact } from "./model";

export async function connectContacts(user: User) {
  if (auth.currentUser?.uid !== user.uid) throw new Error("contacts-access");
  const revision = contactsSnapshot();
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/contacts.readonly");
  provider.setCustomParameters({
    prompt: "consent",
    include_granted_scopes: "true",
  });
  const result = user.providerData.some((p) => p.providerId === "google.com")
    ? await reauthenticateWithPopup(user, provider)
    : await linkWithPopup(user, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accountId = result.user.providerData.find(
    (p) => p.providerId === "google.com",
  )?.uid;
  if (
    auth.currentUser?.uid !== user.uid ||
    !credential?.accessToken ||
    !accountId
  )
    throw new Error("contacts-access");
  saveContactsAccess(
    {
      ownerId: user.uid,
      accountId,
      accessToken: credential.accessToken,
      expiresAt: Date.now() + 50 * 60_000,
    },
    revision,
  );
}
const fields = "names,emailAddresses,phoneNumbers,birthdays,metadata";
async function request(
  access: ContactsAccess,
  path: string,
  params: Record<string, string>,
) {
  assertContactsAccess(access);
  if (auth.currentUser?.uid !== access.ownerId)
    throw new Error("contacts-access");
  const url = new URL(`https://people.googleapis.com/v1/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${access.accessToken}` },
    cache: "no-store",
    redirect: "error",
    credentials: "omit",
    signal: AbortSignal.timeout(30_000),
  });
  assertContactsAccess(access);
  if (response.status === 401 || response.status === 403) {
    clearContactsAccess();
    throw new Error("contacts-access");
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("contacts-request");
  const body: unknown = await response.json();
  assertContactsAccess(access);
  return body;
}
export async function listContacts(ownerId: string, pageToken = "") {
  const access = getContactsAccess(ownerId);
  const body = await request(access, "people/me/connections", {
    personFields: fields,
    pageSize: "100",
    ...(pageToken ? { pageToken } : {}),
  });
  const page = z
    .object({
      connections: z.array(z.unknown()).optional(),
      nextPageToken: z.string().optional(),
    })
    .parse(body);
  return {
    contacts: (page.connections ?? [])
      .map(mapGoogleContact)
      .filter((c): c is GoogleContact => c !== null),
    nextPageToken: page.nextPageToken ?? "",
    access,
  };
}
export async function refreshContact(ownerId: string, resourceName: string) {
  if (!/^people\/[a-zA-Z0-9_-]+$/.test(resourceName))
    throw new Error("contacts-id");
  const access = getContactsAccess(ownerId);
  const body = await request(access, resourceName, { personFields: fields });
  return { contact: body ? mapGoogleContact(body) : null, access };
}

export async function revokeContacts(ownerId: string) {
  const access = getContactsAccess(ownerId);
  if (auth.currentUser?.uid !== ownerId) throw new Error("contacts-access");
  const response = await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: access.accessToken }),
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  assertContactsAccess(access);
  if (!response.ok) throw new Error("contacts-revoke");
  clearContactsAccess();
}
