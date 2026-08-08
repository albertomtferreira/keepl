import type { OwnedRecord } from "@/types";

export function isOwnedBy(record: OwnedRecord | null | undefined, ownerId: string) {
  return record?.ownerId === ownerId;
}
