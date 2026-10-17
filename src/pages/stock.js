import Decimal from 'decimal.js';
import { list, rpc } from '../lib/api.js';
import { $, e, badge, timestamp, options, select, field, check, button, table, row, panel, note, dialog, actionForm, notify } from '../lib/ui.js';
import { quantity, canVoid, remainingReturns } from '../lib/domain.js';
import { scoped, nameOf, heading, bind, searchable, matches, searchBox, reason, payOptions, batchEditor, setupBatches, parseBatches } from './shared.js';

export async function batches(ctx) {
  const [data, products, units, inventory] = await Promise.all([scoped(ctx, 'product_batches'), scoped(ctx, 'products'), list('selling_units'), scoped(ctx, 'store_inventory')]);
  const render = search => table(['Product', 'Batch', 'Expiry', 'Quantity', 'Status', 'Actions'], data.filter(b => matches({ ...b, product: nameOf(products, b.product_id) }, search)).map(b => row([
    e(nameOf(products, b.product_id)), e(b.batch_number), e(b.expires_on || 'No expiry'), e(b.quantity), badge(b.status), `<div class="actions">${button('Set status', 'status', b.batch_id)}${button('Adjust batch', 'adjust', b.batch_id)}</div>`,
  ])));
  const root = ctx.mount(`${heading('Batches & expiry', 'Traceable inventory, expiry and batch holds.', button('Enable tracking / migrate stock', 'enable', '', false))}${note('Sales use eligible batches in FEFO order. Expired, quarantined and recalled stock is not sellable. Customer-return quarantine is managed separately.')}${panel('Product batches', `${searchBox()}<div data-table>${render('')}</div>`)}`);
  if (!root) return;
  searchable(root, render);
  bind(root, {
    status: id => {
      const batch = data.find(b => b.batch_id === id);
      actionForm('Change batch status', note(`${nameOf(products, batch.product_id)} · ${batch.batch_number}`) + select('Status', 'status', ['available', 'quarantined', 'recalled'].map(s => `<option value="${s}" ${s === batch.status ? 'selected' : ''}>${s}</option>`).join('')) + reason(), values => rpc('set_batch_status', { p_batch_id: id, p_status: values.status, p_reason: values.reason }), ctx);
    },
    adjust: id => {
      const batch = data.find(b => b.batch_id === id);
      const product = products.find(p => p.product_id === batch.product_id);
      const places = units.find(u => u.unit_code === product.selling_unit_code)?.decimal_places ?? 0;
      actionForm('Adjust batch stock', note(`${product.product_name} · ${batch.batch_number} · current quantity ${batch.quantity}`) + field('Quantity change', 'quantity', { type: 'number', step: places ? '0.001' : '1' }) + reason(), (values, requestId) => rpc('adjust_batch_stock', { p_request_id: requestId, p_batch_id: id, p_quantity_change: quantity(values.quantity, places, false, true), p_reason: values.reason }), ctx, { mutation: true });
    },
    enable: () => {
      const eligible = products.filter(p => p.active && !p.batch_tracking);
      const modal = dialog('Enable batch tracking', select('Product', 'product', options(eligible, 'product_id', 'product_name')) + check('Require expiry on every batch', 'requires_expiry') + '<div data-migration></div><p class="muted" data-current></p>', async values => {
        const product = eligible.find(p => p.product_id === values.product);
        if (!product) throw new Error('Select an untracked product.');
        const current = Number(inventory.find(i => i.product_id === product.product_id)?.quantity ?? 0);
        await ctx.guard();
        if (current > 0) {
          throw new Error('Use the dedicated “Migrate existing stock” action below to preserve the original request identity.');
        }
        await rpc('enable_batch_tracking', { p_product_id: product.product_id, p_requires_expiry: values.requires_expiry === 'on' });
        await ctx.refresh(); notify('Batch tracking enabled. Receive purchases with batch details.');
      }, { submitLabel: 'Enable on empty stock' });
      $('[name="product"]', modal).onchange = event => {
        const product = eligible.find(p => p.product_id === event.target.value);
        const current = Number(inventory.find(i => i.product_id === product?.product_id)?.quantity ?? 0);
        $('[data-current]', modal).textContent = `Existing main stock: ${current}. Tracking cannot be disabled or reconfigured afterward.`;
        $('[data-migration]', modal).innerHTML = current > 0 ? note('This product has existing stock. Allocate that exact quantity into batches; never zero live inventory as a workaround.') + button('Migrate existing stock', 'migrate', product.product_id, false) : '';
      };
      bind(modal, { migrate: id => {
        const product = eligible.find(p => p.product_id === id);
        const current = inventory.find(i => i.product_id === id)?.quantity;
        const expiry = $('[name="requires_expiry"]', modal).checked;
        const places = units.find(u => u.unit_code === product.selling_unit_code)?.decimal_places ?? 0;
        const migrate = actionForm('Migrate existing stock to batches', note(`${product.product_name}: allocate exactly ${current} ${product.selling_unit_code}. Expired available stock is quarantined by the server.`) + batchEditor('migration') + reason(), (values, requestId) => {
          const batches = parseBatches(values, 'migration', places, expiry, true);
          if (!batches.reduce((s, b) => s.plus(b.quantity), new Decimal(0)).eq(current)) throw new Error('Batch quantities must equal the existing main stock exactly.');
          return rpc('migrate_existing_stock_to_batches', { p_request_id: requestId, p_product_id: id, p_requires_expiry: expiry, p_batches: batches, p_reason: values.reason });
        }, ctx, { mutation: true, label: 'Migrate existing stock' });
        setupBatches(migrate, 'migration', { requiredExpiry: expiry, places, status: true });
      } });
    },
  });
}

