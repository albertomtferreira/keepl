import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  where,
  Timestamp,
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import {
  OwnedFirestoreRepository,
  LOCAL_INDEX_LIMIT,
} from "../../src/repositories/base-repository";
import type { Person } from "../../src/types";

import { commitImportChunk } from "../../src/services/import/import-data";
import { searchLocalRecords } from "../../src/lib/search/local-search";

let env: RulesTestEnvironment;
const collections = [
  "people",
  "groups",
  "relationships",
  "importantDates",
  "personNotes",
  "memories",
  "interactions",
  "reminders",
];
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-keepl",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});
beforeEach(async () => {
  await env.clearFirestore();
});
after(async () => {
  await env.cleanup();
});

describe("deployed rule source against Firestore", () => {
  for (const name of collections)
    it(`${name}: isolates owners and rejects reassignment`, async () => {
      const alice = env.authenticatedContext("alice").firestore();
      const bob = env.authenticatedContext("bob").firestore();
      const guest = env.unauthenticatedContext().firestore();
      await assertSucceeds(setDoc(doc(alice, name, "a"), { ownerId: "alice" }));
      for (const db of [bob, guest]) {
        await assertFails(getDoc(doc(db, name, "a")));
        await assertFails(updateDoc(doc(db, name, "a"), { ownerId: "bob" }));
        await assertFails(deleteDoc(doc(db, name, "a")));
        await assertFails(
          setDoc(doc(db, name, "forged"), { ownerId: "alice" }),
        );
      }
      await assertFails(updateDoc(doc(alice, name, "a"), { ownerId: "bob" }));
      await assertFails(getDocs(collection(alice, name)));
      await assertFails(
        getDocs(query(collection(bob, name), where("ownerId", "==", "alice"))),
      );
      assert.equal(
        (
          await assertSucceeds(
            getDocs(
              query(collection(alice, name), where("ownerId", "==", "alice")),
            ),
          )
        ).size,
        1,
      );
      await assertSucceeds(
        updateDoc(doc(alice, name, "a"), { title: "changed" }),
      );
      await assertSucceeds(deleteDoc(doc(alice, name, "a")));
    });
  it("protects profiles and denies unknown collections", async () => {
    const alice = env.authenticatedContext("alice").firestore();
    const bob = env.authenticatedContext("bob").firestore();
    await assertSucceeds(
      setDoc(doc(alice, "users", "alice"), { ownerId: "alice" }),
    );
    await assertFails(getDoc(doc(bob, "users", "alice")));
    await assertFails(
      updateDoc(doc(alice, "users", "alice"), { ownerId: "bob" }),
    );
    await assertFails(setDoc(doc(alice, "unknown", "a"), { ownerId: "alice" }));
  });
});

it("real repository transactions create, retry, validate references and enforce ownership", async () => {
  const alice = env.authenticatedContext("alice").firestore();
  const repo = new OwnedFirestoreRepository<Person>("people", alice as never);
  const input = {
    displayName: "Alice",
    firstName: "Alice",
    groupIds: [],
    source: "manual" as const,
  };
  await repo.create("alice", input, "a");
  await repo.create("alice", input, "a");
  assert.equal((await repo.list("alice")).length, 1);
  await assert.rejects(
    repo.create("alice", { ...input, displayName: "Changed" }, "a"),
  );
  await assert.rejects(repo.update("alice", "a", { groupIds: ["missing"] }));
  await setDoc(doc(alice, "groups", "g"), { ownerId: "alice" });
  await repo.update("alice", "a", { groupIds: ["g"] });
  const bobRepo = new OwnedFirestoreRepository<Person>(
    "people",
    env.authenticatedContext("bob").firestore() as never,
  );
  await assert.rejects(bobRepo.update("bob", "a", { displayName: "stolen" }));
  await updateDoc(doc(alice, "people", "a"), {
    deletionPending: { target: "a" },
  });
  await assert.rejects(repo.update("alice", "a", { displayName: "late" }));
});

