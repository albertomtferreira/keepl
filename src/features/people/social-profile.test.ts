import assert from "node:assert/strict";
import { test } from "node:test";
import { createPersonSchema } from "./person-validation";
import { safeSocialProfileUrl } from "./social-profile";
import { createTranslator } from "@/lib/i18n/translate";

test("social profile forms accept multiple platforms, handles or URLs and preserve user text", () => {
  const data = createPersonSchema().parse({
    firstName: "Alex",
    email: "",
    socialProfiles: [
      {
        platform: "Instagram",
        handle: "@alex",
        url: "https://instagram.com/alex",
      },
      { platform: "My community", handle: "Member" },
    ],
  });
  assert.equal(data.socialProfiles?.length, 2);
  assert.equal(data.socialProfiles?.[1].platform, "My community");
  assert.equal(data.socialProfiles?.[0].handle, "@alex");
});
test("social profile validation is localized and rejects empty rows and unsafe links", () => {
  for (const locale of ["en", "pt", "fr", "es"] as const) {
    const t = createTranslator(locale);
    const schema = createPersonSchema({
      firstNameRequired: "name",
      validEmail: "email",
      socialPlatformRequired: t("socialProfiles", "platformRequired"),
      socialContactRequired: t("socialProfiles", "contactRequired"),
      socialUrlInvalid: t("socialProfiles", "invalidUrl"),
    });
    for (const [profile, message] of [
      [
        { platform: "", handle: "alex" },
        t("socialProfiles", "platformRequired"),
      ],
      [
        { platform: "Instagram", handle: "", url: "" },
        t("socialProfiles", "contactRequired"),
      ],
      [
        { platform: "Custom", url: "javascript:alert(1)" },
        t("socialProfiles", "invalidUrl"),
      ],
    ] as const) {
      const result = schema.safeParse({
        firstName: "Alex",
        email: "",
        socialProfiles: [profile],
      });
      assert.equal(result.success, false);
      if (!result.success)
        assert.ok(
          result.error.issues.some((issue) => issue.message === message),
        );
    }
  }
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "//example.com",
    "https://user:password@example.com",
    "invalid",
  ])
    assert.equal(safeSocialProfileUrl(url), undefined);
  assert.equal(
    safeSocialProfileUrl("https://example.com/alex"),
    "https://example.com/alex",
  );
});
