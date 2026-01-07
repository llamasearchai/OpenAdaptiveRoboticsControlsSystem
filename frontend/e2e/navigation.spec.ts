/**
 * Navigation E2E Tests
 *
 * Tests navigation between pages and sidebar functionality.
 */

import { test, expect } from './fixtures/base';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to Training page', async ({ page }) => {
    // Training has children, need to expand first - use button selector
    const trainingButton = page.locator('aside button').filter({ hasText: 'Training' }).first();
    await trainingButton.click();

    // Click on Experiments child link
    await page.locator('aside').getByText('Experiments', { exact: true }).click();

    await expect(page).toHaveURL(/\/training/);
  });

  test('should navigate to Robots page', async ({ page }) => {
    // Robots has children, need to expand first - use button selector
    const robotsButton = page.locator('aside button').filter({ hasText: 'Robots' }).first();
    await robotsButton.click();

    // Click on All Robots child link
    await page.locator('aside').getByText('All Robots', { exact: true }).click();

    await expect(page).toHaveURL(/\/robots/);
  });

  test('should navigate to Datasets page', async ({ page }) => {
    const datasetsLink = page.locator('aside').getByRole('link', { name: /datasets/i });
    await datasetsLink.click();
    await expect(page).toHaveURL(/\/datasets/);
  });

  test('should navigate to Analytics page', async ({ page }) => {
    const analyticsLink = page.locator('aside').getByRole('link', { name: /analytics/i });
    await analyticsLink.click();
    await expect(page).toHaveURL(/\/analytics/);
  });

  test('should navigate to Safety page', async ({ page }) => {
    const safetyLink = page.locator('aside').getByRole('link', { name: /safety/i });
    await safetyLink.click();
    await expect(page).toHaveURL(/\/safety/);
  });

  test('should navigate to Settings page', async ({ page }) => {
    const settingsLink = page.locator('aside').getByRole('link', { name: /settings/i });
    await settingsLink.click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test('should navigate to Simulator page', async ({ page }) => {
    const simulatorLink = page.locator('aside').getByRole('link', { name: /simulator/i });
    await simulatorLink.click();
    await expect(page).toHaveURL(/\/simulator/);
  });

  test('should navigate to Kinematics page', async ({ page }) => {
    const kinematicsLink = page.locator('aside').getByRole('link', { name: /kinematics/i });
    await kinematicsLink.click();
    await expect(page).toHaveURL(/\/kinematics/);
  });

  test('should navigate back to Dashboard', async ({ page }) => {
    // First navigate away
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/analytics/);

    // Then navigate back
    const dashboardLink = page.locator('aside').getByRole('link', { name: /dashboard/i });
    await dashboardLink.click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('Browser Navigation', () => {
  test('should support browser back/forward navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/analytics/);

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard/);

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL(/\/analytics/);
  });

  test('should handle direct URL navigation', async ({ page }) => {
    await page.goto('/training');
    await expect(page).toHaveURL(/\/training/);

    await page.goto('/robots');
    await expect(page).toHaveURL(/\/robots/);

    await page.goto('/datasets');
    await expect(page).toHaveURL(/\/datasets/);
  });
});

test.describe('404 Page', () => {
  test('should show 404 for non-existent routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    // Next.js shows 404 page
    await expect(page.getByText(/404|not found/i)).toBeVisible();
  });
});
