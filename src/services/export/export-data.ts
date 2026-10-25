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
import { portableSchemas } from "@/services/import/import-schema";
import {
  keeplExportSchemaVersion,
  type KeeplExportCollection,
  type KeeplExportData,
} from "@/types";

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

export async function exportKeeplData(
  ownerId: string,
): Promise<KeeplExportData> {
  const [
    people,
    groups,
    relationships,
    importantDates,
    personNotes,
    memories,
    interactions,
    reminders,
  ] = await Promise.all([
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
      people: people.map((record) =>
        portableSchemas.people.strip().parse(toExportRecord(record)),
      ),
      groups: groups.map((record) =>
        portableSchemas.groups.strip().parse(toExportRecord(record)),
      ),
      relationships: relationships.map((record) =>
        portableSchemas.relationships.strip().parse(toExportRecord(record)),
      ),
      importantDates: importantDates.map((record) =>
        portableSchemas.importantDates.strip().parse(toExportRecord(record)),
      ),
      personNotes: personNotes.map((record) =>
        portableSchemas.personNotes.strip().parse(toExportRecord(record)),
      ),
      memories: memories.map((record) =>
        portableSchemas.memories.strip().parse(toExportRecord(record)),
      ),
      interactions: interactions.map((record) =>
        portableSchemas.interactions.strip().parse(toExportRecord(record)),
      ),
      reminders: reminders.map((record) =>
        portableSchemas.reminders.strip().parse(toExportRecord(record)),
      ),
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
  return serializeValue(portableRecord) as {
    id: string;
    [key: string]: unknown;
  };
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
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeValue(entry)]),
    );
  }

  return value;
}

function isTimestampLike(value: unknown): value is { toMillis: () => number } {
  return Boolean(
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof value.toMillis === "function",
  );
}
