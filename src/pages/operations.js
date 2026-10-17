import { list, insert, patch, rpc, createWorker, updateSupplierPhone, deleteSupplierPhone } from '../lib/api.js';
import { $, e, badge, short, timestamp, options, select, field, button, table, row, panel, note, dialog, actionForm, notify } from '../lib/ui.js';
import { price } from '../lib/domain.js';
import { scoped, nameOf, heading, bind, searchable, matches, searchBox, reason, payOptions, lineEditor, setupLines, parseLines, detailLines } from './shared.js';

async function transactionDetails(ctx, sale, products, isPurchase = false) {
  const idField = isPurchase ? 'purchase_id' : 'sale_id';
  const [items, allocations] = await Promise.all([
    scoped(ctx, isPurchase ? 'purchase_items' : 'sales_items', { filters: { [idField]: sale[idField] } }),
    isPurchase ? [] : rpc('get_sale_batches', { p_sale_id: sale.sale_id }),
  ]);
  dialog(isPurchase ? 'Purchase details' : 'Sale details', `<p><code>${e(sale[idField])}</code></p><p>${badge(sale.status)} · ${e(ctx.money(sale.total_amount ?? sale.purchase_total_amount))}</p>${detailLines('Items', items, products, ctx, isPurchase ? 'unit_cost' : 'unit_price')}${allocations.length ? `<h3>Original sale batch allocation</h3>${table(['Product', 'Batch', 'Expiry', 'Quantity'], allocations.map(a => row([e(nameOf(products, a.product_id)), e(a.batch_number), e(a.expires_on || 'No expiry'), e(a.quantity)])))}` : ''}${note('For an uncertain request, compare the original request ID and item quantities with this record before creating another transaction.')}`);
}

export async function sales(ctx) {
  const [data, products, units] = await Promise.all([scoped(ctx, 'sales'), scoped(ctx, 'products'), list('selling_units')]);
  const render = search => table(['Sale / request ID', 'Date', 'Payment', 'Status', 'Total', 'Actions'], [...data].sort((a, b) => b.sale_date.localeCompare(a.sale_date)).filter(s => matches(s, search)).map(s => row([
    `<code>${e(s.sale_id)}</code>`, e(timestamp(s.sale_date, ctx.store.time_zone)), e(s.payment_method), badge(s.status), e(ctx.money(s.total_amount)), `<div class="actions">${button('Details', 'details', s.sale_id)}${ctx.manager && s.status === 'completed' ? button('Cancel sale', 'reverse', s.sale_id) : ''}</div>`,
  ])));
  const root = ctx.mount(`${heading('Sales', ctx.manager ? 'Store sales, original item history and cancellations' : 'Record a sale and review your transactions', button('Record sale', 'add', '', false))}${panel('Sales history', `${searchBox()}<div data-table>${render('')}</div>`)}`);
  if (!root) return;
  searchable(root, render, { placeholder: 'Search sale UUID, payment or status…' });
  bind(root, {
    add: () => {
      const modal = actionForm('Record sale', select('Payment method', 'payment_method', payOptions()) + lineEditor(products, units), async (values, id) => {
        await rpc('record_sale', { p_request_id: id, p_payment_method: values.payment_method, p_items: parseLines(values, products, units) });
      }, ctx, { mutation: true, label: 'Record sale' });
      setupLines(modal, products, units);
    },
    details: id => transactionDetails(ctx, data.find(s => s.sale_id === id), products),
    reverse: id => actionForm('Cancel entire sale', note('This reverses the full sale and its original stock allocation. Active customer returns block cancellation. No money is transferred.') + reason(), values => rpc('reverse_sale', { p_sale_id: id, p_reason: values.reason }), ctx),
  });
}

