import { test, expect } from '@playwright/test';

const ids = {
  manager: '22222222-2222-4222-8222-222222222222', worker: '33333333-3333-4333-8333-333333333333',
  store: '11111111-1111-4111-8111-111111111111', org: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  product: '44444444-4444-4444-8444-444444444444', sale: '55555555-5555-4555-8555-555555555555', item: '66666666-6666-4666-8666-666666666666',
};

async function backend(page, { role = 'manager', failSaleOnce = false } = {}) {
  const calls = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const userId = ids[role];
  const now = Math.floor(Date.now() / 1000);
  const accessToken = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: userId, role: 'authenticated', aud: 'authenticated', exp: now + 3600 })).toString('base64url'), 'testsignature'].join('.');
  const user = { id: userId, email: `${role}@example.com`, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const data = {
    profiles: [{ user_id: userId, user_name: role === 'manager' ? 'Jane Manager' : 'Mary Worker', store_id: ids.store, role: role === 'manager' ? 'manager' : 'user', status: 'active' }],
    stores: [{ store_id: ids.store, store_name: 'TRAUTS Store A', organization_id: ids.org, store_type_code: 'general_retail', active: true, time_zone: 'Africa/Lusaka' }],
    organizations: [{ organization_id: ids.org, organization_name: 'TRAUTS Retail', currency_code: 'ZMW' }],
    products: [{ product_id: ids.product, store_id: ids.store, product_name: 'Test Product', sku: 'TEST-001', selling_price: 20, buying_price: 10, category: 'General', selling_unit_code: 'each', batch_tracking: false, requires_expiry: false, active: true, variant_attributes: {} }],
    selling_units: [{ unit_code: 'each', display_name: 'Each', decimal_places: 0 }, { unit_code: 'kg', display_name: 'Kilogram', decimal_places: 3 }],
    product_groups: [], suppliers: [], supplier_phones: [], purchases: [], purchase_items: [], expenses: [],
    sales: [{ sale_id: ids.sale, store_id: ids.store, user_id: userId, sale_date: '2026-10-16T09:00:00Z', status: 'completed', total_amount: 60, payment_method: 'cash' }],
    sales_items: [{ sales_item_id: ids.item, store_id: ids.store, sale_id: ids.sale, product_id: ids.product, quantity: 3, unit_price: 20, line_total: 60 }],
    sellable_inventory: [{ product_id: ids.product, store_id: ids.store, product_name: 'Test Product', physical_quantity: 10, sellable_quantity: 10, reorder_level: 2 }],
    store_inventory: [{ product_id: ids.product, store_id: ids.store, quantity: 10, reorder_level: 2 }],
    inventory_position: [{ product_id: ids.product, store_id: ids.store, product_name: 'Test Product', main_quantity: 10, return_quarantine_quantity: 0, total_physical_quantity: 10, sellable_quantity: 10 }],
    low_stock_report: [], product_batches: [], stock_movements: [], stock_movement_batches: [], batch_status_events: [], batch_stock_migrations: [], batch_stock_migration_items: [],
    customer_returns: [], customer_return_items: [], return_stock_actions: [],
    daily_sales_report: [], daily_expense_report: [], daily_return_report: [], daily_refund_report: [], daily_net_sales_report: [],
    store_time_zones: [{ time_zone: 'Africa/Lusaka' }, { time_zone: 'UTC' }],
  };
  await page.route('https://test-project.supabase.co/**', async route => {
    const request = route.request(), url = new URL(request.url());
    const body = request.postData() ? JSON.parse(request.postData()) : null;
    calls.push({ path: url.pathname, method: request.method(), body });
    const reply = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname === '/auth/v1/token') return reply({ access_token: accessToken, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, user });
    if (url.pathname === '/auth/v1/user') return reply(user);
    if (url.pathname === '/auth/v1/logout') return reply({});
    if (url.pathname === '/functions/v1/create-worker') return reply({ user_id: ids.worker, user_name: body.user_name, role: 'user', confirmation_required: false }, 201);
    if (url.pathname.includes('/rpc/')) {
      const name = url.pathname.split('/').pop();
      if (name === 'get_sale_batches') return reply([]);
      if (name === 'record_sale') {
        if (failSaleOnce) { failSaleOnce = false; return reply({ code: 'XX000', message: 'Temporary database error; inspect sale history before retry.' }, 503); }
        data.sales.push({ sale_id: body.p_request_id, store_id: ids.store, user_id: userId, sale_date: new Date().toISOString(), status: 'completed', total_amount: 20, payment_method: body.p_payment_method });
      }
      return reply(body.p_request_id || body.p_return_id || ids.product);
    }
    const resource = url.pathname.split('/').pop();
    if (!(resource in data)) return reply({ message: `Unknown test resource: ${resource}` }, 404);
    if (request.method() === 'POST') { data[resource].push(body); return reply(request.headers().accept?.includes('vnd.pgrst.object') ? body : [body], 201); }
    let rows = [...data[resource]];
    for (const [key, value] of url.searchParams) if (value.startsWith('eq.')) rows = rows.filter(r => String(r[key]) === value.slice(3));
    const start = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || rows.length);
    rows = rows.slice(start, start + limit);
    return reply(rows);
  });
  return { calls, errors, data };
}

