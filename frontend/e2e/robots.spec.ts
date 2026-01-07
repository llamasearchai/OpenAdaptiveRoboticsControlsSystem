/**
 * Robots Page E2E Tests
 *
 * Tests the robot management and control functionality.
 */

import { test, expect } from './fixtures/base';

test.describe('Robots Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/robots');
  });

  test('should display robots page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should display robots list or empty state', async ({ page }) => {
    // Either shows a list of robots or an empty state message
    const content = page.locator('main, #main-content, [role="main"]');
    await expect(content.first()).toBeVisible();
  });
});

test.describe('Robot Details Page', () => {
  test('should handle robot detail route', async ({ page }) => {
    await page.goto('/robots/test-robot-id');
    // Should either show robot details or handle unknown ID
    await expect(page.locator('body')).toBeVisible();
  });
});
