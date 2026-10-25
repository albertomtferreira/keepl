import assert from "node:assert/strict";
import test from "node:test";
import {
  applyActions,
  buildPlan,
  checkReferences,
  executePlan,
  lifecycleCollections,
  lockPlan,
  type Backend,
  type Collection,
  type RecordData,
  type Snapshot,
  type TransactionPort,
} from "./plan";
import { ReadFailure, settleReads } from "@/lib/async/settle";

const record = (
  id: string,
  fields: Record<string, unknown> = {},
): RecordData => ({
  id,
  ownerId: "alice",
  createdAt: 1,
  updatedAt: 1,
  ...fields,
});
function fixture(): Snapshot {
  return {
    people: [
      record("a", { archivedAt: "2026-01-01", groupIds: ["g"] }),
      record("b"),
    ],
    groups: [record("g")],
    personNotes: [record("n", { personId: "a", body: "Keep private" })],
    importantDates: [record("d", { personId: "a" })],
    interactions: [record("i", { personId: "a" })],
    relationships: [record("r", { fromPersonId: "b", toPersonId: "a" })],
    memories: [
      record("shared", {
        peopleIds: ["a", "b"],
        title: "Unchanged",
        photos: [{ externalId: "photo" }],
      }),
      record("solo", { peopleIds: ["a"] }),
    ],
    reminders: [
      record("rp", { personId: "a" }),
      record("rd", { importantDateId: "d" }),
      record("rm", { memoryId: "shared" }),
    ],
  };
}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function fake(initial = fixture()) {
  let data = clone(initial);
  let denied = false;
  let chunks = 0;
  let failChunk = -1;
  let ambiguous = false;
  const log: string[] = [];
  const transact = async <T>(work: (port: TransactionPort) => Promise<T>) => {
    const next = clone(data);
    const writes: string[] = [];
    const port: TransactionPort = {
      async get(collection, id) {
        if (denied) throw new Error("permission-denied");
        return clone(next[collection].find((item) => item.id === id) ?? null);
      },
      update(collection, id, patch) {
        const found = next[collection].find((item) => item.id === id)!;
        Object.assign(found, patch);
        writes.push(`update:${collection}/${id}`);
      },
      delete(collection, id) {
        next[collection] = next[collection].filter((item) => item.id !== id);
        writes.push(`delete:${collection}/${id}`);
      },
    };
    const result = await work(port);
    data = next;
    log.push(...writes);
    return result;
  };
  const backend: Backend = {
    async load(ownerId) {
      if (denied) throw new Error("permission-denied");
      return Object.fromEntries(
        lifecycleCollections.map((key) => [
          key,
          clone(data[key].filter((item) => item.ownerId === ownerId)),
        ]),
      ) as Snapshot;
    },
    lock: (plan) => transact((port) => lockPlan(plan, port)),
    async apply(plan, actions, finish) {
      chunks++;
      if (chunks === failChunk && !ambiguous) throw new Error("interrupted");
      await transact((port) => applyActions(plan, actions, port, finish, 2));
      if (chunks === failChunk) throw new Error("ambiguous-response");
    },
  };
  return {
    backend,
    log,
    read: () => data,
    transact,
    deny: () => {
      denied = true;
    },
    fail: (index: number, afterCommit = false) => {
      failChunk = index;
      ambiguous = afterCommit;
    },
    change: (
      collection: Collection,
      id: string,
      fields: Record<string, unknown>,
    ) =>
      Object.assign(
        data[collection].find((item) => item.id === id)!,
        fields,
      ),
  };
}

