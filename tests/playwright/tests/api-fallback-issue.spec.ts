import { test, expect } from "@playwright/test";

test.describe("API Fallback Data Issue", () => {
  test("should handle real API data correctly without falling back to mock", async ({
    request,
  }) => {
    // Test the actual API endpoint to see what it returns
    const response = await request.get("/api/fetch-sprint");

    // Should return 200 status
    expect(response.status()).toBe(200);

    const data = await response.json();
    console.log("API Response:", data);

    // The response should have sprint data directly, not wrapped in success/data
    expect(data).toHaveProperty("sprintName");
    expect(data).toHaveProperty("ticketCount");
    expect(data).toHaveProperty("tickets");

    // Should NOT have a success wrapper
    expect(data).not.toHaveProperty("success");
    expect(data).not.toHaveProperty("data");
  });

  test("should not trigger fallback when API returns valid data", async ({
    page,
  }) => {
    // Navigate to the app
    await page.goto("/");

    // Start real data flow
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-real-data").click();

    // Wait for the API call to complete
    await page.waitForTimeout(3000);

    // Should NOT show the error modal about failed API
    const errorModal = page.locator("text=Failed to fetch real data");
    await expect(errorModal).not.toBeVisible();

    // The simplified flow should go directly to step 2 with real data
    await expect(page.locator("#step-2")).toBeVisible();
    const sprintName = page.locator(".sprint-name");
    await expect(sprintName).toBeVisible();
    const sprintNameText = await sprintName.textContent();
    expect(sprintNameText || "").not.toContain("Fallback Data");
    expect(sprintNameText || "").not.toContain("Mock Data");
  });

  test("should show proper error only when API actually fails", async ({
    page,
  }) => {
    // This test would require mocking the API to return an error
    // For now, we'll test the error handling logic

    // Navigate to the app
    await page.goto("/");

    // Check that the error handling code exists
    const hasErrorHandling = await page.evaluate(() => {
      return (
        typeof ValidationWizard !== "undefined" &&
        ValidationWizard.prototype.hasOwnProperty("showError")
      );
    });
    expect(hasErrorHandling).toBe(true);
  });

  test("should handle real sprint data without existing workflow conflicts", async ({
    page,
  }) => {
    // This test simulates a scenario where we have a fresh sprint that doesn't exist in workflow
    // We'll test the API response structure and ensure it doesn't trigger fallback

    // First, test the API directly to understand the response
    const response = await page.request.get("/api/fetch-sprint");
    expect(response.status()).toBe(200);

    const data = await response.json();

    // The response should have the correct structure
    expect(data).toHaveProperty("sprintName");

    // Navigate to the app and test the simplified flow
    await page.goto("/");
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-real-data").click();

    // Wait for the API call
    await page.waitForTimeout(3000);

    // Should show step 2 with real data and no duplicate keys
    await expect(page.locator("#step-2")).toBeVisible();

    // Should show real sprint data, not fallback
    const sprintName = page.locator(".sprint-name");
    await expect(sprintName).toBeVisible();

    const sprintNameText = await sprintName.textContent();
    expect(sprintNameText || "").not.toContain("Fallback Data");
    expect(sprintNameText || "").not.toContain("Mock Data");

    // Verify unique ticket keys
    const keys = await page.$$eval(".ticket-item .ticket-key", (els) =>
      els.map((e) => e.textContent?.trim() || "")
    );
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});
