import { list, insert, patch, rpc } from '../lib/api.js';
import { $, e, badge, options, select, field, check, button, table, row, panel, stat, note, actionForm } from '../lib/ui.js';
import { businessDate, quantity, price } from '../lib/domain.js';
import { scoped, nameOf, heading, bind, searchable, matches, searchBox, reason } from './shared.js';

export async function overview(ctx) {
  const [products, inventory, sales, low] = await Promise.all([
    scoped(ctx, 'products'), scoped(ctx, 'sellable_inventory'), scoped(ctx, 'sales'),
    ctx.manager ? scoped(ctx, 'low_stock_report') : Promise.resolve([]),
  ]);
  const today = businessDate(ctx.store.time_zone);
  const todays = sales.filter(s => s.status === 'completed' && businessDate(ctx.store.time_zone, new Date(s.sale_date)) === today);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - 6 + index);
    const key = date.toISOString().slice(0, 10);
    return { key, value: sales.filter(s => s.status === 'completed' && businessDate(ctx.store.time_zone, new Date(s.sale_date)) === key).reduce((sum, s) => sum + Number(s.total_amount), 0) };
  });
  const max = Math.max(1, ...days.map(d => d.value));
  ctx.mount(`${heading('Your business at a glance', ctx.manager ? 'Store activity, sales and stock availability' : 'Your sales and the store’s available products', '<a href="#/sales" class="primary-btn">Record sale</a>')}<div class="stats">${stat('Today’s gross sales', ctx.money(todays.reduce((s, r) => s + Number(r.total_amount), 0)), ctx.manager ? 'Completed store sales' : 'Your completed sales')}${stat('Today’s transactions', todays.length)}${stat('Active products', products.filter(p => p.active).length)}${stat(ctx.manager ? 'Low-stock products' : 'Products available', ctx.manager ? low.length : inventory.filter(i => Number(i.sellable_quantity) > 0).length)}</div><div class="grid-two">${panel('Sales over the last 7 days', `<div class="chart-bars">${days.map(d => `<div class="chart-column" title="${e(d.key)}: ${e(ctx.money(d.value))}"><div class="chart-value" style="height:${Math.max(1, d.value / max * 125)}px"></div><span>${e(d.key.slice(5))}</span></div>`).join('')}</div>`)}${panel(ctx.manager ? 'Restock alerts' : 'Available inventory', table(['Product', 'Sellable quantity'], (ctx.manager ? low : inventory).slice(0, 6).map(i => row([e(i.product_name), e(i.quantity ?? i.sellable_quantity)]))))}</div>${panel('Recent sales', table(['Sale', 'Date', 'Status', 'Total'], [...sales].sort((a, b) => b.sale_date.localeCompare(a.sale_date)).slice(0, 8).map(s => row([`<code>${e(s.sale_id)}</code>`, e(businessDate(ctx.store.time_zone, new Date(s.sale_date))), badge(s.status), e(ctx.money(s.total_amount))]))))}`);
}

