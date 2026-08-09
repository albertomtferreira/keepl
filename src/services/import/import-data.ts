import { Timestamp } from "firebase/firestore";
import { z } from "zod";

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
import { getExportCollections } from "@/services/export/export-data";
import {
  keeplExportSchemaVersion,
  type ImportDuplicate,
  type ImportPreview,
  type ImportSelection,
  type KeeplExportCollection,
  type KeeplExportData,
  type KeeplExportRecord,
} from "@/types";

const timestampSchema = z.object({
  __type: z.literal("timestamp"),
  milliseconds: z.number().int(),
});

const recordSchema = z.object({ id: z.string().min(1) }).catchall(z.unknown());
const collectionsSchema = z.object(
  Object.fromEntries(getExportCollections().map((collection) => [collection, z.array(recordSchema).default([])])) as Record<
    KeeplExportCollection,
    z.ZodDefault<z.ZodArray<typeof recordSchema>>
  >,
);

const exportSchema = z.object({
  schema: z.literal("keepl.export"),
  version: z.literal(keeplExportSchemaVersion),
  exportedAt: z.string().datetime(),
  collections: collectionsSchema,
});

export function parseKeeplImportJson(input: string): KeeplExportData {
  return exportSchema.parse(JSON.parse(input)) as KeeplExportData;
}

export async function previewKeeplImport(ownerId: string, exportData: KeeplExportData): Promise<ImportPreview> {
  const existing = await loadExisting(ownerId);
  const duplicates: ImportDuplicate[] = [];
  const counts = Object.fromEntries(
    getExportCollections().map((collection) => {
      const records = exportData.collections[collection];

      records.forEach((record) => {
        if (existing[collection].ids.has(record.id)) {
          duplicates.push({ collection, id: record.id, reason: "id" });
          return;
        }

        if (hasNaturalKeyDuplicate(collection, record, existing[collection].naturalKeys)) {
          duplicates.push({ collection, id: record.id, reason: "natural-key" });
        }
      });

      return [collection, records.length];
    }),
  ) as ImportPreview["counts"];

  return { exportData, counts, duplicates };
}

export async function importKeeplData(ownerId: string, exportData: KeeplExportData, selection: ImportSelection) {
  const selected = normalizeSelection(exportData, selection);
  const written: Record<KeeplExportCollection, number> = Object.fromEntries(
    getExportCollections().map((collection) => [collection, 0]),
  ) as Record<KeeplExportCollection, number>;

  for (const collection of getExportCollections()) {
    for (const record of exportData.collections[collection]) {
      if (!selected[collection]?.has(record.id)) {
        continue;
      }

      await writeRecord(ownerId, collection, record);
      written[collection] += 1;
    }
  }

  return written;
}

function normalizeSelection(exportData: KeeplExportData, selection: ImportSelection) {
  return Object.fromEntries(
    getExportCollections().map((collection) => [
      collection,
      new Set(selection[collection] ?? exportData.collections[collection].map((record) => record.id)),
    ]),
  ) as Record<KeeplExportCollection, Set<string>>;
}

async function writeRecord(ownerId: string, collection: KeeplExportCollection, record: KeeplExportRecord) {
  const { id, createdAt, updatedAt, ownerId: ignoredOwnerId, ...data } = deserializeRecord(record);
  void createdAt;
  void updatedAt;
  void ignoredOwnerId;

  switch (collection) {
    case "people":
      await peopleRepository.set(ownerId, id, data as never);
      break;
    case "groups":
      await groupsRepository.set(ownerId, id, data as never);
      break;
    case "relationships":
      await relationshipsRepository.set(ownerId, id, data as never);
      break;
    case "importantDates":
      await importantDatesRepository.set(ownerId, id, data as never);
      break;
    case "personNotes":
      await personNotesRepository.set(ownerId, id, data as never);
      break;
    case "memories":
      await memoriesRepository.set(ownerId, id, data as never);
      break;
    case "interactions":
      await interactionsRepository.set(ownerId, id, data as never);
      break;
    case "reminders":
      await remindersRepository.set(ownerId, id, data as never);
      break;
  }
}

function deserializeRecord(record: KeeplExportRecord) {
  return deserializeValue(record) as KeeplExportRecord;
}

function deserializeValue(value: unknown): unknown {
  if (timestampSchema.safeParse(value).success) {
    return Timestamp.fromMillis((value as { milliseconds: number }).milliseconds);
  }

  if (Array.isArray(value)) {
    return value.map(deserializeValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, deserializeValue(entry)]));
  }

  return value;
}

async function loadExisting(ownerId: string) {
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
    people: toExistingInfo(people, (record) => record.displayName),
    groups: toExistingInfo(groups, (record) => record.name),
    relationships: toExistingInfo(relationships, (record) => `${record.fromPersonId}:${record.toPersonId}:${record.label}`),
    importantDates: toExistingInfo(importantDates, (record) => `${record.personId}:${record.title}`),
    personNotes: toExistingInfo(personNotes, (record) => `${record.personId}:${record.title ?? ""}:${record.body}`),
    memories: toExistingInfo(memories, (record) => record.title),
    interactions: toExistingInfo(interactions, (record) => `${record.personId}:${record.kind}:${record.summary ?? ""}`),
    reminders: toExistingInfo(reminders, (record) => record.title),
  };
}

function toExistingInfo<T extends { id: string }>(records: T[], getNaturalKey: (record: T) => string) {
  return {
    ids: new Set(records.map((record) => record.id)),
    naturalKeys: new Set(records.map((record) => getNaturalKey(record).trim().toLowerCase()).filter(Boolean)),
  };
}

function hasNaturalKeyDuplicate(collection: KeeplExportCollection, record: KeeplExportRecord, naturalKeys: Set<string>) {
  const key = getNaturalKey(collection, record);
  return Boolean(key && naturalKeys.has(key));
}

function getNaturalKey(collection: KeeplExportCollection, record: KeeplExportRecord) {
  const text = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");

  switch (collection) {
    case "people":
      return text(record.displayName);
    case "groups":
      return text(record.name);
    case "relationships":
      return `${text(record.fromPersonId)}:${text(record.toPersonId)}:${text(record.label)}`;
    case "importantDates":
      return `${text(record.personId)}:${text(record.title)}`;
    case "personNotes":
      return `${text(record.personId)}:${text(record.title)}:${text(record.body)}`;
    case "memories":
      return text(record.title);
    case "interactions":
      return `${text(record.personId)}:${text(record.kind)}:${text(record.summary)}`;
    case "reminders":
      return text(record.title);
  }
}
