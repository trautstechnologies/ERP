import { list, rpc } from '../lib/api.js';
import { $, e, options, select, field, button, notify, table, row } from '../lib/ui.js';
import { quantity, price } from '../lib/domain.js';

export const scoped = (ctx, tableName, extra = {}) => list(tableName, { scope: ctx.profile.store_id, ...extra });
export const nameOf = (rows, id, key = 'product_id', label = 'product_name') => rows.find(r => r[key] === id)?.[label] || id || '—';
export const heading = (title, subtitle, actions = '') => `<div class="toolbar"><div><h2>${e(title)}</h2><p>${e(subtitle)}</p></div><div class="actions">${actions}</div></div>`;
export const reason = () => field('Reason', 'reason', { maxLength: 1000 });
export const payOptions = () => ['cash', 'card', 'bank_transfer', 'other'].map(v => `<option value="${v}">${e(v.replace('_', ' '))}</option>`).join('');

export function bind(root, handlers) {
  root.addEventListener('click', async event => {
    const target = event.target.closest('[data-action]');
    if (!target || !root.contains(target) || target.disabled) return;
    const handler = handlers[target.dataset.action];
    if (!handler) return;
    target.disabled = true;
    try { await handler(target.dataset.id, target); }
    catch (error) { notify(error.message, true); }
    finally { target.disabled = false; }
  });
}

export function searchable(root, renderRows, { placeholder = 'Search records…' } = {}) {
  const input = $('[data-search]', root);
  if (!input) return;
  input.placeholder = placeholder;
  input.oninput = () => { $('[data-table]', root).innerHTML = renderRows(input.value.trim().toLowerCase()); };
}
export const matches = (record, search) => !search || Object.values(record).some(value => String(value ?? '').toLowerCase().includes(search));
export const searchBox = () => '<input class="search-input" data-search type="search" aria-label="Search records" placeholder="Search records…">';

export function detailLines(title, lines, products, ctx, costField) {
  return `<h3>${e(title)}</h3>${table(['Product', 'Quantity', 'Unit price/cost', 'Line total'], lines.map(i => row([
    e(nameOf(products, i.product_id)), e(i.quantity), e(ctx.money(i[costField])), e(ctx.money(i.line_total)),
  ])))}`;
}

export function lineEditor(products, units, { purchase = false } = {}) {
  return `<div data-lines></div>${button('Add item', 'add-line')}<p class="muted">${purchase ? 'For tracked products, allocate the received quantity to batches.' : 'Prices and final totals are calculated by the server.'}</p>`;
}

export function setupLines(dialog, products, units, { purchase = false } = {}) {
  let next = 0;
  const add = () => {
    const index = next++;
    const node = document.createElement('div'); node.className = 'line-editor'; node.dataset.line = index;
    node.innerHTML = `<div class="form-grid">${select('Product', `line_${index}_product`, options(products.filter(p => p.active), 'product_id', p => `${p.product_name} · ${p.selling_unit_code}`))}${field('Quantity', `line_${index}_quantity`, { type: 'number', min: '0.001', step: '0.001', value: 1 })}${purchase ? field('Unit cost', `line_${index}_cost`, { type: 'number', min: 0, step: '0.01', value: 0 }) : '<p class="muted" data-price></p>'}</div><div data-batches hidden></div>${button('Remove item', 'remove-line')}`;
    $('[data-lines]', dialog).append(node);
    $('select', node).onchange = () => {
      const product = products.find(p => p.product_id === $('select', node).value);
      const places = units.find(u => u.unit_code === product?.selling_unit_code)?.decimal_places ?? 0;
      const qty = $(`[name="line_${index}_quantity"]`, node);
      qty.step = places ? `0.${'0'.repeat(places - 1)}1` : '1'; qty.min = qty.step;
      if (!purchase) $('[data-price]', node).textContent = product ? `Unit price: ${product.selling_price} · ${product.selling_unit_code}` : '';
      if (purchase) {
        $(`[name="line_${index}_cost"]`, node).value = product?.buying_price ?? 0;
        const batchArea = $('[data-batches]', node);
        batchArea.hidden = !product?.batch_tracking;
        batchArea.innerHTML = product?.batch_tracking ? batchEditor(`line_${index}_batch`) : '';
        if (product?.batch_tracking) setupBatches(batchArea, `line_${index}_batch`, { requiredExpiry: product.requires_expiry, places });
      }
    };
  };
  dialog.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'add-line') add();
    if (action === 'remove-line') event.target.closest('[data-line]')?.remove();
  });
  add();
}

