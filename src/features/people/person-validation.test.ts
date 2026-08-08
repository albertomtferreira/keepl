import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { personSchema } from "@/features/people/person-validation";

describe("person validation", () => {
  it("requires a first name after trimming whitespace", () => {
    const result = personSchema.safeParse({
      firstName: "   ",
      email: "",
    });

    assert.equal(result.success, false);
  });

  it("allows an empty optional email", () => {
    const result = personSchema.safeParse({
      firstName: "Maria",
      email: "",
    });

    assert.equal(result.success, true);
  });

  it("rejects malformed email addresses", () => {
    const result = personSchema.safeParse({
      firstName: "Maria",
      email: "maria-at-example",
    });

    assert.equal(result.success, false);
  });
});
