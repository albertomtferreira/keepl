import assert from "node:assert/strict";
import { test } from "node:test";
import { flexibleDateFromInput, flexibleDateInputValue } from "./flexible-date";
import {
  birthdayInputValue,
  parseBirthdayInput,
} from "@/features/people/person-format";
import { createPersonSchema } from "@/features/people/person-validation";
import { createDateSchema } from "@/features/important-dates/validation";

test("unknown birthday years survive editing without becoming 2000", () => {
  const birthday = { month: 2, day: 29, precision: "month-day" as const };
  assert.equal(birthdayInputValue(birthday), "-02-29");
  assert.deepEqual(
    parseBirthdayInput(birthdayInputValue(birthday), false),
    birthday,
  );
  assert.deepEqual(
    flexibleDateFromInput(flexibleDateInputValue(birthday), false),
    birthday,
  );
  assert.deepEqual(parseBirthdayInput("1984-2-29", false), birthday);
  assert.deepEqual(parseBirthdayInput("1984-2-29", true), {
    ...birthday,
    year: 1984,
    precision: "full",
  });
});

test("optional years validate real calendar dates including leap days", () => {
  for (const value of [
    "-2-30",
    "-4-31",
    "-13-1",
    "-1-0",
    "2025-2-29",
    "1900-2-29",
    "0-1-1",
    "-2-",
    "garbage",
  ]) {
    assert.equal(
      flexibleDateFromInput(value, Boolean(value.split("-")[0])),
      undefined,
      value,
    );
  }
  assert.ok(flexibleDateFromInput("-2-29", false));
  assert.ok(flexibleDateFromInput("2000-2-29", true));
  assert.equal(flexibleDateFromInput("-2-29", true), undefined);
});

test("both forms return localized calendar validation errors", () => {
  const person = createPersonSchema({
    firstNameRequired: "name",
    validEmail: "email",
    validBirthday: "translated date",
  });
  const result = person.safeParse({
    firstName: "Ana",
    email: "",
    birthday: "2025-2-29",
    includeBirthdayYear: true,
  });
  assert.equal(result.success, false);
  if (!result.success)
    assert.equal(result.error.issues[0].message, "translated date");
  assert.ok(
    person.safeParse({
      firstName: "Ana",
      email: "",
      birthday: "2025-2-29",
      includeBirthdayYear: false,
    }).success,
  );
  const date = createDateSchema({
    validationTitle: "title",
    validationDate: "translated date",
  });
  const values = {
    title: "Birthday",
    date: "-2-29",
    includeYear: false,
    kind: "birthday",
    repeatsAnnually: true,
    reminderPreset: "none",
  };
  assert.ok(date.safeParse(values).success);
  assert.equal(date.safeParse({ ...values, includeYear: true }).success, false);
});