export async function suppliers(ctx) {
  const data = await scoped(ctx, 'suppliers');
  const render = search => table(['Supplier', 'Email', 'Address', 'Status', 'Actions'], data.filter(s => matches(s, search)).map(s => row([e(s.supplier_name), e(s.email || '—'), e(s.address || '—'), badge(s.active ? 'active' : 'inactive'), `<div class="actions">${button('Edit', 'edit', s.supplier_id)}${button('Phone numbers', 'phones', s.supplier_id)}${button(s.active ? 'Deactivate' : 'Activate', 'toggle', s.supplier_id)}</div>`])));
  const root = ctx.mount(`${heading('Suppliers', 'Supplier details and contact numbers', button('Add supplier', 'add', '', false))}${panel('Suppliers', `${searchBox()}<div data-table>${render('')}</div>`)}`);
  if (!root) return;
  searchable(root, render);
  const edit = id => {
    const supplier = data.find(s => s.supplier_id === id) || {};
    actionForm(id ? 'Edit supplier' : 'Add supplier', field('Supplier name', 'supplier_name', { value: supplier.supplier_name }) + field('Email', 'email', { value: supplier.email, type: 'email', required: false }) + field('Address', 'address', { value: supplier.address, required: false }), (values, requestId) => {
      const body = { supplier_name: values.supplier_name.trim(), email: values.email.trim() || null, address: values.address.trim() || null };
      return id ? patch('suppliers', 'supplier_id', id, body, ctx.profile.store_id) : insert('suppliers', { ...body, supplier_id: requestId, store_id: ctx.profile.store_id, created_by: ctx.profile.user_id });
    }, ctx, { mutation: !id });
  };
  bind(root, {
    add: () => edit(), edit,
    toggle: id => { const supplier = data.find(s => s.supplier_id === id); actionForm('Update supplier status', note(supplier.supplier_name), () => patch('suppliers', 'supplier_id', id, { active: !supplier.active }, ctx.profile.store_id), ctx); },
    phones: async id => {
      // The supplier FK enforces scope; supplier_phones has no store_id column.
      const phones = await list('supplier_phones', { filters: { supplier_id: id } });
      const modal = actionForm('Supplier phone numbers', table(['Phone', 'Actions'], phones.map(p => row([e(p.phone), `<div class="actions">${button('Edit number', 'edit-phone', p.id)}${button('Remove number', 'remove-phone', p.id)}</div>`]))) + field('Add phone number', 'phone', { maxLength: 30 }), (values, requestId) => insert('supplier_phones', { id: requestId, supplier_id: id, phone: values.phone.trim() }), ctx, { mutation: true, label: 'Add number' });
      bind(modal, {
        'edit-phone': phoneId => actionForm('Edit supplier phone', field('Phone', 'phone', { value: phones.find(p => p.id === phoneId).phone, maxLength: 30 }), values => updateSupplierPhone(phoneId, id, values.phone.trim()), ctx),
        'remove-phone': phoneId => actionForm('Remove supplier contact number', note('This removes a contact number only. Supplier and transaction audit history are retained.'), () => deleteSupplierPhone(phoneId, id), ctx, { label: 'Remove number' }),
      });
      return modal;
    },
  });
}

export async function purchases(ctx) {
  const [data, suppliers, products, units] = await Promise.all([scoped(ctx, 'purchases'), scoped(ctx, 'suppliers'), scoped(ctx, 'products'), list('selling_units')]);
  const render = search => table(['Purchase / request ID', 'Supplier', 'Date', 'Status', 'Total', 'Actions'], [...data].sort((a, b) => b.purchase_date.localeCompare(a.purchase_date)).filter(p => matches({ ...p, supplier: nameOf(suppliers, p.supplier_id, 'supplier_id', 'supplier_name') }, search)).map(p => row([
    `<code>${e(p.purchase_id)}</code>`, e(nameOf(suppliers, p.supplier_id, 'supplier_id', 'supplier_name')), e(timestamp(p.purchase_date, ctx.store.time_zone)), badge(p.status), e(ctx.money(p.purchase_total_amount)), `<div class="actions">${button('Details', 'details', p.purchase_id)}${p.status === 'received' ? button('Cancel purchase', 'reverse', p.purchase_id) : ''}</div>`,
  ])));
  const root = ctx.mount(`${heading('Purchases', 'Receive supplier stock atomically, including batch allocations.', button('Receive purchase', 'add', '', false))}${panel('Purchase history', `${searchBox()}<div data-table>${render('')}</div>`)}`);
  if (!root) return;
  searchable(root, render);
  bind(root, {
    add: () => {
      const modal = actionForm('Receive purchase', select('Supplier', 'supplier_id', options(suppliers.filter(s => s.active), 'supplier_id', 'supplier_name')) + lineEditor(products, units, { purchase: true }), (values, id) => rpc('receive_purchase', { p_request_id: id, p_supplier_id: values.supplier_id, p_items: parseLines(values, products, units, true) }), ctx, { mutation: true, label: 'Receive stock' });
      setupLines(modal, products, units, { purchase: true });
    },
    details: id => transactionDetails(ctx, data.find(p => p.purchase_id === id), products, true),
    reverse: id => actionForm('Cancel entire purchase', note('The received quantities will be removed. The backend rejects this if the required stock is no longer available.') + reason(), values => rpc('reverse_purchase', { p_purchase_id: id, p_reason: values.reason }), ctx),
  });
}

