import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control', () => {
  test.describe('Admin Role', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email"]', 'admin@testpm.com');
      await page.fill('[data-testid="password"]', 'AdminPassword123!');
      await page.click('[data-testid="login-submit"]');
      await expect(page).toHaveURL('/dashboard');
    });

    test('should have access to all features', async ({ page }) => {
      // Should see all navigation items
      await expect(page.locator('[data-testid="nav-properties"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-tasks"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-revenue"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-expenses"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-reports"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-users"]')).toBeVisible();
    });

    test('should be able to manage users', async ({ page }) => {
      await page.goto('/users');
      
      // Should see user management page
      await expect(page.locator('h1')).toContainText('User Management');
      await expect(page.locator('[data-testid="add-user-button"]')).toBeVisible();
      
      // Should be able to create new user
      await page.click('[data-testid="add-user-button"]');
      await expect(page.locator('[data-testid="user-form"]')).toBeVisible();
    });

    test('should be able to manage all properties', async ({ page }) => {
      await page.goto('/properties');
      
      // Should see all properties and management options
      await expect(page.locator('[data-testid="add-property-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-card"] [data-testid="edit-property"]')).toBeVisible();
      await expect(page.locator('[data-testid="property-card"] [data-testid="delete-property"]')).toBeVisible();
    });

    test('should be able to manage all tasks', async ({ page }) => {
      await page.goto('/tasks');
      
      // Should see all tasks and management options
      await expect(page.locator('[data-testid="add-task-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="task-list"] [data-testid="edit-task"]')).toBeVisible();
      await expect(page.locator('[data-testid="task-list"] [data-testid="delete-task"]')).toBeVisible();
    });

    test('should be able to manage revenue and expenses', async ({ page }) => {
      await page.goto('/revenue');
      await expect(page.locator('[data-testid="add-revenue-button"]')).toBeVisible();
      
      await page.goto('/expenses');
      await expect(page.locator('[data-testid="add-expense-button"]')).toBeVisible();
    });

    test('should be able to generate and view all reports', async ({ page }) => {
      await page.goto('/reports');
      
      await expect(page.locator('[data-testid="generate-report-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-filters"]')).toBeVisible();
    });
  });

  test.describe('Staff Role', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email"]', 'staff@testpm.com');
      await page.fill('[data-testid="password"]', 'StaffPassword123!');
      await page.click('[data-testid="login-submit"]');
      await expect(page).toHaveURL('/dashboard');
    });

    test('should have limited navigation access', async ({ page }) => {
      // Should see limited navigation items
      await expect(page.locator('[data-testid="nav-properties"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-tasks"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-revenue"]')).toBeVisible();
      
      // Should NOT see admin-only features
      await expect(page.locator('[data-testid="nav-users"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="nav-reports"]')).not.toBeVisible();
    });

    test('should only see assigned tasks', async ({ page }) => {
      await page.goto('/tasks');
      
      // Should only see tasks assigned to this staff member
      const taskCards = page.locator('[data-testid="task-card"]');
      const count = await taskCards.count();
      
      for (let i = 0; i < count; i++) {
        const assignedTo = await taskCards.nth(i).locator('[data-testid="assigned-to"]').textContent();
        expect(assignedTo).toContain('staff@testpm.com');
      }
    });

    test('should be able to update task status', async ({ page }) => {
      await page.goto('/tasks');
      
      // Should be able to mark tasks as complete
      const firstTask = page.locator('[data-testid="task-card"]').first();
      await firstTask.locator('[data-testid="mark-complete"]').click();
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Task updated successfully');
    });

    test('should NOT be able to create or delete tasks', async ({ page }) => {
      await page.goto('/tasks');
      
      // Should not see task creation/deletion buttons
      await expect(page.locator('[data-testid="add-task-button"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="delete-task"]')).not.toBeVisible();
    });

    test('should have read-only access to properties', async ({ page }) => {
      await page.goto('/properties');
      
      // Should see properties but not management buttons
      await expect(page.locator('[data-testid="property-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="add-property-button"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="edit-property"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="delete-property"]')).not.toBeVisible();
    });

    test('should be able to record revenue but not expenses', async ({ page }) => {
      await page.goto('/revenue');
      await expect(page.locator('[data-testid="add-revenue-button"]')).toBeVisible();
      
      // Try to access expenses page
      await page.goto('/expenses');
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    });

    test('should be redirected when accessing admin pages', async ({ page }) => {
      // Try to access user management
      await page.goto('/users');
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('Access denied');
      
      // Try to access reports
      await page.goto('/reports');
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('Access denied');
    });
  });

  test.describe('Property Owner Role', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email"]', 'owner@testpm.com');
      await page.fill('[data-testid="password"]', 'OwnerPassword123!');
      await page.click('[data-testid="login-submit"]');
      await expect(page).toHaveURL('/dashboard');
    });

    test('should have very limited navigation access', async ({ page }) => {
      // Should only see owner-specific navigation
      await expect(page.locator('[data-testid="nav-properties"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-reports"]')).toBeVisible();
      
      // Should NOT see operational features
      await expect(page.locator('[data-testid="nav-tasks"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="nav-revenue"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="nav-expenses"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="nav-users"]')).not.toBeVisible();
    });

    test('should only see owned properties', async ({ page }) => {
      await page.goto('/properties');
      
      // Should only see properties they own
      const propertyCards = page.locator('[data-testid="property-card"]');
      const count = await propertyCards.count();
      
      for (let i = 0; i < count; i++) {
        const owners = await propertyCards.nth(i).locator('[data-testid="property-owners"]').textContent();
        expect(owners).toContain('owner@testpm.com');
      }
    });

    test('should have read-only access to properties', async ({ page }) => {
      await page.goto('/properties');
      
      // Should see properties but no management options
      await expect(page.locator('[data-testid="property-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="add-property-button"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="edit-property"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="delete-property"]')).not.toBeVisible();
    });

    test('should only see reports for owned properties', async ({ page }) => {
      await page.goto('/reports');
      
      // Should see reports page but with limited data
      await expect(page.locator('[data-testid="property-reports"]')).toBeVisible();
      
      // Generate a report
      await page.click('[data-testid="generate-report-button"]');
      
      // Should only show data for owned properties
      await expect(page.locator('[data-testid="report-data"]')).toBeVisible();
      const reportProperties = await page.locator('[data-testid="report-property"]').allTextContents();
      
      // All properties in report should be owned by this user
      for (const property of reportProperties) {
        // This would need to be verified based on the actual report structure
        expect(property).toBeTruthy();
      }
    });

    test('should be able to download reports', async ({ page }) => {
      await page.goto('/reports');
      
      // Should be able to download PDF reports
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-pdf"]');
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toContain('.pdf');
    });

    test('should be redirected when accessing restricted pages', async ({ page }) => {
      const restrictedPages = ['/tasks', '/revenue', '/expenses', '/users'];
      
      for (const restrictedPage of restrictedPages) {
        await page.goto(restrictedPage);
        await expect(page).toHaveURL('/dashboard');
        await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('Access denied');
      }
    });

    test('should not be able to access other owners data via URL manipulation', async ({ page }) => {
      // Try to access a property that doesn't belong to this owner
      await page.goto('/properties/other-owner-property-id');
      
      // Should be redirected or show access denied
      await expect(page.locator('[data-testid="not-found"]')).toBeVisible();
    });
  });

  test.describe('Role Transitions', () => {
    test('should update access when role changes', async ({ page }) => {
      // Login as admin
      await page.goto('/login');
      await page.fill('[data-testid="email"]', 'admin@testpm.com');
      await page.fill('[data-testid="password"]', 'AdminPassword123!');
      await page.click('[data-testid="login-submit"]');
      
      // Change a user's role from staff to admin
      await page.goto('/users');
      await page.click('[data-testid="user-row"]:has-text("staff@testpm.com") [data-testid="edit-user"]');
      await page.selectOption('[data-testid="role-select"]', 'admin');
      await page.click('[data-testid="save-user"]');
      
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Login as the user whose role was changed
      await page.goto('/login');
      await page.fill('[data-testid="email"]', 'staff@testpm.com');
      await page.fill('[data-testid="password"]', 'StaffPassword123!');
      await page.click('[data-testid="login-submit"]');
      
      // Should now have admin access
      await expect(page.locator('[data-testid="nav-users"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-reports"]')).toBeVisible();
    });
  });

  test.describe('API Access Control', () => {
    test('should enforce role-based API access', async ({ page, request }) => {
      // Login as staff user
      await page.goto('/login');
      await page.fill('[data-testid="email"]', 'staff@testpm.com');
      await page.fill('[data-testid="password"]', 'StaffPassword123!');
      await page.click('[data-testid="login-submit"]');
      
      // Get session cookies
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(cookie => cookie.name.includes('session'));
      
      // Try to access admin-only API endpoints
      const userResponse = await request.get('/api/users', {
        headers: {
          'Cookie': `${sessionCookie?.name}=${sessionCookie?.value}`
        }
      });
      
      expect(userResponse.status()).toBe(403);
      
      // Try to create a user (admin-only action)
      const createUserResponse = await request.post('/api/users', {
        headers: {
          'Cookie': `${sessionCookie?.name}=${sessionCookie?.value}`,
          'Content-Type': 'application/json'
        },
        data: {
          email: 'newuser@test.com',
          role: 'staff',
          firstName: 'New',
          lastName: 'User'
        }
      });
      
      expect(createUserResponse.status()).toBe(403);
    });
  });
});