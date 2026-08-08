import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildUpcomingDates, flexibleDateFromInput, getNextAnnualOccurrence } from "@/lib/dates/flexible-date";
import type { ImportantDate, Person } from "@/types";

describe("flexible date utilities", () => {
  it("parses dates without a known year", () => {
    assert.deepEqual(flexibleDateFromInput("2000-03-14", false), {
      month: 3,
      day: 14,
      precision: "month-day",
    });
  });

  it("calculates next annual occurrence after this year's date has passed", () => {
    const next = getNextAnnualOccurrence({ month: 1, day: 10, precision: "month-day" }, new Date(2026, 1, 1));

    assert.equal(next?.getFullYear(), 2027);
    assert.equal(next?.getMonth(), 0);
    assert.equal(next?.getDate(), 10);
  });

  it("groups upcoming dates by relative window", () => {
    const person = makePerson("person-1", "Maria Silva");
    const dates = [
      makeDate("today", "Birthday", { month: 8, day: 8, precision: "month-day" }),
      makeDate("week", "Anniversary", { month: 8, day: 9, precision: "month-day" }),
      makeDate("month", "Name day", { month: 8, day: 30, precision: "month-day" }),
      makeDate("later", "Holiday", { month: 12, day: 1, precision: "month-day" }),
    ];

    const upcoming = buildUpcomingDates(dates, [person], new Date(2026, 7, 8));

    assert.deepEqual(
      upcoming.map((date) => date.group),
      ["today", "this-week", "this-month", "later"],
    );
  });
});

function makeDate(id: string, title: string, date: ImportantDate["date"]): ImportantDate {
  return {
    id,
    ownerId: "owner-1",
    personId: "person-1",
    title,
    date,
    kind: "custom",
    repeatsAnnually: true,
    createdAt: undefined as never,
    updatedAt: undefined as never,
  };
}

function makePerson(id: string, displayName: string): Person {
  return {
    id,
    ownerId: "owner-1",
    displayName,
    firstName: displayName,
    source: "manual",
    createdAt: undefined as never,
    updatedAt: undefined as never,
  };
}
