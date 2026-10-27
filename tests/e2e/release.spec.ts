import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signIn, addPerson } from "./helpers";
import en from "../../src/lib/i18n/messages/en.json";
import pt from "../../src/lib/i18n/messages/pt.json";
import fr from "../../src/lib/i18n/messages/fr.json";
import es from "../../src/lib/i18n/messages/es.json";
const messages = { en, pt, fr, es };

test.beforeEach(async ({ context }) => {
  await context.route(
    /^https:\/\/(unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,
    (route) => route.abort(),
  );
});

test("four-locale mobile/desktop layout and accessible login/offline shell", async ({
  page,
}) => {
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [locale, text] of Object.entries(messages)) {
      await page.goto("/login");
      await page.evaluate(
        (value) => localStorage.setItem("keepl.locale", value),
        locale,
      );
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      const button = page.getByRole("button", {
        name: text.login.continue,
        exact: true,
      });
      await expect(button).toBeEnabled();
      await button.focus();
      await expect(button).toBeFocused();
      // Auth readiness and focus change opacity/colors through CSS transitions.
      // Audit the settled control, rather than an intermediate animation frame.
      await button.evaluate(async (element) => {
        await Promise.all(
          element.getAnimations().map((animation) => animation.finished),
        );
      });
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(button).toBeFocused();
      await expect(
        page.getByRole("heading", { name: text.login.title, exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.goto("/offline");
      await expect(
        page.getByRole("heading", { name: text.offline.title, exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
  }
});

test("authenticated routes and forms have accessible controls at mobile width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/login");
  await signIn(page, `accessibility-${Date.now()}`);
  for (const path of [
    "/people",
    "/memories",
    "/upcoming",
    "/graph",
    "/search",
    "/settings",
  ]) {
    await page.locator(`a[href="${path}"]:visible`).first().click();
    await page.waitForURL(`**${path}`);
    await page.locator('main [role="status"]').waitFor({ state: "hidden" });
    await expect(
      page.getByRole("button", { name: "Try again", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  for (const path of ["/people/new", "/memories/new"]) {
    if (path === "/people/new")
      await page.locator('a[href="/people"]:visible').first().click();
    if (path === "/memories/new")
      await page.locator('a[href="/memories"]:visible').first().click();
    await page.locator(`a[href="${path}"]:visible`).first().click();
    await page
      .getByRole("button", {
        name: path === "/people/new" ? "Save person" : "Save memory",
        exact: true,
      })
      .waitFor({ state: "visible" });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
});

test("production worker retires legacy caches and isolates offline/sign-out/account transitions", async ({
  page,
  context,
  request,
}) => {
  await context.addInitScript(async () => {
    if (!sessionStorage.getItem("legacy-cache-seeded")) {
      sessionStorage.setItem("legacy-cache-seeded", "true");
      const legacy = await caches.open("pages");
      await legacy.put(
        "/people/old-owner",
        new Response("Legacy private content"),
      );
    }
  });
  await page.goto("/login");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
  });
  await expect
    .poll(() =>
      page.evaluate(async () => (await caches.keys()).includes("pages")),
    )
    .toBe(false);
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.start_url).toBe("/home");
  expect(manifest.display).toBe("standalone");
  expect((await request.get("/manifest.json")).url()).toContain(
    "/manifest.webmanifest",
  );
  for (const size of [192, 512]) {
    const icon = await request.get(`/icon-${size}.png`);
    const bytes = await icon.body();
    expect(bytes.readUInt32BE(16)).toBe(size);
    expect(bytes.readUInt32BE(20)).toBe(size);
  }
  await signIn(page, `offline-first-${Date.now()}`);
  const personPath = await addPerson(page, "OfflinePrivatePerson");
  await expect(
    page.getByRole("heading", { name: "OfflinePrivatePerson", exact: true }),
  ).toBeVisible();
  const cachedPaths = await page.evaluate(async () => {
    const urls = await Promise.all(
      (await caches.keys()).map(async (name) =>
        (await (await caches.open(name)).keys()).map((key) => key.url),
      ),
    );
    return urls.flat().map((url) => new URL(url).pathname);
  });
  expect(cachedPaths).not.toContain(personPath);
  expect(cachedPaths.some((path) => path.startsWith("/api/"))).toBe(false);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "OfflinePrivatePerson", exact: true }),
  ).toHaveCount(0);
  await page.goto("/people?offline-probe=true");
  await expect(
    page.getByRole("heading", { name: "You are offline", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  expect(await page.locator("body").innerText()).not.toContain(
    "OfflinePrivatePerson",
  );
  await context.setOffline(false);
  await page.goto("/login");
  await signIn(page, `offline-second-${Date.now()}`);
  await page.locator('a[href="/people"]:visible').first().click();
  await expect(
    page.getByRole("heading", { name: "Add your first person", exact: true }),
  ).toBeVisible();
  await page.goBack();
  expect(await page.locator("body").innerText()).not.toContain(
    "OfflinePrivatePerson",
  );
});
