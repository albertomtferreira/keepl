import assert from "node:assert/strict";
import { it } from "node:test";
import { postLoginPath } from "./post-login-path";
it("restores internal destinations and rejects external/script/login redirects", () => {
  assert.equal(
    postLoginPath("/people/p?tab=notes#details"),
    "/people/p?tab=notes#details",
  );
  for (const path of [
    null,
    "",
    "//evil.test",
    "https://evil.test",
    "javascript:alert(1)",
    "/\\evil.test",
    "/\n/evil.test",
    "/login?next=/login",
    "/%2e%2e/login",
  ])
    assert.equal(postLoginPath(path), "/home");
});