function newReturn(ctx, sales, saleItems, products, units, headers, returnItems) {
  let allocations = [], selected = '', counter = 0, loading = false;
  const modal = actionForm('Record customer return', select('Original completed sale', 'sale_id', options(sales.filter(s => s.status === 'completed'), 'sale_id', s => `${s.sale_id} · ${ctx.money(s.total_amount)}`)) + '<div data-return-lines></div>' + button('Add return item', 'add-return-line') + reason() + note(ctx.store.store_type_code === 'pharmacy' ? 'Pharmacy returns must enter quarantine and cannot be released for resale.' : 'Refunds use original sale prices. Restocking requires inspection and eligible stock provenance.'), (values, requestId) => {
    if (loading || values.sale_id !== selected) throw new Error('Wait for the original sale allocation to load.');
    const keys = Object.keys(values).filter(key => /^return_\d+_item$/.test(key));
    if (!keys.length) throw new Error('Add at least one return item.');
    const items = keys.map(key => {
      const base = key.replace('_item', '');
      const original = saleItems.find(i => i.sales_item_id === values[key] && i.sale_id === values.sale_id);
      if (!original) throw new Error('Choose an original sale item.');
      const product = products.find(p => p.product_id === original.product_id);
      return { sales_item_id: original.sales_item_id, quantity: quantity(values[`${base}_quantity`], units.find(u => u.unit_code === product?.selling_unit_code)?.decimal_places ?? 0), disposition: values[`${base}_disposition`], inspected: values[`${base}_inspected`] === 'on', ...(values[`${base}_batch`] ? { batch_id: values[`${base}_batch`] } : {}) };
    });
    return rpc('record_customer_return', { p_request_id: requestId, p_sale_id: values.sale_id, p_items: items, p_reason: values.reason });
  }, ctx, { mutation: true, label: 'Record return' });

  const add = () => {
    if (!selected || loading) { notify('Select an original sale first.'); return; }
    const index = counter++;
    const node = document.createElement('div'); node.className = 'line-editor';
    const originals = saleItems.filter(i => i.sale_id === selected);
    node.innerHTML = select('Original sale item', `return_${index}_item`, options(originals, 'sales_item_id', i => `${nameOf(products, i.product_id)} · sold ${i.quantity} · returned ${remainingReturns(returnItems, headers, i.sales_item_id)}`)) + `<div class="form-grid">${field('Return quantity', `return_${index}_quantity`, { type: 'number', min: '0.001', step: '0.001' })}${select('Disposition', `return_${index}_disposition`, ctx.store.store_type_code === 'pharmacy' ? '<option value="quarantine">Quarantine</option>' : '<option value="quarantine">Quarantine</option><option value="restock">Restock after inspection</option><option value="discard">Discard</option>')}</div><div data-original-batch></div>${check('Inspected and approved for restocking', `return_${index}_inspected`)}${button('Remove item', 'remove-return-line')}`;
    $('[data-return-lines]', modal).append(node);
    $('select', node).onchange = event => {
      const item = originals.find(i => i.sales_item_id === event.target.value);
      const batches = allocations.filter(a => a.sales_item_id === item?.sales_item_id);
      $('[data-original-batch]', node).innerHTML = batches.length ? select('Original sold batch', `return_${index}_batch`, options(batches, 'batch_id', a => `${a.batch_number} · originally sold ${a.quantity} · returned ${remainingReturns(returnItems, headers, a.sales_item_id, a.batch_id)}`)) : note('Original sale has no recorded batch allocation. The server decides whether restocking is still possible.');
    };
  };
  let selectionVersion = 0;
  $('[name="sale_id"]', modal).onchange = async event => {
    const version = ++selectionVersion;
    const saleId = event.target.value;
    selected = ''; loading = true;
    $('[data-return-lines]', modal).innerHTML = '';
    try {
      const result = saleId ? await rpc('get_sale_batches', { p_sale_id: saleId }) : [];
      if (version !== selectionVersion || !modal.isConnected) return;
      allocations = result; selected = saleId; loading = false;
      if (selected) add();
    } catch (error) { loading = false; notify(error.message, true); }
  };
  bind(modal, {
    'add-return-line': add,
    'remove-return-line': (_, target) => target.closest('.line-editor').remove(),
  });
}

