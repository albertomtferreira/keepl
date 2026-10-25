import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.use({ serviceWorkers: "block", timezoneId: "Europe/London" });

test("Home and Upcoming show in-app reminders on the day and seven days before", async ({
  page,
  context,
}) => {
  await context.route(
    /^https:\/\/(unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,
    (route) => route.abort(),
  );
  await page.goto("/login");
  await signIn(page, `reminders-${Date.now()}`);
  const birthdays = await page.evaluate(() =>
    [0, 6, 7, 8].map((offset) => {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      return `2000-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }),
  );
  const names = ["TodayPerson", "SixDays", "SevenDays", "EightDays"];
  for (let index = 0; index < names.length; index++) {
    await page.locator('a[href="/people"]:visible').first().click();
    await page.locator('a[href="/people/new"]:visible').first().click();
    await page.getByLabel("First name", { exact: true }).fill(names[index]);
    await page.getByLabel("Birthday", { exact: true }).fill(birthdays[index]);
    await page
      .getByRole("button", { name: "Save person", exact: true })
      .click();
    await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/);
  }
  for (const route of ["home", "upcoming"]) {
    await page.locator(`a[href="/${route}"]:visible`).first().click();
    const reminders = page.getByRole("region", {
      name: "Reminders for today",
      exact: true,
    });
    await expect(
      reminders.getByText("TodayPerson", { exact: true }),
    ).toBeVisible();
    await expect(
      reminders.getByText("SevenDays", { exact: true }),
    ).toBeVisible();
    await expect(reminders.getByText("SixDays", { exact: true })).toHaveCount(
      0,
    );
    await expect(reminders.getByText("EightDays", { exact: true })).toHaveCount(
      0,
    );
    await expect(reminders.getByRole("link")).toHaveCount(2);
  }
});
