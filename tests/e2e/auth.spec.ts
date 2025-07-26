import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/');
  });

  test('should allow tenant signup and login', async ({ page }) => {
    // Navigate to signup page
    await page.click('text=Sign Up');
    await expect(page).toHaveURL('/signup');

    // Fill out tenant signup form
    await page.fill('[data-testid="company-name"]', 'Test Property Management');
    await page.fill('[data-testid="first-name"]', 'John');
    await page.fill('[data-testid="last-name"]', 'Doe');
    await page.fill('[data-testid="email"]', 'john@testpm.com');
    await page.fill('[data-testid="password"]', 'SecurePassword123!');
    await page.fill('[data-testid="confirm-password"]', 'SecurePassword123!');

    // Submit signup form
    await page.click('[data-testid="signup-submit"]');

    // Should redirect to dashboard after successful signup
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome, John');
  });

  test('should validate signup form fields', async ({ page }) => {
    await page.click('text=Sign Up');
    
    // Try to submit empty form
    await page.click('[data-testid="signup-submit"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="company-name-error"]')).toContainText('Company name is required');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');
  });

  test('should validate password confirmation', async ({ page }) => {
    await page.click('text=Sign Up');
    
    // Fill form with mismatched passwords
    await page.fill('[data-testid="company-name"]', 'Test Company');
    await page.fill('[data-testid="first-name"]', 'John');
    await page.fill('[data-testid="last-name"]', 'Doe');
    await page.fill('[data-testid="email"]', 'john@test.com');
    await page.fill('[data-testid="password"]', 'Password123!');
    await page.fill('[data-testid="confirm-password"]', 'DifferentPassword123!');
    
    await page.click('[data-testid="signup-submit"]');
    
    await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('Passwords do not match');
  });

  test('should allow existing user login', async ({ page }) => {
    // Navigate to login page
    await page.click('text=Sign In');
    await expect(page).toHaveURL('/login');

    // Fill login form
    await page.fill('[data-testid="email"]', 'admin@testpm.com');
    await page.fill('[data-testid="password"]', 'AdminPassword123!');

    // Submit login form
    await page.click('[data-testid="login-submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.click('text=Sign In');
    
    // Fill with invalid credentials
    await page.fill('[data-testid="email"]', 'invalid@test.com');
    await page.fill('[data-testid="password"]', 'WrongPassword');
    
    await page.click('[data-testid="login-submit"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid credentials');
  });

  test('should allow user logout', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@testpm.com');
    await page.fill('[data-testid="password"]', 'AdminPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to home page
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Sign In')).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@testpm.com');
    await page.fill('[data-testid="password"]', 'AdminPassword123!');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Refresh page
    await page.reload();
    
    // Should still be authenticated
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});