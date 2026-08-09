export const keeplExportSchemaVersion = 1;

export type KeeplExportCollection =
  | "people"
  | "groups"
  | "relationships"
  | "importantDates"
  | "personNotes"
  | "memories"
  | "interactions"
  | "reminders";

export type KeeplExportTimestamp = {
  __type: "timestamp";
  milliseconds: number;
};

export type KeeplExportRecord = {
  id: string;
  [key: string]: unknown;
};

export type KeeplExportData = {
  schema: "keepl.export";
  version: typeof keeplExportSchemaVersion;
  exportedAt: string;
  collections: Record<KeeplExportCollection, KeeplExportRecord[]>;
};

export type ImportDuplicate = {
  collection: KeeplExportCollection;
  id: string;
  reason: "id" | "natural-key";
};

export type ImportPreview = {
  exportData: KeeplExportData;
  counts: Record<KeeplExportCollection, number>;
  duplicates: ImportDuplicate[];
};

export type ImportSelection = Partial<Record<KeeplExportCollection, string[]>>;
