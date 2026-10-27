import assert from "node:assert/strict";
import { test } from "node:test";
import { Timestamp } from "firebase/firestore";
import {
  buildDueDateReminders as dueReminders,
  buildUpcomingItems,
} from "./upcoming-items";
import type { ImportantDate, Person } from "@/types";

import {
  defaultReminderSettings,
  reminderSettingsSchema,
} from "./reminder-settings";
const legacySettings = structuredClone(defaultReminderSettings);
for (const rules of Object.values(legacySettings)) {
  rules[0].time = "00:00";
  rules[1].enabled = true;
  rules[1].time = "00:00";
}
const buildDueDateReminders = (items: Parameters<typeof dueReminders>[0]) =>
  dueReminders(items, legacySettings, new Date(2026, 0, 1, 12));

const stamp = Timestamp.fromMillis(0);
const base = { ownerId: "owner", createdAt: stamp, updatedAt: stamp };
const person = (id: string, month: number, day: number): Person => ({
  ...base,
  id,
  source: "google-contacts",
  displayName: id,
  birthday: { month, day, precision: "month-day" },
});

test("in-app reminders appear exactly on the day and seven calendar days before, without a three-item limit", () => {
  const people = [
    person("today", 12, 25),
    person("tomorrow", 12, 26),
    person("six", 12, 31),
    person("seven", 1, 1),
    person("eight", 1, 2),
  ];
  const from = new Date(2026, 11, 25, 17, 30);
  const due = buildDueDateReminders(buildUpcomingItems([], people, from, "en"));
  assert.deepEqual(
    due.map((i) => [i.person.id, i.daysUntil]),
    [
      ["today", 0],
      ["seven", 7],
    ],
  );
  assert.equal(
    buildDueDateReminders(
      buildUpcomingItems([], [person("past", 12, 24)], from),
    ).length,
    0,
  );
  assert.equal(
    buildDueDateReminders(
      buildUpcomingItems(
        [],
        [0, 1, 2, 3, 4].map((index) => person(`today-${index}`, 12, 25)),
        from,
      ),
    ).length,
    5,
  );
});

test("important dates follow the same schedule and exclude foreign, archived and deleted sources", () => {
  const p = person("person", 2, 1);
  const date: ImportantDate = {
    ...base,
    id: "date",
    personId: p.id,
    kind: "anniversary",
    title: "Anniversary",
    repeatsAnnually: true,
    date: { month: 10, day: 25, precision: "month-day" },
  };
  assert.equal(
    buildDueDateReminders(
      buildUpcomingItems([date], [p], new Date(2026, 9, 18, 12)),
    ).length,
    1,
  );
  assert.equal(
    buildDueDateReminders(
      buildUpcomingItems([date], [p], new Date(2026, 9, 25, 23)),
    ).length,
    1,
  );
  assert.equal(
    buildDueDateReminders(
      buildUpcomingItems([date], [p], new Date(2026, 9, 19)),
    ).length,
    0,
  );
  for (const unavailable of [
    { ...p, ownerId: "other" },
    { ...p, archivedAt: new Date() },
    { ...p, deletionPending: true },
  ]) {
    assert.equal(
      buildDueDateReminders(
        buildUpcomingItems([date], [unavailable], new Date(2026, 9, 25)),
      ).length,
      0,
    );
  }
});

test("seven-day reminders survive the London daylight-saving transition", () => {
  const previous = process.env.TZ;
  process.env.TZ = "Europe/London";
  try {
    const due = buildDueDateReminders(
      buildUpcomingItems(
        [],
        [person("next-week", 11, 1)],
        new Date(2026, 9, 25, 0, 1),
      ),
    );
    assert.equal(due.length, 1);
    assert.equal(due[0].daysUntil, 7);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("selected category, offsets and independent times control visibility", () => {
  const now = new Date(2026, 9, 25, 7, 59);
  const items = buildUpcomingItems(
    [],
    [person("today", 10, 25), person("tomorrow", 10, 26)],
    now,
  );
  const settings = structuredClone(defaultReminderSettings);
  assert.equal(dueReminders(items, settings, now).length, 0);
  now.setHours(8, 0);
  assert.deepEqual(
    dueReminders(items, settings, now).map((i) => i.person.id),
    ["today"],
  );
  settings.birthday[1] = { enabled: true, daysBefore: 1, time: "09:30" };
  assert.equal(dueReminders(items, settings, now).length, 1);
  now.setHours(9, 30);
  assert.equal(dueReminders(items, settings, now).length, 2);
  settings.birthday[0].enabled = false;
  settings.birthday[1].enabled = false;
  assert.equal(dueReminders(items, settings, now).length, 0);
  assert.equal(
    reminderSettingsSchema.safeParse({
      ...settings,
      birthday: [{ enabled: true, daysBefore: 2, time: "25:00" }],
    }).success,
    false,
  );
});
