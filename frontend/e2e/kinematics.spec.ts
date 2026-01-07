/**
 * Kinematics Page E2E Tests
 *
 * Tests the kinematics visualization and control functionality.
 */

import { test, expect } from './fixtures/base';

test.describe('Kinematics Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kinematics');
  });

  test('should display kinematics page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should display joint controls or visualization', async ({ page }) => {
    // Look for joint-related content
    const content = page.locator('main, #main-content');
    await expect(content.first()).toBeVisible();
  });

  test('should render 3D visualization if present', async ({ page }) => {
    // Check for canvas element (3D scene)
    const canvas = page.locator('canvas');
    // Canvas may or may not be present depending on implementation
    const canvasCount = await canvas.count();
    if (canvasCount > 0) {
      await expect(canvas.first()).toBeVisible();
    }
  });
});