export async function products(ctx) {
  const [data, units, suppliers, groups, inventory] = await Promise.all([
    scoped(ctx, 'products'), list('selling_units'), ctx.manager ? scoped(ctx, 'suppliers') : [],
    scoped(ctx, 'product_groups'), scoped(ctx, 'sellable_inventory'),
  ]);
  const render = search => table(['Product / SKU', 'Category', 'Unit', 'Buying price', 'Selling price', 'Sellable', 'Status', ...(ctx.manager ? ['Actions'] : [])],
    data.filter(p => matches(p, search)).map(p => row([
      `<strong>${e(p.product_name)}</strong><br><small>${e(p.sku)}</small>`, e(p.category || '—'), e(p.selling_unit_code), e(ctx.money(p.buying_price)), e(ctx.money(p.selling_price)), e(inventory.find(i => i.product_id === p.product_id)?.sellable_quantity ?? '—'), badge(p.active ? 'active' : 'inactive'),
      ...(ctx.manager ? [`<div class="actions">${button('Edit', 'edit', p.product_id)}${button(p.active ? 'Deactivate' : 'Activate', 'toggle', p.product_id)}</div>`] : []),
    ])));
  const root = ctx.mount(`${heading('Products & variants', 'Each sellable variant has its own SKU, unit and stock.', ctx.manager ? button('Add product', 'add', '', false) + button('Add product group', 'group') : '')}<div class="stats">${stat('Products', data.length)}${stat('Categories', new Set(data.map(p => p.category).filter(Boolean)).size)}${stat('Active', data.filter(p => p.active).length)}</div>${panel('Product catalog', `${searchBox()}<div data-table>${render('')}</div>`)}`);
  if (!root) return;
  searchable(root, render);
  const edit = id => {
    const p = data.find(row => row.product_id === id) || {};
    const originalAttributes = Object.entries(p.variant_attributes || {});
    const content = `<div class="form-grid">${field('Product name', 'product_name', { value: p.product_name, maxLength: 150 })}${field('SKU', 'sku', { value: p.sku, maxLength: 100 })}${field('Category', 'category', { value: p.category, required: false })}${select('Selling unit', 'selling_unit_code', options(units, 'unit_code', u => `${u.display_name} (${u.unit_code})`, p.selling_unit_code || 'each'))}${field('Selling price', 'selling_price', { value: p.selling_price ?? 0, type: 'number', min: 0, step: '0.01' })}${field('Buying price', 'buying_price', { value: p.buying_price ?? 0, type: 'number', min: 0, step: '0.01' })}${select('Supplier (optional)', 'supplier_id', options(suppliers.filter(s => s.active || s.supplier_id === p.supplier_id), 'supplier_id', 'supplier_name', p.supplier_id, 'No supplier'), false)}${select('Product group (optional)', 'product_group_id', options(groups, 'product_group_id', 'group_name', p.product_group_id, 'No group'), false)}</div><h3>Variant attributes</h3><p class="muted">For grouped products, add details such as size, color or strength.</p><div data-attributes></div>${button('Add attribute', 'add-attribute')}${note('Units cannot be changed after creation through this interface. Choose the selling unit carefully; pack/tablet conversions are not automatic.')}`;
    const modal = actionForm(id ? 'Edit product' : 'Add product', content, async (values, requestId) => {
      const attributes = Object.create(null);
      for (const key of Object.keys(values).filter(k => /^attribute_\d+_name$/.test(k))) {
        const index = Number(key.split('_')[1]);
        const name = values[key].trim();
        const value = values[`attribute_${index}_value`].trim();
        if (!name || !value) throw new Error('Each variant attribute needs a name and value.');
        if (Object.hasOwn(attributes, name)) throw new Error('Use each attribute name only once.');
        const original = originalAttributes[index];
        attributes[name] = original && original[0] === name && String(original[1]) === value ? original[1] : value;
      }
      if (Object.keys(attributes).length && !values.product_group_id) throw new Error('Choose a product group for variant attributes.');
      const body = { product_name: values.product_name.trim(), sku: values.sku.trim(), category: values.category.trim() || null, selling_price: price(values.selling_price), buying_price: price(values.buying_price), supplier_id: values.supplier_id || null, product_group_id: values.product_group_id || null, variant_attributes: attributes };
      if (id) await patch('products', 'product_id', id, body, ctx.profile.store_id);
      else await insert('products', { ...body, product_id: requestId, selling_unit_code: values.selling_unit_code, store_id: ctx.profile.store_id, created_by: ctx.profile.user_id });
    }, ctx, { mutation: !id });
    let attributeIndex = 0;
    const addAttribute = (name = '', value = '') => {
      const index = attributeIndex++;
      const node = document.createElement('div'); node.className = 'line-editor';
      node.innerHTML = `<div class="form-grid">${field('Attribute name', `attribute_${index}_name`, { value: name, maxLength: 60 })}${field('Attribute value', `attribute_${index}_value`, { value: String(value), maxLength: 150 })}</div>${button('Remove attribute', 'remove-attribute')}`;
      $('[data-attributes]', modal).append(node);
    };
    originalAttributes.forEach(([name, value]) => addAttribute(name, value));
    bind(modal, { 'add-attribute': () => addAttribute(), 'remove-attribute': (_, target) => target.closest('.line-editor').remove() });
    if (id) $('[name="selling_unit_code"]', modal).disabled = true;
  };
  bind(root, {
    add: () => edit(), edit,
    toggle: id => { const product = data.find(p => p.product_id === id); actionForm(`${product.active ? 'Deactivate' : 'Activate'} product`, note(product.product_name), () => patch('products', 'product_id', id, { active: !product.active }, ctx.profile.store_id), ctx); },
    group: () => actionForm('Add product group', field('Group name', 'group_name') + field('Description', 'description', { required: false }), (values, requestId) => insert('product_groups', { product_group_id: requestId, store_id: ctx.profile.store_id, created_by: ctx.profile.user_id, group_name: values.group_name.trim(), description: values.description.trim() || null }), ctx, { mutation: true }),
  });
}

export async function inventory(ctx) {
  const [products, inventory, units] = await Promise.all([scoped(ctx, 'products'), scoped(ctx, ctx.manager ? 'inventory_position' : 'sellable_inventory'), list('selling_units')]);
  const render = search => table(['Product', 'Unit', 'Main stock', ...(ctx.manager ? ['Return quarantine', 'Total physical'] : []), 'Sellable', ...(ctx.manager ? ['Actions'] : [])], products.filter(p => matches(p, search)).map(p => {
    const i = inventory.find(i => i.product_id === p.product_id) || {};
    return row([e(p.product_name), e(p.selling_unit_code), e(i.main_quantity ?? i.physical_quantity ?? 0), ...(ctx.manager ? [e(i.return_quarantine_quantity ?? 0), e(i.total_physical_quantity ?? 0)] : []), e(i.sellable_quantity ?? 0), ...(ctx.manager ? [`<div class="actions">${button('Reorder level', 'reorder', p.product_id)}${!p.batch_tracking ? button('Adjust stock', 'adjust', p.product_id) : '<a href="#/batches" class="secondary-btn">Manage batches</a>'}</div>`] : [])]);
  }));
  const root = ctx.mount(`${heading('Inventory', 'Main stock, sellable stock and return quarantine are separate balances.')}${note('Availability is a live snapshot, not a reservation. Sale and purchase RPCs validate stock atomically.')}${panel('Stock position', `${searchBox()}<div data-table>${render('')}</div>`)}`);
  if (!root) return;
  searchable(root, render);
  bind(root, {
    reorder: id => actionForm('Set reorder level', field('Reorder level', 'level', { type: 'number', min: 0, step: '0.001' }), values => rpc('set_reorder_level', { p_product_id: id, p_reorder_level: quantity(values.level, units.find(u => u.unit_code === products.find(p => p.product_id === id).selling_unit_code)?.decimal_places ?? 0, true) }), ctx),
    adjust: id => actionForm(`Adjust ${nameOf(products, id)}`, field('Quantity change (positive or negative)', 'quantity', { type: 'number', step: '0.001' }) + reason(), (values, requestId) => rpc('adjust_stock', { p_request_id: requestId, p_product_id: id, p_quantity_change: quantity(values.quantity, units.find(u => u.unit_code === products.find(p => p.product_id === id).selling_unit_code)?.decimal_places ?? 0, false, true), p_reason: values.reason }), ctx, { mutation: true }),
  });
}
