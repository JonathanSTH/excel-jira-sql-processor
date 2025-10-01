import { test, expect } from "@playwright/test";

test.describe("JIRA-SQL Validation App", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main UI (served at root)
    await page.goto("/");

    // Wait for the page to load completely
    await page.waitForLoadState("networkidle");

    // Wait for the main elements to be visible
    await expect(page.locator(".app-title")).toContainText(
      "JIRA-SQL Validation Wizard"
    );
  });

  test("should display the main wizard interface", async ({ page }) => {
    // Check that the main elements are visible
    await expect(page.locator(".app-title")).toContainText(
      "JIRA-SQL Validation Wizard"
    );
    await expect(page.locator("#new-sprint-card")).toBeVisible();
    await expect(page.locator("#load-existing-card")).toBeVisible();

    // Check progress indicator
    await expect(page.locator(".progress-indicator")).toBeVisible();
    await expect(page.locator(".progress-step").first()).toHaveClass(/active/);
  });

  test("should show data source modal when clicking new sprint", async ({
    page,
  }) => {
    // Click the new sprint card
    await page.locator("#new-sprint-card").click();

    // Check that the modal appears
    await expect(page.locator("#data-source-modal")).toBeVisible();
    await expect(page.locator("#use-mock-data")).toBeVisible();
    await expect(page.locator("#use-real-data")).toBeVisible();
  });

  test("should close modal when clicking close button", async ({ page }) => {
    // Open modal
    await page.locator("#new-sprint-card").click();
    await expect(page.locator("#data-source-modal")).toBeVisible();

    // Close modal
    await page.locator("#modal-close").click();
    await expect(page.locator("#data-source-modal")).not.toBeVisible();
  });

  test("should close modal when clicking overlay", async ({ page }) => {
    // Open modal
    await page.locator("#new-sprint-card").click();
    await expect(page.locator("#data-source-modal")).toBeVisible();

    // Click overlay to close
    await page
      .locator("#data-source-modal")
      .click({ position: { x: 10, y: 10 } });
    await expect(page.locator("#data-source-modal")).not.toBeVisible();
  });

  test("should proceed with mock data flow", async ({ page }) => {
    // Start the mock data flow
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-mock-data").click();

    // Check loading state
    await expect(page.locator("#loading-overlay")).toBeVisible();
    await expect(page.locator(".loading-text")).toContainText(
      "Loading mock sprint data"
    );

    // Wait for loading to complete and step 2 to appear
    await expect(page.locator("#loading-overlay")).not.toBeVisible();
    await expect(page.locator("#step-2")).toBeVisible();

    // Check that sprint summary is displayed
    await expect(page.locator(".sprint-info-card")).toBeVisible();
    await expect(page.locator(".sprint-name")).toContainText(
      "WTCI Sprint 9/25/2025 (Mock Data)"
    );
    await expect(page.locator(".ticket-item")).toHaveCount(5);
  });

  test("should proceed with real data flow", async ({ page }) => {
    // Start the real data flow
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-real-data").click();

    // Check loading state
    await expect(page.locator("#loading-overlay")).toBeVisible();
    await expect(page.locator(".loading-text")).toContainText(
      "Fetching real sprint data from JIRA"
    );

    // Wait for loading to complete and step 2 to appear
    await expect(page.locator("#loading-overlay")).not.toBeVisible();
    await expect(page.locator("#step-2")).toBeVisible();

    // Check that sprint summary is displayed
    await expect(page.locator(".sprint-info-card")).toBeVisible();
    await expect(page.locator(".sprint-name")).toContainText("WTCI Sprint");
  });

  test("should navigate through wizard steps", async ({ page }) => {
    // Start with mock data
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-mock-data").click();

    // Wait for step 2
    await expect(page.locator("#step-2")).toBeVisible();

    // Confirm sprint data and go to validation (now step 3)
    await page.locator("#confirm-sprint-btn").click();
    await expect(page.locator("#step-3")).toBeVisible();
    // Results are shown directly as validation completes

    // Check validation results
    await expect(page.locator(".validation-summary")).toBeVisible();
    await expect(page.locator(".stat-card")).toHaveCount(3);
  });

  test("should allow navigation back through steps", async ({ page }) => {
    // Start with mock data and go to step 2
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-mock-data").click();
    await expect(page.locator("#step-2")).toBeVisible();

    // Go back to step 1
    await page.locator("#back-to-sprint-btn").click();
    await expect(page.locator("#step-1")).toBeVisible();

    // Go forward again
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-mock-data").click();
    await expect(page.locator("#step-2")).toBeVisible();

    // Go to step 3 (validation results)
    await page.locator("#confirm-sprint-btn").click();
    await expect(page.locator("#step-3")).toBeVisible();
    // No back to confirmation from results in simplified flow
  });

  test("should display ticket details correctly", async ({ page }) => {
    // Start with mock data
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-mock-data").click();
    await expect(page.locator("#step-2")).toBeVisible();

    // Check ticket details
    const tickets = page.locator(".ticket-item");
    await expect(tickets).toHaveCount(5);

    // Check first ticket
    await expect(tickets.first().locator(".ticket-key")).toContainText(
      "WTCI-1358"
    );
    await expect(tickets.first().locator(".ticket-summary")).toContainText(
      "Update STaxCodeLocalJurisdication"
    );
    await expect(tickets.first().locator(".ticket-status")).toContainText(
      "Done"
    );
  });

  test("should show validation results", async ({ page }) => {
    // Complete the flow to validation results
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-mock-data").click();
    await page.locator("#confirm-sprint-btn").click();

    // Check validation results
    await expect(page.locator(".validation-summary")).toBeVisible();
    await expect(page.locator(".summary-stats")).toBeVisible();

    // Check stat cards
    await expect(page.locator(".stat-card.success")).toBeVisible();
    await expect(page.locator(".stat-card.error")).toBeVisible();
    await expect(page.locator(".stat-card.total")).toBeVisible();

    // Check validation details
    await expect(page.locator(".validation-details")).toBeVisible();
    await expect(page.locator(".result-item")).toHaveCount(5);
  });
});
