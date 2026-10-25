import { test, expect, type Page } from "@playwright/test";

async function signIn(page: Page, name: string) {
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("load");
  await popup.getByRole("button", { name: /add new account/i }).click();
  await popup.locator("#email-input").fill(`${name}@example.test`);
  await popup.locator("#display-name-input").fill(name);
  await popup.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/home/);
}
async function addPerson(page: Page, name: string) {
  await page.locator('a[href="/people/new"]').first().click();
  await page.getByLabel("First name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/);
  return new URL(page.url()).pathname;
}

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
  await page.locator('a[href="/people"]').first().click();
  await page.locator(`a[href="${first}"]`).first().click();
  await page
    .getByRole("button", { name: "Add relationship", exact: true })
    .click();
  await page
    .locator('select[name="otherPersonId"]')
    .selectOption({ label: "TestBob" });
  await page.locator('input[name="label"]').fill("Friend");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Friend", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Add date", exact: true }).click();
  await page.locator('input[name="title"]').fill("Annual lunch");
  await page.getByLabel("Date", { exact: true }).fill("2030-11-20");
  await page.locator('select[name="reminderPreset"]').selectOption("0");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Annual lunch", { exact: true })).toBeVisible();
  await page.locator('a[href="/upcoming"]').first().click();
  await expect(
    page.getByText("Annual lunch", { exact: true }).first(),
  ).toBeVisible();

  await page.locator('a[href="/memories"]').first().click();
  await page.locator('a[href="/memories/new"]').first().click();
  await page.getByLabel("Title", { exact: true }).fill("Browser memory");
  await page.getByLabel("TestBob", { exact: true }).check();
  await page.getByLabel("Start date", { exact: true }).fill("2026-10-20");
  await page.getByRole("button", { name: "Save memory", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Browser memory", exact: true }),
  ).toBeVisible();

  await page.locator('a[href="/settings"]').first().click();
  await page.locator('a[href="/export"]').click();
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
  expect(JSON.stringify(await before.json())).not.toContain(
    '"stringValue":"Imported"',
  );
  await page
    .getByRole("button", { name: "Import selected", exact: true })
    .click();
  await expect(
    page.getByText("Selected records imported.", { exact: true }),
  ).toBeVisible();
  await page.locator('a[href="/people"]').first().click();
  await expect(
    page.getByRole("heading", { name: "Imported", exact: true }),
  ).toBeVisible();

  await page.locator(`a[href="${second}"]`).first().click();
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
  await page.locator('a[href="/memories"]').first().click();
  await expect(
    page.getByRole("heading", { name: "Browser memory", exact: true }),
  ).toBeVisible();

  await page.locator('a[href="/settings"]').first().click();
  for (const locale of ["pt", "fr", "es", "en"]) {
    await page.locator("#language").selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await page.reload();
    await expect(page.locator("#language")).toHaveValue(locale);
  }
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/login");
  await signIn(page, `${run}-second`);
  await page.locator('a[href="/people"]').first().click();
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
});
