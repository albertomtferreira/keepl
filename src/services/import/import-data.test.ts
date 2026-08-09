import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { keeplExportSchemaVersion, type KeeplExportData } from "@/types";

describe("import validation", () => {
  it("accepts the current export schema", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-api-key";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "test.firebaseapp.com";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123:web:abc";
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "123";
    const { parseKeeplImportJson } = await import("@/services/import/import-data");
    const data: KeeplExportData = {
      schema: "keepl.export",
      version: keeplExportSchemaVersion,
      exportedAt: "2026-08-09T00:00:00.000Z",
      collections: {
        people: [{ id: "person-1", displayName: "Alex" }],
        groups: [],
        relationships: [],
        importantDates: [],
        personNotes: [],
        memories: [],
        interactions: [],
        reminders: [],
      },
    };

    assert.equal(parseKeeplImportJson(JSON.stringify(data)).collections.people[0]?.id, "person-1");
  });

  it("rejects malformed imports", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-api-key";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "test.firebaseapp.com";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123:web:abc";
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "123";
    const { parseKeeplImportJson } = await import("@/services/import/import-data");
    assert.throws(() => parseKeeplImportJson(JSON.stringify({ schema: "something-else" })));
  });
});
