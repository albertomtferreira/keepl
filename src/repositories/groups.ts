import { OwnedFirestoreRepository } from "@/repositories/base-repository";
import type { Group } from "@/types";

export class GroupsRepository extends OwnedFirestoreRepository<Group> {
  constructor() {
    super("groups");
  }

  listByName(ownerId: string) {
    return this.list(ownerId, { orderBy: { field: "name" } });
  }
}

export const groupsRepository = new GroupsRepository();
