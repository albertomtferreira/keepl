import { where } from "firebase/firestore";

import { OwnedFirestoreRepository } from "@/repositories/base-repository";
import type { Person } from "@/types";

export class PeopleRepository extends OwnedFirestoreRepository<Person> {
  constructor() {
    super("people");
  }

  listActive(ownerId: string) {
    return this.list(ownerId, {
      orderBy: { field: "displayName" },
      constraints: [where("archivedAt", "==", null)],
    });
  }
}

export const peopleRepository = new PeopleRepository();
