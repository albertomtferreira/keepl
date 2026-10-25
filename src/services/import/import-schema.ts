import { z } from "zod";

const id = z
  .string()
  .min(1)
  .max(1500)
  .refine(
    (v) => !v.includes("/") && v !== "." && v !== ".." && !/^__.*__$/.test(v),
  );
const text = z.string();
const timestamp = z
  .object({
    __type: z.literal("timestamp"),
    milliseconds: z.number().int().min(-62135596800000).max(253402300799999),
  })
  .strict();
const date = z
  .object({
    year: z.number().int().min(1).max(9999).optional(),
    month: z.number().int().min(1).max(12).optional(),
    day: z.number().int().min(1).max(31).optional(),
    precision: z.enum(["full", "month-day", "year-month", "year"]),
  })
  .strict()
  .refine((d) => {
    const needsYear = d.precision !== "month-day";
    const needsMonth = d.precision !== "year";
    const needsDay = d.precision === "full" || d.precision === "month-day";
    return (
      (!needsYear || d.year !== undefined) &&
      (!needsMonth || d.month !== undefined) &&
      (!needsDay || d.day !== undefined) &&
      (!d.day ||
        !d.month ||
        d.day <=
          [
            31,
            (d.year ?? 2000) % 4 === 0 &&
            ((d.year ?? 2000) % 100 !== 0 || (d.year ?? 2000) % 400 === 0)
              ? 29
              : 28,
            31,
            30,
            31,
            30,
            31,
            31,
            30,
            31,
            30,
            31,
          ][d.month - 1])
    );
  });
const photo = z
  .object({
    source: z.enum([
      "google-photos",
      "external-url",
      "contact-profile",
      "manual-reference",
    ]),
    externalId: text.optional(),
    url: text.optional(),
    thumbnailUrl: text.optional(),
    description: text.optional(),
    capturedAt: timestamp.optional(),
    attribution: text.optional(),
    providerStatus: z.enum(["available", "expired", "unavailable"]).optional(),
    lastCheckedAt: timestamp.optional(),
  })
  .strict()
  .transform(({ providerStatus, lastCheckedAt, ...reference }) => {
    // Accept legacy v1 cache fields, but restore only the portable reference.
    void providerStatus;
    void lastCheckedAt;
    return reference;
  });
const base = {
  id,
  ownerId: text.optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
};
const contact = z
  .object({
    label: text.optional(),
    value: text,
    primary: z.boolean().optional(),
  })
  .strict();
export const portableSchemas = {
  people: z
    .object({
      ...base,
      displayName: text.min(1),
      firstName: text.optional(),
      lastName: text.optional(),
      nickname: text.optional(),
      birthday: date.optional(),
      phoneNumbers: z.array(contact).optional(),
      emails: z.array(contact).optional(),
      socialProfiles: z
        .array(
          z
            .object({
              platform: text,
              handle: text.optional(),
              url: text.optional(),
            })
            .strict(),
        )
        .optional(),
      groupIds: z.array(id).optional(),
      photo: photo.optional(),
      source: z.enum(["manual", "google-contacts", "import", "seed"]),
      sourceId: text.optional(),
      googleContact: z
        .object({
          accountId: text.min(1).max(256),
          resourceName: z
            .string()
            .regex(/^people\/[a-zA-Z0-9_-]+$/)
            .max(256),
        })
        .strict()
        .optional(),
      archivedAt: z.union([z.iso.datetime(), timestamp]).nullable().optional(),
    })
    .strict(),
  groups: z
    .object({
      ...base,
      name: text.min(1),
      description: text.optional(),
      color: text.optional(),
      sortOrder: z.number().finite().optional(),
    })
    .strict(),
  relationships: z
    .object({
      ...base,
      fromPersonId: id,
      toPersonId: id,
      label: text.min(1),
      inverseLabel: text.optional(),
      notes: text.optional(),
    })
    .strict(),
  importantDates: z
    .object({
      ...base,
      personId: id,
      title: text.min(1),
      date,
      kind: z.enum(["birthday", "anniversary", "holiday", "custom"]),
      repeatsAnnually: z.boolean(),
      notes: text.optional(),
    })
    .strict(),
  personNotes: z
    .object({
      ...base,
      personId: id,
      body: text,
      title: text.optional(),
      pinned: z.boolean(),
    })
    .strict(),
  memories: z
    .object({
      ...base,
      title: text.min(1),
      peopleIds: z.array(id),
      startDate: timestamp,
      endDate: timestamp.optional(),
      location: text.optional(),
      description: text.optional(),
      tags: z.array(text).optional(),
      photos: z.array(photo).optional(),
    })
    .strict()
    .refine(
      (v) => !v.endDate || v.endDate.milliseconds >= v.startDate.milliseconds,
    ),
  interactions: z
    .object({
      ...base,
      personId: id,
      kind: z.enum(["call", "message", "email", "visit", "event", "other"]),
      occurredAt: timestamp,
      summary: text.optional(),
      notes: text.optional(),
    })
    .strict(),
  reminders: z
    .object({
      ...base,
      title: text.min(1),
      remindAt: timestamp,
      status: z.enum(["scheduled", "sent", "dismissed", "snoozed"]),
      personId: id.optional(),
      importantDateId: id.optional(),
      memoryId: id.optional(),
      notes: text.optional(),
    })
    .strict(),
};
export const portableExportSchema = z
  .object({
    schema: z.literal("keepl.export"),
    version: z.literal(1),
    exportedAt: z.iso.datetime(),
    collections: z
      .object(
        Object.fromEntries(
          Object.entries(portableSchemas).map(([key, schema]) => [
            key,
            z.array(schema),
          ]),
        ),
      )
      .strict(),
  })
  .strict();
