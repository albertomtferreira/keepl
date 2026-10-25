import assert from "node:assert/strict";
import { it, mock } from "node:test";
import type {
  KeeplExportData,
  KeeplExportRecord,
  ImportSelection,
} from "@/types";

process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-api-key";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "test.firebaseapp.com";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123:web:abc";
const ts = { __type: "timestamp", milliseconds: 1700000000000 };
const base = { createdAt: ts, updatedAt: ts, ownerId: "untrusted" };
function fixture(): KeeplExportData {
  const records = {
    groups: [
      {
        id: "g",
        name: "Family",
        description: "Group",
        color: "red",
        sortOrder: 2,
      },
    ],
    people: [
      {
        id: "p",
        displayName: "Alex",
        source: "manual",
        googleContact: {
          accountId: "google-account",
          resourceName: "people/contact1",
        },
        groupIds: ["g"],
        birthday: { precision: "month-day", month: 2, day: 29 },
        archivedAt: "2026-01-01T00:00:00.000Z",
        phoneNumbers: [{ value: "123", primary: true }],
        socialProfiles: [{ platform: "custom", handle: "alex" }],
      },
    ],
    relationships: [
      {
        id: "r",
        fromPersonId: "p",
        toPersonId: "p",
        label: "friend",
        inverseLabel: "friend",
        notes: "note",
      },
    ],
    importantDates: [
      {
        id: "d",
        personId: "p",
        title: "Birthday",
        date: { precision: "year", year: 2000 },
        kind: "birthday",
        repeatsAnnually: true,
      },
    ],
    personNotes: [
      {
        id: "n",
        personId: "p",
        body: "Private note",
        title: "Note",
        pinned: true,
      },
    ],
    memories: [
      {
        id: "m",
        title: "Visit",
        peopleIds: ["p"],
        startDate: ts,
        endDate: ts,
        tags: ["holiday"],
        photos: [
          {
            source: "google-photos",
            externalId: "photo",
            description: "Photo",
            capturedAt: ts,
          },
        ],
      },
    ],
    interactions: [
      {
        id: "i",
        personId: "p",
        kind: "call",
        occurredAt: ts,
        summary: "Hello",
        notes: "Details",
      },
    ],
    reminders: [
      {
        id: "a",
        title: "Call",
        remindAt: ts,
        status: "scheduled",
        personId: "p",
        importantDateId: "d",
        memoryId: "m",
        notes: "Remember",
      },
    ],
  };
  return {
    schema: "keepl.export",
    version: 1,
    exportedAt: "2026-10-25T00:00:00.000Z",
    collections: Object.fromEntries(
      Object.entries(records).map(([c, rows]) => [
        c,
        rows.map((row) => ({ ...base, ...row })),
      ]),
    ) as unknown as KeeplExportData["collections"],
  };
}
function select(data: KeeplExportData): ImportSelection {
  return Object.fromEntries(
    Object.entries(data.collections).map(([c, records]) => [
      c,
      records.map((r) => r.id),
    ]),
  );
}

