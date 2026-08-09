import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createManualGooglePhotoReference,
  getGooglePhotoDownloadUrl,
  mergePhotoReferences,
  toPhotoReference,
  toPickedPhotoReference,
} from "@/services/google/photos";

describe("Google Photos references", () => {
  it("creates compact manual references without uploading photo data", () => {
    const reference = createManualGooglePhotoReference({
      externalId: " media-1 ",
      url: " https://photos.example/item ",
      description: " Dinner photo ",
    });

    assert.deepEqual(reference, {
      source: "google-photos",
      externalId: "media-1",
      url: "https://photos.example/item",
      thumbnailUrl: "https://photos.example/item",
      description: "Dinner photo",
      providerStatus: "available",
    });
  });

  it("maps picker media to portable photo references", () => {
    const reference = toPhotoReference({
      id: "media-2",
      baseUrl: "https://photos.example/thumb",
      productUrl: "https://photos.example/source",
      filename: "beach.jpg",
      mimeType: "image/jpeg",
    });

    assert.equal(reference.source, "google-photos");
    assert.equal(reference.externalId, "media-2");
    assert.equal(reference.thumbnailUrl, "https://photos.example/thumb");
    assert.equal(reference.url, "https://photos.example/source");
    assert.equal(reference.description, "beach.jpg");
    assert.equal(reference.attribution, "image/jpeg");
  });

  it("deduplicates selected references by provider and external id", () => {
    const merged = mergePhotoReferences(
      [{ source: "google-photos", externalId: "media-1" }],
      [
        { source: "google-photos", externalId: "media-1" },
        { source: "google-photos", externalId: "media-2" },
      ],
    );

    assert.deepEqual(
      merged.map((photo) => photo.externalId),
      ["media-1", "media-2"],
    );
  });

  it("maps picked REST media to expiring Google Photos references", () => {
    const reference = toPickedPhotoReference({
      id: "picked-1",
      createTime: "2026-08-09T12:00:00Z",
      type: "PHOTO",
      mediaFile: {
        baseUrl: "https://photos.example/base",
        filename: "memory.jpg",
        mimeType: "image/jpeg",
      },
    });

    assert.equal(reference.source, "google-photos");
    assert.equal(reference.externalId, "picked-1");
    assert.equal(reference.thumbnailUrl, "https://photos.example/base=w640-h480");
    assert.equal(reference.url, "https://photos.example/base");
    assert.equal(reference.description, "memory.jpg");
    assert.equal(reference.providerStatus, "available");
    assert.equal(reference.capturedAt?.toMillis(), 1786276800000);
    assert.ok(reference.lastCheckedAt);
  });

  it("builds original-quality download URLs from the base media URL", () => {
    assert.equal(
      getGooglePhotoDownloadUrl({
        source: "google-photos",
        url: "https://photos.example/base",
        thumbnailUrl: "https://photos.example/base=w640-h480",
      }),
      "https://photos.example/base=d",
    );
    assert.equal(
      getGooglePhotoDownloadUrl({
        source: "google-photos",
        url: "https://photos.example/base=w640-h480",
      }),
      "https://photos.example/base=d",
    );
  });
});
