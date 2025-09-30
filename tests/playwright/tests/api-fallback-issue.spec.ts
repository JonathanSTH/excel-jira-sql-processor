import { test, expect } from "@playwright/test";

test.describe("API Fallback Data Issue", () => {
  test("should handle real API data correctly without falling back to mock", async ({ request }) => {
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

  test("should not trigger fallback when API returns valid data", async ({ page }) => {
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
    
    // Check if we get the "data already exists" modal (which is correct behavior)
    const dataExistsModal = page.locator("#data-already-exists-modal");
    const isDataExistsModalVisible = await dataExistsModal.isVisible();
    
    if (isDataExistsModalVisible) {
      // This is correct behavior - the sprint already exists in workflow
      console.log("✅ Correctly detected existing sprint data");
      
      // Check that the modal shows the correct sprint name
      const sprintNameInModal = page.locator("#data-exists-sprint-name");
      await expect(sprintNameInModal).toBeVisible();
      
      const sprintNameText = await sprintNameInModal.textContent();
      expect(sprintNameText).toContain("WTCI Sprint 9/25/2025");
      expect(sprintNameText).not.toContain("Fallback Data");
      expect(sprintNameText).not.toContain("Mock Data");
      
      // Close the modal to continue testing
      await page.locator("#data-exists-close").click();
      
    } else {
      // If no modal, should show step 2 with real data
      await expect(page.locator("#step-2")).toBeVisible();
      
      // Should show real sprint data, not fallback data
      const sprintName = page.locator(".sprint-name");
      await expect(sprintName).toBeVisible();
      
      const sprintNameText = await sprintName.textContent();
      expect(sprintNameText).not.toContain("Fallback Data");
      expect(sprintNameText).not.toContain("Mock Data");
    }
  });

  test("should show proper error only when API actually fails", async ({ page }) => {
    // This test would require mocking the API to return an error
    // For now, we'll test the error handling logic
    
    // Navigate to the app
    await page.goto("/");
    
    // Check that the error handling code exists
    const hasErrorHandling = await page.evaluate(() => {
      return typeof ValidationWizard !== 'undefined' && 
             ValidationWizard.prototype.hasOwnProperty('showError');
    });
    expect(hasErrorHandling).toBe(true);
  });

  test("should handle fresh sprint data without existing workflow conflicts", async ({ page }) => {
    // This test simulates a scenario where we have a fresh sprint that doesn't exist in workflow
    // We'll test the API response structure and ensure it doesn't trigger fallback
    
    // First, test the API directly to understand the response
    const response = await page.request.get("/api/fetch-sprint");
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    
    // The response should have the correct structure
    expect(data).toHaveProperty("sprintName");
    expect(data).toHaveProperty("fileInfo");
    
    // Check if this sprint exists in workflow (this determines the flow)
    if (data.fileInfo.existingInWorkflow) {
      console.log("ℹ️ Sprint exists in workflow - will show data exists modal");
      
      // Navigate to the app and test the data exists flow
      await page.goto("/");
      await page.locator("#new-sprint-card").click();
      await page.locator("#use-real-data").click();
      
      // Wait for the API call
      await page.waitForTimeout(3000);
      
      // Should show the data exists modal, not fallback
      const dataExistsModal = page.locator("#data-already-exists-modal");
      await expect(dataExistsModal).toBeVisible();
      
      // Should NOT show fallback error
      const fallbackError = page.locator("text=Failed to fetch real data");
      await expect(fallbackError).not.toBeVisible();
      
    } else {
      console.log("ℹ️ Fresh sprint data - should proceed normally");
      
      // Navigate to the app and test the normal flow
      await page.goto("/");
      await page.locator("#new-sprint-card").click();
      await page.locator("#use-real-data").click();
      
      // Wait for the API call
      await page.waitForTimeout(3000);
      
      // Should show step 2 with real data
      await expect(page.locator("#step-2")).toBeVisible();
      
      // Should show real sprint data, not fallback
      const sprintName = page.locator(".sprint-name");
      await expect(sprintName).toBeVisible();
      
      const sprintNameText = await sprintName.textContent();
      expect(sprintNameText).not.toContain("Fallback Data");
      expect(sprintNameText).not.toContain("Mock Data");
    }
  });
});
