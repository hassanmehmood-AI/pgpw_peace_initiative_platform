import { test, expect } from "@playwright/test";

// Public pages only — they need no sign-in, so the suite runs without credentials.
const ROUTES = ["/","/about","/login","/register","/contact","/legal"];

// Network noise from third parties / missing backend config is not a browser bug.
const IGNORED = [/favicon/i, /supabase/i, /googletagmanager/i, /google-analytics/i, /Failed to load resource/i];

for (const route of ROUTES) {
  test.describe(route, () => {
    test("renders without script errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error" && !IGNORED.some((re) => re.test(m.text()))) errors.push(m.text());
      });

      const res = await page.goto(route, { waitUntil: "load" });
      expect(res?.status(), "HTTP status").toBeLessThan(400);
      await expect(page.locator("body")).not.toBeEmpty();
      expect(errors, errors.join(", ")).toEqual([]);
    });

    test("has no horizontal overflow", async ({ page }) => {
      await page.goto(route, { waitUntil: "load" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, "px of horizontal overflow").toBeLessThanOrEqual(1);
    });
  });
}

test("modern CSS the design relies on is supported", async ({ page }) => {
  await page.goto("/");
  const support = await page.evaluate(() => ({
    backdrop: CSS.supports("backdrop-filter", "blur(4px)") || CSS.supports("-webkit-backdrop-filter", "blur(4px)"),
    grid: CSS.supports("display", "grid"),
    dvh: CSS.supports("height", "100dvh"),
    customProps: CSS.supports("--x", "0"),
    fetchApi: typeof fetch === "function",
    intersection: typeof IntersectionObserver === "function",
  }));
  expect(support).toEqual({
    backdrop: true, grid: true, dvh: true, customProps: true, fetchApi: true, intersection: true,
  });
});
