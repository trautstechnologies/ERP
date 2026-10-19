import { insert, patch, rpc } from '../lib/api.js';
import { $, e, badge, options, select, field, check, button, table, row, panel, stat, note, actionForm, dateLabel } from '../lib/ui.js';
import { businessDate, quantity, price } from '../lib/domain.js';
import { scoped, nameOf, heading, bind, searchable, matches, searchBox, reason, itemSummary } from './shared.js';

export async function overview(ctx) {
  const [products, inventory, sales, low, saleItems] = await Promise.all([
    scoped(ctx, 'products'), scoped(ctx, 'sellable_inventory'), scoped(ctx, 'sales'),
    ctx.manager ? scoped(ctx, 'low_stock_report') : Promise.resolve([]), scoped(ctx, 'sales_items'),
  ]);
  const today = businessDate(ctx.store.time_zone);
  const todays = sales.filter(s => s.status === 'completed' && businessDate(ctx.store.time_zone, new Date(s.sale_date)) === today);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - 6 + index);
    const key = date.toISOString().slice(0, 10);
    return { key, value: sales.filter(s => s.status === 'completed' && businessDate(ctx.store.time_zone, new Date(s.sale_date)) === key).reduce((sum, s) => sum + Number(s.total_amount), 0) };
  });
  const max = Math.max(1, ...days.map(d => d.value));
  ctx.mount(`${heading('Your business at a glance', ctx.manager ? 'Store activity, sales and stock availability' : 'Your sales and the store’s available products', '<a href="#/sales?action=new" class="primary-btn">Record sale</a>')}<div class="stats">${stat('Today’s gross sales', ctx.money(todays.reduce((s, r) => s + Number(r.total_amount), 0)), ctx.manager ? 'Completed store sales' : 'Your completed sales')}${stat('Today’s transactions', todays.length)}${stat('Active products', products.filter(p => p.active).length)}${stat(ctx.manager ? 'Low-stock products' : 'Products available', ctx.manager ? low.length : inventory.filter(i => Number(i.sellable_quantity) > 0).length)}</div><div class="grid-two">${panel('Sales over the last 7 days', `<div class="chart-bars">${days.map(d => `<div class="chart-column" title="${e(dateLabel(d.key, 'full'))}: ${e(ctx.money(d.value))}"><div class="chart-value" style="height:${Math.max(1, d.value / max * 125)}px"></div><span>${e(d.key === today ? 'Today' : dateLabel(d.key, 'short'))}</span></div>`).join('')}</div>`)}${panel(ctx.manager ? 'Restock alerts' : 'Available inventory', table(['Product', 'Sellable quantity'], (ctx.manager ? low : inventory).slice(0, 6).map(i => row([e(i.product_name), e(i.quantity ?? i.sellable_quantity)]))))}</div>${panel('Recent sales', table(['Items sold', 'Date', 'Status', 'Total'], [...sales].sort((a, b) => b.sale_date.localeCompare(a.sale_date)).slice(0, 8).map(s => row([e(itemSummary(saleItems.filter(i => i.sale_id === s.sale_id), products)), e(dateLabel(businessDate(ctx.store.time_zone, new Date(s.sale_date)))), badge(s.status), e(ctx.money(s.total_amount))]))))}`);
}

