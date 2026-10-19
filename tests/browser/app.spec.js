import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const ids = {
  manager: '22222222-2222-4222-8222-222222222222', worker: '33333333-3333-4333-8333-333333333333',
  store: '11111111-1111-4111-8111-111111111111', org: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  product: '44444444-4444-4444-8444-444444444444', sale: '55555555-5555-4555-8555-555555555555', item: '66666666-6666-4666-8666-666666666666',
};

async function backend(page, { role = 'manager', failSaleOnce = false, signupMode = 'session', signupReady = true } = {}) {
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
    calls.push({ path: url.pathname, query: url.search, method: request.method(), body });
    const reply = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname === '/auth/v1/token') return reply({ access_token: accessToken, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, user });
    if (url.pathname === '/auth/v1/signup') {
      if (signupMode === 'failure') return reply({ code: 'unexpected_failure', msg: 'Database error saving new user' }, 500);
      if (signupMode === 'confirmation') return reply({ id: userId, email: body.email, identities: [{ id: userId }] });
      return reply({ access_token: accessToken, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, user: { ...user, email: body.email } });
    }
    if (url.pathname === '/auth/v1/user') return reply(user);
    if (url.pathname === '/auth/v1/logout') return reply({});
    if (url.pathname === '/functions/v1/create-worker') return reply({ user_id: ids.worker, user_name: body.user_name, role: 'user', confirmation_required: false }, 201);
    if (url.pathname.includes('/rpc/')) {
      const name = url.pathname.split('/').pop();
      if (name === 'owner_signup_available') return reply(signupReady);
      if (name === 'get_sale_batches') return reply([]);
      if (name === 'record_sale') {
        if (failSaleOnce) { failSaleOnce = false; return reply({ code: 'XX000', message: 'Temporary database error; inspect sale history before retry.' }, 503); }
        data.sales.push({ sale_id: body.p_request_id, store_id: ids.store, user_id: userId, sale_date: new Date().toISOString(), status: 'completed', total_amount: 20, payment_method: body.p_payment_method });
      }
      return reply(body.p_request_id || body.p_return_id || ids.product);
    }
    const resource = url.pathname.split('/').pop();
    if (!(resource in data)) return reply({ message: `Unknown test resource: ${resource}` }, 404);
    if (resource === 'supplier_phones' && (url.searchParams.get('order')?.includes('id.') && !url.searchParams.get('order')?.includes('supplier_phone_id.') || url.searchParams.has('id') || body && Object.hasOwn(body, 'id'))) return reply({ code: '42703', message: 'column supplier_phones.id does not exist' }, 400);
    if (request.method() === 'POST') { data[resource].push(body); return reply(request.headers().accept?.includes('vnd.pgrst.object') ? body : [body], 201); }
    let rows = [...data[resource]];
    for (const [key, value] of url.searchParams) if (value.startsWith('eq.')) rows = rows.filter(r => String(r[key]) === value.slice(3));
    if (resource === 'supplier_phones' && request.method() === 'PATCH') {
      rows.forEach(r => Object.assign(r, body));
      return reply(rows[0]);
    }
    if (resource === 'supplier_phones' && request.method() === 'DELETE') {
      data[resource] = data[resource].filter(r => !rows.includes(r));
      return reply(rows[0]);
    }
    const start = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || rows.length);
    rows = rows.slice(start, start + limit);
    return reply(request.headers().accept?.includes('vnd.pgrst.object') ? rows[0] : rows);
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
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('desktop-dashboard.png'), fullPage: true });
  for (const name of ['Products', 'Sales', 'Inventory', 'Suppliers', 'Purchases', 'Expenses', 'Operating Summary', 'Manage Accounts', 'Reports', 'Batches & Expiry', 'Returns & Refunds', 'Audit History', 'Settings']) {
    await page.getByRole('link', { name, exact: true }).click();
    await expect(page.locator('#pageTitle')).toHaveText(name);
    await expect(page.getByText('Unable to load this page')).toHaveCount(0);
    await expect(page.locator('.loading')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toHaveCount(0);
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
  await dialog.getByLabel('Payment method', { exact: true }).selectOption({ label: 'Mobile Money' });
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
  expect(submissions[0].body.p_payment_method).toEqual('mobile_money');
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
  await expect(page.locator('[data-table]')).toContainText('Active return');
  await expect(page.locator('[data-table]')).not.toContainText('Voided return');
  await page.getByLabel('Show', { exact: true }).selectOption('voided');
  await expect(page.locator('[data-table]')).toContainText('Voided return');
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
  await expect(dialog.getByText('Variant attributes', { exact: true })).toHaveCount(0);
  await expect(dialog.getByLabel('Selling unit', { exact: true })).toHaveCount(0);
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
  expect(call.body).not.toHaveProperty('variant_attributes');
  expect(call.body).not.toHaveProperty('product_group_id');
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

test('missing startup execution shows guidance after the loading timeout', async ({ page }) => {
  await page.clock.install();
  await page.route('**/src/bootstrap.js', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '// Startup did not run.' }));
  await page.goto('/');
  await page.clock.fastForward(21000);
  await expect(page.getByRole('heading', { name: 'TRAUTS could not finish starting' })).toBeVisible();
  await expect(page.locator('pre')).toContainText('npm run dev');
  await expect(page.getByText('Loading TRAUTS…', { exact: true })).toHaveCount(0);
});

