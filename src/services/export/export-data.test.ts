import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { keeplExportSchemaVersion, type KeeplExportData } from "@/types";

describe("export serialization", () => {
  it("serializes timestamp values into portable JSON", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-api-key";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "test.firebaseapp.com";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123:web:abc";
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "123";
    const { serializeKeeplExport } = await import("@/services/export/export-data");
    const data: KeeplExportData = {
      schema: "keepl.export",
      version: keeplExportSchemaVersion,
      exportedAt: "2026-08-09T00:00:00.000Z",
      collections: {
        people: [{ id: "person-1", createdAt: { __type: "timestamp", milliseconds: 1234 } }],
        groups: [],
        relationships: [],
        importantDates: [],
        personNotes: [],
        memories: [],
        interactions: [],
        reminders: [],
      },
    };

    assert.match(serializeKeeplExport(data), /"__type": "timestamp"/);
    assert.match(serializeKeeplExport(data), /"milliseconds": 1234/);
  });
});
