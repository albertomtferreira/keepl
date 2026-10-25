"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { useI18n } from "@/lib/i18n/i18n-context";
import { formatDate } from "@/lib/i18n/format";
import { peopleRepository } from "@/repositories/people";
import type { Person } from "@/types/person";
import {
  clearContactsAccess,
  contactsSnapshot,
  getContactsAccess,
  subscribeContacts,
  type ContactsAccess,
} from "@/services/google/contacts/access";
import {
  connectContacts,
  listContacts,
  refreshContact,
  revokeContacts,
} from "@/services/google/contacts/client";
import {
  changedFields,
  contactFields,
  matchingPeople,
  type GoogleContact,
} from "@/services/google/contacts/model";
import {
  confirmContact,
  type ContactReview,
} from "@/services/google/contacts/write";

export function ContactsClient() {
  const { user } = useAuth();
  const revision = useSyncExternalStore(
    subscribeContacts,
    contactsSnapshot,
    () => 0,
  );
  return user ? (
    <ContactsSession key={`${user.uid}:${revision}`} ownerId={user.uid} />
  ) : null;
}

function ContactsSession({ ownerId }: { ownerId: string }) {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [people, setPeople] = useState<Person[]>([]);
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [nextPage, setNextPage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<ContactReview[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState<"saved" | "unavailable" | "">("");
  const running = useRef(false);
  let access: ContactsAccess | null = null;
  try {
    access = getContactsAccess(ownerId);
  } catch {
    /* Disconnected. */
  }

  useEffect(() => {
    let cancelled = false;
    peopleRepository
      .list(ownerId)
      .then((p) => {
        if (!cancelled) setPeople(p);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  async function run(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(false);
    setNotice("");
    try {
      await action();
    } catch {
      setError(true);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function browse(more = false) {
    const [page, owned] = await Promise.all([
      listContacts(ownerId, more ? nextPage : ""),
      peopleRepository.list(ownerId),
    ]);
    setPeople(owned);
    setContacts((previous) =>
      more
        ? [
            ...previous,
            ...page.contacts.filter(
              (c) => !previous.some((p) => p.resourceName === c.resourceName),
            ),
          ]
        : page.contacts,
    );
    setNextPage(page.nextPageToken);
    setLoaded(true);
    setReviews([]);
    if (!more) setSelected({});
  }
  const accountId = access?.accountId;
  const linked = people.filter(
    (p) => !p.archivedAt && p.googleContact?.accountId === accountId,
  );
  const linkedPerson = (contact: GoogleContact) =>
    people.find(
      (p) =>
        p.googleContact &&
        p.googleContact.accountId === accountId &&
        p.googleContact.resourceName === contact.resourceName,
    );

  async function refresh(targets: Person[]) {
    const owned = await peopleRepository.list(ownerId);
    const pending: ContactReview[] = [];
    let missing = false;
    for (const target of targets) {
      const current = owned.find((p) => p.id === target.id);
      if (
        !current?.googleContact ||
        current.archivedAt ||
        current.googleContact.accountId !== accountId
      )
        continue;
      const result = await refreshContact(
        ownerId,
        current.googleContact.resourceName,
      );
      if (!result.contact) {
        missing = true;
        continue;
      }
      pending.push({ contact: result.contact, target: current, fields: [] });
    }
    setPeople(owned);
    setReviews(pending);
    if (missing) setNotice("unavailable");
  }
  function prepareImport() {
    const used = new Set<string>();
    const pending: ContactReview[] = [];
    for (const contact of contacts) {
      const choice = selected[contact.resourceName];
      if (!choice || linkedPerson(contact)) continue;
      const target =
        choice === "new" ? null : (people.find((p) => p.id === choice) ?? null);
      if (
        (choice !== "new" && !target) ||
        (target && (target.googleContact || used.has(target.id)))
      ) {
        setError(true);
        return;
      }
      if (target) used.add(target.id);
      pending.push({
        contact,
        target,
        fields: target ? [] : [...contactFields],
      });
    }
    setError(false);
    setReviews(pending);
  }
  const review = reviews[0];
  const fieldLabel = (field: (typeof contactFields)[number]) =>
    t("contactsSync", field);
  function display(value: unknown): string {
    if (
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && !value.length)
    )
      return t("contactsSync", "emptyValue");
    if (Array.isArray(value))
      return value
        .map((v) => `${v.value}${v.label ? ` (${v.label})` : ""}`)
        .join(", ");
    if (typeof value === "object" && value) {
      const d = value as { year?: number; month?: number; day?: number };
      const date = new Date(0);
      date.setUTCFullYear(d.year ?? 2000, (d.month ?? 1) - 1, d.day ?? 1);
      return formatDate(date, locale, {
        ...(d.month ? { month: "long" as const } : {}),
        ...(d.day ? { day: "numeric" as const } : {}),
        ...(d.year ? { year: "numeric" as const } : {}),
        timeZone: "UTC",
      });
    }
    return String(value);
  }

  return (
    <section className="space-y-5" aria-busy={busy}>
      <p className="text-sm text-muted-foreground">
        {t("contactsSync", "intro")}
      </p>
      <p role="status" className="text-sm">
        {t("contactsSync", access ? "connected" : "disconnected")}
      </p>
      <div className="flex flex-wrap gap-2">
        {!access ? (
          <Button
            disabled={busy}
            onClick={() =>
              run(async () => {
                if (user) await connectContacts(user);
              })
            }
          >
            {t("contactsSync", "connect")}
          </Button>
        ) : (
          <>
            <Button disabled={busy} onClick={() => run(() => browse())}>
              {t("contactsSync", "browse")}
            </Button>
            <Button
              variant="outline"
              disabled={busy || !linked.length}
              onClick={() => run(() => refresh(linked))}
            >
              {t("contactsSync", "refreshAll")}
            </Button>
            <Button variant="outline" onClick={clearContactsAccess}>
              {t("contactsSync", "disconnect")}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await revokeContacts(ownerId);
                })
              }
            >
              {t("contactsSync", "revoke")}
            </Button>
          </>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {t("contactsSync", "disconnectHelp")}
      </p>
      {busy ? <p role="status">{t("contactsSync", "working")}</p> : null}
      {error ? (
        <p role="alert" className="text-destructive">
          {t("contactsSync", "error")}
        </p>
      ) : null}
      {notice ? <p role="status">{t("contactsSync", notice)}</p> : null}

      {review ? (
        <div className="space-y-4 rounded-lg border p-4">
          <h2 className="font-semibold">
            {t("contactsSync", "reviewTitle", {
              name: review.contact.values.displayName,
            })}
          </h2>
          <p>
            {t("contactsSync", review.target ? "reviewExisting" : "reviewNew")}
          </p>
          <p className="text-sm">
            {t("contactsSync", "remaining", { count: reviews.length })}
          </p>
          {(review.target
            ? changedFields(review.target, review.contact)
            : contactFields
          ).map((field) => (
            <label
              key={field}
              className="flex items-start gap-3 rounded border p-3"
            >
              <input
                type="checkbox"
                className="mt-1"
                disabled={busy || (!review.target && field === "displayName")}
                checked={
                  review.fields.includes(field) ||
                  (!review.target && field === "displayName")
                }
                onChange={(e) => {
                  const checked = e.target.checked;
                  setReviews((previous) => [
                    {
                      ...previous[0],
                      fields: checked
                        ? [...previous[0].fields, field]
                        : previous[0].fields.filter((f) => f !== field),
                    },
                    ...previous.slice(1),
                  ]);
                }}
              />
              <span className="min-w-0 break-words">
                <strong>{fieldLabel(field)}</strong>
                <span className="block text-sm">
                  {t("contactsSync", "current")}:{" "}
                  {display(review.target?.[field])}
                </span>
                <span className="block text-sm">
                  {t("contactsSync", "google")}:{" "}
                  {display(review.contact.values[field])}
                </span>
              </span>
            </label>
          ))}
          {review.target &&
          !changedFields(review.target, review.contact).length ? (
            <p>{t("contactsSync", "noChanges")}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || !access}
              onClick={() =>
                run(async () => {
                  const currentAccess = getContactsAccess(ownerId);
                  // Recheck the owner-scoped link list before claiming a restored/manual person.
                  const owned = await peopleRepository.list(ownerId);
                  const already = owned.find(
                    (p) =>
                      p.googleContact?.accountId === currentAccess.accountId &&
                      p.googleContact.resourceName ===
                        review.contact.resourceName,
                  );
                  if (already && already.id !== review.target?.id)
                    throw new Error("contacts-linked");
                  await confirmContact(currentAccess, review);
                  setPeople(await peopleRepository.list(ownerId));
                  setReviews((previous) => previous.slice(1));
                  setSelected((previous) => {
                    const copy = { ...previous };
                    delete copy[review.contact.resourceName];
                    return copy;
                  });
                  setNotice("saved");
                })
              }
            >
              {t("contactsSync", "confirm")}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setReviews((previous) => previous.slice(1))}
            >
              {t("contactsSync", "skip")}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setReviews([])}
            >
              {t("contactsSync", "cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {access && linked.length ? (
        <div className="space-y-2">
          <h2 className="font-semibold">{t("contactsSync", "linked")}</h2>
          {linked.map((person) => (
            <div
              key={person.id}
              className="flex items-center justify-between gap-3 rounded border p-3"
            >
              <span className="min-w-0 break-words">{person.displayName}</span>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => run(() => refresh([person]))}
              >
                {t("contactsSync", "refresh")}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      {access && loaded ? (
        <div className="space-y-3">
          <label className="block">
            {t("contactsSync", "search")}
            <input
              className="mt-1 block w-full rounded border p-2"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <p className="text-sm text-muted-foreground">
            {t("contactsSync", "searchHelp")}
          </p>
          {!contacts.length ? <p>{t("contactsSync", "empty")}</p> : null}
          {contacts
            .filter((c) =>
              JSON.stringify(c.values)
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((contact) => {
              const linkedTo = linkedPerson(contact);
              const candidates = matchingPeople(contact, people).filter(
                (p) => !p.googleContact && !p.archivedAt,
              );
              return (
                <div
                  key={contact.resourceName}
                  className="space-y-2 rounded border p-3"
                >
                  <p className="font-medium break-words">
                    {contact.values.displayName}
                  </p>
                  <p className="text-sm break-words">
                    {[
                      ...(contact.values.emails ?? []),
                      ...(contact.values.phoneNumbers ?? []),
                    ]
                      .map((v) => v.value)
                      .join(", ")}
                  </p>
                  {linkedTo ? (
                    <p>
                      {t("contactsSync", "alreadyLinked", {
                        name: linkedTo.displayName,
                      })}
                    </p>
                  ) : (
                    <label className="block text-sm">
                      {t("contactsSync", "destination")}
                      <select
                        className="mt-1 block w-full rounded border p-2"
                        disabled={busy}
                        value={selected[contact.resourceName] ?? ""}
                        onChange={(e) =>
                          setSelected((previous) => ({
                            ...previous,
                            [contact.resourceName]: e.target.value,
                          }))
                        }
                      >
                        <option value="">{t("contactsSync", "skip")}</option>
                        <option value="new">
                          {t("contactsSync", "createNew")}
                        </option>
                        {candidates.map((p) => (
                          <option key={p.id} value={p.id}>
                            {t("contactsSync", "match", {
                              name: p.displayName,
                            })}
                          </option>
                        ))}
                        {people
                          .filter(
                            (p) =>
                              !p.googleContact &&
                              !p.archivedAt &&
                              !candidates.some((c) => c.id === p.id),
                          )
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {t("contactsSync", "linkTo", {
                                name: p.displayName,
                              })}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                </div>
              );
            })}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || !Object.values(selected).some(Boolean)}
              onClick={prepareImport}
            >
              {t("contactsSync", "reviewSelected")}
            </Button>
            {nextPage ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => run(() => browse(true))}
              >
                {t("contactsSync", "loadMore")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
