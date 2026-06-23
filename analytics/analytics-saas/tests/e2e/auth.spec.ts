import { expect, test } from "@playwright/test";

test.describe("Auth", () => {
  test("unauthenticated user redirects to login", async ({ page }) => {
    await page.goto("/reports");
    expect(page.url()).toContain("/login");
  });

  test("landing page is accessible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Analytics Briefs, Delivered")).toBeVisible();
    await expect(page.locator("text=Sign In")).toBeVisible();
  });

  test("login page shows sign in button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Sign in with Google")).toBeVisible();
  });

  test("dashboard redirects unauthenticated to login", async ({ page }) => {
    await page.goto("/dashboard");
    expect(page.url()).toContain("/login");
  });

  test("properties page redirects unauthenticated to login", async ({ page }) => {
    await page.goto("/properties");
    expect(page.url()).toContain("/login");
  });

  test("settings page redirects unauthenticated to login", async ({ page }) => {
    await page.goto("/settings");
    expect(page.url()).toContain("/login");
  });
});
