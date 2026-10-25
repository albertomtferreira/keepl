import assert from "node:assert/strict";
import { test } from "node:test";
import { Timestamp } from "firebase/firestore";
import {
  changedFields,
  contactImportId,
  mapGoogleContact,
  matchingPeople,
} from "./model";
import {
  assertContactsAccess,
  clearContactsAccess,
  contactsSnapshot,
  getContactsAccess,
  saveContactsAccess,
  setContactsOwner,
} from "./access";
import { portableSchemas } from "@/services/import/import-schema";
import type { Person } from "@/types/person";

const person: Person = {
  id: "p",
  ownerId: "owner",
  source: "manual",
  displayName: "Alex",
  createdAt: Timestamp.fromMillis(0),
  updatedAt: Timestamp.fromMillis(0),
};
test("Google contact mapping preserves authored values, primary points and yearless birthdays", () => {
  const contact = mapGoogleContact({
    resourceName: "people/c123",
    names: [{ displayName: "Alex", givenName: "Alex" }],
    emailAddresses: [
      { value: "Alex@Example.com", type: "home", metadata: { primary: true } },
    ],
    birthdays: [{ date: { month: 2, day: 29 } }],
  });
  assert.equal(contact?.values.emails?.[0].value, "Alex@Example.com");
  assert.equal(contact?.values.emails?.[0].primary, true);
  assert.deepEqual(contact?.values.birthday, {
    month: 2,
    day: 29,
    precision: "month-day",
  });
  assert.equal(
    mapGoogleContact({
      resourceName: "people/deleted",
      metadata: { deleted: true },
    }),
    null,
  );
  assert.equal(mapGoogleContact({ resourceName: "people/empty" }), null);
  assert.equal(
    mapGoogleContact({
      resourceName: "people/invalid",
      names: [{ displayName: "A" }],
      birthdays: [{ date: { year: 2025, month: 2, day: 29 } }],
    })?.values.birthday,
    undefined,
  );
  assert.throws(() => mapGoogleContact({ resourceName: "people/../../bad" }));
});
test("duplicate candidates use normalized contact points; field differences include removals", () => {
  const contact = mapGoogleContact({
    resourceName: "people/c1",
    names: [{ displayName: "Other" }],
    emailAddresses: [{ value: "alex@example.com" }],
    phoneNumbers: [{ value: "+44 1234 567890" }],
  })!;
  assert.equal(
    matchingPeople(contact, [
      { ...person, emails: [{ value: " ALEX@example.com " }] },
    ]).length,
    1,
  );
  assert.equal(
    matchingPeople(contact, [
      { ...person, phoneNumbers: [{ value: "+44-1234-567890" }] },
    ]).length,
    1,
  );
  assert.equal(matchingPeople(contact, [person]).length, 0);
  assert.ok(
    changedFields(
      { ...person, birthday: { precision: "year", year: 2000 } },
      contact,
    ).includes("birthday"),
  );
});
test("import IDs are stable for retries and isolated by both owner and Google account", async () => {
  const id = await contactImportId("owner", "google", "people/c1");
  assert.equal(id, await contactImportId("owner", "google", "people/c1"));
  assert.notEqual(id, await contactImportId("other", "google", "people/c1"));
  assert.notEqual(id, await contactImportId("owner", "other", "people/c1"));
});
test("credentials reject account changes, stale consent, expiry and disconnect", () => {
  setContactsOwner("owner");
  const access = {
    ownerId: "owner",
    accountId: "google",
    accessToken: "secret",
    expiresAt: Date.now() + 10_000,
  };
  saveContactsAccess(access, contactsSnapshot());
  assert.equal(getContactsAccess("owner"), access);
  assert.throws(() => getContactsAccess("other"));
  const revision = contactsSnapshot();
  clearContactsAccess();
  assert.throws(() => assertContactsAccess(access));
  assert.throws(() => saveContactsAccess(access, revision));
  saveContactsAccess(access, contactsSnapshot());
  setContactsOwner("other");
  assert.throws(() => getContactsAccess("owner"));
  assert.throws(() =>
    saveContactsAccess(
      { ...access, ownerId: "other", expiresAt: 0 },
      contactsSnapshot(),
    ),
  );
  setContactsOwner(null);
});
test("portable contact references reject secrets and malformed identifiers while legacy people remain valid", () => {
  const portable = {
    id: "p",
    displayName: "A",
    source: "manual",
    createdAt: { __type: "timestamp", milliseconds: 0 },
    updatedAt: { __type: "timestamp", milliseconds: 0 },
  };
  assert.ok(portableSchemas.people.safeParse(portable).success);
  const googleContact = { accountId: "google", resourceName: "people/c1" };
  assert.deepEqual(
    portableSchemas.people.parse({ ...portable, googleContact }).googleContact,
    googleContact,
  );
  assert.equal(
    portableSchemas.people.safeParse({
      ...portable,
      googleContact: { ...googleContact, accessToken: "secret" },
    }).success,
    false,
  );
  assert.equal(
    portableSchemas.people.safeParse({
      ...portable,
      googleContact: { ...googleContact, resourceName: "../bad" },
    }).success,
    false,
  );
});
