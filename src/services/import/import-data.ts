import {
  Timestamp,
  doc,
  runTransaction,
  type Transaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { checkReferences, type RecordData } from "@/services/lifecycle/plan";
import { portableExportSchema } from "./import-schema";
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

export function parseKeeplImportJson(input: string): KeeplExportData {
  const parsed = JSON.parse(input);
  if (parsed?.version !== 1)
    throw new Error("Unsupported export version; only version 1 is supported.");
  const data = portableExportSchema.parse(parsed) as KeeplExportData;
  for (const collection of getExportCollections()) {
    const ids = data.collections[collection].map((record) => record.id);
    if (new Set(ids).size !== ids.length)
      throw new Error(`Duplicate IDs: ${collection}`);
  }
  return data;
}

export async function previewKeeplImport(
  ownerId: string,
  exportData: KeeplExportData,
): Promise<ImportPreview> {
  exportData = parseKeeplImportJson(JSON.stringify(exportData));
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

        if (
          (collection === "people" &&
            existing.people.externalKeys.has(contactReferenceKey(record))) ||
          hasNaturalKeyDuplicate(
            collection,
            record,
            existing[collection].naturalKeys,
          )
        ) {
          duplicates.push({ collection, id: record.id, reason: "natural-key" });
        }
      });

      return [collection, records.length];
    }),
  ) as ImportPreview["counts"];

  return { exportData, counts, duplicates };
}

export type ImportPlan = {
  ownerId: string;
  records: { collection: KeeplExportCollection; record: KeeplExportRecord }[];
  issues: string[];
};
const referenceFields: Record<string, KeeplExportCollection> = {
  groupIds: "groups",
  peopleIds: "people",
  personId: "people",
  fromPersonId: "people",
  toPersonId: "people",
  importantDateId: "importantDates",
  memoryId: "memories",
};

export function getImportIssues(
  exportData: KeeplExportData,
  selection: ImportSelection,
): string[] {
  const issues: string[] = [];
  for (const collection of getExportCollections()) {
    for (const record of exportData.collections[collection]) {
      if (!selection[collection]?.includes(record.id)) continue;
      for (const [field, target] of Object.entries(referenceFields)) {
        const value = record[field];
        for (const reference of value === undefined
          ? []
          : Array.isArray(value)
            ? value
            : [value]) {
          if (!selection[target]?.includes(String(reference)))
            issues.push(`${collection}/${record.id}: ${target}/${reference}`);
        }
      }
    }
  }
  return issues;
}

export async function createImportPlan(
  ownerId: string,
  exportData: KeeplExportData,
  selection: ImportSelection,
): Promise<ImportPlan> {
  if (!ownerId) throw new Error("Missing owner");
  exportData = parseKeeplImportJson(JSON.stringify(exportData));
  const issues = getImportIssues(exportData, selection);
  for (const collection of getExportCollections()) {
    const available = new Set(
      exportData.collections[collection].map((record) => record.id),
    );
    if ((selection[collection] ?? []).some((id) => !available.has(id)))
      throw new Error("Unknown selection ID");
  }
  const fingerprint = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(exportData)),
      ),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  const ids = new Map<string, string>();
  // Stable across reloads and ambiguous transaction outcomes. Different owners never share destination IDs.
  for (const collection of getExportCollections()) {
    for (const record of exportData.collections[collection]) {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(
          JSON.stringify([ownerId, fingerprint, collection, record.id]),
        ),
      );
      ids.set(
        `${collection}/${record.id}`,
        "restore_" +
          Array.from(new Uint8Array(digest), (b) =>
            b.toString(16).padStart(2, "0"),
          ).join(""),
      );
    }
  }
  const records: ImportPlan["records"] = [];
  for (const collection of [
    "groups",
    "people",
    "relationships",
    "importantDates",
    "personNotes",
    "memories",
    "interactions",
    "reminders",
  ] as const) {
    for (const source of exportData.collections[collection]) {
      if (!selection[collection]?.includes(source.id)) continue;
      const record: KeeplExportRecord = {
        ...source,
        id: ids.get(`${collection}/${source.id}`)!,
        ownerId,
      };
      for (const [field, target] of Object.entries(referenceFields)) {
        const value = record[field];
        if (value !== undefined)
          record[field] = Array.isArray(value)
            ? value.map((id) => ids.get(`${target}/${id}`))
            : ids.get(`${target}/${value}`);
      }
      records.push({ collection, record });
    }
  }
  return { ownerId, records, issues };
}

export async function importKeeplData(
  ownerId: string,
  exportData: KeeplExportData,
  selection: ImportSelection,
  onProgress?: (count: number) => void,
  commitChunk: (
    chunk: ImportPlan["records"],
  ) => Promise<void> = commitImportChunk,
) {
  const plan = await createImportPlan(ownerId, exportData, selection);
  if (plan.issues.length) throw new Error("Unresolved dependencies");
  const written = Object.fromEntries(
    getExportCollections().map((c) => [c, 0]),
  ) as Record<KeeplExportCollection, number>;
  const chunks: ImportPlan["records"][] = [];
  let chunk: ImportPlan["records"] = [];
  let bytes = 0;
  for (const row of plan.records) {
    const size = new TextEncoder().encode(JSON.stringify(row)).length;
    if (size > 900_000) throw new Error("Record exceeds safe document size");
    if (chunk.length >= 100 || bytes + size > 4_000_000) {
      chunks.push(chunk);
      chunk = [];
      bytes = 0;
    }
    chunk.push(row);
    bytes += size;
  }
  if (chunk.length) chunks.push(chunk);
  let committed = 0;
  // Each chunk is atomic. Earlier chunks remain committed on failure; deterministic IDs make retry safe.
  for (const chunk of chunks) {
    await commitChunk(chunk);
    chunk.forEach(({ collection }) => written[collection]++);
    committed += chunk.length;
    onProgress?.(committed);
  }
  return written;
}