test('unbundled Live Server imports show a startup error instead of endless loading', async ({ page }) => {
  await page.route(/\/src\/main\.js(?:\?.*)?$/, async route => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    body: await readFile(new URL('../../src/main.js', import.meta.url), 'utf8'),
  }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'TRAUTS could not load its application modules' })).toBeVisible();
  await expect(page.getByText(/not VS Code Live Server/)).toBeVisible();
});

for (const role of ['manager', 'worker']) {
  test(`dashboard sale shortcut opens one form and consumes its intent for ${role}`, async ({ page }) => {
    const state = await backend(page, { role });
    await login(page, role);
    await page.getByRole('link', { name: 'Record sale', exact: true }).click();
    await expect(page.locator('#pageTitle')).toHaveText('Sales');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByLabel('Product', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/#\/sales$/);
    expect(state.calls.some(c => c.path.endsWith('/rpc/record_sale'))).toBe(false);
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('link', { name: 'Sales', exact: true }).click();
    await expect(page.locator('.loading')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(state.errors).toEqual([]);
  });
}

test('dashboard chart dates use month names and the store business date', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-17T23:30:00Z') });
  await backend(page);
  await login(page);
  const labels = await page.locator('.chart-column > span').allTextContents();
  expect(labels).toEqual(['12 Oct', '13 Oct', '14 Oct', '15 Oct', '16 Oct', '17 Oct', 'Today']);
  await expect(page.locator('.chart-column').last()).toHaveAttribute('title', /^Sunday, 18 October 2026:/);
});

test('transaction tables and selectors use product summaries while backend references remain correct', async ({ page }) => {
  const state = await backend(page);
  const supplier = '77777777-7777-4777-8777-777777777777';
  const purchase = '88888888-8888-4888-8888-888888888888';
  const expense = '99999999-9999-4999-8999-999999999999';
  state.data.suppliers = [{ supplier_id: supplier, store_id: ids.store, supplier_name: 'Retail Supplier', active: true }];
  state.data.purchases = [{ purchase_id: purchase, store_id: ids.store, supplier_id: supplier, purchase_date: '2026-10-16T09:00:00Z', status: 'received', purchase_total_amount: 20 }];
  state.data.purchase_items = [{ purchase_item_id: 'purchase-line', store_id: ids.store, purchase_id: purchase, product_id: ids.product, quantity: 2, unit_cost: 10, line_total: 20 }];
  state.data.expenses = [{ expense_id: expense, store_id: ids.store, expense_date: '2026-10-16T10:00:00Z', category: 'Transport', description: 'Supplier delivery', amount: 10, payment_method: 'cash', status: 'recorded' }];
  await login(page);
  for (const name of ['Sales', 'Purchases', 'Expenses', 'Manage Accounts']) {
    await page.getByRole('link', { name, exact: true }).click();
    await expect(page.locator('#pageTitle')).toHaveText(name);
    await expect(page.locator('[data-table] table')).toBeVisible();
    expect(await page.locator('table').innerText()).not.toMatch(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    expect(await page.locator('thead').innerText()).not.toMatch(/\bID\b|request/i);
  }
  await page.getByRole('link', { name: 'Sales', exact: true }).click();
  await expect(page.locator('#pageTitle')).toHaveText('Sales');
  await expect(page.locator('[data-table] tbody')).toContainText('Test Product × 3');
  await expect(page.locator('tbody')).toContainText('Jane Manager');
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  expect(await page.getByRole('dialog').innerText()).not.toContain(ids.sale);
  await page.getByRole('dialog').getByText('Support references', { exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(ids.sale);
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).first().click();
  await page.getByRole('link', { name: 'Returns & Refunds', exact: true }).click();
  await page.getByRole('button', { name: 'Record return', exact: true }).click();
  const selector = page.getByRole('dialog').getByLabel('Original completed sale');
  expect((await selector.locator('option').allTextContents()).join(' ')).not.toContain(ids.sale);
  await expect(selector).toContainText('Test Product × 3');
  await selector.selectOption(ids.sale);
  await page.getByRole('dialog').getByLabel('Original sale item').selectOption(ids.item);
  await page.getByRole('dialog').getByLabel('Return quantity').fill('1');
  await page.getByRole('dialog').getByLabel('Reason', { exact: true }).fill('Item returned');
  await page.getByRole('dialog').getByRole('button', { name: 'Record return', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.calls.find(c => c.path.endsWith('/rpc/record_customer_return')).body.p_sale_id).toBe(ids.sale);
});

test('audit resolves staff and batches and low-stock reports omit IDs from display and CSV', async ({ page }) => {
  const state = await backend(page);
  const movement = '77777777-7777-4777-8777-777777777777';
  const batch = '88888888-8888-4888-8888-888888888888';
  state.data.stock_movements = [{ stock_movement_id: movement, store_id: ids.store, product_id: ids.product, created_by: ids.manager, created_at: '2026-10-16T09:00:00Z', movement_type: 'sale', quantity_change: -1, sales_item_id: ids.item }];
  state.data.product_batches = [{ batch_id: batch, store_id: ids.store, product_id: ids.product, batch_number: 'BATCH-A', quantity: 4, status: 'available', expires_on: '2027-10-01' }];
  state.data.stock_movement_batches = [{ allocation_id: 'allocation', store_id: ids.store, product_id: ids.product, stock_movement_id: movement, batch_id: batch, quantity_change: -1 }];
  state.data.low_stock_report = [{ store_id: ids.store, product_id: ids.product, sku: 'TEST-001', product_name: 'Test Product', quantity: 1, reorder_level: 2, inventory_not_initialized: false }];
  await login(page);
  await page.getByRole('link', { name: 'Audit History', exact: true }).click();
  await expect(page.getByLabel('Record type', { exact: true })).toBeVisible();
  await expect(page.locator('tbody')).toContainText('Jane Manager');
  await expect(page.locator('tbody')).toContainText('Test Product');
  await page.getByLabel('Record type', { exact: true }).selectOption('Batch allocations');
  await expect(page.locator('tbody')).toContainText('BATCH-A');
  expect(await page.locator('table').innerText()).not.toContain(batch);
  expect(await page.locator('thead').innerText()).not.toMatch(/_id|\bID\b/);
  await page.getByRole('link', { name: 'Reports', exact: true }).click();
  await page.getByLabel('Report', { exact: true }).selectOption('Low stock');
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page.locator('[data-report]')).toContainText('Test Product');
  expect(await page.locator('[data-report]').innerText()).not.toContain(ids.product);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const download = await pending;
  const content = await readFile(await download.path(), 'utf8');
  expect(content).toContain('"Product"');
  expect(content).not.toContain('product_id');
  expect(content).not.toContain(ids.product);
  expect(state.errors).toEqual([]);
});


test('legacy fractional units cannot bypass whole-number sale validation', async ({ page }) => {
  const state = await backend(page);
  state.data.products[0].selling_unit_code = 'kg';
  state.data.selling_units.push({ unit_code: 'kg', display_name: 'Kilogram', decimal_places: 3 });
  await login(page);
  await page.getByRole('link', { name: 'Record sale', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Product', { exact: true }).selectOption(ids.product);
  const qty = modal.getByLabel('Quantity', { exact: true });
  await expect(qty).toHaveAttribute('step', '1');
  await qty.evaluate(node => { node.step = 'any'; node.min = '0'; });
  await qty.fill('0.5');
  await modal.getByRole('button', { name: 'Record sale', exact: true }).click();
  await expect(modal.locator('.form-error')).toContainText('whole-number');
  expect(state.calls.filter(c => c.path.endsWith('/rpc/record_sale'))).toHaveLength(0);
  await qty.fill('2');
  await modal.getByRole('button', { name: 'Record sale', exact: true }).click();
  await expect(modal).toHaveCount(0);
  expect(state.calls.find(c => c.path.endsWith('/rpc/record_sale')).body.p_items[0].quantity).toBe(2);
});


test('quarantine processing submits whole quantities with the original return item', async ({ page }) => {
  const state = await backend(page);
  state.data.customer_returns = [{ return_id: 'held-return', store_id: ids.store, sale_id: ids.sale, created_at: '2026-10-16T10:00:00Z', return_status: 'active', refund_status: 'pending', refund_total: 20, reason: 'Held return' }];
  state.data.customer_return_items = [{ return_item_id: 'held-item', return_id: 'held-return', store_id: ids.store, product_id: ids.product, quantity: 1, quarantined_quantity: 1, disposition: 'quarantine' }];
  await login(page);
  await page.getByRole('link', { name: 'Returns & Refunds', exact: true }).click();
  await page.getByRole('button', { name: 'Process holding', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Held return item').selectOption('held-item');
  await expect(modal.getByLabel('Quantity', { exact: true })).toHaveAttribute('step', '1');
  await modal.getByLabel('Quantity', { exact: true }).fill('1');
  await modal.getByLabel('Reason', { exact: true }).fill('Damaged item disposed');
  await modal.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(modal).toHaveCount(0);
  expect(state.calls.find(c => c.path.endsWith('/rpc/process_return_quarantine')).body).toMatchObject({ p_return_item_id: 'held-item', p_quantity: 1, p_action: 'dispose' });
  expect(state.errors).toEqual([]);
});

test('searchable dropdowns filter labels and submit selected product and payment values', async ({ page }) => {
  const state = await backend(page);
  await login(page);
  await page.getByRole('link', { name: 'Record sale', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Product', { exact: true }).click();
  const search = modal.getByRole('combobox', { name: 'Search Product options', exact: true });
  await search.fill('unmatched');
  await expect(modal.getByRole('status')).toHaveText('No matching options');
  await search.press('Enter');
  expect(state.calls.filter(c => c.path.endsWith('/rpc/record_sale'))).toHaveLength(0);
  await search.fill('tEsT pRoD');
  await modal.getByRole('listbox', { name: 'Product options', exact: true }).getByRole('option', { name: 'Test Product · each', exact: true }).click();
  await expect(modal.getByLabel('Product', { exact: true })).toHaveValue(ids.product);
  await modal.getByLabel('Payment method', { exact: true }).click();
  const paymentSearch = modal.getByRole('combobox', { name: 'Search Payment method options', exact: true });
  await paymentSearch.fill('mobile');
  await paymentSearch.press('Enter');
  await expect(modal.getByLabel('Payment method', { exact: true })).toHaveValue('mobile_money');
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Record sale', exact: true }).click();
  await expect(modal).toHaveCount(0);
  expect(state.calls.find(c => c.path.endsWith('/rpc/record_sale')).body).toMatchObject({ p_payment_method: 'mobile_money', p_items: [{ product_id: ids.product, quantity: 1 }] });
});

test('searchable dropdown keyboard cancel preserves selection and supports dynamic rows', async ({ page }) => {
  await backend(page);
  await login(page);
  await page.getByRole('link', { name: 'Record sale', exact: true }).click();
  const modal = page.getByRole('dialog');
  const payment = modal.getByLabel('Payment method', { exact: true });
  await payment.focus();
  await payment.press('ArrowDown');
  const search = modal.getByRole('combobox', { name: 'Search Payment method options', exact: true });
  await search.fill('bank');
  await search.press('Escape');
  await expect(modal).toBeVisible();
  await expect(payment).toHaveValue('cash');
  await expect(payment).toBeFocused();
  await modal.getByRole('button', { name: 'Add item', exact: true }).click();
  await modal.getByLabel('Product', { exact: true }).nth(1).click();
  const productSearch = modal.getByRole('combobox', { name: 'Search Product options', exact: true });
  await productSearch.fill('test');
  await productSearch.press('ArrowDown');
  await productSearch.press('Enter');
  await expect(modal.getByLabel('Product', { exact: true }).nth(1)).toHaveValue(ids.product);
});

test('searchable page filters work on mobile without overflowing the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await backend(page);
  await login(page);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('link', { name: 'Returns & Refunds', exact: true }).click();
  await page.getByLabel('Show', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Search Show options', exact: true }).fill('voided');
  const popup = page.locator('.select-search-popup');
  const bounds = await popup.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await page.getByRole('listbox', { name: 'Show options', exact: true }).getByRole('option', { name: 'Voided entries', exact: true }).click();
  await expect(page.getByLabel('Show', { exact: true })).toHaveValue('voided');
  await expect(popup).toHaveCount(0);
});

test('purchase details after visiting Sales use only the current page handlers', async ({ page }) => {
  const state = await backend(page);
  const purchase = '88888888-8888-4888-8888-888888888888';
  state.data.purchases = [{ purchase_id: purchase, store_id: ids.store, purchase_date: '2026-10-16T09:00:00Z', status: 'received', purchase_total_amount: 20 }];
  state.data.purchase_items = [{ purchase_item_id: 'purchase-line', store_id: ids.store, purchase_id: purchase, product_id: ids.product, quantity: 2, unit_cost: 10, line_total: 20 }];
  await login(page);
  for (let visit = 0; visit < 2; visit++) {
    await page.getByRole('link', { name: 'Sales', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sales', exact: true }).last()).toBeVisible();
    await page.getByRole('link', { name: 'Purchases', exact: true }).click();
    await expect(page.locator('[data-table]')).toContainText('Test Product × 2');
    await page.getByRole('button', { name: 'Details', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Purchase details');
    await expect(page.getByRole('dialog')).toContainText('Test Product');
    await expect(page.locator('#appMessage')).toBeHidden();
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).first().click();
    await page.getByRole('button', { name: 'Receive purchase', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Receive purchase');
    await expect(page.getByRole('dialog')).not.toContainText('Payment method');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  expect(state.calls.filter(c => c.path.endsWith('/rpc/get_sale_batches'))).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

test('supplier contacts use the confirmed key for listing, adding, editing and removing', async ({ page }) => {
  const state = await backend(page);
  const supplier = '77777777-7777-4777-8777-777777777777';
  const otherSupplier = '88888888-8888-4888-8888-888888888888';
  const phoneId = '99999999-9999-4999-8999-999999999999';
  state.data.suppliers = [
    { supplier_id: supplier, store_id: ids.store, supplier_name: 'Retail Supplier', active: true },
    { supplier_id: otherSupplier, store_id: ids.store, supplier_name: 'Other Supplier', active: true },
  ];
  state.data.supplier_phones = [
    { supplier_phone_id: phoneId, supplier_id: supplier, phone: '0971234567' },
    { supplier_phone_id: 'other-phone', supplier_id: otherSupplier, phone: '+260 96 555 5555' },
  ];
  await login(page);
  await page.getByRole('link', { name: 'Suppliers', exact: true }).click();
  const supplierRow = () => page.locator('tbody tr').filter({ hasText: 'Retail Supplier' });
  await expect(supplierRow()).toContainText('0971234567');
  await expect(supplierRow()).not.toContainText('+260 96 555 5555');
  await page.getByRole('searchbox', { name: 'Search records' }).fill('0971234567');
  await expect(page.locator('tbody')).not.toContainText('Other Supplier');
  await supplierRow().getByRole('button', { name: 'Phone numbers', exact: true }).click();
  let modal = page.getByRole('dialog');
  await expect(modal).toContainText('0971234567');
  await expect(modal).not.toContainText('+260 96 555 5555');
  await modal.getByLabel('Add phone number').fill(' +260 97 111 2222 ');
  await modal.getByRole('button', { name: 'Add number', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(supplierRow()).toContainText('+260 97 111 2222');
  const added = state.calls.find(c => c.path.endsWith('/supplier_phones') && c.method === 'POST').body;
  expect(added).toMatchObject({ supplier_id: supplier, phone: '+260 97 111 2222' });
  expect(added.supplier_phone_id).toMatch(/^[a-f0-9-]{36}$/);
  expect(added).not.toHaveProperty('id');

  await supplierRow().getByRole('button', { name: 'Phone numbers', exact: true }).click();
  await page.getByRole('dialog').getByRole('row').filter({ hasText: '0971234567' }).getByRole('button', { name: 'Edit number', exact: true }).click();
  modal = page.getByRole('dialog');
  await modal.getByLabel('Phone', { exact: true }).fill('0961234567');
  await modal.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(supplierRow()).toContainText('0961234567');
  await expect(supplierRow()).not.toContainText('0971234567');
  const updated = state.calls.find(c => c.path.endsWith('/supplier_phones') && c.method === 'PATCH');
  const query = new URLSearchParams(updated.query);
  expect(query.get('supplier_phone_id')).toBe(`eq.${phoneId}`);
  expect(query.get('supplier_id')).toBe(`eq.${supplier}`);

  await supplierRow().getByRole('button', { name: 'Phone numbers', exact: true }).click();
  await page.getByRole('dialog').getByRole('row').filter({ hasText: '0961234567' }).getByRole('button', { name: 'Remove number', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove number', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(supplierRow()).not.toContainText('0961234567');
  await expect(supplierRow()).toContainText('+260 97 111 2222');
  expect(state.data.supplier_phones.find(p => p.supplier_id === otherSupplier).phone).toBe('+260 96 555 5555');
  const deleted = new URLSearchParams(state.calls.find(c => c.method === 'DELETE').query);
  expect(deleted.get('supplier_phone_id')).toBe(`eq.${phoneId}`);
  expect(deleted.get('supplier_id')).toBe(`eq.${supplier}`);
  await expect(page.locator('#appMessage')).not.toHaveClass(/error/);
  expect(state.errors).toEqual([]);
});

test('blank supplier phone entries do not create contact records', async ({ page }) => {
  const state = await backend(page);
  state.data.suppliers = [{ supplier_id: 'supplier', store_id: ids.store, supplier_name: 'New Supplier', active: true }];
  await login(page);
  await page.getByRole('link', { name: 'Suppliers', exact: true }).click();
  await expect(page.locator('[data-table] tbody')).toContainText('Not added');
  await page.getByRole('button', { name: 'Phone numbers', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Add phone number').fill('   ');
  await modal.getByRole('button', { name: 'Add number', exact: true }).click();
  await expect(modal.locator('.form-error')).toHaveText('Enter a phone number.');
  expect(state.calls.filter(c => c.path.endsWith('/supplier_phones') && c.method === 'POST')).toHaveLength(0);
});

test('blank SKUs are generated per product and clearing an existing SKU preserves it', async ({ page }) => {
  const state = await backend(page);
  await login(page);
  await page.getByRole('link', { name: 'Products', exact: true }).click();
  for (const name of ['First automatic product', 'Second automatic product']) {
    await page.getByRole('button', { name: 'Add product', exact: true }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.getByLabel('SKU', { exact: true })).not.toHaveAttribute('required');
    await modal.getByLabel('Product name', { exact: true }).fill(name);
    await modal.getByLabel('SKU', { exact: true }).fill('   ');
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(modal).toHaveCount(0);
  }
  const created = state.calls.filter(c => c.path.endsWith('/products') && c.method === 'POST');
  expect(created).toHaveLength(2);
  for (const call of created) expect(call.body.sku).toBe(`AUTO-${call.body.product_id.replaceAll('-', '').toUpperCase()}`);
  expect(created[0].body.sku).not.toBe(created[1].body.sku);
  const existing = page.locator('tbody tr').filter({ hasText: 'Test Product' });
  await existing.getByRole('button', { name: 'Edit', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('SKU', { exact: true }).fill('');
  await modal.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(modal).toHaveCount(0);
  expect(state.calls.find(c => c.path.endsWith('/products') && c.method === 'PATCH').body.sku).toBe('TEST-001');
});

async function fillBusinessSignup(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a business account', exact: true }).click();
  await page.getByLabel('Your name', { exact: true }).fill('New Owner');
  await page.getByLabel('Business name', { exact: true }).fill('New Retail Business');
  await page.getByLabel('Store name', { exact: true }).fill('New Lusaka Store');
  await page.getByLabel('Email address').fill('owner@example.com');
  await page.getByLabel('Phone number (optional)').fill('0971234567');
  await page.getByLabel('Password', { exact: true }).fill('Strong-test-password-123!');
  await page.getByLabel('Confirm password', { exact: true }).fill('Strong-test-password-123!');
}

test('business signup uses Auth metadata and enters the manager workspace with a session', async ({ page }) => {
  const state = await backend(page);
  await fillBusinessSignup(page);
  await page.getByRole('button', { name: 'Create business', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your business at a glance' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Manage Accounts', exact: true })).toBeVisible();
  const signup = state.calls.find(c => c.path === '/auth/v1/signup');
  expect(signup.body.data.erp_owner_signup).toEqual({ user_name: 'New Owner', organization_name: 'New Retail Business', store_name: 'New Lusaka Store', phone: '0971234567' });
  expect(signup.body.data.erp_owner_signup).not.toHaveProperty('role');
  expect(signup.body.data.erp_owner_signup).not.toHaveProperty('store_id');
  expect(state.calls.filter(c => ['/rest/v1/profiles','/rest/v1/stores','/rest/v1/organizations'].includes(c.path) && c.method === 'POST')).toHaveLength(0);
  expect(state.errors).toEqual([]);
});

test('business signup respects email confirmation and validates matching passwords', async ({ page }) => {
  const state = await backend(page, { signupMode: 'confirmation' });
  await fillBusinessSignup(page);
  await page.getByLabel('Confirm password', { exact: true }).fill('Different-password-123!');
  await page.getByRole('button', { name: 'Create business', exact: true }).click();
  await expect(page.locator('#signupError')).toHaveText('Passwords do not match.');
  expect(state.calls.filter(c => c.path === '/auth/v1/signup')).toHaveLength(0);
  await page.getByLabel('Confirm password', { exact: true }).fill('Strong-test-password-123!');
  await page.getByRole('button', { name: 'Create business', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.locator('#loginError')).toContainText('Check your email');
  await expect(page.getByLabel('Email address')).toHaveValue('owner@example.com');
  await expect(page.locator('.sidebar')).toHaveCount(0);
});

test('an uncertain signup does not silently retry and keeps login available', async ({ page }) => {
  const state = await backend(page, { signupMode: 'failure' });
  await fillBusinessSignup(page);
  await page.getByRole('button', { name: 'Create business', exact: true }).click();
  await expect(page.locator('#signupError')).toContainText('Database error saving new user');
  await expect(page.getByRole('button', { name: 'Create business', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Back to login', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  expect(state.calls.filter(c => c.path === '/auth/v1/signup')).toHaveLength(1);
});


test('signup remains unavailable before backend provisioning is enabled while login works', async ({ page }) => {
  const state = await backend(page, { signupReady: false });
  await login(page);
  expect(state.calls.some(c => c.path.endsWith('/rpc/owner_signup_available'))).toBe(true);
  expect(state.calls.filter(c => c.path === '/auth/v1/signup')).toHaveLength(0);
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create a business account', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
});
