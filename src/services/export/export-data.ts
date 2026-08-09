import {
  groupsRepository,
  importantDatesRepository,
  interactionsRepository,
  memoriesRepository,
  peopleRepository,
  personNotesRepository,
  relationshipsRepository,
  remindersRepository,
} from "@/repositories";
import { keeplExportSchemaVersion, type KeeplExportCollection, type KeeplExportData } from "@/types";

const exportCollections = [
  "people",
  "groups",
  "relationships",
  "importantDates",
  "personNotes",
  "memories",
  "interactions",
  "reminders",
] as const satisfies readonly KeeplExportCollection[];

export async function exportKeeplData(ownerId: string): Promise<KeeplExportData> {
  const [people, groups, relationships, importantDates, personNotes, memories, interactions, reminders] =
    await Promise.all([
      peopleRepository.list(ownerId),
      groupsRepository.list(ownerId),
      relationshipsRepository.list(ownerId),
      importantDatesRepository.list(ownerId),
      personNotesRepository.list(ownerId),
      memoriesRepository.list(ownerId),
      interactionsRepository.list(ownerId),
      remindersRepository.list(ownerId),
    ]);

  return {
    schema: "keepl.export",
    version: keeplExportSchemaVersion,
    exportedAt: new Date().toISOString(),
    collections: {
      people: people.map(toExportRecord),
      groups: groups.map(toExportRecord),
      relationships: relationships.map(toExportRecord),
      importantDates: importantDates.map(toExportRecord),
      personNotes: personNotes.map(toExportRecord),
      memories: memories.map(toExportRecord),
      interactions: interactions.map(toExportRecord),
      reminders: reminders.map(toExportRecord),
    },
  };
}

export function serializeKeeplExport(data: KeeplExportData) {
  return JSON.stringify(data, null, 2);
}

export function getExportCollections() {
  return exportCollections;
}

function toExportRecord<T extends { id: string; ownerId: string }>(record: T) {
  const { ownerId, ...portableRecord } = record;
  void ownerId;
  return serializeValue(portableRecord) as { id: string; [key: string]: unknown };
}

function serializeValue(value: unknown): unknown {
  if (isTimestampLike(value)) {
    return { __type: "timestamp", milliseconds: value.toMillis() };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializeValue(entry)]));
  }

  return value;
}

function isTimestampLike(value: unknown): value is { toMillis: () => number } {
  return Boolean(value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function");
}
