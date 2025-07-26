import { test, expect } from '@playwright/test';

test.describe('Multi-Tenant Data Isolation', () => {
  test('should isolate data between different tenants', async ({ browser }) => {
    // Create two browser contexts for different tenants
    const tenant1Context = await browser.newContext();
    const tenant2Context = await browser.newContext();
    
    const tenant1Page = await tenant1Context.newPage();
    const tenant2Page = await tenant2Context.newPage();

    // Tenant 1: Sign up and create property
    await tenant1Page.goto('/signup');
    await tenant1Page.fill('[data-testid="company-name"]', 'Tenant 1 Properties');
    await tenant1Page.fill('[data-testid="first-name"]', 'Alice');
    await tenant1Page.fill('[data-testid="last-name"]', 'Johnson');
    await tenant1Page.fill('[data-testid="email"]', 'alice@tenant1.com');
    await tenant1Page.fill('[data-testid="password"]', 'Password123!');
    await tenant1Page.fill('[data-testid="confirm-password"]', 'Password123!');
    await tenant1Page.click('[data-testid="signup-submit"]');
    
    await expect(tenant1Page).toHaveURL('/dashboard');
    
    // Create property for Tenant 1
    await tenant1Page.goto('/properties');
    await tenant1Page.click('[data-testid="add-property-button"]');
    await tenant1Page.fill('[data-testid="property-name"]', 'Tenant 1 Villa');
    await tenant1Page.fill('[data-testid="property-address"]', '123 Tenant 1 Street');
    await tenant1Page.fill('[data-testid="property-description"]', 'Tenant 1 exclusive property');
    await tenant1Page.click('[data-testid="save-property"]');
    
    await expect(tenant1Page.locator('[data-testid="success-message"]')).toContainText('Property created successfully');

    // Tenant 2: Sign up and create property
    await tenant2Page.goto('/signup');
    await tenant2Page.fill('[data-testid="company-name"]', 'Tenant 2 Properties');
    await tenant2Page.fill('[data-testid="first-name"]', 'Bob');
    await tenant2Page.fill('[data-testid="last-name"]', 'Smith');
    await tenant2Page.fill('[data-testid="email"]', 'bob@tenant2.com');
    await tenant2Page.fill('[data-testid="password"]', 'Password123!');
    await tenant2Page.fill('[data-testid="confirm-password"]', 'Password123!');
    await tenant2Page.click('[data-testid="signup-submit"]');
    
    await expect(tenant2Page).toHaveURL('/dashboard');
    
    // Create property for Tenant 2
    await tenant2Page.goto('/properties');
    await tenant2Page.click('[data-testid="add-property-button"]');
    await tenant2Page.fill('[data-testid="property-name"]', 'Tenant 2 Apartment');
    await tenant2Page.fill('[data-testid="property-address"]', '456 Tenant 2 Avenue');
    await tenant2Page.fill('[data-testid="property-description"]', 'Tenant 2 exclusive property');
    await tenant2Page.click('[data-testid="save-property"]');
    
    await expect(tenant2Page.locator('[data-testid="success-message"]')).toContainText('Property created successfully');

    // Verify data isolation
    // Tenant 1 should only see their property
    await tenant1Page.goto('/properties');
    await expect(tenant1Page.locator('[data-testid="property-card"]')).toContainText('Tenant 1 Villa');
    await expect(tenant1Page.locator('[data-testid="property-card"]')).not.toContainText('Tenant 2 Apartment');
    
    // Tenant 2 should only see their property
    await tenant2Page.goto('/properties');
    await expect(tenant2Page.locator('[data-testid="property-card"]')).toContainText('Tenant 2 Apartment');
    await expect(tenant2Page.locator('[data-testid="property-card"]')).not.toContainText('Tenant 1 Villa');

    // Clean up
    await tenant1Context.close();
    await tenant2Context.close();
  });

  test('should isolate revenue data between tenants', async ({ browser }) => {
    const tenant1Context = await browser.newContext();
    const tenant2Context = await browser.newContext();
    
    const tenant1Page = await tenant1Context.newPage();
    const tenant2Page = await tenant2Context.newPage();

    // Login as different tenants
    await tenant1Page.goto('/login');
    await tenant1Page.fill('[data-testid="email"]', 'alice@tenant1.com');
    await tenant1Page.fill('[data-testid="password"]', 'Password123!');
    await tenant1Page.click('[data-testid="login-submit"]');

    await tenant2Page.goto('/login');
    await tenant2Page.fill('[data-testid="email"]', 'bob@tenant2.com');
    await tenant2Page.fill('[data-testid="password"]', 'Password123!');
    await tenant2Page.click('[data-testid="login-submit"]');

    // Add revenue for Tenant 1
    await tenant1Page.goto('/revenue');
    await tenant1Page.click('[data-testid="add-revenue-button"]');
    await tenant1Page.fill('[data-testid="guest-name"]', 'Tenant 1 Guest');
    await tenant1Page.selectOption('[data-testid="property-select"]', { label: 'Tenant 1 Villa' });
    await tenant1Page.fill('[data-testid="revenue-amount"]', '500');
    await tenant1Page.fill('[data-testid="check-in"]', '2024-01-01');
    await tenant1Page.fill('[data-testid="check-out"]', '2024-01-03');
    await tenant1Page.click('[data-testid="save-revenue"]');

    // Add revenue for Tenant 2
    await tenant2Page.goto('/revenue');
    await tenant2Page.click('[data-testid="add-revenue-button"]');
    await tenant2Page.fill('[data-testid="guest-name"]', 'Tenant 2 Guest');
    await tenant2Page.selectOption('[data-testid="property-select"]', { label: 'Tenant 2 Apartment' });
    await tenant2Page.fill('[data-testid="revenue-amount"]', '300');
    await tenant2Page.fill('[data-testid="check-in"]', '2024-01-05');
    await tenant2Page.fill('[data-testid="check-out"]', '2024-01-07');
    await tenant2Page.click('[data-testid="save-revenue"]');

    // Verify revenue isolation
    await tenant1Page.goto('/revenue');
    await expect(tenant1Page.locator('[data-testid="revenue-list"]')).toContainText('Tenant 1 Guest');
    await expect(tenant1Page.locator('[data-testid="revenue-list"]')).not.toContainText('Tenant 2 Guest');
    await expect(tenant1Page.locator('[data-testid="total-revenue"]')).toContainText('$500');

    await tenant2Page.goto('/revenue');
    await expect(tenant2Page.locator('[data-testid="revenue-list"]')).toContainText('Tenant 2 Guest');
    await expect(tenant2Page.locator('[data-testid="revenue-list"]')).not.toContainText('Tenant 1 Guest');
    await expect(tenant2Page.locator('[data-testid="total-revenue"]')).toContainText('$300');

    await tenant1Context.close();
    await tenant2Context.close();
  });

  test('should isolate task assignments between tenants', async ({ browser }) => {
    const tenant1Context = await browser.newContext();
    const tenant2Context = await browser.newContext();
    
    const tenant1Page = await tenant1Context.newPage();
    const tenant2Page = await tenant2Context.newPage();

    // Login as different tenants
    await tenant1Page.goto('/login');
    await tenant1Page.fill('[data-testid="email"]', 'alice@tenant1.com');
    await tenant1Page.fill('[data-testid="password"]', 'Password123!');
    await tenant1Page.click('[data-testid="login-submit"]');

    await tenant2Page.goto('/login');
    await tenant2Page.fill('[data-testid="email"]', 'bob@tenant2.com');
    await tenant2Page.fill('[data-testid="password"]', 'Password123!');
    await tenant2Page.click('[data-testid="login-submit"]');

    // Create task for Tenant 1
    await tenant1Page.goto('/tasks');
    await tenant1Page.click('[data-testid="add-task-button"]');
    await tenant1Page.fill('[data-testid="task-title"]', 'Tenant 1 Cleaning Task');
    await tenant1Page.selectOption('[data-testid="property-select"]', { label: 'Tenant 1 Villa' });
    await tenant1Page.fill('[data-testid="due-date"]', '2024-01-15T10:00');
    await tenant1Page.click('[data-testid="save-task"]');

    // Create task for Tenant 2
    await tenant2Page.goto('/tasks');
    await tenant2Page.click('[data-testid="add-task-button"]');
    await tenant2Page.fill('[data-testid="task-title"]', 'Tenant 2 Maintenance Task');
    await tenant2Page.selectOption('[data-testid="property-select"]', { label: 'Tenant 2 Apartment' });
    await tenant2Page.fill('[data-testid="due-date"]', '2024-01-20T14:00');
    await tenant2Page.click('[data-testid="save-task"]');

    // Verify task isolation
    await tenant1Page.goto('/tasks');
    await expect(tenant1Page.locator('[data-testid="task-list"]')).toContainText('Tenant 1 Cleaning Task');
    await expect(tenant1Page.locator('[data-testid="task-list"]')).not.toContainText('Tenant 2 Maintenance Task');

    await tenant2Page.goto('/tasks');
    await expect(tenant2Page.locator('[data-testid="task-list"]')).toContainText('Tenant 2 Maintenance Task');
    await expect(tenant2Page.locator('[data-testid="task-list"]')).not.toContainText('Tenant 1 Cleaning Task');

    await tenant1Context.close();
    await tenant2Context.close();
  });

  test('should prevent cross-tenant API access', async ({ page, request }) => {
    // Login as Tenant 1
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'alice@tenant1.com');
    await page.fill('[data-testid="password"]', 'Password123!');
    await page.click('[data-testid="login-submit"]');

    // Get session cookies
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(cookie => cookie.name.includes('session'));

    // Try to access Tenant 2's data via API (should fail)
    const response = await request.get('/api/properties', {
      headers: {
        'Cookie': `${sessionCookie?.name}=${sessionCookie?.value}`
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    
    // Should only return Tenant 1's properties
    expect(data.properties.every((prop: any) => prop.name.includes('Tenant 1'))).toBe(true);
    expect(data.properties.some((prop: any) => prop.name.includes('Tenant 2'))).toBe(false);
  });

  test('should handle tenant switching (logout/login)', async ({ page }) => {
    // Login as Tenant 1
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'alice@tenant1.com');
    await page.fill('[data-testid="password"]', 'Password123!');
    await page.click('[data-testid="login-submit"]');

    // Verify Tenant 1 data
    await page.goto('/properties');
    await expect(page.locator('[data-testid="property-card"]')).toContainText('Tenant 1 Villa');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Login as Tenant 2
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'bob@tenant2.com');
    await page.fill('[data-testid="password"]', 'Password123!');
    await page.click('[data-testid="login-submit"]');

    // Verify Tenant 2 data (should not see Tenant 1 data)
    await page.goto('/properties');
    await expect(page.locator('[data-testid="property-card"]')).toContainText('Tenant 2 Apartment');
    await expect(page.locator('[data-testid="property-card"]')).not.toContainText('Tenant 1 Villa');
  });

  test('should isolate user management between tenants', async ({ browser }) => {
    const tenant1Context = await browser.newContext();
    const tenant2Context = await browser.newContext();
    
    const tenant1Page = await tenant1Context.newPage();
    const tenant2Page = await tenant2Context.newPage();

    // Login as admin users for both tenants
    await tenant1Page.goto('/login');
    await tenant1Page.fill('[data-testid="email"]', 'alice@tenant1.com');
    await tenant1Page.fill('[data-testid="password"]', 'Password123!');
    await tenant1Page.click('[data-testid="login-submit"]');

    await tenant2Page.goto('/login');
    await tenant2Page.fill('[data-testid="email"]', 'bob@tenant2.com');
    await tenant2Page.fill('[data-testid="password"]', 'Password123!');
    await tenant2Page.click('[data-testid="login-submit"]');

    // Create staff user for Tenant 1
    await tenant1Page.goto('/users');
    await tenant1Page.click('[data-testid="add-user-button"]');
    await tenant1Page.fill('[data-testid="first-name"]', 'Staff');
    await tenant1Page.fill('[data-testid="last-name"]', 'One');
    await tenant1Page.fill('[data-testid="email"]', 'staff1@tenant1.com');
    await tenant1Page.selectOption('[data-testid="role-select"]', 'staff');
    await tenant1Page.fill('[data-testid="password"]', 'StaffPassword123!');
    await tenant1Page.click('[data-testid="save-user"]');

    // Create staff user for Tenant 2
    await tenant2Page.goto('/users');
    await tenant2Page.click('[data-testid="add-user-button"]');
    await tenant2Page.fill('[data-testid="first-name"]', 'Staff');
    await tenant2Page.fill('[data-testid="last-name"]', 'Two');
    await tenant2Page.fill('[data-testid="email"]', 'staff2@tenant2.com');
    await tenant2Page.selectOption('[data-testid="role-select"]', 'staff');
    await tenant2Page.fill('[data-testid="password"]', 'StaffPassword123!');
    await tenant2Page.click('[data-testid="save-user"]');

    // Verify user isolation
    await tenant1Page.goto('/users');
    await expect(tenant1Page.locator('[data-testid="user-list"]')).toContainText('staff1@tenant1.com');
    await expect(tenant1Page.locator('[data-testid="user-list"]')).not.toContainText('staff2@tenant2.com');

    await tenant2Page.goto('/users');
    await expect(tenant2Page.locator('[data-testid="user-list"]')).toContainText('staff2@tenant2.com');
    await expect(tenant2Page.locator('[data-testid="user-list"]')).not.toContainText('staff1@tenant1.com');

    await tenant1Context.close();
    await tenant2Context.close();
  });
});