it("cursor pages preserve ties, owner scope, filters and complete bounded indexes", async () => {
  const alice = env.authenticatedContext("alice").firestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (let offset = 0; offset < LOCAL_INDEX_LIMIT + 1; offset += 400) {
      const batch = writeBatch(ctx.firestore());
      for (
        let i = offset;
        i < Math.min(offset + 400, LOCAL_INDEX_LIMIT + 1);
        i++
      )
        batch.set(doc(ctx.firestore(), "people", String(i).padStart(5, "0")), {
          ownerId: "alice",
          displayName: "Same",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      await batch.commit();
    }
    await setDoc(doc(ctx.firestore(), "people", "foreign"), {
      ownerId: "bob",
      displayName: "Same",
    });
  });
  const repo = new OwnedFirestoreRepository<Person>("people", alice as never);
  const first = await repo.listPage("alice", {
    limit: 50,
    orderBy: { field: "displayName" },
  });
  const second = await repo.listPage(
    "alice",
    { limit: 50, orderBy: { field: "displayName" } },
    first.cursor,
  );
  assert.equal(
    new Set([...first.records, ...second.records].map((p) => p.id)).size,
    100,
  );
  assert.equal((await repo.list("alice", { limit: 125 })).length, 125);
  await assert.rejects(repo.list("alice"), /local-index-capacity-exceeded/);
  assert.equal(
    (await repo.list("alice", { scanAll: true })).length,
    LOCAL_INDEX_LIMIT + 1,
  );
  await deleteDoc(doc(alice, "people", "02000"));
  const complete = await repo.list("alice");
  assert.equal(complete.length, LOCAL_INDEX_LIMIT);
  await updateDoc(doc(alice, "people", "01999"), {
    displayName: "BeyondFirstPage",
  });
  const results = searchLocalRecords(
    {
      people: await repo.list("alice"),
      notes: [],
      memories: [],
      importantDates: [],
      interactions: [],
      groups: [],
    },
    "BeyondFirstPage",
  );
  assert.equal(results[0]?.id, "01999");
  await assert.rejects(
    repo.listPage("alice", { limit: 101 }),
    /invalid-page-size/,
  );
});

it("real import transactions preserve timestamps and references, retry safely and abort on changed destinations", async () => {
  const db = env.authenticatedContext("alice").firestore();
  const run: Parameters<typeof commitImportChunk>[1] = (body) =>
    runTransaction(db as never, async (transaction) => {
      // Rebind references to the authenticated rules test client, preserving production transaction logic.
      await body({
        get: (ref) =>
          transaction.get(doc(db as never, ref.path) as never) as never,
        set: (ref, data) =>
          transaction.set(
            doc(db as never, ref.path) as never,
            data as never,
          ) as never,
      });
    });
  const stamp = { __type: "timestamp", milliseconds: 1234 };
  const records = [
    {
      collection: "groups" as const,
      record: {
        id: "g",
        ownerId: "alice",
        name: "Group",
        createdAt: stamp,
        updatedAt: stamp,
      },
    },
    {
      collection: "people" as const,
      record: {
        id: "p",
        ownerId: "alice",
        displayName: "Person",
        firstName: "Person",
        source: "manual",
        groupIds: ["g"],
        createdAt: stamp,
        updatedAt: stamp,
      },
    },
  ];
  await commitImportChunk(records, run);
  await commitImportChunk(records, run);
  const person = (await getDoc(doc(db, "people", "p"))).data()!;
  assert.deepEqual(person.groupIds, ["g"]);
  assert.equal(person.createdAt.toMillis(), 1234);
  await updateDoc(doc(db, "groups", "g"), { name: "Edited" });
  await assert.rejects(
    commitImportChunk(
      [
        ...records,
        { collection: "groups", record: { ...records[0].record, id: "new" } },
      ],
      run,
    ),
  );
  assert.equal((await getDoc(doc(db, "groups", "new"))).exists(), false);
  await assert.rejects(
    commitImportChunk(
      [
        {
          collection: "groups",
          record: { ...records[0].record, id: "forged", ownerId: "bob" },
        },
      ],
      run,
    ),
  );
});

it("intended profile, recent, membership and scheduled-reminder queries are owner scoped", async () => {
  const db = env.authenticatedContext("alice").firestore();
  const stamp = Timestamp.fromMillis(1234);
  const shapes = [
    ["interactions", "personId", "p"],
    ["importantDates", "personId", "p"],
    ["personNotes", "personId", "p"],
    ["relationships", "fromPersonId", "p"],
    ["relationships", "toPersonId", "p"],
    ["reminders", "importantDateId", "d"],
    ["memories", "peopleIds", ["p"]],
  ] as const;
  for (const [name, field, value] of shapes) {
    await setDoc(doc(db, name, field), {
      ownerId: "alice",
      [field]: value,
      startDate: stamp,
      occurredAt: stamp,
      status: "scheduled",
      remindAt: stamp,
    });
    const result = await getDocs(
      query(
        collection(db, name),
        where("ownerId", "==", "alice"),
        where(
          field,
          field === "peopleIds" ? "array-contains" : "==",
          field === "peopleIds" ? "p" : value,
        ),
      ),
    );
    assert.equal(result.size, 1);
  }
  for (const [name, field] of [
    ["memories", "startDate"],
    ["interactions", "occurredAt"],
  ]) {
    assert.equal(
      (
        await getDocs(
          query(
            collection(db, name),
            where("ownerId", "==", "alice"),
            orderBy(field, "desc"),
            limit(3),
          ),
        )
      ).size,
      1,
    );
  }
  assert.equal(
    (
      await getDocs(
        query(
          collection(db, "reminders"),
          where("ownerId", "==", "alice"),
          where("status", "==", "scheduled"),
          orderBy("remindAt"),
        ),
      )
    ).size,
    1,
  );
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), "people", "missing")),
  );
});
