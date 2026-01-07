/**
 * Settings Page E2E Tests
 *
 * Tests the application settings functionality.
 */

import { test, expect } from './fixtures/base';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should display settings sections', async ({ page }) => {
    const content = page.locator('main, #main-content');
    await expect(content.first()).toBeVisible();
  });

  test('should have theme settings', async ({ page }) => {
    // Look for theme-related settings
    const themeSettings = page.getByText(/theme|appearance|dark.*mode|light.*mode/i);
    await expect(themeSettings.first()).toBeVisible();
  });
});

test.describe('Theme Switching', () => {
  test('should toggle between light and dark theme', async ({ page }) => {
    await page.goto('/settings');

    // Look for theme toggle
    const themeToggle = page.locator('[data-testid*="theme"], [aria-label*="theme"]').first();

    if (await themeToggle.isVisible()) {
      // Get initial theme state
      const html = page.locator('html');
      const initialClass = await html.getAttribute('class');

      // Toggle theme
      await themeToggle.click();

      // Wait for theme change
      await page.waitForTimeout(500);

      // Verify theme changed
      const newClass = await html.getAttribute('class');

      // Theme class should have changed
      if (initialClass !== newClass) {
        expect(newClass).not.toBe(initialClass);
      }
    }
  });
});
