import { OwnedFirestoreRepository } from "@/repositories/base-repository";
import type { Group } from "@/types";

export class GroupsRepository extends OwnedFirestoreRepository<Group> {
  constructor() {
    super("groups");
  }

  async listByName(ownerId: string) {
    const groups = await this.list(ownerId);

    return groups.sort((first, second) => first.name.localeCompare(second.name));
  }
}

export const groupsRepository = new GroupsRepository();
