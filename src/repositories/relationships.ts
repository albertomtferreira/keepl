import { where } from "firebase/firestore";

import { OwnedFirestoreRepository } from "@/repositories/base-repository";
import type { Relationship } from "@/types";

export class RelationshipsRepository extends OwnedFirestoreRepository<Relationship> {
  constructor() {
    super("relationships");
  }

  listForPerson(ownerId: string, personId: string) {
    return Promise.all([
      this.list(ownerId, { constraints: [where("fromPersonId", "==", personId)] }),
      this.list(ownerId, { constraints: [where("toPersonId", "==", personId)] }),
    ]).then(([fromRelationships, toRelationships]) => [
      ...fromRelationships,
      ...toRelationships.filter(
        (relationship) =>
          !fromRelationships.some((existing) => existing.id === relationship.id),
      ),
    ]);
  }
}

export const relationshipsRepository = new RelationshipsRepository();