it("round-trips every collection through export, preview, remapping and import with current ownership", async () => {
  const service = await import("./import-data");
  const repos = await import("@/repositories");
  const exporter = await import("@/services/export/export-data");
  const data = fixture();
  const repositories = {
    people: repos.peopleRepository,
    groups: repos.groupsRepository,
    relationships: repos.relationshipsRepository,
    importantDates: repos.importantDatesRepository,
    personNotes: repos.personNotesRepository,
    memories: repos.memoriesRepository,
    interactions: repos.interactionsRepository,
    reminders: repos.remindersRepository,
  };
  for (const [collection, repository] of Object.entries(repositories)) {
    mock.method(repository, "list", async (ownerId: string) => {
      assert.equal(ownerId, "current");
      return data.collections[collection as keyof typeof data.collections];
    });
  }
  try {
    data.collections.people[0].accessToken = "must-not-export";
    data.collections.people[0].deletionPending = true;
    data.collections.importantDates[0].deletionPending = true;
    data.collections.memories[0].deletionPending = true;
    const exported = await exporter.exportKeeplData("current");
    for (const key of ["people", "importantDates", "memories"] as const) {
      assert.ok(!("deletionPending" in exported.collections[key][0]));
    }
    assert.ok(!("accessToken" in exported.collections.people[0]));
    const forged = structuredClone(exported);
    forged.collections.people[0].deletionPending = true;
    assert.throws(() => service.parseKeeplImportJson(JSON.stringify(forged)));
    assert.ok(
      Object.values(exported.collections)
        .flat()
        .every((r) => !("ownerId" in r)),
    );
    const parsed = service.parseKeeplImportJson(
      exporter.serializeKeeplExport(exported),
    );
    const preview = await service.previewKeeplImport("current", parsed);
    assert.equal(preview.duplicates.length, 8);
    const candidateData = structuredClone(parsed);
    candidateData.collections.people[0].id = "different-person-id";
    const candidates = await service.previewKeeplImport(
      "current",
      candidateData,
    );
    assert.ok(
      candidates.duplicates.some(
        (d) => d.collection === "people" && d.reason === "natural-key",
      ),
    );
    const plan = await service.createImportPlan(
      "current",
      parsed,
      select(parsed),
    );
    assert.deepEqual(plan.issues, []);
    const byCollection = Object.fromEntries(
      plan.records.map((row) => [row.collection, row.record]),
    );
    assert.deepEqual(byCollection.people.groupIds, [byCollection.groups.id]);
    assert.deepEqual(
      byCollection.people.googleContact,
      data.collections.people[0].googleContact,
    );
    const renamed = structuredClone(parsed);
    renamed.collections.people[0].id = "renamed-copy";
    renamed.collections.people[0].displayName = "Different name";
    const renamedPreview = await service.previewKeeplImport("current", renamed);
    assert.ok(
      renamedPreview.duplicates.some(
        (d) => d.id === "renamed-copy" && d.reason === "natural-key",
      ),
    );
    assert.deepEqual(byCollection.memories.peopleIds, [byCollection.people.id]);
    assert.equal(
      byCollection.reminders.importantDateId,
      byCollection.importantDates.id,
    );
    assert.equal(byCollection.reminders.memoryId, byCollection.memories.id);
    for (const c of [
      "relationships",
      "importantDates",
      "personNotes",
      "interactions",
      "reminders",
    ])
      assert.equal(
        byCollection[c].personId ?? byCollection[c].fromPersonId,
        byCollection.people.id,
      );
    assert.ok(plan.records.every((row) => row.record.ownerId === "current"));
    assert.equal(byCollection.people.displayName, "Alex");
    assert.deepEqual(
      byCollection.memories.photos,
      parsed.collections.memories[0].photos,
    );
    const other = await service.createImportPlan(
      "other",
      parsed,
      select(parsed),
    );
    assert.notEqual(other.records[0].record.id, plan.records[0].record.id);
    const chunks: unknown[] = [];
    await service.importKeeplData(
      "current",
      parsed,
      select(parsed),
      undefined,
      async (chunk) => {
        chunks.push(chunk);
      },
    );
    assert.equal(chunks.length, 1);
  } finally {
    mock.restoreAll();
  }
});

it("rejects malformed fields in every collection, duplicate IDs, secrets and unsupported versions before writing", async () => {
  const { parseKeeplImportJson, importKeeplData } =
    await import("./import-data");
  for (const collection of Object.keys(
    fixture().collections,
  ) as (keyof KeeplExportData["collections"])[]) {
    const data = fixture();
    data.collections[collection][0].createdAt = {
      __type: "timestamp",
      milliseconds: Infinity,
    };
    let writes = 0;
    await assert.rejects(
      importKeeplData("current", data, select(data), undefined, async () => {
        writes++;
      }),
    );
    assert.equal(writes, 0);
  }
  for (const mutate of [
    (d: KeeplExportData) => {
      (d as { version: number }).version = 2;
    },
    (d: KeeplExportData) => {
      d.collections.people.push(d.collections.people[0]);
    },
    (d: KeeplExportData) => {
      d.collections.people[0].accessToken = "secret";
    },
    (d: KeeplExportData) => {
      d.collections.people[0].id = "bad/path";
    },
    (d: KeeplExportData) => {
      d.collections.people[0].birthday = {
        precision: "full",
        year: 2025,
        month: 2,
        day: 29,
      };
    },
    (d: KeeplExportData) => {
      d.collections.interactions[0].kind = "unknown";
    },
  ]) {
    const data = fixture();
    mutate(data);
    assert.throws(() => parseKeeplImportJson(JSON.stringify(data)));
  }
});

it("blocks selective or absent dependencies and forged selection IDs before writes", async () => {
  const { importKeeplData, getImportIssues } = await import("./import-data");
  const data = fixture();
  const selection = select(data);
  selection.people = [];
  assert.ok(getImportIssues(data, selection).length > 0);
  let calls = 0;
  await assert.rejects(
    importKeeplData("current", data, selection, undefined, async () => {
      calls++;
    }),
  );
  selection.people = ["missing"];
  await assert.rejects(
    importKeeplData("current", data, selection, undefined, async () => {
      calls++;
    }),
  );
  assert.equal(calls, 0);
});

