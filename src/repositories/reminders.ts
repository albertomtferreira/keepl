import { where } from "firebase/firestore";

import { OwnedFirestoreRepository } from "@/repositories/base-repository";
import type { Reminder } from "@/types";

export class RemindersRepository extends OwnedFirestoreRepository<Reminder> {
  constructor() {
    super("reminders");
  }

  listScheduled(ownerId: string) {
    return this.list(ownerId, {
      constraints: [where("status", "==", "scheduled")],
      orderBy: { field: "remindAt" },
    });
  }

  listForImportantDate(ownerId: string, importantDateId: string) {
    return this.list(ownerId, {
      constraints: [where("importantDateId", "==", importantDateId)],
    });
  }
}

export const remindersRepository = new RemindersRepository();
