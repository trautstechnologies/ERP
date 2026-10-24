import { list, insert, patch, rpc, createWorker, updateSupplierPhone, deleteSupplierPhone } from '../lib/api.js';
import { $, e, badge, timestamp, dateLabel, supportDetails, options, select, field, button, table, row, panel, note, dialog, actionForm, notify } from '../lib/ui.js';
import { price, paymentLabel } from '../lib/domain.js';
import { scoped, nameOf, heading, bind, searchable, matches, searchBox, reason, payOptions, lineEditor, setupLines, parseLines, detailLines, itemSummary } from './shared.js';

async function transactionDetails(ctx, sale, products, isPurchase = false) {
  const idField = isPurchase ? 'purchase_id' : 'sale_id';
  const [items, allocations] = await Promise.all([
    scoped(ctx, isPurchase ? 'purchase_items' : 'sales_items', { filters: { [idField]: sale[idField] } }),
    isPurchase ? [] : rpc('get_sale_batches', { p_sale_id: sale.sale_id }),
  ]);
  dialog(isPurchase ? 'Purchase details' : 'Sale details', `<p>${e(timestamp(sale.purchase_date || sale.sale_date, ctx.store.time_zone))}</p><p>${badge(sale.status)} · ${e(ctx.money(sale.total_amount ?? sale.purchase_total_amount))}</p>${detailLines('Items', items, products, ctx, isPurchase ? 'unit_cost' : 'unit_price')}${allocations.length ? `<h3>Original sale batch allocation</h3>${table(['Product', 'Batch', 'Expiry', 'Quantity'], allocations.map(a => row([e(nameOf(products, a.product_id)), e(a.batch_number), e(a.expires_on ? dateLabel(a.expires_on) : 'No expiry'), e(a.quantity)])))}` : ''}${supportDetails({ [isPurchase ? 'Purchase reference' : 'Sale reference']: sale[idField] })}`);
}

export async function sales(ctx) {
  const [data, products, saleItems, staff] = await Promise.all([scoped(ctx, 'sales'), scoped(ctx, 'products'), scoped(ctx, 'sales_items'), ctx.manager ? scoped(ctx, 'profiles') : [ctx.profile]]);
  const render = search => table(['Items sold', 'Recorded by', 'Date', 'Payment', 'Status', 'Total', 'Actions'], [...data].sort((a, b) => b.sale_date.localeCompare(a.sale_date)).filter(s => matches({ ...s, items: itemSummary(saleItems.filter(i => i.sale_id === s.sale_id), products), staff: nameOf(staff, s.user_id, 'user_id', 'user_name'), payment_label: paymentLabel(s.payment_method) }, search)).map(s => row([
    e(itemSummary(saleItems.filter(i => i.sale_id === s.sale_id), products)), e(nameOf(staff, s.user_id, 'user_id', 'user_name')), e(timestamp(s.sale_date, ctx.store.time_zone)), e(paymentLabel(s.payment_method)), badge(s.status), e(ctx.money(s.total_amount)), `<div class="actions">${button('Details', 'details', s.sale_id)}${ctx.manager && s.status === 'completed' ? button('Cancel sale', 'reverse', s.sale_id) : ''}</div>`,
  ])));
  const root = ctx.mount(`${heading('Sales', ctx.manager ? 'Store sales, original item history and cancellations' : 'Record a sale and review your transactions', button('Record sale', 'add', '', false))}${panel('Sales history', `${searchBox()}<div data-table>${render('')}</div>`)}`);
  if (!root) return;
  searchable(root, render, { placeholder: 'Search products, staff, payment or status…' });
  const openSale = () => {
    const modal = actionForm('Record sale', select('Payment method', 'payment_method', payOptions()) + lineEditor(products), async (values, id) => {
      await rpc('record_sale', { p_request_id: id, p_payment_method: values.payment_method, p_items: parseLines(values, products) });
    }, ctx, { mutation: true, label: 'Record sale' });
    setupLines(modal, products);
  };
  bind(root, {
    add: openSale,
    details: id => transactionDetails(ctx, data.find(s => s.sale_id === id), products),
    reverse: id => actionForm('Cancel entire sale', note('This reverses the full sale and its original stock allocation. Active customer returns block cancellation. No money is transferred.') + reason(), values => rpc('reverse_sale', { p_sale_id: id, p_reason: values.reason }), ctx),
  });
  if (ctx.intent === 'new-sale') openSale();
}

