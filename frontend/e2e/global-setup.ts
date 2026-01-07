/**
 * Global setup for Playwright E2E tests
 *
 * This file runs once before all tests.
 * Use it to set up test databases, start services, etc.
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  console.log('\n🚀 Starting E2E test setup...');
  console.log(`   Base URL: ${baseURL}`);

  // Wait for the server to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let retries = 0;
  const maxRetries = 30;

  while (retries < maxRetries) {
    try {
      await page.goto(baseURL as string, { timeout: 5000 });
      console.log('   ✅ Server is ready');
      break;
    } catch {
      retries++;
      if (retries === maxRetries) {
        console.error('   ❌ Server failed to start');
        throw new Error(`Server at ${baseURL} is not responding after ${maxRetries} retries`);
      }
      console.log(`   ⏳ Waiting for server... (attempt ${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  await browser.close();

  console.log('   ✅ Global setup complete\n');
}

export default globalSetup;