export async function returns(ctx) {
  const [headers, items, actions, sales, saleItems, products, units] = await Promise.all([
    scoped(ctx, 'customer_returns'), scoped(ctx, 'customer_return_items'), scoped(ctx, 'return_stock_actions'),
    scoped(ctx, 'sales'), scoped(ctx, 'sales_items'), scoped(ctx, 'products'), list('selling_units'),
  ]);
  let search = '', mode = 'active';
  const render = () => table(['Return / original sale', 'Date', 'Return status', 'Refund', 'Holding', 'Actions'], headers.filter(h => {
    const included = mode === 'all' || (mode === 'pending' ? h.return_status === 'active' && h.refund_status === 'pending' : h.return_status === mode);
    return matches(h, search) && included;
  }).map(h => {
    const held = items.filter(i => i.return_id === h.return_id).reduce((s, i) => s.plus(i.quarantined_quantity), new Decimal(0));
    return row([`<code>${e(h.return_id)}</code><br><small>Sale: ${e(h.sale_id)}</small>`, e(timestamp(h.created_at, ctx.store.time_zone)), badge(h.return_status), `${e(ctx.money(h.refund_total))}<br>${badge(h.refund_status)}`, e(held.toString()), `<div class="actions">${button('Details', 'details', h.return_id)}${h.return_status === 'active' && held.gt(0) ? button('Process holding', 'process', h.return_id) : ''}${h.return_status === 'active' && h.refund_status === 'pending' ? button('Record refund', 'refund', h.return_id) : ''}${canVoid(h, items, actions) ? button('Void mistake', 'void', h.return_id) : ''}</div>`]);
  }));
  const root = ctx.mount(`${heading('Returns & refunds', 'Original sale provenance, separate quarantine and audited corrections.', button('Record return', 'add', '', false))}${note('Recording a refund does not transfer money. Voided returns retain original financial fields but are excluded from active queues and operational totals.')}${panel('Return history', `<div class="filters">${searchBox()}${select('Show', 'return_mode', '<option value="active">Active returns</option><option value="pending">Pending refunds (active only)</option><option value="voided">Voided entries</option><option value="all">All audit history</option>')}</div><div data-table>${render()}</div>`)}`);
  if (!root) return;
  $('[data-search]', root).oninput = event => { search = event.target.value.trim().toLowerCase(); $('[data-table]', root).innerHTML = render(); };
  $('[name="return_mode"]', root).onchange = event => { mode = event.target.value; $('[data-table]', root).innerHTML = render(); };
  bind(root, {
    add: () => newReturn(ctx, sales, saleItems, products, units, headers, items),
    details: id => {
      const header = headers.find(h => h.return_id === id);
      const lines = items.filter(i => i.return_id === id);
      const ids = new Set(lines.map(i => i.return_item_id));
      dialog('Return audit', `<p><code>${e(id)}</code></p><p>${e(header.reason)}</p>${header.return_status === 'voided' ? note(`Voided: ${header.void_reason} · ${header.voided_by} · ${timestamp(header.voided_at, ctx.store.time_zone)}`) : ''}${table(['Product', 'Quantity', 'Refund', 'Disposition', 'Held', 'Batch ID'], lines.map(i => row([e(nameOf(products, i.product_id)), e(i.quantity), e(ctx.money(i.refund_amount)), e(i.disposition), e(i.quarantined_quantity), `<code>${e(i.batch_id || 'Unbatched original sale')}</code>`])))}<h3>Quarantine actions</h3>${table(['Action ID', 'Action', 'Quantity', 'Reason'], actions.filter(a => ids.has(a.return_item_id)).map(a => row([`<code>${e(a.action_id)}</code>`, e(a.action), e(a.quantity), e(a.reason)])))}${header.refunded_at ? note(`Refund recorded: ${header.refund_method} · ${header.refund_reference || 'Cash'} · ${timestamp(header.refunded_at, ctx.store.time_zone)}`) : ''}`);
    },
    process: id => {
      const held = items.filter(i => i.return_id === id && Number(i.quarantined_quantity) > 0);
      const pharmacy = ctx.store.store_type_code === 'pharmacy' || held.some(i => i.pharmacy_return);
      actionForm('Process return quarantine', select('Held return item', 'item', options(held, 'return_item_id', i => `${nameOf(products, i.product_id)} · held ${i.quarantined_quantity}`)) + select('Action', 'action', `<option value="dispose">Dispose</option>${!pharmacy ? '<option value="release">Release to main stock</option>' : ''}`) + field('Quantity', 'quantity', { type: 'number', min: '0.001', step: '0.001' }) + check('Inspected and approved for resale (required for release)', 'inspected') + reason() + note(pharmacy ? 'Pharmacy returns cannot be released for resale.' : 'Expired, recalled, unknown-batch or otherwise ineligible goods cannot be released.'), (values, requestId) => {
        const item = held.find(i => i.return_item_id === values.item);
        const product = products.find(p => p.product_id === item?.product_id);
        return rpc('process_return_quarantine', { p_request_id: requestId, p_return_item_id: values.item, p_action: values.action, p_quantity: quantity(values.quantity, units.find(u => u.unit_code === product?.selling_unit_code)?.decimal_places ?? 0), p_reason: values.reason, p_inspected: values.inspected === 'on' });
      }, ctx, { mutation: true });
    },
    refund: id => actionForm('Record refund already performed', note(`This records an external payment of ${ctx.money(headers.find(h => h.return_id === id).refund_total)}. It does not pay the customer.`) + select('Refund method', 'method', payOptions()) + field('Payment reference (required for non-cash)', 'reference', { required: false }) + '<label class="check"><input name="confirmed" type="checkbox" required>I confirm the refund has already been performed outside this app.</label>', values => rpc('mark_return_refunded', { p_return_id: id, p_method: values.method, p_reference: values.reference.trim() || null }), ctx, { label: 'Record paid refund' }),
    void: id => actionForm('Void erroneous return entry', note('Only use this when the entry was mistaken and no actual goods should remain in return quarantine. This does not dispose of goods or reverse a payment. Rounding restrictions may require correcting later returns first.') + reason() + '<label class="check"><input type="checkbox" name="confirmed" required>I verified this is an erroneous, untouched entry.</label>', values => rpc('void_customer_return', { p_return_id: id, p_reason: values.reason }), ctx, { label: 'Void mistaken entry' }),
  });
}

