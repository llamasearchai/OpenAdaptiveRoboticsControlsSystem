/**
 * Safety Page E2E Tests
 *
 * Tests the safety configuration and monitoring.
 */

import { test, expect } from './fixtures/base';

test.describe('Safety Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/safety');
  });

  test('should display safety page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should display safety status or configuration', async ({ page }) => {
    const content = page.locator('main, #main-content');
    await expect(content.first()).toBeVisible();
  });

  test('should have safety controls or settings', async ({ page }) => {
    // Look for safety-related controls
    const safetyContent = page.getByText(/safety|limit|constraint|filter/i);
    await expect(safetyContent.first()).toBeVisible();
  });
});
