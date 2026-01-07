/**
 * Simulator Page E2E Tests
 *
 * Tests the 3D simulator functionality.
 */

import { test, expect } from './fixtures/base';

test.describe('Simulator Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/simulator');
  });

  test('should display simulator page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should render 3D canvas', async ({ page }) => {
    // 3D scenes typically render to a canvas element
    const canvas = page.locator('canvas');
    // Canvas might take a moment to initialize
    await expect(canvas.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have simulation controls', async ({ page }) => {
    // Look for control buttons or panels
    const controls = page.locator('[data-testid*="control"], button, [role="button"]');
    await expect(controls.first()).toBeVisible();
  });
});

test.describe('Simulator - WebGL Support', () => {
  test('should handle WebGL context', async ({ page }) => {
    await page.goto('/simulator');

    // Check that no WebGL error messages are shown
    const errorText = page.getByText(/webgl.*not supported|webgl.*error/i);
    await expect(errorText).not.toBeVisible();
  });
});
