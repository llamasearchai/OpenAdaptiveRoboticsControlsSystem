/**
 * Playwright test fixtures and page object models
 *
 * Provides reusable test utilities and page abstractions.
 */

import { test as base, Page, Locator, expect } from '@playwright/test';

/**
 * Page object model for the Dashboard page
 */
export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly statsGrid: Locator;
  readonly recentActivity: Locator;
  readonly quickActions: Locator;
  readonly systemStatus: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Dashboard' });
    this.statsGrid = page.locator('.grid').first();
    this.recentActivity = page.getByText('Recent Activity').locator('..');
    this.quickActions = page.getByText('Quick Actions').locator('..');
    this.systemStatus = page.getByText('System Status').locator('..');
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForLoad() {
    await expect(this.heading).toBeVisible();
  }

  async getStatCards() {
    return this.page.locator('[class*="Card"]').all();
  }
}

/**
 * Page object model for the Training page
 */
export class TrainingPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newTrainingButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /training/i });
    this.newTrainingButton = page.getByRole('link', { name: /new.*training/i });
  }

  async goto() {
    await this.page.goto('/training');
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Page object model for the Robots page
 */
export class RobotsPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /robots/i });
  }

  async goto() {
    await this.page.goto('/robots');
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Page object model for the Simulator page
 */
export class SimulatorPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly canvas: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /simulator/i });
    this.canvas = page.locator('canvas');
  }

  async goto() {
    await this.page.goto('/simulator');
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Page object for navigation sidebar
 */
export class Sidebar {
  readonly page: Page;
  readonly nav: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nav = page.locator('nav, aside').first();
  }

  async navigateTo(pageName: string) {
    await this.page.getByRole('link', { name: new RegExp(pageName, 'i') }).click();
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Extended test with page object fixtures
 */
export const test = base.extend<{
  dashboardPage: DashboardPage;
  trainingPage: TrainingPage;
  robotsPage: RobotsPage;
  simulatorPage: SimulatorPage;
  sidebar: Sidebar;
}>({
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  trainingPage: async ({ page }, use) => {
    await use(new TrainingPage(page));
  },
  robotsPage: async ({ page }, use) => {
    await use(new RobotsPage(page));
  },
  simulatorPage: async ({ page }, use) => {
    await use(new SimulatorPage(page));
  },
  sidebar: async ({ page }, use) => {
    await use(new Sidebar(page));
  },
});

export { expect } from '@playwright/test';
