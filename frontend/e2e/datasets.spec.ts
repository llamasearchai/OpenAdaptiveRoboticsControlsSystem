/**
 * Datasets Page E2E Tests
 *
 * Tests the dataset management functionality.
 */

import { test, expect } from './fixtures/base';

test.describe('Datasets Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/datasets');
  });

  test('should display datasets page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should display datasets list or empty state', async ({ page }) => {
    const content = page.locator('main, #main-content');
    await expect(content.first()).toBeVisible();
  });

  test('should have upload capability', async ({ page }) => {
    // Look for upload button or drag-drop area
    const uploadElement = page.getByText(/upload|add.*dataset|import/i);
    await expect(uploadElement.first()).toBeVisible();
  });
});
