/**
 * Dashboard E2E Tests
 *
 * Tests the main dashboard functionality including:
 * - Page load and rendering
 * - Stats display
 * - Navigation
 * - Responsive behavior
 */

import { test, expect } from './fixtures/base';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should redirect from home to dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/dashboard/);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display dashboard heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  });

  test('should display welcome message', async ({ page }) => {
    await expect(page.getByText(/welcome to arcs/i)).toBeVisible();
  });

  test('should display stat cards', async ({ page }) => {
    // Check for stat card titles - use the main content area
    const mainContent = page.locator('#main-content');
    await expect(mainContent.getByText('Active Robots')).toBeVisible();
    await expect(mainContent.getByText('Training Runs')).toBeVisible();
    await expect(mainContent.locator('text=Datasets').first()).toBeVisible();
    await expect(mainContent.getByText('System Health')).toBeVisible();
  });

  test('should display recent activity section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
    await expect(page.getByText('Latest events and notifications')).toBeVisible();
  });

  test('should display quick actions section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Quick Actions' })).toBeVisible();
    await expect(page.getByText('New Training Run')).toBeVisible();
    await expect(page.getByText('Configure Robot')).toBeVisible();
    await expect(page.getByText('View Analytics')).toBeVisible();
    await expect(page.getByText('Upload Dataset')).toBeVisible();
  });

  test('should display system status section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'System Status' })).toBeVisible();
    await expect(page.getByText('API Server')).toBeVisible();
    await expect(page.getByText('Simulation Backend')).toBeVisible();
    await expect(page.getByText('Training Service')).toBeVisible();
    await expect(page.getByText('WebSocket')).toBeVisible();
  });

  test('quick actions should navigate correctly', async ({ page }) => {
    // Test New Training Run link
    const newTrainingLink = page.getByRole('link', { name: /new training run/i });
    await expect(newTrainingLink).toHaveAttribute('href', '/training/new');

    // Test Configure Robot link
    const configureRobotLink = page.getByRole('link', { name: /configure robot/i });
    await expect(configureRobotLink).toHaveAttribute('href', '/robots/configure');

    // Test View Analytics link
    const analyticsLink = page.getByRole('link', { name: /view analytics/i });
    await expect(analyticsLink).toHaveAttribute('href', '/analytics');

    // Test Upload Dataset link
    const datasetLink = page.getByRole('link', { name: /upload dataset/i });
    await expect(datasetLink).toHaveAttribute('href', '/datasets');
  });

  test('should have accessible main content area', async ({ page }) => {
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
  });
});

test.describe('Dashboard - Responsive', () => {
  test('should display properly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Dashboard should still show key elements
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Active Robots')).toBeVisible();
  });

  test('should display properly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Active Robots')).toBeVisible();
  });
});

test.describe('Dashboard - Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
