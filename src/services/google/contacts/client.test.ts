import assert from "node:assert/strict";
import { test, mock } from "node:test";
import type { User } from "firebase/auth";
import {
  clearContactsAccess,
  contactsSnapshot,
  getContactsAccess,
  saveContactsAccess,
  setContactsOwner,
} from "./access";

process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-api-key";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "test.firebaseapp.com";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123:web:abc";

test("Contacts transport uses header-only credentials, pagination and fixed provider paths", async () => {
  const { auth } = await import("@/lib/firebase/client");
  const { listContacts, refreshContact } = await import("./client");
  const previous = auth.currentUser;
  (auth as { currentUser: User | null }).currentUser = { uid: "owner" } as User;
  setContactsOwner("owner");
  const access = {
    ownerId: "owner",
    accountId: "google",
    accessToken: "secret",
    expiresAt: Date.now() + 10000,
  };
  saveContactsAccess(access, contactsSnapshot());
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, options?: RequestInit) => {
      const url = new URL(String(input));
      assert.equal(url.origin, "https://people.googleapis.com");
      assert.equal(url.searchParams.has("access_token"), false);
      assert.deepEqual(options?.headers, { Authorization: "Bearer secret" });
      assert.equal(options?.cache, "no-store");
      assert.equal(options?.redirect, "error");
      assert.equal(options?.credentials, "omit");
      return Response.json(
        url.pathname.endsWith("connections")
          ? {
              connections: [
                { resourceName: "people/c1", names: [{ displayName: "Alex" }] },
              ],
              nextPageToken: "page2",
            }
          : { resourceName: "people/c1", names: [{ displayName: "Updated" }] },
      );
    },
  );
  try {
    assert.equal((await listContacts("owner")).nextPageToken, "page2");
    await listContacts("owner", "page2");
    assert.match(
      String(fetchMock.mock.calls[1].arguments[0]),
      /pageToken=page2/,
    );
    assert.equal(
      (await refreshContact("owner", "people/c1")).contact?.values.displayName,
      "Updated",
    );
    await assert.rejects(refreshContact("owner", "../bad"));
    assert.equal(fetchMock.mock.calls.length, 3);
  } finally {
    fetchMock.mock.restore();
    clearContactsAccess();
    (auth as { currentUser: User | null }).currentUser = previous;
  }
});

test("denied, unavailable and stale in-flight responses cannot leak across sessions", async () => {
  const { auth } = await import("@/lib/firebase/client");
  const { refreshContact, listContacts, revokeContacts } =
    await import("./client");
  const previous = auth.currentUser;
  (auth as { currentUser: User | null }).currentUser = { uid: "owner" } as User;
  setContactsOwner("owner");
  const access = {
    ownerId: "owner",
    accountId: "google",
    accessToken: "secret",
    expiresAt: Date.now() + 10000,
  };
  let status = 404;
  let duringRequest = () => {};
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    duringRequest();
    return new Response("", { status });
  });
  try {
    saveContactsAccess(access, contactsSnapshot());
    assert.equal((await refreshContact("owner", "people/c1")).contact, null);
    for (status of [401, 403]) {
      await assert.rejects(listContacts("owner"));
      assert.throws(() => getContactsAccess("owner"));
      saveContactsAccess(access, contactsSnapshot());
    }
    status = 429;
    await assert.rejects(listContacts("owner"), /contacts-request/);
    assert.equal(getContactsAccess("owner"), access);
    status = 200;
    duringRequest = () => {
      setContactsOwner("other");
      saveContactsAccess({ ...access, ownerId: "other" }, contactsSnapshot());
    };
    await assert.rejects(listContacts("owner"));
    assert.equal(getContactsAccess("other").ownerId, "other");
    setContactsOwner("owner");
    saveContactsAccess(access, contactsSnapshot());
    await assert.rejects(revokeContacts("owner"));
    assert.equal(getContactsAccess("other").ownerId, "other");
  } finally {
    fetchMock.mock.restore();
    setContactsOwner(null);
    (auth as { currentUser: User | null }).currentUser = previous;
  }
});
