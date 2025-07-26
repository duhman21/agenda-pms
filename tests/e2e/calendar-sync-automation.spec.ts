import { test, expect } from '@playwright/test';

test.describe('Calendar Sync and Task Automation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@testpm.com');
    await page.fill('[data-testid="password"]', 'AdminPassword123!');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should sync iCal calendar and create bookings', async ({ page }) => {
    // Create a property with iCal URL
    await page.goto('/properties');
    await page.click('[data-testid="add-property-button"]');
    await page.fill('[data-testid="property-name"]', 'Sync Test Villa');
    await page.fill('[data-testid="property-address"]', '123 Sync Street');
    await page.fill('[data-testid="property-description"]', 'Property for testing calendar sync');
    await page.fill('[data-testid="ical-url"]', 'https://calendar.google.com/calendar/ical/test%40example.com/public/basic.ics');
    await page.click('[data-testid="save-property"]');

    await expect(page.locator('[data-testid="success-message"]')).toContainText('Property created successfully');

    // Navigate to calendar sync page
    await page.goto('/calendar');
    
    // Find the property and trigger sync
    const propertyRow = page.locator('[data-testid="property-sync-row"]:has-text("Sync Test Villa")');
    await propertyRow.locator('[data-testid="sync-now-button"]').click();

    // Should show sync in progress
    await expect(propertyRow.locator('[data-testid="sync-status"]')).toContainText('Syncing...');

    // Wait for sync to complete
    await expect(propertyRow.locator('[data-testid="sync-status"]')).toContainText('Last synced:', { timeout: 30000 });

    // Check that bookings were created
    await page.goto('/calendar/bookings');
    await expect(page.locator('[data-testid="booking-list"]')).toContainText('Sync Test Villa');

    // Verify booking details
    const bookingCard = page.locator('[data-testid="booking-card"]').first();
    await expect(bookingCard).toBeVisible();
    await expect(bookingCard.locator('[data-testid="property-name"]')).toContainText('Sync Test Villa');
    await expect(bookingCard.locator('[data-testid="booking-source"]')).toContainText('ical');
  });

  test('should detect and prevent booking overlaps', async ({ page }) => {
    // Navigate to bookings and create a manual booking
    await page.goto('/calendar/bookings');
    await page.click('[data-testid="add-booking-button"]');
    
    await page.selectOption('[data-testid="property-select"]', { label: 'Sync Test Villa' });
    await page.fill('[data-testid="guest-name"]', 'Manual Guest');
    await page.fill('[data-testid="check-in"]', '2024-02-01');
    await page.fill('[data-testid="check-out"]', '2024-02-03');
    await page.fill('[data-testid="revenue"]', '300');
    await page.selectOption('[data-testid="source-select"]', 'manual');
    
    await page.click('[data-testid="save-booking"]');
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Booking created successfully');

    // Try to create an overlapping booking
    await page.click('[data-testid="add-booking-button"]');
    
    await page.selectOption('[data-testid="property-select"]', { label: 'Sync Test Villa' });
    await page.fill('[data-testid="guest-name"]', 'Overlapping Guest');
    await page.fill('[data-testid="check-in"]', '2024-02-02'); // Overlaps with previous booking
    await page.fill('[data-testid="check-out"]', '2024-02-04');
    await page.fill('[data-testid="revenue"]', '250');
    
    await page.click('[data-testid="save-booking"]');

    // Should show overlap warning
    await expect(page.locator('[data-testid="overlap-warning"]')).toContainText('This booking overlaps with existing booking');
    await expect(page.locator('[data-testid="existing-booking-details"]')).toContainText('Manual Guest');

    // Should provide options to resolve conflict
    await expect(page.locator('[data-testid="resolve-conflict-options"]')).toBeVisible();
    await expect(page.locator('[data-testid="force-create-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="modify-dates-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="cancel-booking-button"]')).toBeVisible();
  });

  test('should automatically generate tasks from bookings', async ({ page }) => {
    // Create a booking that should trigger task generation
    await page.goto('/calendar/bookings');
    await page.click('[data-testid="add-booking-button"]');
    
    await page.selectOption('[data-testid="property-select"]', { label: 'Sync Test Villa' });
    await page.fill('[data-testid="guest-name"]', 'Task Generation Guest');
    await page.fill('[data-testid="check-in"]', '2024-02-10');
    await page.fill('[data-testid="check-out"]', '2024-02-12');
    await page.fill('[data-testid="revenue"]', '400');
    
    await page.click('[data-testid="save-booking"]');
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Booking created successfully');

    // Check that tasks were automatically generated
    await page.goto('/tasks');
    
    // Should have pre-arrival tasks
    await expect(page.locator('[data-testid="task-list"]')).toContainText('Pre-arrival preparation');
    await expect(page.locator('[data-testid="task-list"]')).toContainText('Sync Test Villa');
    
    // Should have checkout tasks
    await expect(page.locator('[data-testid="task-list"]')).toContainText('Post-checkout cleaning');
    await expect(page.locator('[data-testid="task-list"]')).toContainText('Post-checkout inspection');

    // Verify task details
    const cleaningTask = page.locator('[data-testid="task-card"]:has-text("Post-checkout cleaning")');
    await cleaningTask.click();
    
    await expect(page.locator('[data-testid="task-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-property"]')).toContainText('Sync Test Villa');
    await expect(page.locator('[data-testid="task-due-date"]')).toContainText('Feb 12, 2024'); // Should be checkout date
    await expect(page.locator('[data-testid="auto-generated-badge"]')).toBeVisible();
  });

  test('should handle task assignment and completion workflow', async ({ page }) => {
    // Navigate to tasks
    await page.goto('/tasks');
    
    // Assign a task to staff member
    const unassignedTask = page.locator('[data-testid="task-card"]:has-text("Unassigned")').first();
    await unassignedTask.locator('[data-testid="assign-task"]').click();
    
    await page.selectOption('[data-testid="staff-select"]', { label: 'Staff Member' });
    await page.click('[data-testid="save-assignment"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Task assigned successfully');

    // Logout as admin and login as staff
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'staff@testpm.com');
    await page.fill('[data-testid="password"]', 'StaffPassword123!');
    await page.click('[data-testid="login-submit"]');

    // Staff should see assigned tasks
    await page.goto('/tasks');
    await expect(page.locator('[data-testid="assigned-tasks"]')).toBeVisible();
    
    // Mark task as in progress
    const assignedTask = page.locator('[data-testid="task-card"]').first();
    await assignedTask.locator('[data-testid="start-task"]').click();
    
    await expect(assignedTask.locator('[data-testid="task-status"]')).toContainText('In Progress');

    // Complete the task
    await assignedTask.locator('[data-testid="complete-task"]').click();
    await page.fill('[data-testid="completion-notes"]', 'Task completed successfully. Property is ready for next guest.');
    await page.click('[data-testid="confirm-completion"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Task completed successfully');
    await expect(assignedTask.locator('[data-testid="task-status"]')).toContainText('Completed');
  });

  test('should show task calendar view with scheduling', async ({ page }) => {
    await page.goto('/tasks/calendar');
    
    // Should show calendar view
    await expect(page.locator('[data-testid="task-calendar"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-month-view"]')).toBeVisible();

    // Should show tasks on their due dates
    await expect(page.locator('[data-testid="calendar-day"]:has-text("12") [data-testid="task-indicator"]')).toBeVisible();

    // Click on a day with tasks
    await page.click('[data-testid="calendar-day"]:has-text("12")');
    
    // Should show day's tasks
    await expect(page.locator('[data-testid="day-tasks-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="day-tasks-list"]')).toContainText('Post-checkout cleaning');

    // Should be able to reschedule tasks
    const taskInModal = page.locator('[data-testid="day-tasks-list"] [data-testid="task-item"]').first();
    await taskInModal.locator('[data-testid="reschedule-task"]').click();
    
    await page.fill('[data-testid="new-due-date"]', '2024-02-13T10:00');
    await page.click('[data-testid="save-reschedule"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Task rescheduled successfully');
  });

  test('should handle overdue task notifications', async ({ page }) => {
    // Create a task with past due date
    await page.goto('/tasks');
    await page.click('[data-testid="add-task-button"]');
    
    await page.fill('[data-testid="task-title"]', 'Overdue Test Task');
    await page.selectOption('[data-testid="property-select"]', { label: 'Sync Test Villa' });
    await page.fill('[data-testid="due-date"]', '2024-01-01T10:00'); // Past date
    await page.selectOption('[data-testid="assign-to"]', { label: 'Staff Member' });
    
    await page.click('[data-testid="save-task"]');

    // Should show overdue notification
    await expect(page.locator('[data-testid="overdue-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="overdue-count"]')).toContainText('1 overdue task');

    // Click on overdue notification
    await page.click('[data-testid="overdue-notification"]');
    
    // Should show overdue tasks modal
    await expect(page.locator('[data-testid="overdue-tasks-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="overdue-task-list"]')).toContainText('Overdue Test Task');
    
    // Should highlight overdue status
    const overdueTask = page.locator('[data-testid="overdue-task-item"]');
    await expect(overdueTask).toHaveClass(/overdue/);
    await expect(overdueTask.locator('[data-testid="overdue-badge"]')).toBeVisible();
  });

  test('should sync calendar changes and update tasks', async ({ page }) => {
    // Simulate a booking change that affects tasks
    await page.goto('/calendar/bookings');
    
    // Edit an existing booking to change checkout date
    const existingBooking = page.locator('[data-testid="booking-card"]').first();
    await existingBooking.locator('[data-testid="edit-booking"]').click();
    
    // Change checkout date
    await page.fill('[data-testid="check-out"]', '2024-02-14'); // Extended stay
    await page.click('[data-testid="save-booking"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Booking updated successfully');

    // Check that related tasks were updated
    await page.goto('/tasks');
    
    // Post-checkout tasks should now be scheduled for the new date
    const checkoutTask = page.locator('[data-testid="task-card"]:has-text("Post-checkout cleaning")');
    await expect(checkoutTask.locator('[data-testid="due-date"]')).toContainText('Feb 14, 2024');
  });

  test('should handle calendar export functionality', async ({ page }) => {
    await page.goto('/calendar');
    
    // Should show export options
    await expect(page.locator('[data-testid="export-calendar"]')).toBeVisible();
    
    // Export iCal for a specific property
    const propertyRow = page.locator('[data-testid="property-sync-row"]').first();
    await propertyRow.locator('[data-testid="export-ical"]').click();
    
    // Should generate download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-ical"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/\.ics$/);
    
    // Verify export URL is accessible
    await page.goto('/calendar/export/property-id');
    await expect(page.locator('body')).toContainText('BEGIN:VCALENDAR');
  });

  test('should show unified calendar view with all bookings', async ({ page }) => {
    await page.goto('/calendar/unified');
    
    // Should show unified calendar
    await expect(page.locator('[data-testid="unified-calendar"]')).toBeVisible();
    
    // Should show bookings from all sources
    await expect(page.locator('[data-testid="booking-event"]')).toBeVisible();
    
    // Should be able to filter by source
    await page.selectOption('[data-testid="source-filter"]', 'airbnb');
    await expect(page.locator('[data-testid="booking-event"][data-source="airbnb"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-event"][data-source="booking.com"]')).not.toBeVisible();
    
    // Should be able to filter by property
    await page.selectOption('[data-testid="property-filter"]', 'Sync Test Villa');
    await expect(page.locator('[data-testid="booking-event"][data-property="Sync Test Villa"]')).toBeVisible();
    
    // Should show booking details on click
    await page.click('[data-testid="booking-event"]');
    await expect(page.locator('[data-testid="booking-details-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="guest-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-dates"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-revenue"]')).toBeVisible();
  });

  test('should handle sync errors gracefully', async ({ page }) => {
    // Create property with invalid iCal URL
    await page.goto('/properties');
    await page.click('[data-testid="add-property-button"]');
    await page.fill('[data-testid="property-name"]', 'Error Test Property');
    await page.fill('[data-testid="property-address"]', '456 Error Street');
    await page.fill('[data-testid="ical-url"]', 'https://invalid-url.com/calendar.ics');
    await page.click('[data-testid="save-property"]');

    // Try to sync
    await page.goto('/calendar');
    const errorPropertyRow = page.locator('[data-testid="property-sync-row"]:has-text("Error Test Property")');
    await errorPropertyRow.locator('[data-testid="sync-now-button"]').click();

    // Should show error status
    await expect(errorPropertyRow.locator('[data-testid="sync-status"]')).toContainText('Sync failed', { timeout: 30000 });
    await expect(errorPropertyRow.locator('[data-testid="sync-error"]')).toBeVisible();
    
    // Should show error details
    await errorPropertyRow.locator('[data-testid="view-error"]').click();
    await expect(page.locator('[data-testid="error-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to fetch calendar');
    
    // Should allow retry
    await page.click('[data-testid="retry-sync"]');
    await expect(errorPropertyRow.locator('[data-testid="sync-status"]')).toContainText('Syncing...');
  });
});