it("retains committed progress on interruption and reuses all IDs on retry", async () => {
  const { importKeeplData } = await import("./import-data");
  const data = fixture();
  data.collections.groups = Array.from({ length: 205 }, (_, index) => ({
    ...base,
    id: `g${index}`,
    name: `Group ${index}`,
  }));
  const selection: ImportSelection = {
    groups: data.collections.groups.map((r) => r.id),
  };
  const store = new Map<string, KeeplExportRecord>();
  let chunks = 0;
  const progress: number[] = [];
  const commit = async (rows: { record: KeeplExportRecord }[]) => {
    if (++chunks === 2) throw new Error("interrupted");
    for (const { record } of rows) {
      if (store.has(record.id)) assert.deepEqual(store.get(record.id), record);
      else store.set(record.id, record);
    }
  };
  await assert.rejects(
    importKeeplData(
      "current",
      data,
      selection,
      (n) => progress.push(n),
      commit,
    ),
  );
  assert.equal(store.size, 100);
  assert.deepEqual(progress, [100]);
  await importKeeplData(
    "current",
    data,
    selection,
    (n) => progress.push(n),
    commit,
  );
  assert.equal(store.size, 205);
  assert.equal(progress.at(-1), 205);
});

it("drops legacy photo availability cache while preserving portable metadata", async () => {
  const { parseKeeplImportJson } = await import("./import-data");
  const data = fixture();
  data.collections.people[0].photo = {
    source: "external-url",
    url: "https://example.com/photo",
    providerStatus: "expired",
    lastCheckedAt: ts,
  };
  const parsed = parseKeeplImportJson(JSON.stringify(data));
  assert.deepEqual(parsed.collections.people[0].photo, {
    source: "external-url",
    url: "https://example.com/photo",
  });
});

it("transaction writer preserves timestamps, retries identical copies and aborts changed destinations atomically", async () => {
  const { commitImportChunk, createImportPlan } = await import("./import-data");
  const data = fixture();
  const plan = await createImportPlan("current", data, { groups: ["g"] });
  const store = new Map<string, Record<string, unknown>>();
  const run: NonNullable<Parameters<typeof commitImportChunk>[1]> = async (
    body,
  ) => {
    const pending = new Map<string, Record<string, unknown>>();
    const transaction = {
      get: async (ref: { path: string }) => ({
        exists: () => store.has(ref.path),
        data: () => store.get(ref.path),
      }),
      set: (ref: { path: string }, payload: Record<string, unknown>) => {
        pending.set(ref.path, payload);
        return transaction;
      },
    };
    await body(
      transaction as unknown as Parameters<Parameters<typeof run>[0]>[0],
    );
    for (const [key, value] of pending) store.set(key, value);
  };
  await commitImportChunk(plan.records, run);
  assert.equal(store.size, 1);
  const payload = [...store.values()][0];
  assert.equal(payload.ownerId, "current");
  assert.ok(!("id" in payload));
  assert.equal(
    (payload.createdAt as { toMillis(): number }).toMillis(),
    ts.milliseconds,
  );
  await commitImportChunk(plan.records, run);
  assert.equal(store.size, 1);
  payload.name = "User edit";
  const extra = {
    collection: "groups" as const,
    record: { ...plan.records[0].record, id: "new-destination" },
  };
  await assert.rejects(
    commitImportChunk([extra, ...plan.records], run),
    /no overwrite/,
  );
  assert.equal(store.size, 1);
  assert.equal(payload.name, "User edit");
});

it("restore chunks cannot attach records to pending, missing, or foreign lifecycle sources", async () => {
  const { commitImportChunk } = await import("./import-data");
  let writes = 0;
  let parent: Record<string, unknown> | null = {
    ownerId: "current",
    deletionPending: true,
  };
  const chunk = [
    {
      collection: "memories" as const,
      record: {
        id: "memory",
        ownerId: "current",
        title: "Restore",
        peopleIds: ["person"],
        createdAt: ts,
        updatedAt: ts,
        startDate: ts,
      },
    },
  ];
  const run: NonNullable<Parameters<typeof commitImportChunk>[1]> = async (
    body,
  ) => {
    const transaction = {
      get: async (ref: { path: string }) => ({
        exists: () => ref.path === "people/person" && parent !== null,
        data: () => parent,
      }),
      set: () => {
        writes++;
        return transaction;
      },
    };
    await body(
      transaction as unknown as Parameters<Parameters<typeof run>[0]>[0],
    );
  };
  for (const value of [parent, null, { ownerId: "other" }]) {
    parent = value;
    await assert.rejects(
      commitImportChunk(chunk, run),
      /reference-unavailable/,
    );
    assert.equal(writes, 0);
  }
  parent = { ownerId: "current" };
  await commitImportChunk(chunk, run);
  assert.equal(writes, 1);
});
