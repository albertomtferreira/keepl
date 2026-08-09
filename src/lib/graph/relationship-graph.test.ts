import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Timestamp } from "firebase/firestore";

import { deriveRelationshipGraph, getRelationshipTypeOptions } from "@/lib/graph/relationship-graph";
import type { Person, Relationship } from "@/types";

const now = Timestamp.fromDate(new Date("2026-08-08T12:00:00Z"));

describe("deriveRelationshipGraph", () => {
  it("derives nodes and edges from owned input without duplicating relationship truth", () => {
    const graph = deriveRelationshipGraph(makePeople(), [
      makeRelationship({ id: "relationship-1", fromPersonId: "person-1", toPersonId: "person-2", label: "friend" }),
    ]);

    assert.deepEqual(
      graph.nodes.map((node) => node.id),
      ["person-1", "person-2"],
    );
    assert.deepEqual(graph.edges, [
      {
        id: "relationship-1",
        fromId: "person-1",
        toId: "person-2",
        label: "friend",
        inverseLabel: undefined,
      },
    ]);
  });

  it("drops relationships that reference people outside the owner-scoped people input", () => {
    const graph = deriveRelationshipGraph(makePeople(), [
      makeRelationship({ fromPersonId: "person-1", toPersonId: "external-person", label: "friend" }),
    ]);

    assert.deepEqual(graph.nodes, []);
    assert.deepEqual(graph.edges, []);
  });

  it("limits profile graphs to the focused person and direct relationships", () => {
    const graph = deriveRelationshipGraph(makePeople(), [
      makeRelationship({ id: "direct", fromPersonId: "person-1", toPersonId: "person-2", label: "friend" }),
      makeRelationship({ id: "indirect", fromPersonId: "person-2", toPersonId: "person-3", label: "sibling" }),
    ], { focusPersonId: "person-1" });

    assert.deepEqual(
      graph.edges.map((edge) => edge.id),
      ["direct"],
    );
    assert.deepEqual(
      graph.nodes.map((node) => node.id),
      ["person-1", "person-2"],
    );
  });

  it("filters by relationship type and group", () => {
    const graph = deriveRelationshipGraph(makePeople(), [
      makeRelationship({ id: "friend", fromPersonId: "person-1", toPersonId: "person-2", label: "Friend" }),
      makeRelationship({ id: "mentor", fromPersonId: "person-1", toPersonId: "person-3", label: "mentor" }),
    ], {
      filters: {
        relationshipTypes: ["friend"],
        groupIds: ["group-1"],
      },
    });

    assert.deepEqual(
      graph.edges.map((edge) => edge.id),
      ["friend"],
    );
  });
});

describe("getRelationshipTypeOptions", () => {
  it("normalizes and sorts relationship labels for filters", () => {
    assert.deepEqual(
      getRelationshipTypeOptions([
        makeRelationship({ label: "Friend" }),
        makeRelationship({ label: " friend " }),
        makeRelationship({ label: "mentor" }),
      ]),
      ["friend", "mentor"],
    );
  });
});

function makePeople(): Person[] {
  return [
    makePerson({ id: "person-1", displayName: "Ada Lovelace", groupIds: ["group-1"] }),
    makePerson({ id: "person-2", displayName: "Grace Hopper", groupIds: ["group-1"] }),
    makePerson({ id: "person-3", displayName: "Katherine Johnson", groupIds: ["group-2"] }),
  ];
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

function makeRelationship(overrides: Partial<Relationship> = {}): Relationship {
  return {
    id: "relationship",
    ownerId: "owner-1",
    fromPersonId: "person-1",
    toPersonId: "person-2",
    label: "friend",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
