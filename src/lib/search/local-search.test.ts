import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Timestamp } from "firebase/firestore";

import { searchLocalRecords, type LocalSearchInput } from "@/lib/search/local-search";
import type { Group, ImportantDate, Interaction, Memory, Person, PersonNote } from "@/types";

const now = Timestamp.fromDate(new Date("2026-08-08T12:00:00Z"));

describe("searchLocalRecords", () => {
  it("returns no results for empty queries", () => {
    assert.deepEqual(searchLocalRecords(makeInput(), "   "), []);
  });

  it("matches people by name, nickname, contacts, and groups", () => {
    const input = makeInput();

    assert.equal(searchLocalRecords(input, "rico")[0]?.id, "person-1");
    assert.equal(searchLocalRecords(input, "ricardo@example.com")[0]?.id, "person-1");
    assert.ok(searchLocalRecords(input, "running").some((result) => result.id === "person-1"));
  });

  it("matches notes, memories, dates, interactions, and groups", () => {
    const input = makeInput();

    assert.equal(searchLocalRecords(input, "new job")[0]?.type, "note");
    assert.equal(searchLocalRecords(input, "lisbon")[0]?.type, "memory");
    assert.equal(searchLocalRecords(input, "anniversary")[0]?.type, "date");
    assert.equal(searchLocalRecords(input, "coffee")[0]?.type, "interaction");
    assert.equal(searchLocalRecords(input, "friends", "groups")[0]?.type, "group");
  });

  it("honors result scopes", () => {
    const input = makeInput();
    const results = searchLocalRecords(input, "ricardo", "notes");

    assert.deepEqual(
      results.map((result) => result.type),
      ["note"],
    );
  });

  it("ranks direct person matches above related record matches", () => {
    const input = makeInput();
    const results = searchLocalRecords(input, "ricardo");

    assert.equal(results[0]?.type, "person");
  });

  it("boosts pinned notes above otherwise similar unpinned notes", () => {
    const input = makeInput({
      notes: [
        makeNote({ id: "unpinned", body: "Loves handmade pasta", pinned: false }),
        makeNote({ id: "pinned", body: "Loves handmade pasta", pinned: true }),
      ],
    });

    assert.equal(searchLocalRecords(input, "pasta")[0]?.id, "pinned");
  });

  it("does not infer or fetch records outside provided owner-scoped input", () => {
    const input = makeInput({
      people: [makePerson({ id: "owned", displayName: "Owned Person" })],
      notes: [],
      memories: [],
      importantDates: [],
      interactions: [],
      groups: [],
    });

    assert.deepEqual(searchLocalRecords(input, "other user's secret"), []);
  });
});

function makeInput(overrides: Partial<LocalSearchInput> = {}): LocalSearchInput {
  const people = [
    makePerson({
      id: "person-1",
      displayName: "Ricardo Silva",
      firstName: "Ricardo",
      nickname: "Rico",
      emails: [{ value: "ricardo@example.com", primary: true }],
      groupIds: ["group-1"],
    }),
  ];
  const groups = [makeGroup({ id: "group-1", name: "Running friends" })];

  return {
    people,
    groups,
    notes: [makeNote({ personId: "person-1", title: "Career", body: "Started a new job", pinned: true })],
    memories: [makeMemory({ title: "Lisbon dinner", peopleIds: ["person-1"], location: "Lisbon" })],
    importantDates: [makeImportantDate({ title: "Anniversary dinner", personId: "person-1" })],
    interactions: [makeInteraction({ personId: "person-1", summary: "Coffee catch-up" })],
    ...overrides,
  };
}

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "person",
    ownerId: "owner-1",
    displayName: "Person",
    source: "manual",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeNote(overrides: Partial<PersonNote> = {}): PersonNote {
  return {
    id: "note",
    ownerId: "owner-1",
    personId: "person-1",
    body: "Note body",
    pinned: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: "memory",
    ownerId: "owner-1",
    title: "Memory",
    peopleIds: [],
    startDate: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeImportantDate(overrides: Partial<ImportantDate> = {}): ImportantDate {
  return {
    id: "date",
    ownerId: "owner-1",
    personId: "person-1",
    title: "Important date",
    date: { month: 8, day: 20, precision: "month-day" },
    kind: "custom",
    repeatsAnnually: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeInteraction(overrides: Partial<Interaction> = {}): Interaction {
  return {
    id: "interaction",
    ownerId: "owner-1",
    personId: "person-1",
    kind: "visit",
    occurredAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: "group",
    ownerId: "owner-1",
    name: "Group",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
