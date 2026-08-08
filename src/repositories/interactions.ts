import { where } from "firebase/firestore";

import { OwnedFirestoreRepository } from "@/repositories/base-repository";
import type { Interaction } from "@/types";

export class InteractionsRepository extends OwnedFirestoreRepository<Interaction> {
  constructor() {
    super("interactions");
  }

  listForPerson(ownerId: string, personId: string) {
    return this.list(ownerId, {
      constraints: [where("personId", "==", personId)],
      orderBy: { field: "occurredAt", direction: "desc" },
    });
  }
}

export const interactionsRepository = new InteractionsRepository();
