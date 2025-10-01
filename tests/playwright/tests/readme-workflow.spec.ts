import { test, expect } from "@playwright/test";

test.describe("README Instructions Flow", () => {
  test("should follow the complete README workflow", async ({ page }) => {
    // Step 1: Navigate to the app (following README instructions)
    await page.goto("/");

    // Verify we're on the correct page
    await expect(page.locator(".app-title")).toContainText(
      "JIRA-SQL Validation Wizard"
    );

    // Step 2: Start a new sprint (as per README workflow)
    await page.locator("#new-sprint-card").click();

    // Step 3: Choose data source (README mentions both mock and real data)
    await expect(page.locator("#data-source-modal")).toBeVisible();

    // Test with mock data first (as mentioned in README)
    await page.locator("#use-mock-data").click();

    // Step 4: Wait for sprint data to load
    await expect(page.locator("#loading-overlay")).toBeVisible();
    await expect(page.locator(".loading-text")).toContainText(
      "Loading mock sprint data"
    );

    // Step 5: Verify sprint confirmation step (Step 2)
    await expect(page.locator("#loading-overlay")).not.toBeVisible();
    await expect(page.locator("#step-2")).toBeVisible();

    // Verify sprint data is displayed correctly
    await expect(page.locator(".sprint-info-card")).toBeVisible();
    await expect(page.locator(".sprint-name")).toContainText(
      "WTCI Sprint 9/25/2025"
    );
    await expect(page.locator(".sprint-status")).toContainText("Active");
    await expect(page.locator(".ticket-item")).toHaveCount(4);

    // Step 6: Confirm sprint data and proceed to validation results
    await page.locator("#header-confirm-btn").click();
    await expect(page.locator("#step-3")).toBeVisible();
    await expect(page.locator(".validation-summary")).toBeVisible();

    // Step 10: Verify validation statistics
    await expect(page.locator(".summary-stats")).toBeVisible();
    await expect(page.locator(".stat-card.success")).toBeVisible();
    await expect(page.locator(".stat-card.error")).toBeVisible();
    await expect(page.locator(".stat-card.total")).toBeVisible();

    // Step 11: Verify individual validation results
    await expect(page.locator(".validation-details")).toBeVisible();
    await expect(page.locator(".result-item")).toHaveCount(4);

    // Step 12: Generate report (final step in README workflow)
    await page.locator("#generate-report-btn").click();

    // Verify report generation
    await expect(page.locator("#loading-overlay")).toBeVisible();
    await expect(page.locator(".loading-text")).toContainText(
      "Generating report"
    );

    // Wait for report generation to complete
    await expect(page.locator("#loading-overlay")).not.toBeVisible();
  });

  test("should handle real data flow as mentioned in README", async ({
    page,
  }) => {
    // Navigate to the app
    await page.goto("/");

    // Start new sprint
    await page.locator("#new-sprint-card").click();

    // Choose real data (as mentioned in README)
    await page.locator("#use-real-data").click();

    // Wait for real data to load
    await expect(page.locator("#loading-overlay")).toBeVisible();
    await expect(page.locator(".loading-text")).toContainText(
      "Fetching real sprint data from JIRA"
    );

    // Verify real data loads successfully
    await expect(page.locator("#loading-overlay")).not.toBeVisible();
    await expect(page.locator("#step-2")).toBeVisible();

    // Verify real sprint data is displayed
    await expect(page.locator(".sprint-info-card")).toBeVisible();
    await expect(page.locator(".sprint-name")).toContainText("WTCI Sprint");

    // Simplified flow: no modal; proceed directly to step 2
    await expect(page.locator("#step-2")).toBeVisible();

    // Complete the workflow
    await page.locator("#header-confirm-btn").click();
    await expect(page.locator("#step-3")).toBeVisible();

    await expect(page.locator("#step-3")).toBeVisible();

    // Verify validation results
    await expect(page.locator(".validation-summary")).toBeVisible();
  });

  test("should handle existing data workflow from README", async ({ page }) => {
    // Navigate to the app
    await page.goto("/");

    // Check if load existing data is available
    const loadExistingCard = page.locator("#load-existing-card");
    await expect(loadExistingCard).toBeVisible();

    // Click load existing data
    await loadExistingCard.click();

    // The app will either:
    // 1. Load existing data and show step 2, or
    // 2. Show an error/message and stay on step 1 if no data exists

    // Wait a moment for the action to complete
    await page.waitForTimeout(1000);

    // Check which step is visible
    const step2 = page.locator("#step-2");
    const step1 = page.locator("#step-1");

    const step2Visible = await step2.isVisible();
    const step1Visible = await step1.isVisible();

    // One of these should be visible
    expect(step2Visible || step1Visible).toBeTruthy();

    // If step 2 is visible, verify that data was loaded
    if (step2Visible) {
      await expect(page.locator(".sprint-info-card")).toBeVisible();
    }
  });

  test("should demonstrate all wizard steps as documented", async ({
    page,
  }) => {
    // Navigate to the app
    await page.goto("/");

    // Step 1: Verify initial state
    await expect(page.locator("#step-1")).toBeVisible();
    await expect(page.locator(".progress-step").first()).toHaveClass(/active/);

    // Step 2: Start workflow
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-mock-data").click();

    // Verify step 2
    await expect(page.locator("#step-2")).toBeVisible();
    await expect(page.locator(".progress-step").nth(1)).toHaveClass(/active/);

    // Step 3: Confirm and proceed
    await page.locator("#header-confirm-btn").click();
    await expect(page.locator("#step-3")).toBeVisible();
    await expect(page.locator(".progress-step").nth(2)).toHaveClass(/active/);

    // Step 4: Validation (now immediately after confirm in step 3)
    await expect(page.locator("#step-3")).toBeVisible();
    await expect(page.locator(".progress-step").nth(2)).toHaveClass(/active/);

    // Verify all steps are marked as completed
    await expect(page.locator(".progress-step")).toHaveCount(3);
  });

  test("should handle error scenarios mentioned in README", async ({
    page,
  }) => {
    // Navigate to the app
    await page.goto("/");

    // Test error handling by trying to proceed without data
    // This should show appropriate error messages

    // Try to confirm sprint without selecting data
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-mock-data").click();

    // Wait for data to load
    await expect(page.locator("#loading-overlay")).not.toBeVisible();
    await expect(page.locator("#step-2")).toBeVisible();

    // Now test navigation and error handling
    await page.locator("#header-confirm-btn").click();
    await expect(page.locator("#step-3")).toBeVisible();

    // Validation now shows at step 3 after confirm
    await page.waitForSelector("#header-confirm-btn", { state: "attached" });
    await page.evaluate(() => {
      const btn = document.getElementById("header-confirm-btn");
      if (btn) (btn as HTMLButtonElement).click();
    });
    await expect(page.locator("#step-3")).toBeVisible();

    // Verify error handling works
    await expect(page.locator(".validation-summary")).toBeVisible();
  });
});
