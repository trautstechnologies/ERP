import { test, expect } from '@playwright/test';

test('production build reaches login when external font services are unavailable', async ({ page }) => {
  const errors = [], failedAssets = [], externalFonts = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/assets/') && response.status() !== 200) failedAssets.push(response.url());
  });
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => {
    externalFonts.push(route.request().url());
    return route.abort();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
  await expect(page.locator('.auth-card')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);
  expect(externalFonts).toEqual([]);
});
