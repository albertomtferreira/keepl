import { test, expect } from "@playwright/test";

import { readFile } from "node:fs/promises";
import { signIn, addPerson } from "./helpers";
import { createTranslator } from "../../src/lib/i18n/translate";

test("protected routes, sign-in, writes, import confirmation, locales and account isolation", async ({
  page,
  request,
  context,
}) => {
  // Emulator widget cosmetics are optional; do not wait on their CDNs.
  await context.route(
    /^https:\/\/(unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,
    (route) => route.abort(),
  );
  const run = `browser-${Date.now()}`;
  await page.goto("/people");
  await expect(page).toHaveURL(/\/login\?next=/);
  // Return to the default destination so the sign-in helper can assert navigation.
  await page.goto("/login");
  await signIn(page, run);
  const first = await addPerson(page, "TestAlice");
  const second = await addPerson(page, "TestBob");
  await page.locator(`a[href="${second}/edit"]:visible`).first().click();
  await page
    .getByPlaceholder("New group name", { exact: true })
    .fill("Release group");
  await page.getByRole("button", { name: "Add group", exact: true }).click();
  await expect(page.getByLabel("Release group", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(second + "$"));
  await page.locator('a[href="/people"]:visible').first().click();
  await page.locator(`a[href="${first}"]:visible`).first().click();
  await page
    .getByRole("button", { name: "Add relationship", exact: true })
    .click();
  await page
    .locator('select[name="otherPersonId"]')
    .selectOption({ label: "TestBob" });
  await page.locator('input[name="label"]').fill("Friend");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Friend", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Release note");
  await page
    .getByLabel("Note", { exact: true })
    .fill("Enjoys walking by the river");
  await page.getByLabel("Pin note", { exact: true }).check();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText("Enjoys walking by the river", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("A quick note", { exact: true })
    .fill("Release interaction");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(
    page.getByText("Release interaction", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add date", exact: true }).click();
  await page.locator('input[name="title"]').fill("Annual lunch");
  await page.getByLabel("Date", { exact: true }).fill("2030-11-20");
  await page.locator('select[name="reminderPreset"]').selectOption("0");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Annual lunch", { exact: true })).toBeVisible();
  await page.locator('a[href="/upcoming"]:visible').first().click();
  await expect(
    page.getByText("Annual lunch", { exact: true }).first(),
  ).toBeVisible();

  await page.locator('a[href="/memories"]:visible').first().click();
  await page.locator('a[href="/memories/new"]:visible').first().click();
  await page.getByLabel("Title", { exact: true }).fill("Browser memory");
  await page.getByLabel("TestBob", { exact: true }).check();
  await page.getByLabel("TestAlice", { exact: true }).check();
  await page.getByLabel("Start date", { exact: true }).fill("2026-10-20");
  await page.getByRole("button", { name: "Save memory", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Browser memory", exact: true }),
  ).toBeVisible();

  const memoryPath = new URL(page.url()).pathname;
  await page.locator(`a[href="${memoryPath}/edit"]:visible`).click();
  await page
    .getByLabel("Description", { exact: true })
    .fill("Release memory edited");
  await page.getByRole("button", { name: "Save memory", exact: true }).click();
  await expect(
    page.getByText("Release memory edited", { exact: true }),
  ).toBeVisible();
  await page.locator('a[href="/search"]:visible').first().click();
  await page
    .getByPlaceholder("Search names, notes, memories, dates, groups...")
    .fill("river");
  await expect(
    page.getByRole("heading", { name: "Release note", exact: true }),
  ).toBeVisible();
  await page.locator('a[href="/graph"]:visible').first().click();
  await expect(
    page.getByRole("heading", { name: "Relationship list", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Friend", { exact: true }).first()).toBeVisible();
  await page.locator('a[href="/settings"]:visible').first().click();
  await page.locator('a[href="/export"]:visible').click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download JSON", exact: true })
    .click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
  for (const records of Object.values(exported.collections) as Array<
    Array<Record<string, unknown>>
  >) {
    expect(records.length).toBeGreaterThan(0);
    for (const record of records) expect(record).not.toHaveProperty("ownerId");
  }
  expect(JSON.stringify(exported)).not.toContain("accessToken");
  const backup = {
    schema: "keepl.export",
    version: 1,
    exportedAt: new Date().toISOString(),
    collections: {
      people: [
        {
          id: "import-person",
          firstName: "Imported",
          displayName: "Imported",
          source: "manual",
          createdAt: { __type: "timestamp", milliseconds: 1 },
          updatedAt: { __type: "timestamp", milliseconds: 1 },
        },
      ],
      groups: [],
      relationships: [],
      importantDates: [],
      personNotes: [],
      memories: [],
      interactions: [],
      reminders: [],
    },
  };
  await page.locator('input[type="file"]').setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("heading", { name: "Import preview", exact: true }),
  ).toBeVisible();
  // Emulator REST inspection observes the real backend without changing browser auth.
  const before = await request.get(
    "http://127.0.0.1:8080/v1/projects/demo-keepl/databases/(default)/documents/people",
    { headers: { Authorization: "Bearer owner" } },
  );
  expect(before.ok()).toBeTruthy();
  const sourcePerson = await request.get(
    `http://127.0.0.1:8080/v1/projects/demo-keepl/databases/(default)/documents${first}`,
    { headers: { Authorization: "Bearer owner" } },
  );
  expect(sourcePerson.ok()).toBeTruthy();
  const ownerId = (await sourcePerson.json()).fields.ownerId.stringValue;
  const ownedBefore = (await before.json()).documents.filter(
    (record: { fields: { ownerId: { stringValue: string } } }) =>
      record.fields.ownerId.stringValue === ownerId,
  );
  expect(ownedBefore.length).toBeGreaterThan(0);
  expect(
    ownedBefore.some(
      (record: { fields: { displayName: { stringValue: string } } }) =>
        record.fields.displayName.stringValue === "Imported",
    ),
  ).toBe(false);

  await page
    .getByRole("button", { name: "Import selected", exact: true })
    .click();
  await expect(
    page.getByText("Selected records imported.", { exact: true }),
  ).toBeVisible();
  await page.locator('a[href="/people"]:visible').first().click();
  await expect(
    page.getByRole("heading", { name: "Imported", exact: true }),
  ).toBeVisible();

  await page.locator(`a[href="${second}"]:visible`).first().click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Review changes", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirm reviewed changes", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm reviewed changes", exact: true })
    .click();
  await expect(page).toHaveURL(/\/people$/);
  await expect(
    page.getByRole("heading", { name: "TestBob", exact: true }),
  ).toHaveCount(0);
  await page.locator('a[href="/memories"]:visible').first().click();
  await expect(
    page.getByRole("heading", { name: "Browser memory", exact: true }),
  ).toBeVisible();

  await page.locator('a[href="/settings"]:visible').first().click();
  await page.locator('a[href="/people"]:visible').first().click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Archive TestAlice", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "TestAlice", exact: true }),
  ).toHaveCount(0);
  await page.locator('a[href="/settings"]:visible').first().click();
  for (const locale of ["pt", "fr", "es", "en"] as const) {
    await page.locator("#language").selectOption(locale);
    await page.locator("#language").press("Tab");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    // Verify the actual saved preference, not a transient confirmation label.
    await expect
      .poll(async () => {
        const response = await request.get(
          `http://127.0.0.1:8080/v1/projects/demo-keepl/databases/(default)/documents/users/${ownerId}`,
          { headers: { Authorization: "Bearer owner" } },
        );
        return (await response.json()).fields?.locale?.stringValue;
      })
      .toBe(locale);
    await page.reload();
    await expect(page.locator("#language")).toHaveValue(locale);
    // WebKit can restore a native select before React has restored its locale.
    // Wait for translated UI, not only the select's browser-restored value.
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(
      page.getByRole("heading", {
        name: createTranslator(locale)("pageHeaders", "settingsTitle"),
        exact: true,
      }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/login");
  await signIn(page, `${run}-second`);
  await page.locator('a[href="/people"]:visible').first().click();
  await expect(
    page.getByRole("heading", { name: "Add your first person", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "TestAlice", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Imported", exact: true }),
  ).toHaveCount(0);
  await page.goto(first);
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "TestAlice", exact: true }),
  ).toHaveCount(0);
  await page.locator('a[href="/settings"]:visible').first().click();
  await page.locator('a[href="/export"]:visible').click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "release-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await expect(
    page.getByRole("heading", { name: "Import preview", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Import selected", exact: true })
    .click();
  await expect(
    page.getByText("Selected records imported.", { exact: true }),
  ).toBeVisible();
  await page.locator('a[href="/people"]:visible').first().click();
  await expect(
    page.getByRole("heading", { name: "TestAlice", exact: true }),
  ).toBeVisible();
  await page.locator('a[href="/memories"]:visible').first().click();
  await page
    .getByRole("heading", { name: "Browser memory", exact: true })
    .click();
  await expect(
    page.getByText("Release memory edited", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "TestAlice", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "TestBob", exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).pathname).not.toBe(memoryPath);
});
