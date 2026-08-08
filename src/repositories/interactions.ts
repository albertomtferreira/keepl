import { OwnedFirestoreRepository } from "@/repositories/base-repository";
import type { Interaction } from "@/types";

export class InteractionsRepository extends OwnedFirestoreRepository<Interaction> {
  constructor() {
    super("interactions");
  }

  async listRecent(ownerId: string, count = 10) {
    const interactions = await this.list(ownerId);

    return sortByNewestOccurrence(interactions).slice(0, count);
  }

  async listForPerson(ownerId: string, personId: string) {
    const interactions = await this.list(ownerId);

    return sortByNewestOccurrence(interactions.filter((interaction) => interaction.personId === personId));
  }
}

function sortByNewestOccurrence(interactions: Interaction[]) {
  return [...interactions].sort((first, second) => second.occurredAt.toMillis() - first.occurredAt.toMillis());
}

export const interactionsRepository = new InteractionsRepository();
