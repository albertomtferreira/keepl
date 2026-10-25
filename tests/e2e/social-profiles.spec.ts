import { test, expect } from "@playwright/test";
import { signIn, addPerson } from "./helpers";

test.use({ serviceWorkers: "block" });

test("social profiles can be added, validated, edited and removed", async ({
  page,
  context,
}) => {
  await context.route(
    /^https:\/\/(unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,
    (route) => route.abort(),
  );
  await page.goto("/login");
  await signIn(page, `social-${Date.now()}`);
  const personPath = await addPerson(page, "SocialPerson");
  await page
    .getByRole("link", { name: "Manage social profiles", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add social profile", exact: true })
    .click();
  const first = page.getByRole("group", {
    name: "Social profile 1",
    exact: true,
  });
  await first.getByLabel("Platform", { exact: true }).fill("Instagram");
  await first.getByLabel("Username or handle", { exact: true }).fill("@alex");
  await first.getByLabel("Profile URL").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(
    page.getByText("Use a complete http:// or https:// profile URL", {
      exact: true,
    }),
  ).toBeVisible();
  await first.getByLabel("Profile URL").fill("https://www.instagram.com/alex/");
  await page
    .getByRole("button", { name: "Add social profile", exact: true })
    .click();
  const second = page.getByRole("group", {
    name: "Social profile 2",
    exact: true,
  });
  await second.getByLabel("Platform", { exact: true }).fill("My community");
  await second
    .getByLabel("Username or handle", { exact: true })
    .fill("Member Alex");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${personPath}$`));
  const link = page.getByRole("link", { name: /Instagram: @alex/ });
  await expect(link).toHaveAttribute("href", "https://www.instagram.com/alex/");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(
    page.getByText("My community: Member Alex", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Manage social profiles", exact: true })
    .click();
  await first
    .getByLabel("Username or handle", { exact: true })
    .fill("@updated");
  await page
    .getByRole("button", { name: "Remove social profile 2", exact: true })
    .click();
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(
    page.getByRole("link", { name: /Instagram: @updated/ }),
  ).toBeVisible();
  await expect(
    page.getByText("My community: Member Alex", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Manage social profiles", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove social profile 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${personPath}$`));
  await expect(
    page.getByText("No social profiles added yet.", { exact: true }),
  ).toBeVisible();
});