async function login(page, role = 'manager') {
  await page.goto('/');
  await page.getByLabel('Email address').fill(`${role}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('Test-password-123!');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your business at a glance' })).toBeVisible();
}

test('manager shell preserves navy/blue structure and loads every module without runtime errors', async ({ page }) => {
  const backendState = await backend(page);
  await login(page);
  await expect(page.locator('.sidebar')).toHaveCSS('background-color', 'rgb(20, 45, 89)');
  await page.screenshot({ path: test.info().outputPath('desktop-dashboard.png'), fullPage: true });
  for (const name of ['Products', 'Sales', 'Inventory', 'Suppliers', 'Purchases', 'Expenses', 'Operating Summary', 'Manage Accounts', 'Reports', 'Batches & Expiry', 'Returns & Refunds', 'Audit History', 'Settings']) {
    await page.getByRole('link', { name, exact: true }).click();
    await expect(page.locator('#pageTitle')).toHaveText(name);
    await expect(page.getByText('Unable to load this page')).toHaveCount(0);
    await expect(page.locator('.loading')).toHaveCount(0);
  }
  expect(backendState.errors).toEqual([]);
});

test('worker navigation rejects manager deep links and has no manager actions', async ({ page }) => {
  const state = await backend(page, { role: 'worker' });
  await login(page, 'worker');
  await expect(page.getByRole('link', { name: 'Manage Accounts' })).toHaveCount(0);
  await page.goto('/#/returns');
  await expect(page.getByRole('heading', { name: 'Your business at a glance' })).toBeVisible();
  await page.getByRole('link', { name: 'Products', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add product', exact: true })).toHaveCount(0);
  expect(state.calls.some(c => c.path.endsWith('/customer_returns'))).toBe(false);
});

test('sale payload uses server prices and retains its request UUID after uncertain failure', async ({ page }) => {
  const state = await backend(page, { failSaleOnce: true });
  await login(page);
  await page.getByRole('link', { name: 'Sales', exact: true }).click();
  await page.getByRole('button', { name: 'Record sale', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Product', { exact: true }).selectOption(ids.product);
  await dialog.getByLabel('Quantity', { exact: true }).fill('1');
  await dialog.getByRole('button', { name: 'Record sale', exact: true }).click();
  await expect(dialog.locator('.form-error')).toContainText('Temporary database error');
  await expect(dialog.getByLabel('Quantity', { exact: true })).toHaveAttribute('readonly', '');
  await dialog.getByRole('button', { name: 'Record sale', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const submissions = state.calls.filter(c => c.path.endsWith('/rpc/record_sale'));
  expect(submissions).toHaveLength(2);
  expect(submissions[0].body).toEqual(submissions[1].body);
  expect(Object.keys(submissions[0].body).sort()).toEqual(['p_items', 'p_payment_method', 'p_request_id']);
  expect(submissions[0].body.p_items).toEqual([{ product_id: ids.product, quantity: 1 }]);
  expect(state.errors).toEqual([]);
});

test('voided pending returns stay out of the active refund queue and require audit-only actions', async ({ page }) => {
  const state = await backend(page);
  state.data.customer_returns = [
    { return_id: 'active-return', store_id: ids.store, sale_id: ids.sale, created_at: '2026-10-16T10:00:00Z', return_status: 'active', refund_status: 'pending', refund_total: 20, reason: 'Active return' },
    { return_id: 'voided-return', store_id: ids.store, sale_id: ids.sale, created_at: '2026-10-16T10:00:00Z', return_status: 'voided', refund_status: 'pending', refund_total: 20, reason: 'Voided return' },
  ];
  await login(page);
  await page.getByRole('link', { name: 'Returns & Refunds', exact: true }).click();
  await page.getByLabel('Show', { exact: true }).selectOption('pending');
  await expect(page.locator('[data-table]')).toContainText('active-return');
  await expect(page.locator('[data-table]')).not.toContainText('voided-return');
  await page.getByLabel('Show', { exact: true }).selectOption('voided');
  await expect(page.locator('[data-table]')).toContainText('voided-return');
  await expect(page.getByRole('button', { name: 'Record refund' })).toHaveCount(0);
});

test('create-worker sends no role/store override and handles the immediate-login contract', async ({ page }) => {
  const state = await backend(page);
  await login(page);
  await page.getByRole('link', { name: 'Manage Accounts', exact: true }).click();
  await page.getByRole('button', { name: 'Create worker', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Worker name').fill('New Worker');
  await dialog.getByLabel('Email', { exact: true }).fill('new@example.com');
  await dialog.getByLabel('Temporary password', { exact: false }).fill('Unique-Password-123!');
  await dialog.getByRole('button', { name: 'Create worker', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#appMessage')).toContainText('Immediate login');
  const call = state.calls.find(c => c.path.endsWith('/functions/v1/create-worker'));
  expect(Object.keys(call.body).sort()).toEqual(['email', 'password', 'phone', 'user_name']);
});

test('recording a return uses original sales item IDs and defaults to quarantine', async ({ page }) => {
  const state = await backend(page);
  await login(page);
  await page.getByRole('link', { name: 'Returns & Refunds', exact: true }).click();
  await page.getByRole('button', { name: 'Record return', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original completed sale').selectOption(ids.sale);
  await dialog.getByLabel('Original sale item').selectOption(ids.item);
  await dialog.getByLabel('Return quantity').fill('1');
  await dialog.getByLabel('Reason', { exact: true }).fill('Customer return');
  await dialog.getByRole('button', { name: 'Record return', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const call = state.calls.find(c => c.path.endsWith('/rpc/record_customer_return'));
  expect(call.body.p_sale_id).toEqual(ids.sale);
  expect(call.body.p_items).toEqual([{ sales_item_id: ids.item, quantity: 1, disposition: 'quarantine', inspected: false }]);
  expect(state.errors).toEqual([]);
});

test('mobile navigation opens and closes after a route change', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await backend(page);
  await login(page);
  await expect(page.locator('.sidebar')).not.toBeVisible();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.locator('.sidebar')).toBeVisible();
  await page.getByRole('link', { name: 'Sales', exact: true }).click();
  await expect(page.locator('#pageTitle')).toHaveText('Sales');
  await expect(page.locator('.sidebar')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('mobile-sales.png'), fullPage: true });
});

test('product creation uses scoped catalog fields without directly inserting inventory', async ({ page }) => {
  const state = await backend(page);
  await login(page);
  await page.getByRole('link', { name: 'Products', exact: true }).click();
  await page.getByRole('button', { name: 'Add product', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Product name', { exact: true }).fill('New Product');
  await dialog.getByLabel('SKU', { exact: true }).fill('NEW-001');
  await dialog.getByLabel('Selling price').fill('25');
  await dialog.getByLabel('Buying price').fill('12');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const call = state.calls.find(c => c.path.endsWith('/products') && c.method === 'POST');
  expect(call.body.store_id).toEqual(ids.store);
  expect(call.body.created_by).toEqual(ids.manager);
  expect(call.body.selling_unit_code).toEqual('each');
  expect(call.body.variant_attributes).toEqual({});
  expect(call.body).not.toHaveProperty('quantity');
  expect(state.calls.some(c => c.path.endsWith('/store_inventory') && c.method !== 'GET')).toBe(false);
});

test('tracked purchase form sends batch sums inside the atomic purchase RPC', async ({ page }) => {
  const state = await backend(page);
  state.data.products[0].batch_tracking = true;
  state.data.products[0].requires_expiry = true;
  state.data.suppliers = [{ supplier_id: '77777777-7777-4777-8777-777777777777', store_id: ids.store, supplier_name: 'Test Supplier', active: true }];
  await login(page);
  await page.getByRole('link', { name: 'Purchases', exact: true }).click();
  await page.getByRole('button', { name: 'Receive purchase', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Supplier', { exact: true }).selectOption(state.data.suppliers[0].supplier_id);
  await dialog.getByLabel('Product', { exact: true }).selectOption(ids.product);
  await dialog.getByLabel('Quantity', { exact: true }).fill('2');
  await dialog.getByLabel('Batch number', { exact: true }).fill('BATCH-001');
  await dialog.getByLabel('Batch quantity', { exact: true }).fill('2');
  await dialog.getByLabel('Expiry date', { exact: true }).fill('2099-01-01');
  await dialog.getByRole('button', { name: 'Receive stock', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const call = state.calls.find(c => c.path.endsWith('/rpc/receive_purchase'));
  expect(call.body.p_items).toEqual([{ product_id: ids.product, quantity: 2, unit_cost: 10, batches: [{ batch_number: 'BATCH-001', quantity: 2, expires_on: '2099-01-01' }] }]);
  expect(state.errors).toEqual([]);
});