export async function expenses(ctx) {
  const data = await scoped(ctx, 'expenses');
  const enabled = import.meta.env.VITE_ENABLE_EXPENSE_CANCELLATION === 'true';
  const render = search => table(['Expense ID', 'Date', 'Category', 'Description', 'Amount', 'Status', ...(enabled ? ['Actions'] : [])], data.filter(x => matches(x, search)).map(x => row([
    `<code>${e(x.expense_id)}</code>`, e(timestamp(x.expense_date, ctx.store.time_zone)), e(x.category), e(x.description), e(ctx.money(x.amount)), badge(x.status), ...(enabled ? [x.status === 'recorded' ? button('Cancel', 'cancel', x.expense_id) : '—'] : []),
  ])));
  const root = ctx.mount(`${heading('Expenses', 'Record store expenses and preserve transaction history.', button('Record expense', 'add', '', false))}${!enabled ? note('Expense cancellation is unavailable until the deployed cancellation RPC signature has been verified. Recorded expenses cannot be deleted here.') : ''}${panel('Expenses', `${searchBox()}<div data-table>${render('')}</div>`)}`);
  if (!root) return;
  searchable(root, render);
  bind(root, {
    add: () => actionForm('Record expense', field('Category', 'category') + field('Description', 'description') + field('Amount', 'amount', { type: 'number', min: '0.01', step: '0.01' }) + select('Payment method', 'payment_method', payOptions()), (values, requestId) => {
      const amount = price(values.amount);
      if (!amount) throw new Error('Expense amount must be greater than zero.');
      return insert('expenses', { expense_id: requestId, store_id: ctx.profile.store_id, created_by: ctx.profile.user_id, category: values.category.trim(), description: values.description.trim(), amount, payment_method: values.payment_method });
    }, ctx, { mutation: true }),
    cancel: id => actionForm('Cancel expense', reason(), values => rpc('cancel_expense', { p_expense_id: id, p_reason: values.reason }), ctx),
  });
}

export async function accounts(ctx) {
  const data = await scoped(ctx, 'profiles');
  const render = search => table(['Name', 'User ID', 'Phone', 'Role', 'Status', 'Actions'], data.filter(p => matches(p, search)).map(p => row([e(p.user_name), `<code>${e(p.user_id)}</code>`, e(p.phone || '—'), e(p.role === 'user' ? 'Worker' : 'Manager'), badge(p.status), p.role === 'user' ? button('Edit worker', 'edit', p.user_id) : 'Administrative account'])));
  const root = ctx.mount(`${heading('Manage accounts', 'Create workers in this store and manage their active status.', button('Create worker', 'add', '', false))}${note('Login emails are held by Supabase Auth, not the profiles table. This page never invents an email or allows store/role reassignment.')}${panel('Store team', `${searchBox()}<div data-table>${render('')}</div>`)}`);
  if (!root) return;
  searchable(root, render);
  bind(root, {
    edit: id => {
      const worker = data.find(p => p.user_id === id);
      actionForm('Edit worker', field('Name', 'user_name', { value: worker.user_name, maxLength: 100 }) + field('Phone', 'phone', { value: worker.phone, required: false, maxLength: 30 }) + select('Status', 'status', `<option value="active" ${worker.status === 'active' ? 'selected' : ''}>Active</option><option value="inactive" ${worker.status === 'inactive' ? 'selected' : ''}>Inactive</option>`), values => patch('profiles', 'user_id', id, { user_name: values.user_name.trim(), phone: values.phone.trim() || null, status: values.status }, ctx.profile.store_id), ctx);
    },
    add: () => {
      let submitted = false;
      dialog('Create worker', field('Worker name', 'user_name', { maxLength: 100 }) + field('Email', 'email', { type: 'email' }) + field('Temporary password (at least 12 characters)', 'password', { type: 'password', extra: 'minlength="12" autocomplete="new-password"' }) + field('Phone', 'phone', { required: false, maxLength: 30 }) + note('No confirmation email is sent. Share credentials securely. If the request outcome is uncertain, check Auth administratively before creating the account again.'), async values => {
        if (submitted) throw new Error('This account creation was already submitted. Check the Auth account before opening a new request.');
        await ctx.guard(); submitted = true;
        const result = await createWorker({ email: values.email.trim(), password: values.password, user_name: values.user_name.trim(), phone: values.phone.trim() || null });
        await ctx.refresh(); notify(`Worker created. UUID: ${result.user_id}. Immediate login is available.`);
      }, { submitLabel: 'Create worker' });
    },
  });
}
