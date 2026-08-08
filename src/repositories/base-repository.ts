import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  type OrderByDirection,
  type QueryConstraint,
  type WithFieldValue,
} from "firebase/firestore";

import { db as defaultDb } from "@/lib/firebase/client";
import { createFirestoreConverter, type FirestoreEntityData } from "@/repositories/firestore-converter";
import type { Entity, OwnedRecord, UserOwnedEntity } from "@/types";

type OwnedEntity = Entity & OwnedRecord;

export type ListOptions<T extends OwnedEntity> = {
  orderBy?: {
    field: keyof FirestoreEntityData<T> & string;
    direction?: OrderByDirection;
  };
  limit?: number;
  constraints?: QueryConstraint[];
};

export type CreateInput<T extends UserOwnedEntity> = Omit<
  FirestoreEntityData<T>,
  "createdAt" | "updatedAt" | "ownerId"
>;

export type UpdateInput<T extends UserOwnedEntity> = Partial<
  Omit<FirestoreEntityData<T>, "createdAt" | "updatedAt" | "ownerId">
>;

export class OwnedFirestoreRepository<T extends UserOwnedEntity> {
  private readonly converter = createFirestoreConverter<T>();

  constructor(
    private readonly collectionName: string,
    private readonly firestore: Firestore = defaultDb,
  ) {}

  async getById(ownerId: string, id: string) {
    const snapshot = await getDoc(this.docRef(id));
    const record = snapshot.exists() ? snapshot.data() : null;

    if (!record || record.ownerId !== ownerId) {
      return null;
    }

    return record;
  }

  async list(ownerId: string, options: ListOptions<T> = {}) {
    const constraints: QueryConstraint[] = [where("ownerId", "==", ownerId)];

    if (options.orderBy) {
      constraints.push(orderBy(options.orderBy.field, options.orderBy.direction));
    }

    if (options.constraints) {
      constraints.push(...options.constraints);
    }

    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    const snapshot = await getDocs(query(this.collectionRef(), ...constraints));
    return snapshot.docs.map((document) => document.data());
  }

  async create(ownerId: string, data: CreateInput<T>) {
    const document = await addDoc(this.collectionRef(), {
      ...data,
      ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as WithFieldValue<FirestoreEntityData<T>>);

    return document.id;
  }

  async set(ownerId: string, id: string, data: CreateInput<T>) {
    await setDoc(this.docRef(id), {
      ...data,
      ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as WithFieldValue<FirestoreEntityData<T>>);

    return id;
  }

  async update(ownerId: string, id: string, data: UpdateInput<T>) {
    const existing = await this.getById(ownerId, id);

    if (!existing) {
      throw new Error(`Cannot update ${this.collectionName}/${id}: document not found for owner.`);
    }

    await updateDoc(this.docRef(id), {
      ...data,
      ownerId,
      updatedAt: serverTimestamp(),
    });
  }

  async delete(ownerId: string, id: string) {
    const existing = await this.getById(ownerId, id);

    if (!existing) {
      throw new Error(`Cannot delete ${this.collectionName}/${id}: document not found for owner.`);
    }

    await deleteDoc(this.docRef(id));
  }

  protected collectionRef() {
    return collection(this.firestore, this.collectionName).withConverter(this.converter);
  }

  protected docRef(id: string) {
    return doc(this.firestore, this.collectionName, id).withConverter(this.converter);
  }
}
