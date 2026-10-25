import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";
import { createTranslator } from "../../src/lib/i18n/translate";

// Keep provider requests intercepted by Playwright; a service worker can bypass
// context.route and send the emulator's fake OAuth token to the real provider.
test.use({ serviceWorkers: "block" });

test("selected contact import, reviewed refresh, session disconnect and localized Settings entry", async ({
  page,
  context,
}) => {
  await context.route(
    /^https:\/\/(unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,
    (route) => route.abort(),
  );
  let updated = false;
  let unavailable = false;
  await context.route("https://people.googleapis.com/v1/**", (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.has("access_token")).toBe(false);
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    const contact = {
      resourceName: "people/test1",
      names: [
        {
          displayName: updated ? "Updated Google name" : "Imported Google name",
          givenName: "Imported",
        },
      ],
      emailAddresses: [
        { value: updated ? "updated@example.test" : "imported@example.test" },
      ],
      birthdays: [{ date: { month: 2, day: 29 } }],
    };
    return route.fulfill({
      status: unavailable ? 404 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        url.pathname.endsWith("/connections")
          ? {
              connections: [
                contact,
                {
                  resourceName: "people/test2",
                  names: [{ displayName: "Unselected contact" }],
                },
                ...Array.from({ length: 25 }, (_, index) => ({
                  resourceName: `people/extra${index}`,
                  names: [{ displayName: `Extra contact ${index}` }],
                })),
              ],
            }
          : contact,
      ),
    });
  });
  const run = `contacts-${Date.now()}`;
  await page.goto("/login");
  await signIn(page, run);
  await page.locator('a[href="/settings"]:visible').first().click();
  await page
    .getByRole("link", { name: "Manage contacts", exact: true })
    .click();
  const popupPromise = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Connect Google Contacts", exact: true })
    .click();
  const popup = await popupPromise;
  await popup.waitForLoadState("load");
  await popup
    .getByText(`${run}@example.test`, { exact: false })
    .first()
    .click();
  await expect(
    page.getByText("Connected for this session.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Browse contacts", exact: true })
    .click();
  await expect(
    page.getByText("Imported Google name", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Import destination").first().selectOption("new");
  await page
    .getByRole("button", { name: "Review selected contacts", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Review Imported Google name",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Review Imported Google name",
      exact: true,
    }),
  ).toBeInViewport();
  await expect(
    page.getByRole("heading", {
      name: "Review Imported Google name",
      exact: true,
    }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Confirm and save this person", exact: true })
    .click();
  await expect(page.getByText("Person saved.", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Already linked to Imported Google name", { exact: true }),
  ).toBeVisible();
  updated = true;
  await page
    .getByRole("button", { name: "Review updates", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Review Updated Google name",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Emails", { exact: false }).check();
  await page
    .getByRole("button", { name: "Confirm and save this person", exact: true })
    .click();
  await expect(page.getByText("Person saved.", { exact: true })).toBeVisible();
  unavailable = true;
  await page
    .getByRole("button", { name: "Review updates", exact: true })
    .click();
  await expect(
    page.getByText(
      "Some contacts are unavailable in Google. Their Keepl records were kept.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Disconnect locally", exact: true })
    .click();
  await expect(
    page.getByText(
      "Disconnected. Reconnect after reloading or when access expires.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.locator('a[href="/people"]:visible').first().click();
  await expect(
    page.getByText("Imported Google name", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Unselected contact", { exact: true }),
  ).toHaveCount(0);
  await page.getByText("Imported Google name", { exact: true }).click();
  await expect(
    page.getByText("updated@example.test", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Imported Google name", exact: true }),
  ).toBeVisible();
  for (const locale of ["pt", "fr", "es", "en"] as const) {
    const t = createTranslator(locale);
    await page.locator('a[href="/settings"]:visible').first().click();
    await page.locator("#language").selectOption(locale);
    await page.locator("#language").press("Tab");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await page
      .getByRole("link", { name: t("contactsSync", "manage"), exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: t("pageHeaders", "contactsTitle"),
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: t("contactsSync", "connect"),
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
