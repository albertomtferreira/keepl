import { OwnedFirestoreRepository } from "@/repositories/base-repository";
import type { Person } from "@/types";

export class PeopleRepository extends OwnedFirestoreRepository<Person> {
  constructor() {
    super("people");
  }

  async listActive(ownerId: string) {
    const people = await this.list(ownerId);

    return people
      .filter((person) => !person.archivedAt)
      .sort((first, second) => first.displayName.localeCompare(second.displayName));
  }

  archive(ownerId: string, id: string) {
    return this.update(ownerId, id, { archivedAt: new Date() });
  }
}

export const peopleRepository = new PeopleRepository();
