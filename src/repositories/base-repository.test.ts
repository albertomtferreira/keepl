import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isOwnedBy } from "@/repositories/ownership";

describe("owned repository helpers", () => {
  it("accepts records owned by the requesting user", () => {
    assert.equal(isOwnedBy({ ownerId: "user-1" }, "user-1"), true);
  });

  it("rejects records owned by another user", () => {
    assert.equal(isOwnedBy({ ownerId: "user-2" }, "user-1"), false);
  });

  it("rejects missing records", () => {
    assert.equal(isOwnedBy(null, "user-1"), false);
  });
});
