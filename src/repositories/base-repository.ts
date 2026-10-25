import {
  runTransaction,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Firestore,
  type OrderByDirection,
  type QueryConstraint,
  type WithFieldValue,
} from "firebase/firestore";

import { db as defaultDb } from "@/lib/firebase/client";
import {
  createFirestoreConverter,
  type FirestoreEntityData,
} from "@/repositories/firestore-converter";
import { canonical, checkReferences } from "@/services/lifecycle/plan";
import { isOwnedBy } from "@/repositories/ownership";
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

    if (!isOwnedBy(record, ownerId)) {
      return null;
    }

    return record;
  }

  async list(ownerId: string, options: ListOptions<T> = {}) {
    const constraints: QueryConstraint[] = [where("ownerId", "==", ownerId)];

    if (options.orderBy) {
      constraints.push(
        orderBy(options.orderBy.field, options.orderBy.direction),
      );
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

  async create(ownerId: string, data: CreateInput<T>, requestId?: string) {
    const ref = requestId ? this.docRef(requestId) : doc(this.collectionRef());
    await this.write(ownerId, ref.id, data, false, true);
    return ref.id;
  }

  async set(ownerId: string, id: string, data: CreateInput<T>) {
    await this.write(ownerId, id, data, false);
    return id;
  }

  async update(ownerId: string, id: string, data: UpdateInput<T>) {
    await this.write(ownerId, id, data, true);
  }

  private async write(
    ownerId: string,
    id: string,
    data: UpdateInput<T>,
    merge: boolean,
    createOnly = false,
  ) {
    if (!ownerId || "deletionPending" in data)
      throw new Error("invalid-owner-or-lifecycle-field");
    await runTransaction(this.firestore, async (transaction) => {
      const ref = this.docRef(id);
      const snapshot = await transaction.get(ref);
      const existing = snapshot.exists() ? snapshot.data() : null;
      if (
        existing &&
        (!isOwnedBy(existing, ownerId) || existing.deletionPending)
      )
        throw new Error("record-unavailable");
      if (merge && !existing) throw new Error("record-unavailable");
      const record = { ...(merge ? existing : {}), ...data };
      await checkReferences(
        ownerId,
        this.collectionName,
        record,
        async (collectionName, referenceId) => {
          const parent = await transaction.get(
            doc(this.firestore, collectionName, referenceId),
          );
          return parent.exists()
            ? {
                ...parent.data(),
                id: parent.id,
                ownerId: parent.data().ownerId,
              }
            : null;
        },
      );
      if (createOnly && existing) {
        const fields = Object.fromEntries(
          Object.entries(existing).filter(
            ([key]) =>
              ![
                "id",
                "ownerId",
                "createdAt",
                "updatedAt",
                "deletionPending",
              ].includes(key),
          ),
        );
        if (canonical(fields) !== canonical(data))
          throw new Error("create-conflict");
        return;
      }
      if (merge)
        transaction.update(ref, {
          ...data,
          ownerId,
          updatedAt: serverTimestamp(),
        });
      else
        transaction.set(ref, {
          ...data,
          ownerId,
          createdAt: existing?.createdAt ?? serverTimestamp(),
          updatedAt: serverTimestamp(),
        } as WithFieldValue<FirestoreEntityData<T>>);
    });
  }

  async delete(ownerId: string, id: string) {
    if (
      ["people", "importantDates", "memories"].includes(this.collectionName)
    ) {
      const { previewLifecycle, confirmLifecycle } =
        await import("@/services/lifecycle");
      await confirmLifecycle(
        await previewLifecycle(ownerId, {
          collection: this.collectionName as
            "people" | "importantDates" | "memories",
          id,
        }),
      );
      return;
    }
    await runTransaction(this.firestore, async (transaction) => {
      const ref = this.docRef(id);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) return;
      if (!isOwnedBy(snapshot.data(), ownerId)) throw new Error("ownership");
      transaction.delete(ref);
    });
  }

  protected collectionRef() {
    return collection(this.firestore, this.collectionName).withConverter(
      this.converter,
    );
  }

  protected docRef(id: string) {
    return doc(this.firestore, this.collectionName, id).withConverter(
      this.converter,
    );
  }
}
