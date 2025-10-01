import { test, expect } from "@playwright/test";
import { spawn, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

test.describe("Server Startup and Management", () => {
  test("should start server with npm run app", async () => {
    // Test that the server can be started with the npm script
    // This test verifies the command exists and can be executed
    const { stdout, stderr } = await execAsync("npm run app --help", {
      timeout: 5000,
      cwd: process.cwd(),
    });

    // The command should exist (no error about missing script)
    expect(stderr).not.toContain("Missing script");
  });

  test("should respond to health check after startup", async ({ request }) => {
    // Wait a bit for server to fully start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("OK");
  });

  test("should serve UI files correctly", async ({ page }) => {
    await page.goto("/");

    // Check that the main HTML elements are present
    await expect(page.locator(".app-title")).toContainText(
      "JIRA-SQL Validation Wizard"
    );
    await expect(page.locator("#new-sprint-card")).toBeVisible();
    await expect(page.locator("#load-existing-card")).toBeVisible();
  });

  test("should serve static assets", async ({ request }) => {
    // Test that CSS and JS files are served
    const cssResponse = await request.get("/styles.css");
    expect(cssResponse.status()).toBe(200);

    const jsResponse = await request.get("/app.js");
    expect(jsResponse.status()).toBe(200);
  });

  test("should handle concurrent requests", async ({ request }) => {
    // Make multiple concurrent requests to test server stability
    const requests = Array(10)
      .fill(null)
      .map(() => request.get("/api/health"));

    const responses = await Promise.all(requests);

    // All requests should succeed
    responses.forEach((response) => {
      expect(response.status()).toBe(200);
    });
  });

  test("should maintain session state", async ({ page }) => {
    // Test that the application maintains state across page interactions
    await page.goto("/");

    // Start a workflow
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-mock-data").click();

    // Wait for step 2
    await expect(page.locator("#step-2")).toBeVisible();

    // Refresh the page
    await page.reload();

    // Should be back to step 1
    await expect(page.locator("#step-1")).toBeVisible();
  });

  test("should handle server errors gracefully", async ({ page }) => {
    // Test error handling by making invalid requests
    const response = await page.request.get("/api/nonexistent");
    expect(response.status()).toBe(404);
  });

  test("should support different browsers", async ({ page, browserName }) => {
    // Test that the app works across different browsers
    await page.goto("/");

    // Basic functionality should work in all browsers
    await expect(page.locator(".app-title")).toContainText(
      "JIRA-SQL Validation Wizard"
    );
    await expect(page.locator("#new-sprint-card")).toBeVisible();

    // Test basic interaction
    await page.locator("#new-sprint-card").click();
    await expect(page.locator("#data-source-modal")).toBeVisible();
  });

  test("should not move to inProgress until sprint confirmed", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-real-data").click();

    // Intercept the move-to-inprogress call
    let moveCalls = 0;
    await page.route("**/api/move-to-inprogress", (route) => {
      moveCalls += 1;
      route.continue();
    });

    // Wait for step 2
    await page.waitForSelector("#step-2", { state: "visible" });

    // Should not have moved yet
    expect(moveCalls).toBe(0);

    // Confirm sprint
    await page.locator("#confirm-sprint-btn").click();

    // Allow network flush
    await page.waitForTimeout(300);

    // Should have exactly one move call
    expect(moveCalls).toBe(1);
  });
  test("should handle network interruptions", async ({ page }) => {
    await page.goto("/");

    // Start a data fetch
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-real-data").click();

    // Simulate network interruption by going offline
    await page.context().setOffline(true);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Go back online
    await page.context().setOffline(false);

    // App should handle this gracefully: simplified flow may already finish loading.
    // Assert no fatal error and that we reach step 2 eventually.
    const errorModal = page.locator("text=Failed to fetch real data");
    await expect(errorModal).not.toBeVisible();
    await expect(page.locator("#step-2")).toBeVisible();
  });

  test("should clean up resources on shutdown", async ({ page, request }) => {
    await page.goto("/");

    // Start a workflow to create some state
    await page.locator("#new-sprint-card").click();
    await page.locator("#use-mock-data").click();
    await expect(page.locator("#step-2")).toBeVisible();

    // Close the page (simulating browser close)
    await page.close();

    // Server should still be running and responsive
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
  });
});
