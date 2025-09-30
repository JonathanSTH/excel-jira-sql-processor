import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test.describe("File Comparison UI Demo", () => {
  const projectRoot = path.join(__dirname, "../../..");
  const fetchedDir = path.join(projectRoot, "sprintData", "fetched");

  test.beforeEach(async () => {
    // Clean up any existing sprint files
    if (fs.existsSync(fetchedDir)) {
      const files = fs.readdirSync(fetchedDir);
      files.forEach((file) => {
        if (file.startsWith("wtci-sprint-tickets-")) {
          fs.unlinkSync(path.join(fetchedDir, file));
        }
      });
    }
  });

  test("should show file comparison modal with different content", async ({
    page,
  }) => {
    // Create a test file with specific content that will differ from API response
    const existingContent = `🔍 Getting tickets from WTCI Sprint 9/25/2025...
Found 3 tickets in open sprints

📋 Tickets in Open Sprints:
================================================================================
1. WTCI-1359 - Existing ticket from file
   Status: Backlog
   Assignee: John Doe
   Priority: High
   Created: 2025-09-26T10:53:26.720-0500
   Updated: 2025-09-26T10:54:02.520-0500
   Sprint: WTCI Sprint 9/25/2025
   Description: This is an existing ticket from the saved file

2. WTCI-1360 - Another existing ticket
   Status: In Progress
   Assignee: Jane Smith
   Priority: Medium
   Created: 2025-09-27T09:00:00.000-0500
   Updated: 2025-09-27T10:30:00.000-0500
   Sprint: WTCI Sprint 9/25/2025
   Description: This is another existing ticket

3. WTCI-1361 - Done ticket
   Status: Done
   Assignee: Bob Wilson
   Priority: Low
   Created: 2025-09-25T14:00:00.000-0500
   Updated: 2025-09-27T11:00:00.000-0500
   Sprint: WTCI Sprint 9/25/2025
   Description: This ticket is already completed


📊 Tickets grouped by Status:
================================================================================

📋 Backlog (1 tickets):
  - WTCI-1359: Existing ticket from file

📋 In Progress (1 tickets):
  - WTCI-1360: Another existing ticket

📋 Done (1 tickets):
  - WTCI-1361: Done ticket`;

    const testFile = path.join(
      fetchedDir,
      "wtci-sprint-tickets-2025-09-25.txt"
    );
    fs.writeFileSync(testFile, existingContent);

    // Mock the API response to return different content
    await page.route("**/api/fetch-sprint", async (route) => {
      const mockResponse = {
        sprintName: "WTCI Sprint 9/25/2025",
        ticketCount: 1,
        status: "Active",
        startDate: "Sep 16, 2025",
        endDate: "Sep 24, 2025",
        tickets: [
          {
            key: "WTCI-1359",
            summary: "Clobber updates per shared file",
            status: "Backlog",
          },
        ],
        fileInfo: {
          filename: "wtci-sprint-tickets-2025-09-25.txt",
          path: "C:\\code\\test\\sprintData\\fetched\\wtci-sprint-tickets-2025-09-25.txt",
          saved: false,
          sprintDate: "2025-09-25",
          existingInWorkflow: false,
          fileComparison: {
            action: "different",
            existingFile: "wtci-sprint-tickets-2025-09-25.txt",
            existingContent: existingContent,
            newContent: `🔍 Getting tickets from WTCI Sprint 9/25/2025...
Found 1 tickets in open sprints

📋 Tickets in Open Sprints:
================================================================================
1. WTCI-1359 - Clobber updates per shared file
   Status: Backlog
   Assignee: Unassigned
   Priority: Medium
   Created: 2025-09-26T10:53:26.720-0500
   Updated: 2025-09-26T10:54:02.520-0500
   Sprint: Not assigned
   Description: sTaxTable:
AZ - For filingstatus M and S, update b1Percentage to 2.5% per request from Daria (DBA up...


📊 Tickets grouped by Status:
================================================================================

📋 Backlog (1 tickets):
  - WTCI-1359: Clobber updates per shared file`,
            message: "Files have different content - user decision required",
          },
          needsUserDecision: true,
        },
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponse),
      });
    });

    // Navigate to the page
    await page.goto("http://localhost:3000");

    // Click on "New Sprint" card
    await page.click("#new-sprint-card");

    // Select "Real Data" option
    await page.click("#use-real-data");

    // Wait for the file comparison modal to appear
    await expect(page.locator("#file-comparison-modal")).toBeVisible();

    // Verify modal content
    await expect(page.locator(".modal-title")).toContainText(
      "File Content Comparison"
    );
    await expect(page.locator(".comparison-description")).toContainText(
      "Two files with the same name but different content were found"
    );

    // Verify both panels are visible
    await expect(page.locator(".comparison-panel").first()).toBeVisible();
    await expect(page.locator(".comparison-panel").nth(1)).toBeVisible();

    // Verify headers
    await expect(page.locator(".comparison-header h4").first()).toContainText(
      "Existing File"
    );
    await expect(page.locator(".comparison-header h4").nth(1)).toContainText(
      "New File"
    );

    // Verify file info
    await expect(page.locator("#existing-file-info")).toContainText(
      "wtci-sprint-tickets-2025-09-25.txt"
    );
    await expect(page.locator("#new-file-info")).toContainText("New content");

    // Verify content is displayed
    await expect(page.locator("#existing-file-content")).toContainText(
      "WTCI-1360 - Another existing ticket"
    );
    await expect(page.locator("#new-file-content")).toContainText(
      "WTCI-1359 - Clobber updates per shared file"
    );

    // Verify action buttons
    await expect(page.locator("#keep-existing-btn")).toBeVisible();
    await expect(page.locator("#keep-new-btn")).toBeVisible();
    await expect(page.locator("#cancel-comparison-btn")).toBeVisible();

    // Test keeping existing file
    await page.click("#keep-existing-btn");

    // Verify modal closes and we proceed to next step
    await expect(page.locator("#file-comparison-modal")).not.toBeVisible();
    await expect(page.locator("#sprint-confirmation")).toBeVisible();
  });

  test("should show file comparison modal and keep new file", async ({
    page,
  }) => {
    // Create a test file with different content
    const existingContent = `🔍 Getting tickets from WTCI Sprint 9/25/2025...
Found 2 tickets in open sprints

📋 Tickets in Open Sprints:
================================================================================
1. WTCI-1359 - Old ticket
   Status: Backlog
   Assignee: Old User
   Priority: Low

2. WTCI-1360 - Another old ticket
   Status: Done
   Assignee: Old User 2
   Priority: Medium

📊 Tickets grouped by Status:
================================================================================

📋 Backlog (1 tickets):
  - WTCI-1359: Old ticket

📋 Done (1 tickets):
  - WTCI-1360: Another old ticket`;

    const testFile = path.join(
      fetchedDir,
      "wtci-sprint-tickets-2025-09-25.txt"
    );
    fs.writeFileSync(testFile, existingContent);

    // Mock the API response
    await page.route("**/api/fetch-sprint", async (route) => {
      const mockResponse = {
        sprintName: "WTCI Sprint 9/25/2025",
        ticketCount: 1,
        status: "Active",
        startDate: "Sep 16, 2025",
        endDate: "Sep 24, 2025",
        tickets: [
          {
            key: "WTCI-1359",
            summary: "Clobber updates per shared file",
            status: "Backlog",
          },
        ],
        fileInfo: {
          filename: "wtci-sprint-tickets-2025-09-25.txt",
          path: "C:\\code\\test\\sprintData\\fetched\\wtci-sprint-tickets-2025-09-25.txt",
          saved: false,
          sprintDate: "2025-09-25",
          existingInWorkflow: false,
          fileComparison: {
            action: "different",
            existingFile: "wtci-sprint-tickets-2025-09-25.txt",
            existingContent: existingContent,
            newContent: `🔍 Getting tickets from WTCI Sprint 9/25/2025...
Found 1 tickets in open sprints

📋 Tickets in Open Sprints:
================================================================================
1. WTCI-1359 - Clobber updates per shared file
   Status: Backlog
   Assignee: Unassigned
   Priority: Medium
   Created: 2025-09-26T10:53:26.720-0500
   Updated: 2025-09-26T10:54:02.520-0500
   Sprint: Not assigned
   Description: sTaxTable:
AZ - For filingstatus M and S, update b1Percentage to 2.5% per request from Daria (DBA up...


📊 Tickets grouped by Status:
================================================================================

📋 Backlog (1 tickets):
  - WTCI-1359: Clobber updates per shared file`,
            message: "Files have different content - user decision required",
          },
          needsUserDecision: true,
        },
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponse),
      });
    });

    // Mock the select-file API response
    await page.route("**/api/select-file", async (route) => {
      const request = route.request();
      const body = await request.postDataJSON();

      const mockResponse = {
        success: true,
        message: "File selection processed successfully",
        finalFilename: "wtci-sprint-tickets-2025-09-25.txt",
        sprintData: {
          sprintName: "WTCI Sprint 9/25/2025",
          ticketCount: 1,
          tickets: [
            {
              key: "WTCI-1359",
              summary: "Clobber updates per shared file",
              status: "Backlog",
            },
          ],
          fileInfo: {
            filename: "wtci-sprint-tickets-2025-09-25.txt",
            path: "C:\\code\\test\\sprintData\\fetched\\wtci-sprint-tickets-2025-09-25.txt",
            saved: true,
            fileComparison: null,
            needsUserDecision: false,
          },
        },
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponse),
      });
    });

    // Navigate to the page
    await page.goto("http://localhost:3000");

    // Click on "New Sprint" card
    await page.click("#new-sprint-card");

    // Select "Real Data" option
    await page.click("#use-real-data");

    // Wait for the file comparison modal to appear
    await expect(page.locator("#file-comparison-modal")).toBeVisible();

    // Test keeping new file
    await page.click("#keep-new-btn");

    // Verify modal closes and we proceed to next step
    await expect(page.locator("#file-comparison-modal")).not.toBeVisible();
    await expect(page.locator("#sprint-confirmation")).toBeVisible();
  });

  test("should handle identical content automatically", async ({ page }) => {
    // Create a test file with content that matches the API response
    const existingContent = `🔍 Getting tickets from WTCI Sprint 9/25/2025...
Found 1 tickets in open sprints

📋 Tickets in Open Sprints:
================================================================================
1. WTCI-1359 - Clobber updates per shared file
   Status: Backlog
   Assignee: Unassigned
   Priority: Medium
   Created: 2025-09-26T10:53:26.720-0500
   Updated: 2025-09-26T10:54:02.520-0500
   Sprint: Not assigned
   Description: sTaxTable:
AZ - For filingstatus M and S, update b1Percentage to 2.5% per request from Daria (DBA up...


📊 Tickets grouped by Status:
================================================================================

📋 Backlog (1 tickets):
  - WTCI-1359: Clobber updates per shared file`;

    const testFile = path.join(
      fetchedDir,
      "wtci-sprint-tickets-2025-09-25.txt"
    );
    fs.writeFileSync(testFile, existingContent);

    // Mock the API response with identical content
    await page.route("**/api/fetch-sprint", async (route) => {
      const mockResponse = {
        sprintName: "WTCI Sprint 9/25/2025",
        ticketCount: 1,
        status: "Active",
        startDate: "Sep 16, 2025",
        endDate: "Sep 24, 2025",
        tickets: [
          {
            key: "WTCI-1359",
            summary: "Clobber updates per shared file",
            status: "Backlog",
          },
        ],
        fileInfo: {
          filename: "wtci-sprint-tickets-2025-09-25.txt",
          path: "C:\\code\\test\\sprintData\\fetched\\wtci-sprint-tickets-2025-09-25.txt",
          saved: true,
          sprintDate: "2025-09-25",
          existingInWorkflow: false,
          fileComparison: {
            action: "identical",
            existingFile: "wtci-sprint-tickets-2025-09-25.txt",
            message: "Files have identical content",
          },
          needsUserDecision: false,
        },
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponse),
      });
    });

    // Navigate to the page
    await page.goto("http://localhost:3000");

    // Click on "New Sprint" card
    await page.click("#new-sprint-card");

    // Select "Real Data" option
    await page.click("#use-real-data");

    // Verify no comparison modal appears and we go directly to confirmation
    await expect(page.locator("#file-comparison-modal")).not.toBeVisible();
    await expect(page.locator("#sprint-confirmation")).toBeVisible();
  });
});
