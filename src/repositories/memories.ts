import { OwnedFirestoreRepository } from "@/repositories/base-repository";
import type { Memory } from "@/types";

export class MemoriesRepository extends OwnedFirestoreRepository<Memory> {
  constructor() {
    super("memories");
  }

  async listRecent(ownerId: string, count = 10) {
    const memories = await this.list(ownerId);

    return sortByNewestStartDate(memories).slice(0, count);
  }

  async listForPerson(ownerId: string, personId: string) {
    const memories = await this.list(ownerId);

    return sortByNewestStartDate(memories.filter((memory) => memory.peopleIds.includes(personId)));
  }
}

function sortByNewestStartDate(memories: Memory[]) {
  return [...memories].sort((first, second) => second.startDate.toMillis() - first.startDate.toMillis());
}

export const memoriesRepository = new MemoriesRepository();