export async function commitImportChunk(
  chunk: ImportPlan["records"],
  run: (
    body: (transaction: Pick<Transaction, "get" | "set">) => Promise<void>,
  ) => Promise<void> = (body) => runTransaction(db, body),
) {
  await run(async (transaction) => {
    const snapshots = await Promise.all(
      chunk.map(({ collection, record }) =>
        transaction.get(doc(db, collection, record.id)),
      ),
    );
    const inChunk = new Map(
      chunk.map(({ collection, record }, index) => [
        `${collection}/${record.id}`,
        snapshots[index].exists()
          ? snapshots[index].data()
          : deserializeRecord(record),
      ]),
    );
    const fetched = new Map<string, RecordData | null>();
    for (const { collection, record } of chunk) {
      await checkReferences(
        String(record.ownerId),
        collection,
        record,
        async (parentCollection, parentId) => {
          const key = `${parentCollection}/${parentId}`;
          if (inChunk.has(key))
            return { ...inChunk.get(key), id: parentId } as RecordData;
          if (!fetched.has(key)) {
            const snapshot = await transaction.get(
              doc(db, parentCollection, parentId),
            );
            fetched.set(
              key,
              snapshot.exists()
                ? ({ ...snapshot.data(), id: parentId } as RecordData)
                : null,
            );
          }
          return fetched.get(key)!;
        },
      );
    }
    chunk.forEach(({ collection, record }, index) => {
      const data = deserializeRecord(record);
      const { id: ignoredId, ...payload } = data;
      void ignoredId;
      if (snapshots[index].exists()) {
        if (
          JSON.stringify(canonical(snapshots[index].data())) !==
          JSON.stringify(canonical(payload))
        )
          throw new Error("Restore destination changed; no overwrite allowed");
      } else transaction.set(doc(db, collection, record.id), payload);
    });
  });
}

function canonical(value: unknown): unknown {
  if (value instanceof Timestamp) return { milliseconds: value.toMillis() };
  if (value instanceof Date) return { milliseconds: value.getTime() };
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  return value;
}

function deserializeRecord(record: KeeplExportRecord) {
  const result = deserializeValue(record) as KeeplExportRecord;
  if (typeof result.archivedAt === "string")
    result.archivedAt = new Date(result.archivedAt);
  return result;
}

function deserializeValue(value: unknown): unknown {
  if (timestampSchema.safeParse(value).success) {
    return Timestamp.fromMillis(
      (value as { milliseconds: number }).milliseconds,
    );
  }

  if (Array.isArray(value)) {
    return value.map(deserializeValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        deserializeValue(entry),
      ]),
    );
  }

  return value;
}

async function loadExisting(ownerId: string) {
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
    peopleRepository.list(ownerId, { scanAll: true }),
    groupsRepository.list(ownerId, { scanAll: true }),
    relationshipsRepository.list(ownerId, { scanAll: true }),
    importantDatesRepository.list(ownerId, { scanAll: true }),
    personNotesRepository.list(ownerId, { scanAll: true }),
    memoriesRepository.list(ownerId, { scanAll: true }),
    interactionsRepository.list(ownerId, { scanAll: true }),
    remindersRepository.list(ownerId, { scanAll: true }),
  ]);

  return {
    people: {
      ...toExistingInfo(people, (record) => record.displayName),
      externalKeys: new Set(
        people.map((record) => contactReferenceKey(record)).filter(Boolean),
      ),
    },
    groups: toExistingInfo(groups, (record) => record.name),
    relationships: toExistingInfo(
      relationships,
      (record) => `${record.fromPersonId}:${record.toPersonId}:${record.label}`,
    ),
    importantDates: toExistingInfo(
      importantDates,
      (record) => `${record.personId}:${record.title}`,
    ),
    personNotes: toExistingInfo(
      personNotes,
      (record) => `${record.personId}:${record.title ?? ""}:${record.body}`,
    ),
    memories: toExistingInfo(memories, (record) => record.title),
    interactions: toExistingInfo(
      interactions,
      (record) => `${record.personId}:${record.kind}:${record.summary ?? ""}`,
    ),
    reminders: toExistingInfo(reminders, (record) => record.title),
  };
}

function toExistingInfo<T extends { id: string }>(
  records: T[],
  getNaturalKey: (record: T) => string,
) {
  return {
    ids: new Set(records.map((record) => record.id)),
    naturalKeys: new Set(
      records
        .map((record) => getNaturalKey(record).trim().toLowerCase())
        .filter(Boolean),
    ),
  };
}

function hasNaturalKeyDuplicate(
  collection: KeeplExportCollection,
  record: KeeplExportRecord,
  naturalKeys: Set<string>,
) {
  const key = getNaturalKey(collection, record);
  return Boolean(key && naturalKeys.has(key));
}

function getNaturalKey(
  collection: KeeplExportCollection,
  record: KeeplExportRecord,
) {
  const text = (value: unknown) =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

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

function contactReferenceKey(record: object) {
  const link = (
    record as { googleContact?: { accountId?: string; resourceName?: string } }
  ).googleContact;
  return link?.accountId && link?.resourceName
    ? JSON.stringify([link.accountId, link.resourceName])
    : "";
}
