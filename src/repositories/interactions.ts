import { where } from "firebase/firestore";
import { OwnedFirestoreRepository } from "@/repositories/base-repository";
import type { Interaction } from "@/types";

export class InteractionsRepository extends OwnedFirestoreRepository<Interaction> {
  constructor() {
    super("interactions");
  }

  async listRecent(ownerId: string, count = 10) {
    return this.list(ownerId, {
      orderBy: { field: "occurredAt", direction: "desc" },
      limit: count,
    });
  }

  async listForPerson(ownerId: string, personId: string) {
    const interactions = await this.list(ownerId, {
      constraints: [where("personId", "==", personId)],
    });

    return sortByNewestOccurrence(
      interactions.filter((interaction) => interaction.personId === personId),
    );
  }
}

function sortByNewestOccurrence(interactions: Interaction[]) {
  return [...interactions].sort(
    (first, second) =>
      second.occurredAt.toMillis() - first.occurredAt.toMillis(),
  );
}

export const interactionsRepository = new InteractionsRepository();
