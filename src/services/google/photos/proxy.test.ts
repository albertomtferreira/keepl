import assert from "node:assert/strict";
import { it } from "node:test";
import { POST } from "@/app/api/google/photos/picker/media/route";
import { GET } from "@/app/api/google/photos/picker/sessions/[sessionId]/route";
import { bearer, isAllowedGooglePhotosMediaUrl, proxyPhotos } from "./proxy";
import {
  setGooglePhotosAccount,
  saveGooglePhotosAccess,
  hasGooglePhotosAccessToken,
  clearGooglePhotosAccess,
  fetchGooglePhotoBlob,
  mergePhotoReferences,
} from "./index";

it("isolates credentials, rejects stale consent, expires access and clears on denied requests", async () => {
  const original = globalThis.fetch;
  try {
    setGooglePhotosAccount("a");
    saveGooglePhotosAccess({
      ownerId: "a",
      accessToken: "secret",
      expiresAt: Date.now() + 60000,
    });
    assert.equal(hasGooglePhotosAccessToken(), true);
    setGooglePhotosAccount("b");
    assert.equal(hasGooglePhotosAccessToken(), false);
    assert.throws(() =>
      saveGooglePhotosAccess({
        ownerId: "a",
        accessToken: "secret",
        expiresAt: Date.now() + 60000,
      }),
    );
    assert.throws(() =>
      saveGooglePhotosAccess({
        ownerId: "b",
        accessToken: "secret",
        expiresAt: Date.now() - 1,
      }),
    );
    saveGooglePhotosAccess({
      ownerId: "b",
      accessToken: "secret",
      expiresAt: Date.now() + 60000,
    });
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url).includes("secret"), false);
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer secret",
      );
      assert.equal(String(init?.body).includes("secret"), false);
      return new Response("secret upstream error", { status: 403 });
    };
    await assert.rejects(
      fetchGooglePhotoBlob("https://lh3.googleusercontent.com/photo"),
      /permission-required/,
    );
    assert.equal(hasGooglePhotosAccessToken(), false);
  } finally {
    clearGooglePhotosAccess();
    setGooglePhotosAccount(null);
    globalThis.fetch = original;
  }
});

it("validates bearer, origin, media targets, malformed JSON and session paths", async () => {
  assert.equal(
    bearer(new Request("https://keepl.test/api?accessToken=secret")),
    null,
  );
  assert.equal(
    bearer(
      new Request("https://keepl.test/api", {
        headers: {
          Authorization: "Bearer secret",
          Origin: "https://other.test",
        },
      }),
    ),
    null,
  );
  for (const url of [
    "http://lh3.googleusercontent.com/x",
    "https://evil.test/x",
    "https://lh3.googleusercontent.com:444/x",
    "https://user:secret@lh3.googleusercontent.com/x",
    "https://lh3.googleusercontent.com/x?accessToken=secret",
  ])
    assert.equal(isAllowedGooglePhotosMediaUrl(url), false);
  assert.equal(
    isAllowedGooglePhotosMediaUrl(
      "https://lh3.googleusercontent.com/x=w640-h480",
    ),
    true,
  );
  assert.equal(
    (
      await POST(
        new Request("https://keepl.test/api", {
          method: "POST",
          headers: { Authorization: "Bearer secret" },
          body: "bad",
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await GET(new Request("https://keepl.test/api"), {
        params: Promise.resolve({ sessionId: "../escape" }),
      })
    ).status,
    400,
  );
});

it("forwards only header credentials, rejects redirects, disables caches and redacts upstream errors", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url).includes("secret"), false);
      assert.equal(init?.redirect, "error");
      assert.equal(init?.cache, "no-store");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer secret",
      );
      return new Response("secret provider failure", { status: 403 });
    };
    const result = await proxyPhotos(
      new Request("https://keepl.test/api", {
        headers: { Authorization: "Bearer secret" },
      }),
      "https://photospicker.googleapis.com/v1/sessions",
    );
    assert.equal(result.status, 403);
    assert.equal(result.headers.get("cache-control"), "no-store");
    assert.equal((await result.text()).includes("secret"), false);
  } finally {
    globalThis.fetch = original;
  }
});

it("refreshes reselected media references instead of retaining expired URLs", () => {
  assert.deepEqual(
    mergePhotoReferences(
      [{ source: "google-photos", externalId: "a", url: "old" }],
      [{ source: "google-photos", externalId: "a", url: "fresh" }],
    ).map((p) => p.url),
    ["fresh"],
  );
});

