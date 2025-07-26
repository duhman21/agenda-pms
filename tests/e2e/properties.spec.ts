import { test, expect } from '@playwright/test';

test.describe('Property Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@testpm.com');
    await page.fill('[data-testid="password"]', 'AdminPassword123!');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display properties list', async ({ page }) => {
    await page.goto('/properties');
    
    // Should show properties page
    await expect(page.locator('h1')).toContainText('Properties');
    await expect(page.locator('[data-testid="properties-list"]')).toBeVisible();
    
    // Should show add property button
    await expect(page.locator('[data-testid="add-property-button"]')).toBeVisible();
  });

  test('should create new property', async ({ page }) => {
    await page.goto('/properties');
    
    // Click add property button
    await page.click('[data-testid="add-property-button"]');
    
    // Fill property form
    await page.fill('[data-testid="property-name"]', 'Sunset Beach Villa');
    await page.fill('[data-testid="property-address"]', '123 Ocean Drive, Miami, FL 33139');
    await page.fill('[data-testid="property-description"]', 'Beautiful beachfront villa with ocean views');
    await page.fill('[data-testid="ical-url"]', 'https://airbnb.com/calendar/sunset-villa.ics');
    
    // Submit form
    await page.click('[data-testid="save-property"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Property created successfully');
    
    // Should appear in properties list
    await expect(page.locator('[data-testid="property-card"]')).toContainText('Sunset Beach Villa');
  });

  test('should validate property form', async ({ page }) => {
    await page.goto('/properties');
    await page.click('[data-testid="add-property-button"]');
    
    // Try to submit empty form
    await page.click('[data-testid="save-property"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="property-name-error"]')).toContainText('Property name is required');
    await expect(page.locator('[data-testid="property-address-error"]')).toContainText('Address is required');
  });

  test('should edit existing property', async ({ page }) => {
    await page.goto('/properties');
    
    // Click edit button on first property
    await page.click('[data-testid="property-card"]:first-child [data-testid="edit-property"]');
    
    // Update property name
    await page.fill('[data-testid="property-name"]', 'Updated Villa Name');
    
    // Save changes
    await page.click('[data-testid="save-property"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Property updated successfully');
    
    // Should show updated name
    await expect(page.locator('[data-testid="property-card"]')).toContainText('Updated Villa Name');
  });

  test('should delete property', async ({ page }) => {
    await page.goto('/properties');
    
    // Get initial property count
    const initialCount = await page.locator('[data-testid="property-card"]').count();
    
    // Click delete button on first property
    await page.click('[data-testid="property-card"]:first-child [data-testid="delete-property"]');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Property deleted successfully');
    
    // Should have one less property
    await expect(page.locator('[data-testid="property-card"]')).toHaveCount(initialCount - 1);
  });

  test('should search properties', async ({ page }) => {
    await page.goto('/properties');
    
    // Type in search box
    await page.fill('[data-testid="property-search"]', 'Villa');
    
    // Should filter properties
    await expect(page.locator('[data-testid="property-card"]')).toContainText('Villa');
    
    // Clear search
    await page.fill('[data-testid="property-search"]', '');
    
    // Should show all properties again
    const allPropertiesCount = await page.locator('[data-testid="property-card"]').count();
    expect(allPropertiesCount).toBeGreaterThan(0);
  });

  test('should manage property owners', async ({ page }) => {
    await page.goto('/properties');
    
    // Click on property to view details
    await page.click('[data-testid="property-card"]:first-child');
    
    // Should show property details
    await expect(page.locator('[data-testid="property-details"]')).toBeVisible();
    
    // Click manage owners
    await page.click('[data-testid="manage-owners"]');
    
    // Add new owner
    await page.click('[data-testid="add-owner"]');
    await page.fill('[data-testid="owner-email"]', 'owner@example.com');
    await page.fill('[data-testid="ownership-percentage"]', '50');
    await page.click('[data-testid="save-owner"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Owner added successfully');
    
    // Should appear in owners list
    await expect(page.locator('[data-testid="owner-list"]')).toContainText('owner@example.com');
    await expect(page.locator('[data-testid="owner-list"]')).toContainText('50%');
  });

  test('should validate ownership percentages', async ({ page }) => {
    await page.goto('/properties');
    await page.click('[data-testid="property-card"]:first-child');
    await page.click('[data-testid="manage-owners"]');
    
    // Try to add owner with invalid percentage
    await page.click('[data-testid="add-owner"]');
    await page.fill('[data-testid="owner-email"]', 'owner@example.com');
    await page.fill('[data-testid="ownership-percentage"]', '150');
    await page.click('[data-testid="save-owner"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="percentage-error"]')).toContainText('Ownership percentage cannot exceed 100%');
  });

  test('should show iCal sync status', async ({ page }) => {
    await page.goto('/properties');
    
    // Should show sync status for properties with iCal URLs
    await expect(page.locator('[data-testid="property-card"] [data-testid="sync-status"]')).toBeVisible();
    
    // Click sync now button
    await page.click('[data-testid="property-card"]:first-child [data-testid="sync-now"]');
    
    // Should show sync in progress
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Syncing...');
    
    // Should show sync completed
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Last synced:', { timeout: 10000 });
  });

  test('should handle pagination', async ({ page }) => {
    await page.goto('/properties');
    
    // If there are multiple pages
    const nextButton = page.locator('[data-testid="next-page"]');
    if (await nextButton.isVisible()) {
      const firstPageFirstProperty = await page.locator('[data-testid="property-card"]:first-child').textContent();
      
      // Go to next page
      await nextButton.click();
      
      // Should show different properties
      const secondPageFirstProperty = await page.locator('[data-testid="property-card"]:first-child').textContent();
      expect(firstPageFirstProperty).not.toBe(secondPageFirstProperty);
      
      // Go back to first page
      await page.click('[data-testid="prev-page"]');
      
      // Should show original properties
      await expect(page.locator('[data-testid="property-card"]:first-child')).toContainText(firstPageFirstProperty || '');
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/properties');
    
    // Should show mobile-optimized layout
    await expect(page.locator('[data-testid="mobile-property-list"]')).toBeVisible();
    
    // Should show mobile navigation
    await expect(page.locator('[data-testid="mobile-nav-toggle"]')).toBeVisible();
    
    // Click mobile menu
    await page.click('[data-testid="mobile-nav-toggle"]');
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
  });
});