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

test('installed production mobile shell reloads without a network connection', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/mobile.html');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a previously prepared mobile account can reopen cached data offline after token expiry', async ({ page, context }) => {
  const userId = '33333333-3333-4333-8333-333333333333';
  const storeId = '11111111-1111-4111-8111-111111111111';
  const user = { id: userId, email: 'worker@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: userId, role: 'authenticated', exp: expiry })).toString('base64url'), 'testsignature'].join('.');
  await page.route('https://test-project.supabase.co/**', route => {
    const url = new URL(route.request().url());
    let data = [];
    if (url.pathname === '/auth/v1/token') data = { access_token: token, refresh_token: 'test-refresh', expires_in: 3600, expires_at: expiry, token_type: 'bearer', user };
    else if (url.pathname === '/auth/v1/user') data = user;
    else if (url.pathname.endsWith('/profiles')) data = [{ user_id: userId, store_id: storeId, user_name: 'Offline worker', role: 'user', status: 'active' }];
    else if (url.pathname.endsWith('/stores')) data = [{ store_id: storeId, store_name: 'Prepared mobile store', active: true, time_zone: 'Africa/Lusaka' }];
    else if (url.pathname.endsWith('/is_organization_owner') || url.pathname.endsWith('/owner_signup_available')) data = false;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/mobile.html');
  await page.getByLabel('Email address').fill('worker@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Test-password-123!');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your business at a glance' })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    const key = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
    const session = JSON.parse(localStorage.getItem(key));
    session.expires_at = Math.floor(Date.now() / 1000) - 60;
    localStorage.setItem(key, JSON.stringify(session));
  });
  await page.unrouteAll({ behavior: 'wait' });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your business at a glance' })).toBeVisible();
  await expect(page.locator('#syncStatus')).toContainText('Offline');
  await expect(page.locator('.user-info')).toContainText('Offline worker');
});