export async function suppliers(ctx) {
  const [data, allPhones] = await Promise.all([scoped(ctx, 'suppliers'), list('supplier_phones')]);
  const phonesFor = id => allPhones.filter(phone => phone.supplier_id === id);
  const phoneValue = value => {
    const phone = value.trim();
    if (!phone) throw new Error('Enter a phone number.');
    return phone;
  };
  const render = search => table(['Supplier', 'Phone numbers', 'Email', 'Address', 'Status', 'Actions'], data.filter(s => matches({ ...s, phones: phonesFor(s.supplier_id).map(p => p.phone).join(' ') }, search)).map(s => row([e(s.supplier_name), phonesFor(s.supplier_id).map(p => e(p.phone)).join('<br>') || 'Not added', e(s.email || '—'), e(s.address || '—'), badge(s.active ? 'active' : 'inactive'), `<div class="actions">${button('Edit', 'edit', s.supplier_id)}${button('Phone numbers', 'phones', s.supplier_id)}${button(s.active ? 'Deactivate' : 'Activate', 'toggle', s.supplier_id)}</div>`])));
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
      // RLS authorizes contacts through the parent supplier; there is no store_id column.
      const phones = await list('supplier_phones', { filters: { supplier_id: id } });
      const modal = actionForm('Supplier phone numbers', table(['Phone', 'Actions'], phones.map(p => row([e(p.phone), `<div class="actions">${button('Edit number', 'edit-phone', p.supplier_phone_id)}${button('Remove number', 'remove-phone', p.supplier_phone_id)}</div>`]))) + field('Add phone number', 'phone', { type: 'tel', maxLength: 30 }), (values, requestId) => insert('supplier_phones', { supplier_phone_id: requestId, supplier_id: id, phone: phoneValue(values.phone) }), ctx, { mutation: true, label: 'Add number' });
      bind(modal, {
        'edit-phone': phoneId => actionForm('Edit supplier phone', field('Phone', 'phone', { value: phones.find(p => p.supplier_phone_id === phoneId).phone, type: 'tel', maxLength: 30 }), values => updateSupplierPhone(phoneId, id, phoneValue(values.phone)), ctx),
        'remove-phone': phoneId => actionForm('Remove supplier contact number', note('This removes a contact number only. Supplier and transaction audit history are retained.'), () => deleteSupplierPhone(phoneId, id), ctx, { label: 'Remove number' }),
      });
      return modal;
    },
  });
}

export async function purchases(ctx) {
  const [data, suppliers, products, purchaseItems] = await Promise.all([scoped(ctx, 'purchases'), scoped(ctx, 'suppliers'), scoped(ctx, 'products'), scoped(ctx, 'purchase_items')]);
  const render = search => table(['Items received', 'Supplier', 'Date', 'Status', 'Total', 'Actions'], [...data].sort((a, b) => b.purchase_date.localeCompare(a.purchase_date)).filter(p => matches({ ...p, items: itemSummary(purchaseItems.filter(i => i.purchase_id === p.purchase_id), products), supplier: nameOf(suppliers, p.supplier_id, 'supplier_id', 'supplier_name') }, search)).map(p => row([
    e(itemSummary(purchaseItems.filter(i => i.purchase_id === p.purchase_id), products)), e(nameOf(suppliers, p.supplier_id, 'supplier_id', 'supplier_name')), e(timestamp(p.purchase_date, ctx.store.time_zone)), badge(p.status), e(ctx.money(p.purchase_total_amount)), `<div class="actions">${button('Details', 'details', p.purchase_id)}${p.status === 'received' ? button('Cancel purchase', 'reverse', p.purchase_id) : ''}</div>`,
  ])));
  const root = ctx.mount(`${heading('Purchases', 'Receive supplier stock atomically, including batch allocations.', button('Receive purchase', 'add', '', false))}${panel('Purchase history', `${searchBox()}<div data-table>${render('')}</div>`)}`);
  if (!root) return;
  searchable(root, render);
  bind(root, {
    add: () => {
      const modal = actionForm('Receive purchase', select('Supplier', 'supplier_id', options(suppliers.filter(s => s.active), 'supplier_id', 'supplier_name')) + lineEditor(products, { purchase: true }), (values, id) => rpc('receive_purchase', { p_request_id: id, p_supplier_id: values.supplier_id, p_items: parseLines(values, products, true) }), ctx, { mutation: true, label: 'Receive stock' });
      setupLines(modal, products, { purchase: true });
    },
    details: id => transactionDetails(ctx, data.find(p => p.purchase_id === id), products, true),
    reverse: id => actionForm('Cancel entire purchase', note('The received quantities will be removed. The backend rejects this if the required stock is no longer available.') + reason(), values => rpc('reverse_purchase', { p_purchase_id: id, p_reason: values.reason }), ctx),
  });
}

export async function expenses(ctx) {
  const data = await scoped(ctx, 'expenses');
  const enabled = import.meta.env.VITE_ENABLE_EXPENSE_CANCELLATION === 'true';
  const render = search => table(['Date', 'Category', 'Description', 'Payment', 'Amount', 'Status', ...(enabled ? ['Actions'] : [])], data.filter(x => matches({ ...x, payment_label: paymentLabel(x.payment_method) }, search)).map(x => row([
    e(timestamp(x.expense_date, ctx.store.time_zone)), e(x.category), e(x.description), e(paymentLabel(x.payment_method)), e(ctx.money(x.amount)), badge(x.status), ...(enabled ? [x.status === 'recorded' ? button('Cancel', 'cancel', x.expense_id) : '—'] : []),
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
  const render = search => table(['Name', 'Phone', 'Role', 'Status', 'Actions'], data.filter(p => matches(p, search)).map(p => row([e(p.user_name), e(p.phone || '—'), e(ctx.owner && p.user_id === ctx.profile.user_id ? 'Organization Owner' : p.role === 'user' ? 'Worker' : 'Manager'), badge(p.status), p.role === 'user' ? button('Edit worker', 'edit', p.user_id) : 'Administrative account'])));
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
        await ctx.refresh(); notify(`${result.user_name || values.user_name} was created successfully. Immediate login is available.`);
      }, { submitLabel: 'Create worker' });
    },
  });
}
