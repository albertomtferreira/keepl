import { expect, type Page } from "@playwright/test";
export async function signIn(page: Page, name: string) {
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
export async function addPerson(page: Page, name: string) {
  if (!(await page.locator('a[href="/people/new"]:visible').count())) {
    await page.locator('a[href="/people"]:visible').first().click();
  }
  await page.locator('a[href="/people/new"]:visible').first().click();
  await page.getByLabel("First name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/);
  return new URL(page.url()).pathname;
}