test("person deletion preserves every memory, detaches only the target, removes date-only reminders and keeps unrelated data", async () => {
  const store = fake();
  const plan = buildPlan("alice", await store.backend.load("alice"), {
    collection: "people",
    id: "a",
  });
  assert.equal(store.log.length, 0, "preview must not write");
  await executePlan(plan, store.backend);
  const data = store.read();
  assert.deepEqual(
    data.people.map((item) => item.id),
    ["b"],
  );
  for (const key of [
    "personNotes",
    "importantDates",
    "interactions",
    "relationships",
  ] as const)
    assert.equal(data[key].length, 0);
  assert.deepEqual(
    data.memories.find((item) => item.id === "shared")?.peopleIds,
    ["b"],
  );
  assert.deepEqual(
    data.memories.find((item) => item.id === "solo")?.peopleIds,
    [],
  );
  assert.equal(data.memories[0].title, "Unchanged");
  assert.deepEqual(data.memories[0].photos, [{ externalId: "photo" }]);
  assert.deepEqual(
    data.reminders.map((item) => item.id),
    ["rm"],
  );
  assert.equal(data.groups.length, 1);
  assert.equal(store.log.at(-1), "delete:people/a");
});

for (const collection of ["importantDates", "memories"] as const)
  test(`${collection} deletion removes reminders referring only to that source`, async () => {
    const store = fake();
    await executePlan(
      buildPlan("alice", await store.backend.load("alice"), {
        collection,
        id: collection === "memories" ? "shared" : "d",
      }),
      store.backend,
    );
    assert.equal(
      store
        .read()
        .reminders.some(
          (item) => item.id === (collection === "memories" ? "rm" : "rd"),
        ),
      false,
    );
    assert.equal(store.read().people.length, 2);
  });

test("owner isolation and denied reads prevent discovery/deletion; archived people are valid sources", async () => {
  const initial = fixture();
  initial.personNotes.push(
    record("foreign", { ownerId: "bob", personId: "a" }),
  );
  assert.throws(
    () => buildPlan("alice", initial, { collection: "people", id: "a" }),
    /ownership/,
  );
  const store = fake(initial);
  const plan = buildPlan("alice", await store.backend.load("alice"), {
    collection: "people",
    id: "a",
  });
  store.deny();
  await assert.rejects(executePlan(plan, store.backend), /permission/);
  assert.equal(store.log.length, 0);
  assert.ok(store.read().personNotes.some((item) => item.id === "foreign"));
});

for (const ambiguous of [false, true])
  test(`chunk interruption retains source and fresh-review retry is safe (ambiguous=${ambiguous})`, async () => {
    const initial = fixture();
    initial.personNotes.push(
      ...Array.from({ length: 110 }, (_, i) =>
        record(`extra-${i}`, { personId: "a" }),
      ),
    );
    const store = fake(initial);
    store.fail(2, ambiguous);
    const source = { collection: "people", id: "a" } as const;
    const progress: number[] = [];
    await assert.rejects(
      executePlan(
        buildPlan("alice", await store.backend.load("alice"), source),
        store.backend,
        (value) => progress.push(value),
      ),
    );
    assert.deepEqual(progress, [50]);
    assert.equal(
      store.read().people.find((item) => item.id === "a")?.deletionPending,
      true,
    );
    await executePlan(
      buildPlan("alice", await store.backend.load("alice"), source),
      store.backend,
    );
    assert.equal(
      store.read().people.some((item) => item.id === "a"),
      false,
    );
    assert.equal(store.read().personNotes.length, 0);
    const deletions = store.log.filter((item) => item.startsWith("delete:"));
    assert.equal(new Set(deletions).size, deletions.length);
  });

test("edited dependencies invalidate a reviewed plan without deleting them; refresh allows explicit recovery", async () => {
  const store = fake();
  const target = { collection: "people", id: "a" } as const;
  const plan = buildPlan("alice", await store.backend.load("alice"), target);
  store.change("memories", "shared", { title: "Concurrent edit" });
  await assert.rejects(executePlan(plan, store.backend), /changed-plan/);
  assert.equal(
    store.log.filter((item) => item.startsWith("delete:")).length,
    0,
  );
  await executePlan(
    buildPlan("alice", await store.backend.load("alice"), target),
    store.backend,
  );
  assert.equal(store.read().memories[0].title, "Concurrent edit");
});

