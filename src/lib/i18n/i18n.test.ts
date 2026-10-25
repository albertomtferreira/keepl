import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";
import { supportedLocales, normalizeLocale } from "./config";
import { createTranslator, interpolate, messages } from "./translate";
import { readDeviceLocale, persistDeviceLocale } from "./locale-storage";
import { formatDate, formatRelativeTime } from "./format";
import { formatFlexibleDate } from "@/lib/dates/flexible-date";
import { formatMemoryDate } from "@/features/memories/memory-format";
import { formatLastInteraction } from "@/features/interactions/interaction-format";
import { buildUpcomingItems } from "@/features/important-dates/upcoming-items";
import { createPersonSchema } from "@/features/people/person-validation";
import { createMemorySchema } from "@/features/memories/validation";
import { createNoteSchema } from "@/features/notes/validation";
import { createDateSchema } from "@/features/important-dates/validation";
import { createRelationshipSchema } from "@/features/relationships/validation";
import { getRelationshipLabelFromPerspective } from "@/features/relationships/relationship-labels";
import { searchLocalRecords } from "@/lib/search/local-search";
import type { Person } from "@/types";

const tokens = (value: string) =>
  [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
for (const locale of supportedLocales) {
  test(`${locale}: exact message and interpolation parity`, () => {
    const localized = messages[locale];
    assert.deepEqual(
      Object.keys(localized).sort(),
      Object.keys(messages.en).sort(),
    );
    for (const namespace of Object.keys(
      messages.en,
    ) as (keyof typeof messages.en)[]) {
      assert.deepEqual(
        Object.keys(localized[namespace]).sort(),
        Object.keys(messages.en[namespace]).sort(),
      );
      for (const key of Object.keys(messages.en[namespace])) {
        const text = (localized[namespace] as Record<string, string>)[key];
        assert.ok(text.trim(), `${namespace}.${key}`);
        assert.doesNotMatch(
          text,
          /[\p{L}]\?[\p{L}]|\uFFFD/u,
          `${namespace}.${key}: invalid encoding`,
        );
        assert.deepEqual(
          tokens(text),
          tokens((messages.en[namespace] as Record<string, string>)[key]),
          `${namespace}.${key}`,
        );
      }
    }
  });

  test(`${locale}: translated core validation and preserved authored values`, () => {
    const t = createTranslator(locale);
    const cases = [
      [
        createPersonSchema({
          firstNameRequired: t("personForm", "validationFirstName"),
          validEmail: t("personForm", "validationEmail"),
        }),
        { firstName: "", email: "" },
        t("personForm", "validationFirstName"),
      ],
      [
        createMemorySchema({
          titleRequired: t("memoryForm", "validationTitle"),
          startDateRequired: t("memoryForm", "validationStartDate"),
          endDateAfterStart: t("memoryForm", "validationEndDate"),
        }),
        { title: "", startDate: "2026-10-25" },
        t("memoryForm", "validationTitle"),
      ],
      [
        createNoteSchema({ validationBody: t("notes", "validationBody") }),
        { body: "", pinned: false },
        t("notes", "validationBody"),
      ],
      [
        createDateSchema({
          validationTitle: t("importantDates", "validationTitle"),
          validationDate: t("importantDates", "validationDate"),
        }),
        {
          title: "",
          date: "2026-10-25",
          includeYear: false,
          kind: "custom",
          repeatsAnnually: true,
          reminderPreset: "none",
        },
        t("importantDates", "validationTitle"),
      ],
      [
        createRelationshipSchema({
          validationPerson: t("relationships", "validationPerson"),
          validationLabel: t("relationships", "validationLabel"),
        }),
        { otherPersonId: "", label: "Friend" },
        t("relationships", "validationPerson"),
      ],
    ] as const;
    for (const [schema, input, message] of cases) {
      const result = schema.safeParse(input);
      assert.equal(result.success, false);
      if (!result.success)
        assert.equal(result.error.issues[0].message, message);
    }
    const note = {
      body: "My own words / mes mots / minhas palavras",
      title: "Birthday",
      pinned: true,
    };
    assert.deepEqual(
      createNoteSchema({ validationBody: t("notes", "validationBody") }).parse(
        note,
      ),
      note,
    );
    const relationship = {
      otherPersonId: "someone",
      label: "Friend",
      inverseLabel: "Família",
      notes: "User words",
    };
    assert.deepEqual(
      createRelationshipSchema({
        validationPerson: t("relationships", "validationPerson"),
        validationLabel: t("relationships", "validationLabel"),
      }).parse(relationship),
      relationship,
    );
  });

  test(`${locale}: dates, birthdays, relative labels and search chrome`, () => {
    const t = createTranslator(locale);
    const date = new Date(2026, 9, 25, 12);
    assert.equal(
      formatDate(date, locale),
      new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date),
    );
    assert.equal(
      formatRelativeTime(1, locale),
      new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(1, "day"),
    );
    assert.equal(
      formatFlexibleDate(undefined, locale),
      t("dates", "dateNotSet"),
    );
    assert.equal(
      formatMemoryDate({} as Parameters<typeof formatMemoryDate>[0], locale),
      t("dates", "noDate"),
    );
    const interaction = {
      occurredAt: Timestamp.fromDate(new Date(Date.now() - 3 * 86400000)),
    };
    const relative = formatLastInteraction(interaction, locale);
    assert.ok(relative.length);
    if (locale !== "en")
      assert.notEqual(relative, formatLastInteraction(interaction, "en"));
    const person = {
      id: "p",
      ownerId: "owner",
      firstName: "Birthday",
      displayName: "Birthday",
      birthday: { month: 10, day: 25, precision: "month-day" },
    } as Person;
    const before = JSON.stringify(person);
    const items = buildUpcomingItems([], [person], date, locale);
    assert.equal(items[0].title, t("personProfile", "birthday"));
    const results = searchLocalRecords(
      {
        people: [person],
        notes: [
          {
            id: "n",
            personId: "p",
            body: "Unchanged words",
            pinned: false,
          } as never,
        ],
        memories: [],
        importantDates: [],
        interactions: [],
        groups: [],
      },
      "Unchanged",
      "notes",
      t,
    );
    assert.equal(
      results[0].subtitle,
      t("searchResults", "noteAbout", { name: person.displayName }),
    );
    assert.equal(results[0].title, "Unchanged words");
    assert.equal(JSON.stringify(person), before);
    const relationship = {
      fromPersonId: "p",
      toPersonId: "other",
      label: "parent",
    } as Parameters<typeof getRelationshipLabelFromPerspective>[0];
    assert.equal(
      getRelationshipLabelFromPerspective(relationship, "p", locale),
      "parent",
    );
    assert.equal(
      getRelationshipLabelFromPerspective(relationship, "other", locale),
      t("relationshipInverses", "child"),
    );
    assert.equal(
      getRelationshipLabelFromPerspective(
        { ...relationship, inverseLabel: "My words" },
        "other",
        locale,
      ),
      "My words",
    );
  });
}