export async function products(ctx) {
  const [data, suppliers, inventory] = await Promise.all([
    scoped(ctx, 'products'), ctx.manager ? scoped(ctx, 'suppliers') : [], scoped(ctx, 'sellable_inventory'),
  ]);
  const render = search => table(['Product / SKU', 'Category', 'Unit', 'Buying price', 'Selling price', 'Sellable', 'Status', ...(ctx.manager ? ['Actions'] : [])],
    data.filter(p => matches(p, search)).map(p => row([
      `<strong>${e(p.product_name)}</strong><br><small>${e(p.sku)}</small>`, e(p.category || '—'), e(p.selling_unit_code), e(ctx.money(p.buying_price)), e(ctx.money(p.selling_price)), e(inventory.find(i => i.product_id === p.product_id)?.sellable_quantity ?? '—'), badge(p.active ? 'active' : 'inactive'),
      ...(ctx.manager ? [`<div class="actions">${button('Edit', 'edit', p.product_id)}${button(p.active ? 'Deactivate' : 'Activate', 'toggle', p.product_id)}</div>`] : []),
    ])));
  const root = ctx.mount(`${heading('Products', 'Manage products, prices and stock.', ctx.manager ? button('Add product', 'add', '', false) : '')}<div class="stats">${stat('Products', data.length)}${stat('Categories', new Set(data.map(p => p.category).filter(Boolean)).size)}${stat('Active', data.filter(p => p.active).length)}</div>${panel('Product catalog', `${searchBox()}<div data-table>${render('')}</div>`)}`);
  if (!root) return;
  searchable(root, render);
  const edit = id => {
    const p = data.find(row => row.product_id === id) || {};
    const content = `<div class="form-grid">${field('Product name', 'product_name', { value: p.product_name, maxLength: 150 })}${field('SKU', 'sku', { value: p.sku, maxLength: 100 })}${field('Category', 'category', { value: p.category, required: false })}${field('Selling price', 'selling_price', { value: p.selling_price ?? 0, type: 'number', min: 0, step: '0.01' })}${field('Buying price', 'buying_price', { value: p.buying_price ?? 0, type: 'number', min: 0, step: '0.01' })}${select('Supplier (optional)', 'supplier_id', options(suppliers.filter(s => s.active || s.supplier_id === p.supplier_id), 'supplier_id', 'supplier_name', p.supplier_id, 'No supplier'), false)}</div>${note('Stock is counted in whole items. Give different sizes or packs separate product names, such as Cola 500 ml and Cola 2 L.')}`;
    actionForm(id ? 'Edit product' : 'Add product', content, async (values, requestId) => {
      const body = { product_name: values.product_name.trim(), sku: values.sku.trim(), category: values.category.trim() || null, selling_price: price(values.selling_price), buying_price: price(values.buying_price), supplier_id: values.supplier_id || null };
      if (id) await patch('products', 'product_id', id, body, ctx.profile.store_id);
      else await insert('products', { ...body, product_id: requestId, selling_unit_code: 'each', store_id: ctx.profile.store_id, created_by: ctx.profile.user_id });
    }, ctx, { mutation: !id });
  };
  bind(root, {
    add: () => edit(), edit,
    toggle: id => { const product = data.find(p => p.product_id === id); actionForm(`${product.active ? 'Deactivate' : 'Activate'} product`, note(product.product_name), () => patch('products', 'product_id', id, { active: !product.active }, ctx.profile.store_id), ctx); },
  });
}

export async function inventory(ctx) {
  const [products, inventory] = await Promise.all([scoped(ctx, 'products'), scoped(ctx, ctx.manager ? 'inventory_position' : 'sellable_inventory')]);
  const render = search => table(['Product', 'Unit', 'Main stock', ...(ctx.manager ? ['Return quarantine', 'Total physical'] : []), 'Sellable', ...(ctx.manager ? ['Actions'] : [])], products.filter(p => matches(p, search)).map(p => {
    const i = inventory.find(i => i.product_id === p.product_id) || {};
    return row([e(p.product_name), e(p.selling_unit_code), e(i.main_quantity ?? i.physical_quantity ?? 0), ...(ctx.manager ? [e(i.return_quarantine_quantity ?? 0), e(i.total_physical_quantity ?? 0)] : []), e(i.sellable_quantity ?? 0), ...(ctx.manager ? [`<div class="actions">${button('Reorder level', 'reorder', p.product_id)}${!p.batch_tracking ? button('Adjust stock', 'adjust', p.product_id) : '<a href="#/batches" class="secondary-btn">Manage batches</a>'}</div>`] : [])]);
  }));
  const root = ctx.mount(`${heading('Inventory', 'Main stock, sellable stock and return quarantine are separate balances.')}${note('Availability is a live snapshot, not a reservation. Sale and purchase RPCs validate stock atomically.')}${panel('Stock position', `${searchBox()}<div data-table>${render('')}</div>`)}`);
  if (!root) return;
  searchable(root, render);
  bind(root, {
    reorder: id => actionForm('Set reorder level', field('Reorder level', 'level', { type: 'number', min: 0, step: '1' }), values => rpc('set_reorder_level', { p_product_id: id, p_reorder_level: quantity(values.level, { allowZero: true }) }), ctx),
    adjust: id => actionForm(`Adjust ${nameOf(products, id)}`, field('Quantity change (positive or negative)', 'quantity', { type: 'number', step: '1' }) + reason(), (values, requestId) => rpc('adjust_stock', { p_request_id: requestId, p_product_id: id, p_quantity_change: quantity(values.quantity, { signed: true }), p_reason: values.reason }), ctx, { mutation: true }),
  });
}
