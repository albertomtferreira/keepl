import { where } from "firebase/firestore";

import { OwnedFirestoreRepository } from "@/repositories/base-repository";
import type { ImportantDate } from "@/types";

export class ImportantDatesRepository extends OwnedFirestoreRepository<ImportantDate> {
  constructor() {
    super("importantDates");
  }

  listForOwner(ownerId: string) {
    return this.list(ownerId);
  }

  listForPerson(ownerId: string, personId: string) {
    return this.list(ownerId, { constraints: [where("personId", "==", personId)] });
  }
}

export const importantDatesRepository = new ImportantDatesRepository();
