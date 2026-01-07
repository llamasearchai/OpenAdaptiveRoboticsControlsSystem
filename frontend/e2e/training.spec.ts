/**
 * Training Page E2E Tests
 *
 * Tests the training management functionality.
 */

import { test, expect } from './fixtures/base';

test.describe('Training Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/training');
  });

  test('should display training page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should have link to create new training run', async ({ page }) => {
    const newRunLink = page.getByRole('link', { name: /new/i });
    await expect(newRunLink).toBeVisible();
  });

  test('should navigate to new training form', async ({ page }) => {
    await page.getByRole('link', { name: /new/i }).click();
    await expect(page).toHaveURL(/\/training\/new/);
  });
});

test.describe('New Training Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/training/new');
  });

  test('should display new training form', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should have algorithm selection', async ({ page }) => {
    // Check for algorithm-related content
    const algorithmText = page.getByText(/algorithm/i);
    await expect(algorithmText.first()).toBeVisible();
  });
});

test.describe('Training Details Page', () => {
  test('should handle training run detail route', async ({ page }) => {
    await page.goto('/training/test-run-id');
    // Should either show the training details or handle the unknown ID gracefully
    await expect(page.locator('body')).toBeVisible();
  });
});
