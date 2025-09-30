import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test.describe("File Comparison Workflow", () => {
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

  test("should handle identical file contents automatically", async ({
    page,
  }) => {
    // First, get the actual content that the API generates
    const response1 = await page.request.get(
      "http://localhost:3000/api/fetch-sprint"
    );
    const data1 = await response1.json();

    // Create a test file with the exact same content
    const testFile = path.join(
      fetchedDir,
      "wtci-sprint-tickets-2025-09-25.txt"
    );
    fs.writeFileSync(
      testFile,
      data1.fileInfo.fileComparison?.newContent || "test content"
    );

    // Make another API call
    const response2 = await page.request.get(
      "http://localhost:3000/api/fetch-sprint"
    );
    const data2 = await response2.json();

    // Should detect identical content and proceed automatically
    expect(data2.fileInfo.fileComparison?.action).toBe("identical");
    expect(data2.fileInfo.needsUserDecision).toBe(false);
    expect(data2.fileInfo.saved).toBe(true);
  });

  test("should show comparison modal for different file contents", async ({
    page,
  }) => {
    // Create a test file with different content
    const existingContent = `🔍 Getting tickets from WTCI Sprint 9/25/2025...
Found 2 tickets in open sprints

📋 Tickets in Open Sprints:
================================================================================
1. WTCI-1359 - Existing ticket
   Status: Backlog

2. WTCI-1360 - Another existing ticket
   Status: In Progress

📊 Tickets grouped by Status:
================================================================================

📋 Backlog (1 tickets):
  - WTCI-1359: Existing ticket

📋 In Progress (1 tickets):
  - WTCI-1360: Another existing ticket`;

    const testFile = path.join(
      fetchedDir,
      "wtci-sprint-tickets-2025-09-25.txt"
    );
    fs.writeFileSync(testFile, existingContent);

    // Make API call
    const response = await page.request.get(
      "http://localhost:3000/api/fetch-sprint"
    );
    const data = await response.json();

    // Should detect different content and require user decision
    expect(data.fileInfo.fileComparison?.action).toBe("different");
    expect(data.fileInfo.needsUserDecision).toBe(true);
    expect(data.fileInfo.saved).toBe(false);
    expect(data.fileInfo.fileComparison?.existingContent).toBe(existingContent);
    expect(data.fileInfo.fileComparison?.newContent).toContain("WTCI-1359");
  });

  test("should handle file selection API", async ({ page }) => {
    // Create a test file
    const testFile = path.join(
      fetchedDir,
      "wtci-sprint-tickets-2025-09-25.txt"
    );
    fs.writeFileSync(testFile, "existing content");

    // Test selecting new file
    const selectResponse = await page.request.post(
      "http://localhost:3000/api/select-file",
      {
        data: {
          selectedFile: "new",
          newContent: "new content",
          sprintData: {
            sprintName: "WTCI Sprint 9/25/2025",
            ticketCount: 1,
            tickets: [{ key: "WTCI-1359", summary: "Test", status: "Backlog" }],
            fileInfo: {
              filename: "wtci-sprint-tickets-2025-09-25.txt",
            },
          },
        },
      }
    );

    const selectData = await selectResponse.json();
    expect(selectData.success).toBe(true);
    expect(selectData.finalFilename).toBe("wtci-sprint-tickets-2025-09-25.txt");

    // Verify file was updated
    const finalContent = fs.readFileSync(testFile, "utf8");
    expect(finalContent).toBe("new content");
  });

  test("should normalize filenames by removing number suffix", async ({
    page,
  }) => {
    // Create a test file with number suffix
    const testFile = path.join(
      fetchedDir,
      "wtci-sprint-tickets-2025-09-25(1).txt"
    );
    fs.writeFileSync(testFile, "existing content");

    // Test selecting existing file
    const selectResponse = await page.request.post(
      "http://localhost:3000/api/select-file",
      {
        data: {
          selectedFile: "wtci-sprint-tickets-2025-09-25(1).txt",
          newContent: "new content",
          sprintData: {
            sprintName: "WTCI Sprint 9/25/2025",
            ticketCount: 1,
            tickets: [{ key: "WTCI-1359", summary: "Test", status: "Backlog" }],
          },
        },
      }
    );

    const selectData = await selectResponse.json();
    expect(selectData.success).toBe(true);
    expect(selectData.finalFilename).toBe("wtci-sprint-tickets-2025-09-25.txt");

    // Verify file was renamed and updated
    const finalFile = path.join(
      fetchedDir,
      "wtci-sprint-tickets-2025-09-25.txt"
    );
    expect(fs.existsSync(finalFile)).toBe(true);
    expect(fs.existsSync(testFile)).toBe(false);
  });
});
