import { z } from "zod";
import type { Person } from "@/types/person";

export const contactFields = [
  "displayName",
  "firstName",
  "lastName",
  "emails",
  "phoneNumbers",
  "birthday",
] as const;
export type ContactField = (typeof contactFields)[number];
export type ContactValues = Pick<Person, ContactField>;
export type GoogleContact = { resourceName: string; values: ContactValues };

const entry = z.object({
  value: z.string().max(1000),
  type: z.string().optional(),
  metadata: z.object({ primary: z.boolean().optional() }).optional(),
});
const googlePerson = z.object({
  resourceName: z.string().regex(/^people\/[a-zA-Z0-9_-]+$/),
  metadata: z.object({ deleted: z.boolean().optional() }).optional(),
  names: z
    .array(
      z.object({
        displayName: z.string().optional(),
        givenName: z.string().optional(),
        familyName: z.string().optional(),
      }),
    )
    .optional(),
  emailAddresses: z.array(entry).optional(),
  phoneNumbers: z.array(entry).optional(),
  birthdays: z
    .array(
      z.object({
        date: z
          .object({
            year: z.number().int().optional(),
            month: z.number().int(),
            day: z.number().int(),
          })
          .optional(),
      }),
    )
    .optional(),
});

export function mapGoogleContact(input: unknown): GoogleContact | null {
  const p = googlePerson.parse(input);
  if (p.metadata?.deleted) return null;
  const name = p.names?.[0];
  const points = (items: z.infer<typeof entry>[] = []) =>
    items
      .filter((e) => e.value.trim())
      .map((e) => ({
        value: e.value,
        ...(e.type ? { label: e.type } : {}),
        ...(e.metadata?.primary ? { primary: true } : {}),
      }));
  const emails = points(p.emailAddresses);
  const phoneNumbers = points(p.phoneNumbers);
  const displayName =
    name?.displayName?.trim() || emails[0]?.value || phoneNumbers[0]?.value;
  if (!displayName) return null;
  const d = p.birthdays?.find((b) => b.date)?.date;
  const validDate =
    d &&
    (!d.year || (d.year >= 1 && d.year <= 9999)) &&
    d.month >= 1 &&
    d.month <= 12 &&
    d.day >= 1 &&
    d.day <= new Date(Date.UTC(d.year || 2000, d.month, 0)).getUTCDate();
  return {
    resourceName: p.resourceName,
    values: {
      displayName,
      firstName: name?.givenName ?? "",
      lastName: name?.familyName ?? "",
      emails,
      phoneNumbers,
      ...(validDate
        ? {
            birthday: {
              ...(d.year ? { year: d.year } : {}),
              month: d.month,
              day: d.day,
              precision: d.year ? ("full" as const) : ("month-day" as const),
            },
          }
        : {}),
    },
  };
}

export function comparable(value: unknown): string {
  if (value === undefined || value === "") return "";
  if (Array.isArray(value))
    return JSON.stringify(value.map((v) => JSON.parse(comparable(v) || '""')));
  if (value && typeof value === "object")
    return JSON.stringify(
      Object.fromEntries(
        Object.entries(value)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
  return JSON.stringify(value);
}
export function changedFields(person: Person, contact: GoogleContact) {
  return contactFields.filter(
    (field) => comparable(person[field]) !== comparable(contact.values[field]),
  );
}
export function matchingPeople(contact: GoogleContact, people: Person[]) {
  const email = (v: string) => v.trim().toLowerCase();
  const phone = (v: string) => v.replace(/[^0-9]/g, "");
  return people.filter(
    (p) =>
      p.displayName.trim().toLowerCase() ===
        contact.values.displayName.trim().toLowerCase() ||
      p.emails?.some((e) =>
        contact.values.emails?.some((c) => email(c.value) === email(e.value)),
      ) ||
      p.phoneNumbers?.some(
        (e) =>
          phone(e.value).length >= 7 &&
          contact.values.phoneNumbers?.some(
            (c) => phone(c.value) === phone(e.value),
          ),
      ),
  );
}
export async function contactImportId(
  ownerId: string,
  accountId: string,
  resourceName: string,
) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([ownerId, accountId, resourceName]),
    ),
  );
  return (
    "gc-" +
    Array.from(new Uint8Array(bytes), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("")
  );
}