test("transaction validation is atomic on changed records and rejects another owner's document", async () => {
  const store = fake();
  const plan = buildPlan("alice", await store.backend.load("alice"));
  const actions = [
    {
      collection: "personNotes" as const,
      record: record("n", { personId: "a", body: "stale" }),
    },
  ];
  await assert.rejects(
    store.transact((port) => applyActions(plan, actions, port)),
    /changed-plan/,
  );
  assert.equal(store.log.length, 0);
  store.change("personNotes", "n", { ownerId: "bob" });
  await assert.rejects(
    store.transact((port) => applyActions(plan, actions, port)),
    /ownership/,
  );
});

test("reference guards reject missing, cross-owner, and pending sources, including reminder -> date -> person chains", async () => {
  const store = fake();
  for (const patch of [{ deletionPending: true }, { ownerId: "bob" }]) {
    store.change("people", "a", patch);
    await assert.rejects(
      store.transact((port) =>
        checkReferences(
          "alice",
          "reminders",
          { importantDateId: "d" },
          port.get,
        ),
      ),
      /reference-unavailable/,
    );
  }
  await assert.rejects(
    store.transact((port) =>
      checkReferences(
        "alice",
        "memories",
        { peopleIds: ["missing"] },
        port.get,
      ),
    ),
    /reference-unavailable/,
  );
});

test("orphan review preserves memories/people, removes dangling date reminders, and rejects newly restored references", async () => {
  const data = fixture();
  data.people = data.people.filter((item) => item.id !== "a");
  data.people[0].groupIds = ["missing-group"];
  const store = fake(data);
  const plan = buildPlan("alice", await store.backend.load("alice"));
  assert.equal(store.log.length, 0);
  assert.ok(plan.actions.some((action) => action.record.id === "rd"));
  await executePlan(plan, store.backend);
  assert.equal(store.read().memories.length, 2);
  assert.deepEqual(store.read().people[0].groupIds, []);
  assert.equal(
    store.read().reminders.some((item) => item.id === "rd"),
    false,
  );
  const restored = fake(data);
  const stale = buildPlan("alice", await restored.backend.load("alice"));
  restored.read().people.push(record("a"));
  await assert.rejects(executePlan(stale, restored.backend), /changed-plan/);
  assert.equal(restored.log.length, 0);
});

test("read settlement distinguishes genuine empty, complete failure, and partial failure", async () => {
  assert.deepEqual(
    await settleReads([Promise.resolve([]), Promise.resolve(null)]),
    [[], null],
  );
  await assert.rejects(
    settleReads([Promise.resolve([]), Promise.reject(new Error("denied"))]),
    (error: unknown) => error instanceof ReadFailure && error.partial,
  );
  await assert.rejects(
    settleReads([Promise.reject(new Error("denied"))]),
    (error: unknown) => error instanceof ReadFailure && !error.partial,
  );
});

test("an ambiguous final source commit can be acknowledged again without duplicate writes", async () => {
  const store = fake();
  const plan = buildPlan("alice", await store.backend.load("alice"), {
    collection: "people",
    id: "a",
  });
  store.fail(2, true);
  await assert.rejects(executePlan(plan, store.backend));
  assert.equal(
    store.read().people.some((item) => item.id === "a"),
    false,
  );
  const writes = store.log.length;
  await executePlan(plan, store.backend);
  assert.equal(store.log.length, writes);
});

test("chunk validation detects a dependency restored after review before writing any repair", async () => {
  const data = fixture();
  data.people = [];
  const store = fake(data);
  const plan = buildPlan("alice", await store.backend.load("alice"));
  store.read().people.push(record("a"));
  await assert.rejects(
    store.transact((port) => applyActions(plan, plan.actions, port)),
    /changed-plan/,
  );
  assert.equal(store.log.length, 0);
});
