import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getRelationshipLabelFromPerspective,
  resolveInverseRelationshipLabel,
} from "@/features/relationships/relationship-labels";
import type { Relationship } from "@/types";

describe("relationship label helpers", () => {
  it("resolves common inverse relationship labels", () => {
    assert.equal(resolveInverseRelationshipLabel("parent"), "child");
    assert.equal(resolveInverseRelationshipLabel("Child"), "parent");
    assert.equal(resolveInverseRelationshipLabel("mentor"), "mentee");
    assert.equal(resolveInverseRelationshipLabel("friend"), "friend");
  });

  it("uses the stored label from the source person's perspective", () => {
    const relationship = makeRelationship({ fromPersonId: "maria", toPersonId: "sofia", label: "mother" });

    assert.equal(getRelationshipLabelFromPerspective(relationship, "maria"), "mother");
  });

  it("uses the explicit inverse label from the target person's perspective", () => {
    const relationship = makeRelationship({
      fromPersonId: "maria",
      toPersonId: "sofia",
      label: "mother",
      inverseLabel: "daughter",
    });

    assert.equal(getRelationshipLabelFromPerspective(relationship, "sofia"), "daughter");
  });

  it("falls back to a known inverse label from the target person's perspective", () => {
    const relationship = makeRelationship({ fromPersonId: "maria", toPersonId: "sofia", label: "parent" });

    assert.equal(getRelationshipLabelFromPerspective(relationship, "sofia"), "child");
  });
});

function makeRelationship(overrides: Pick<Relationship, "fromPersonId" | "toPersonId" | "label"> & Partial<Relationship>): Relationship {
  return {
    id: "relationship-1",
    ownerId: "owner-1",
    createdAt: undefined as never,
    updatedAt: undefined as never,
    ...overrides,
  };
}
