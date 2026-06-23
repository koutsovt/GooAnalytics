import { test, expect } from "@playwright/test";

async function devLogin(page: any, email: string) {
  await page.goto("/api/auth/dev-login?email=" + encodeURIComponent(email));
  await page.waitForLoadState("networkidle");
  const url = page.url();
  if (url.includes("error")) {
    throw new Error(`Dev login failed: ${url}`);
  }
}

test.describe("Properties Management", () => {
  test("properties page loads and shows title", async ({ browser }) => {
    const page = await browser.newPage();
    await devLogin(page, "props-test-1@example.com");

    await page.goto("/properties");
    await expect(page.locator("h1:has-text('Properties')")).toBeVisible();

    await page.close();
  });

  test("properties page has add button", async ({ browser }) => {
    const page = await browser.newPage();
    await devLogin(page, "props-test-2@example.com");

    await page.goto("/properties");
    await expect(page.locator("button:has-text('Add Property')")).toBeVisible();

    await page.close();
  });

  test("add property form appears when button clicked", async ({ browser }) => {
    const page = await browser.newPage();
    await devLogin(page, "props-test-3@example.com");

    await page.goto("/properties");

    // Click "Add Property" button
    await page.locator("button:has-text('Add Property')").first().click();

    // Wait for form to appear
    await page.waitForSelector('input[placeholder*="https://example.com"]', { timeout: 5000 });
    await expect(page.locator('label:has-text("Website URL")')).toBeVisible();

    await page.close();
  });

});
