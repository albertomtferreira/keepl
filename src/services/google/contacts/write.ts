"use client";
import {
  deleteField,
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { Person } from "@/types/person";
import { assertContactsAccess, type ContactsAccess } from "./access";
import {
  comparable,
  contactFields,
  contactImportId,
  type ContactField,
  type GoogleContact,
} from "./model";

export type ContactReview = {
  contact: GoogleContact;
  target: Person | null;
  fields: ContactField[];
};

// The operational claim is derived from portable Person.googleContact references.
// It prevents concurrent tabs from attaching the same contact to different people.
export async function confirmContact(
  access: ContactsAccess,
  review: ContactReview,
) {
  return commitContactReview(access, review, db, () => {
    assertContactsAccess(access);
    if (auth.currentUser?.uid !== access.ownerId)
      throw new Error("contacts-access");
  });
}

export async function commitContactReview(
  access: ContactsAccess,
  review: ContactReview,
  firestore: Firestore,
  verifyAccess: () => void,
) {
  verifyAccess();
  const key = await contactImportId(
    access.ownerId,
    access.accountId,
    review.contact.resourceName,
  );
  const personId = review.target?.id ?? key;
  const personRef = doc(firestore, "people", personId);
  const claimRef = doc(firestore, "googleContactLinks", key);
  const link = {
    accountId: access.accountId,
    resourceName: review.contact.resourceName,
  };
  await runTransaction(firestore, async (transaction) => {
    verifyAccess();
    const claim = await transaction.get(claimRef);
    const current = await transaction.get(personRef);
    if (claim.exists()) {
      if (claim.data().ownerId !== access.ownerId)
        throw new Error("contacts-owner");
      if (claim.data().personId !== personId) {
        const previous = await transaction.get(
          doc(firestore, "people", claim.data().personId),
        );
        if (previous.exists()) throw new Error("contacts-linked");
      }
    }
    const existing = current.exists() ? current.data() : null;
    if (
      existing &&
      (existing.ownerId !== access.ownerId || existing.deletionPending)
    )
      throw new Error("contacts-owner");
    verifyAccess();
    if (review.target) {
      if (
        !existing ||
        contactFields.some(
          (f) => comparable(existing[f]) !== comparable(review.target?.[f]),
        ) ||
        comparable(existing.googleContact) !==
          comparable(review.target.googleContact)
      )
        throw new Error("contacts-stale");
      if (
        existing.googleContact &&
        comparable(existing.googleContact) !== comparable(link)
      )
        throw new Error("contacts-linked");
      const patch: Record<string, unknown> = {
        googleContact: link,
        updatedAt: serverTimestamp(),
      };
      for (const field of review.fields) {
        if (!contactFields.includes(field)) throw new Error("contacts-field");
        patch[field] = review.contact.values[field] ?? deleteField();
      }
      transaction.update(personRef, patch);
    } else if (!existing) {
      const values: Record<string, unknown> = {
        displayName: review.contact.values.displayName,
      };
      for (const field of review.fields)
        if (review.contact.values[field] !== undefined)
          values[field] = review.contact.values[field];
      transaction.set(personRef, {
        ...values,
        ownerId: access.ownerId,
        source: "google-contacts",
        sourceId: link.resourceName,
        googleContact: link,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (comparable(existing.googleContact) !== comparable(link))
      throw new Error("contacts-stale");
    // An existing deterministic import is a successful retry, never an overwrite.
    transaction.set(claimRef, { ownerId: access.ownerId, personId });
  });
  return personId;
}
