import { where } from "firebase/firestore";

import { OwnedFirestoreRepository } from "@/repositories/base-repository";
import type { PersonNote } from "@/types";

export class PersonNotesRepository extends OwnedFirestoreRepository<PersonNote> {
  constructor() {
    super("personNotes");
  }

  listForPerson(ownerId: string, personId: string) {
    return this.list(ownerId, { constraints: [where("personId", "==", personId)] });
  }
}

export const personNotesRepository = new PersonNotesRepository();
