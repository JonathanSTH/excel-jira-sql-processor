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

    // Confirm sprint data and go to step 3
    await page.locator("#confirm-sprint-btn").click();
    await expect(page.locator("#step-3")).toBeVisible();

    // Proceed to validation and go to step 4
    await page.locator("#proceed-validation-btn").click();
    await expect(page.locator("#step-4")).toBeVisible();

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

    // Go to step 3
    await page.locator("#confirm-sprint-btn").click();
    await expect(page.locator("#step-3")).toBeVisible();

    // Go back to step 2
    await page.locator("#back-to-confirmation-btn").click();
    await expect(page.locator("#step-2")).toBeVisible();
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
    await page.locator("#proceed-validation-btn").click();

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

  test("should handle add ticket modal", async ({ page }) => {
    // Go to step 3 (ticket review)
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-mock-data").click();
    await page.locator("#confirm-sprint-btn").click();
    await expect(page.locator("#step-3")).toBeVisible();

    // Click add ticket button
    await page.locator("#add-ticket-btn").click();

    // Check modal appears
    await expect(page.locator("#add-ticket-modal")).toBeVisible();
    await expect(page.locator("#ticket-number-input")).toBeVisible();
    await expect(page.locator("#search-ticket-btn")).toBeVisible();

    // Close modal
    await page.locator("#add-ticket-close").click();
    await expect(page.locator("#add-ticket-modal")).not.toBeVisible();
  });

  test("should search for tickets", async ({ page }) => {
    // Go to step 3 and open add ticket modal
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-mock-data").click();
    await page.locator("#confirm-sprint-btn").click();
    await page.locator("#add-ticket-btn").click();

    // Enter ticket number and search
    await page.locator("#ticket-number-input").fill("WTCI-1234");
    await page.locator("#search-ticket-btn").click();

    // Check that search results appear
    await expect(page.locator("#ticket-search-results")).toBeVisible();

    // Verify we get back the correct ticket data
    await expect(
      page.locator("#ticket-search-results .ticket-search-result")
    ).toBeVisible();
    await expect(
      page.locator("#ticket-search-results .ticket-header h4")
    ).toContainText("WTCI-1234");
    await expect(
      page.locator("#ticket-search-results .ticket-status")
    ).toBeVisible();
    await expect(
      page.locator("#ticket-search-results .ticket-details")
    ).toBeVisible();

    // Verify the ticket has the expected properties
    const ticketHeader = await page
      .locator("#ticket-search-results .ticket-header h4")
      .textContent();
    const ticketStatus = await page
      .locator("#ticket-search-results .ticket-status")
      .textContent();
    const ticketSummary = await page
      .locator("#ticket-search-results .ticket-field span")
      .first()
      .textContent();

    expect(ticketHeader).toContain("WTCI-1234");
    expect(ticketStatus).toBeTruthy();
    expect(ticketSummary).toBeTruthy();
  });

  test("should handle Enter key in ticket search", async ({ page }) => {
    // Go to step 3 and open add ticket modal
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-mock-data").click();
    await page.locator("#confirm-sprint-btn").click();
    await page.locator("#add-ticket-btn").click();

    // Enter ticket number and press Enter
    await page.locator("#ticket-number-input").fill("WTCI-1234");
    await page.locator("#ticket-number-input").press("Enter");

    // Check that search results appear
    await expect(page.locator("#ticket-search-results")).toBeVisible();

    // Verify we get back the correct ticket data (same validation as click test)
    await expect(
      page.locator("#ticket-search-results .ticket-search-result")
    ).toBeVisible();
    await expect(
      page.locator("#ticket-search-results .ticket-header h4")
    ).toContainText("WTCI-1234");
    await expect(
      page.locator("#ticket-search-results .ticket-status")
    ).toBeVisible();
    await expect(
      page.locator("#ticket-search-results .ticket-details")
    ).toBeVisible();
  });
});
