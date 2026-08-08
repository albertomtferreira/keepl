import type {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from "firebase/firestore";

import type { Entity } from "@/types";

export type FirestoreEntityData<T extends Entity> = Omit<T, "id">;

export function createFirestoreConverter<T extends Entity>(): FirestoreDataConverter<T> {
  return {
    toFirestore(entity: T) {
      const { id, ...data } = entity;
      void id;
      return data;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions) {
      return {
        id: snapshot.id,
        ...snapshot.data(options),
      } as T;
    },
  };
}
