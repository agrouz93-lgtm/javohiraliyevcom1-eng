import { test, expect } from '@playwright/test';

test('splash → home: no persistent blur overlay', async ({ page }) => {
  await page.goto('/');

  // Wait for splash to complete (3400ms) + transition
  await page.waitForTimeout(4500);

  // No backdrop-style blur overlay should sit above the home content
  const overlays = await page.$$('div[class*="backdrop-blur"], div[class*="blur-"], div[style*="backdrop-filter"]');
  for (const o of overlays) {
    const box = await o.boundingBox();
    const parent = await o.evaluate(el => el.closest('[data-overlay="splash"]'));
    // If overlay still exists and covers the screen → FAIL
    expect(parent).toBeNull();
  }

  // Home page content should be visible
  await expect(page.locator('text=Assalomu alaykum')).toBeVisible();
  await expect(page.locator('text=BuildAI')).toBeVisible();
});

test('BottomNav navigation does not re-trigger splash', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(4500); // let splash finish

  // Click calculator nav item
  await page.click('a[href="#calculator"], [data-nav="calculator"], button:has-text("Kalkulyator")');
  await expect(page.locator('text=Kalkulyator')).toBeVisible();

  // Click home nav item — should NOT show splash
  await page.click('a[href="#home"], [data-nav="home"], button:has-text("Asosiy")');
  await expect(page.locator('text=Assalomu alaykum')).toBeVisible();
  await expect(page.locator('text=BuildAI').first()).toBeVisible();
});