it("keeps picker creation, polling, listing and cleanup credentials out of URLs and bodies", async () => {
  const { launchGooglePhotosPicker } = await import("./index");
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const paths: string[] = [];
  const popup = {
    closed: false,
    opener: null,
    location: { replace: () => {} },
    close: () => {},
  };
  try {
    globalThis.window = {
      sessionStorage: { removeItem: () => {} },
      open: () => popup,
      location: { origin: "https://keepl.test" },
      setTimeout: (callback: () => void) => {
        callback();
        return 1;
      },
    } as unknown as Window & typeof globalThis;
    setGooglePhotosAccount("a");
    saveGooglePhotosAccess({
      ownerId: "a",
      accessToken: "secret",
      expiresAt: Date.now() + 60000,
    });
    globalThis.fetch = async (url, init) => {
      const path = String(url);
      paths.push(path);
      assert.equal(path.includes("secret"), false);
      assert.equal(String(init?.body).includes("secret"), false);
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer secret",
      );
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      if (path.includes("media-items"))
        return Response.json({
          mediaItems: [
            {
              id: "photo",
              mediaFile: { baseUrl: "https://lh3.googleusercontent.com/photo" },
            },
          ],
        });
      return Response.json({
        id: "session",
        pickerUri: "https://photos.google.com/picker/session",
        mediaItemsSet: init?.method !== "POST",
      });
    };
    assert.equal((await launchGooglePhotosPicker())[0].externalId, "photo");
    assert.equal(paths.length, 4);
    globalThis.window.open = () => null;
    await assert.rejects(launchGooglePhotosPicker(), /popup-blocked/);
  } finally {
    clearGooglePhotosAccess();
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    setGooglePhotosAccount(null);
  }
});

it("rejects in-flight media after account switching without clearing the new account", async () => {
  const original = globalThis.fetch;
  try {
    setGooglePhotosAccount("a");
    saveGooglePhotosAccess({
      ownerId: "a",
      accessToken: "old",
      expiresAt: Date.now() + 60000,
    });
    let finish!: (value: Response) => void;
    globalThis.fetch = () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      });
    const pending = fetchGooglePhotoBlob(
      "https://lh3.googleusercontent.com/photo",
    );
    setGooglePhotosAccount("b");
    saveGooglePhotosAccess({
      ownerId: "b",
      accessToken: "new",
      expiresAt: Date.now() + 60000,
    });
    finish(new Response("denied", { status: 401 }));
    await assert.rejects(pending);
    assert.equal(hasGooglePhotosAccessToken(), true);
  } finally {
    clearGooglePhotosAccess();
    setGooglePhotosAccount(null);
    globalThis.fetch = original;
  }
});

it("expires credentials by time even before the timer fires", () => {
  const original = Date.now;
  const now = original();
  try {
    setGooglePhotosAccount("a");
    saveGooglePhotosAccess({
      ownerId: "a",
      accessToken: "secret",
      expiresAt: now + 60000,
    });
    Date.now = () => now + 60001;
    assert.equal(hasGooglePhotosAccessToken(), false);
  } finally {
    Date.now = original;
    clearGooglePhotosAccess();
    setGooglePhotosAccount(null);
  }
});

it("revokes media object URLs on disconnect and rejects a late media response", async () => {
  const { fetchGooglePhotoObjectUrl } = await import("./index");
  const originalFetch = globalThis.fetch;
  const originalRevoke = URL.revokeObjectURL;
  const revoked: string[] = [];
  try {
    URL.revokeObjectURL = (url) => {
      revoked.push(url);
      originalRevoke(url);
    };
    setGooglePhotosAccount("a");
    saveGooglePhotosAccess({
      ownerId: "a",
      accessToken: "secret",
      expiresAt: Date.now() + 60000,
    });
    globalThis.fetch = async () =>
      new Response(new Blob(["photo"], { type: "image/jpeg" }));
    const objectUrl = await fetchGooglePhotoObjectUrl(
      "https://lh3.googleusercontent.com/photo",
    );
    clearGooglePhotosAccess();
    assert.ok(revoked.includes(objectUrl));
    saveGooglePhotosAccess({
      ownerId: "a",
      accessToken: "secret",
      expiresAt: Date.now() + 60000,
    });
    let finish!: (value: Response) => void;
    globalThis.fetch = () =>
      new Promise((resolve) => {
        finish = resolve;
      });
    const pending = fetchGooglePhotoObjectUrl(
      "https://lh3.googleusercontent.com/photo",
    );
    setGooglePhotosAccount("b");
    finish(new Response(new Blob(["photo"])));
    await assert.rejects(pending, /permission-required/);
  } finally {
    clearGooglePhotosAccess();
    setGooglePhotosAccount(null);
    globalThis.fetch = originalFetch;
    URL.revokeObjectURL = originalRevoke;
  }
});
