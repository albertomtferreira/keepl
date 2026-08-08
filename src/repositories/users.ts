import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Firestore,
  type WithFieldValue,
} from "firebase/firestore";

import { db as defaultDb } from "@/lib/firebase/client";
import {
  createFirestoreConverter,
  type FirestoreEntityData,
} from "@/repositories/firestore-converter";
import type { UserProfile } from "@/types";

export type UpsertUserProfileInput = Omit<
  UserProfile,
  "id" | "createdAt" | "updatedAt" | "ownerId"
>;

const userProfileConverter = createFirestoreConverter<UserProfile>();

export class UserProfilesRepository {
  constructor(private readonly firestore: Firestore = defaultDb) {}

  async get(userId: string) {
    const snapshot = await getDoc(this.ref(userId));
    const profile = snapshot.exists() ? snapshot.data() : null;

    if (!profile || profile.ownerId !== userId) {
      return null;
    }

    return profile;
  }

  async upsert(userId: string, data: UpsertUserProfileInput) {
    await setDoc(
      this.ref(userId),
      {
        ...data,
        ownerId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as WithFieldValue<FirestoreEntityData<UserProfile>>,
      { merge: true },
    );
  }

  private ref(userId: string) {
    return doc(this.firestore, "users", userId).withConverter(userProfileConverter);
  }
}

export const userProfilesRepository = new UserProfilesRepository();
