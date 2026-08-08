import { where } from "firebase/firestore";

import { OwnedFirestoreRepository } from "@/repositories/base-repository";
import type { Memory } from "@/types";

export class MemoriesRepository extends OwnedFirestoreRepository<Memory> {
  constructor() {
    super("memories");
  }

  listRecent(ownerId: string, count = 10) {
    return this.list(ownerId, {
      orderBy: { field: "startDate", direction: "desc" },
      limit: count,
    });
  }

  listForPerson(ownerId: string, personId: string) {
    return this.list(ownerId, {
      constraints: [where("peopleIds", "array-contains", personId)],
      orderBy: { field: "startDate", direction: "desc" },
    });
  }
}

export const memoriesRepository = new MemoriesRepository();
