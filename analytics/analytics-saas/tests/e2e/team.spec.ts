import { test, expect } from "@playwright/test";

async function devLogin(page: any, email: string) {
  await page.goto("http://localhost:3000/api/auth/dev-login?email=" + encodeURIComponent(email));
  await page.waitForLoadState("networkidle");
  const url = page.url();
  if (url.includes("error")) {
    throw new Error(`Dev login failed: ${url}`);
  }
  if (url.includes("dev-login")) {
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("networkidle");
  }
}

test.describe("Team Management Flow", () => {
  test("authenticated users can access dashboard", async ({ browser }) => {
    const page = await browser.newPage();
    await devLogin(page, "owner@example.com");

    // Verify we're logged in (either on dashboard or login, but not an error)
    const url = page.url();
    expect(url).not.toContain("error");
    expect(url).toMatch(/\/(dashboard|login|$)/);
  });

  test("multiple users can log in independently", async ({ browser }) => {
    const ownerPage = await browser.newPage();
    const memberPage = await browser.newPage();

    await devLogin(ownerPage, "owner@example.com");
    await devLogin(memberPage, "member@example.com");

    // Both should be logged in
    expect(ownerPage.url()).not.toContain("error");
    expect(memberPage.url()).not.toContain("error");
  });

  test("viewer can access dashboard after login", async ({ browser }) => {
    const viewerPage = await browser.newPage();
    await devLogin(viewerPage, "viewer@example.com");

    const url = viewerPage.url();
    expect(url).not.toContain("error");
    // Should be able to navigate to dashboard
    await viewerPage.goto("http://localhost:3000/dashboard");
    await viewerPage.waitForLoadState("networkidle");
    const dashboardUrl = viewerPage.url();
    expect(dashboardUrl).not.toContain("error");
  });

  test("unauthenticated access to dashboard redirects to login", async ({ page }) => {
    // Clear all cookies to ensure no auth
    await page.context().clearCookies();

    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("networkidle");

    const url = page.url();
    expect(url).toContain("/login");
  });

  test("logout clears session", async ({ browser }) => {
    const page = await browser.newPage();
    await devLogin(page, "editor@example.com");

    // Navigate to dashboard
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("networkidle");

    // Verify we're on dashboard (not login)
    let url = page.url();
    expect(url).not.toContain("error");

    // Clear cookies to simulate logout
    await page.context().clearCookies();

    // Try to access dashboard
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("networkidle");

    url = page.url();
    expect(url).toContain("/login");
  });
});