export async function audit(ctx) {
  const datasets = {
    'Stock movements': 'stock_movements', 'Batch allocations': 'stock_movement_batches',
    'Batch status changes': 'batch_status_events', 'Existing-stock migrations': 'batch_stock_migrations',
    'Migration batch allocations': 'batch_stock_migration_items',
    'Return quarantine actions': 'return_stock_actions',
  };
  const products = await scoped(ctx, 'products');
  const root = ctx.mount(`${heading('Audit history', 'Read-only movement and workflow history. Search a request UUID to reconcile an uncertain response.')}${panel('Audit records', `<div class="filters">${select('Record type', 'dataset', Object.keys(datasets).map(k => `<option>${e(k)}</option>`).join(''))}${searchBox()}</div><div data-table></div>`)}`);
  if (!root) return;
  let data = [], loadVersion = 0;
  const render = () => {
    const search = $('[data-search]', root).value.toLowerCase();
    const keys = [...new Set(data.flatMap(Object.keys))];
    $('[data-table]', root).innerHTML = table(keys, data.filter(r => matches({ ...r, product_name: nameOf(products, r.product_id) }, search)).map(r => row(keys.map(key => e(r[key])))));
  };
  const load = async () => {
    const version = ++loadVersion;
    try {
      const result = await scoped(ctx, datasets[$('[name="dataset"]', root).value]);
      if (version !== loadVersion || !root.isConnected) return;
      data = result; render();
    } catch (error) { notify(error.message, true); }
  };
  $('[name="dataset"]', root).onchange = load;
  $('[data-search]', root).oninput = render;
  await load();
}