test("locale normalization and safe device persistence", () => {
  assert.equal(normalizeLocale("pt-BR"), "pt");
  assert.equal(normalizeLocale("FR-fr"), "fr");
  assert.equal(normalizeLocale("de"), "en");
  assert.equal(normalizeLocale(null), "en");
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  const data = new Map<string, string>();
  try {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => data.get(key) ?? null,
          setItem: (key: string, value: string) => data.set(key, value),
        },
      },
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { language: "fr-FR" },
    });
    assert.equal(readDeviceLocale(), "fr");
    for (const locale of supportedLocales) {
      persistDeviceLocale(locale);
      assert.equal(readDeviceLocale(), locale);
    }
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      get() {
        throw new Error("storage disabled");
      },
    });
    assert.doesNotThrow(() => persistDeviceLocale("es"));
    assert.equal(readDeviceLocale(), "fr");
  } finally {
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalNavigator)
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});

test("fallback and interpolation are predictable and do not recursively substitute user text", () => {
  assert.equal(
    interpolate("{name} / {count} / {name}", { name: "{count}", count: 2 }),
    "{count} / 2 / {count}",
  );
  const original = messages.fr.common.close;
  try {
    Reflect.deleteProperty(messages.fr.common, "close");
    assert.equal(
      createTranslator("fr")("common", "close"),
      messages.en.common.close,
    );
  } finally {
    messages.fr.common.close = original;
  }
});
