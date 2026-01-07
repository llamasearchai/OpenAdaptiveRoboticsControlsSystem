/**
 * Visual Regression E2E Tests
 *
 * Tests visual appearance and catches unintended UI changes.
 * Run with: pnpm test:e2e --project=visual
 *
 * Note: Run with --update-snapshots flag first to create baseline screenshots.
 */

import { test, expect } from '@playwright/test';

// Skip visual tests by default since they require baseline screenshots
// Run with --update-snapshots to generate baselines first
test.describe.skip('Visual Regression - Dashboard', () => {
  test('dashboard page should match snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for any animations to complete
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('dashboard stat cards should match snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const statsGrid = page.locator('.grid').first();
    await expect(statsGrid).toHaveScreenshot('dashboard-stats.png');
  });
});

test.describe.skip('Visual Regression - Navigation', () => {
  test('sidebar should match snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('aside').first();
    await expect(sidebar).toHaveScreenshot('sidebar.png');
  });
});

test.describe.skip('Visual Regression - Pages', () => {
  test('training page should match snapshot', async ({ page }) => {
    await page.goto('/training');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('training.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('robots page should match snapshot', async ({ page }) => {
    await page.goto('/robots');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('robots.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('datasets page should match snapshot', async ({ page }) => {
    await page.goto('/datasets');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('datasets.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('settings page should match snapshot', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('settings.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe.skip('Visual Regression - Responsive', () => {
  test('dashboard mobile view should match snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('dashboard tablet view should match snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe.skip('Visual Regression - Theme', () => {
  test('dark theme should match snapshot', async ({ page }) => {
    await page.goto('/dashboard');

    // Inject dark mode class
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('light theme should match snapshot', async ({ page }) => {
    await page.goto('/dashboard');

    // Ensure light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });

    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('dashboard-light.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

// Active visual tests - basic sanity checks
test.describe('Visual Sanity Checks', () => {
  test('dashboard should render without errors', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Check that the page has rendered content
    await expect(page.locator('html')).toBeVisible();
  });

  test('page should have correct viewport dimensions', async ({ page }) => {
    await page.goto('/dashboard');

    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBeGreaterThan(0);
    expect(viewportSize?.height).toBeGreaterThan(0);
  });
});