export function parseLines(values, products, units, purchase = false) {
  const keys = Object.keys(values).filter(k => /^line_\d+_product$/.test(k));
  if (!keys.length) throw new Error('Add at least one item.');
  const seen = new Set();
  return keys.map(key => {
    const prefix = key.replace('_product', '');
    const product = products.find(p => p.product_id === values[key]);
    if (!product) throw new Error('Select a product for every item.');
    if (seen.has(product.product_id)) throw new Error('Use one line per product; combine duplicate quantities.');
    seen.add(product.product_id);
    const places = units.find(u => u.unit_code === product.selling_unit_code)?.decimal_places ?? 0;
    const item = { product_id: product.product_id, quantity: quantity(values[`${prefix}_quantity`], places) };
    if (purchase) {
      item.unit_cost = price(values[`${prefix}_cost`]);
      if (product.batch_tracking) item.batches = parseBatches(values, `${prefix}_batch`, places, product.requires_expiry);
    }
    return item;
  });
}

export function batchEditor(prefix = 'batch') {
  return `<div data-batch-list="${e(prefix)}"></div><button type="button" class="secondary-btn" data-add-batch="${e(prefix)}">Add batch</button>`;
}

export function setupBatches(root, prefix = 'batch', { requiredExpiry = false, places = 3, status = false } = {}) {
  let next = 0;
  const add = () => {
    const index = next++;
    const node = document.createElement('div'); node.className = 'line-editor';
    node.innerHTML = `<div class="form-grid">${field('Batch number', `${prefix}_${index}_number`, { maxLength: 100 })}${field('Batch quantity', `${prefix}_${index}_quantity`, { type: 'number', min: places ? '0.001' : '1', step: places ? '0.001' : '1' })}${field('Expiry date', `${prefix}_${index}_expiry`, { type: 'date', required: requiredExpiry })}${status ? select('Initial status', `${prefix}_${index}_status`, '<option value="available">Available</option><option value="quarantined">Quarantined</option><option value="recalled">Recalled</option>') : ''}</div><button type="button" class="secondary-btn" data-remove-batch>Remove batch</button>`;
    $(`[data-batch-list="${prefix}"]`, root).append(node);
    $('[data-remove-batch]', node).onclick = () => node.remove();
  };
  $(`[data-add-batch="${prefix}"]`, root).onclick = add;
  add();
}

export function parseBatches(values, prefix, places = 3, requiredExpiry = false, includeStatus = false) {
  const keys = Object.keys(values).filter(k => new RegExp(`^${prefix}_\\d+_number$`).test(k));
  if (!keys.length) throw new Error('Add at least one batch.');
  return keys.map(key => {
    const base = key.replace('_number', '');
    const batch_number = values[key].trim();
    if (!batch_number) throw new Error('Every batch needs a number.');
    const expires_on = values[`${base}_expiry`] || null;
    if (requiredExpiry && !expires_on) throw new Error('Every batch needs an expiry date.');
    return { batch_number, quantity: quantity(values[`${base}_quantity`], places), expires_on, ...(includeStatus ? { status: values[`${base}_status`] } : {}) };
  });
}

export async function checkedRpc(ctx, name, body) {
  await ctx.guard();
  return rpc(name, body);
}
