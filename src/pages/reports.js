import Decimal from 'decimal.js';
import { list, rpc } from '../lib/api.js';
import { $, e, options, select, field, button, table, row, panel, stat, note, actionForm, exportCsv, notify, dateLabel, supportDetails } from '../lib/ui.js';
import { businessDate } from '../lib/domain.js';
import { scoped, heading, bind } from './shared.js';

const reportTypes = {
  'Net sales': 'daily_net_sales_report', 'Gross sales': 'daily_sales_report',
  'Return entitlements': 'daily_return_report', 'Recorded refund payments': 'daily_refund_report',
  'Expenses': 'daily_expense_report', 'Low stock': 'low_stock_report',
};
const reportLabels = {
  report_date: 'Date', sale_count: 'Sales', sales_total: 'Gross sales',
  return_count: 'Returns', return_total: 'Return amount', refund_count: 'Refunds',
  refund_total: 'Refund payments', expense_count: 'Expenses', expense_total: 'Expense amount',
  category: 'Category', gross_sales: 'Gross sales', returns_total: 'Return amount', net_sales: 'Net sales',
  product_name: 'Product', sku: 'SKU', quantity: 'Sellable stock', reorder_level: 'Reorder level',
  inventory_not_initialized: 'Stock set up',
};

export async function reports(ctx) {
  const today = businessDate(ctx.store.time_zone);
  const root = ctx.mount(`${heading('Reports', 'Store business dates and authoritative database totals.', button('Export CSV', 'export'))}${note('Net sales deduct active return entitlements. Recorded refund payments are separate: do not subtract them from net sales again. Daily views may have no row for days without activity.')}${panel('Report filters', `<form data-filter-form><div class="filters">${select('Report', 'report', Object.keys(reportTypes).map(name => `<option>${e(name)}</option>`).join(''))}${field('Start date', 'start', { value: today.slice(0, 8) + '01', type: 'date' })}${field('End date', 'end', { value: today, type: 'date' })}<button class="primary-btn" type="submit">Apply filters</button></div></form><div data-report></div>`)}`);
  if (!root) return;
  let current = [], currentName = '', version = 0;
  const load = async () => {
    const request = ++version;
    const values = Object.fromEntries(new FormData($('[data-filter-form]', root)));
    if (values.start > values.end) throw new Error('Start date must not be after end date.');
    const data = await scoped(ctx, reportTypes[values.report]);
    if (request !== version || !root.isConnected) return;
    currentName = values.report;
    current = data.filter(r => !r.report_date || r.report_date >= values.start && r.report_date <= values.end);
    const columns = [...new Set(current.flatMap(Object.keys))].filter(k => !k.endsWith('_id') && k !== 'id');
    const display = (record, key) => key === 'report_date' ? dateLabel(record[key])
      : key === 'inventory_not_initialized' ? (record[key] ? 'No' : 'Yes')
        : /(?:total|sales)$/.test(key) ? ctx.money(record[key]) : record[key];
    $('[data-report]', root).innerHTML = current.length ? table(columns.map(c => reportLabels[c] || c.replaceAll('_', ' ')), current.map(r => row(columns.map(k => e(display(r, k)))))) : '<p class="empty">No report rows for this selection.</p>';
    current = current.map(record => Object.fromEntries(columns.map(key => [reportLabels[key] || key.replaceAll('_', ' '), key === 'report_date' ? dateLabel(record[key]) : key === 'inventory_not_initialized' ? (record[key] ? 'No' : 'Yes') : record[key]])));
  };
  $('[data-filter-form]', root).onsubmit = async event => { event.preventDefault(); try { await load(); } catch (error) { notify(error.message, true); } };
  bind(root, { export: () => exportCsv(currentName.toLowerCase().replaceAll(' ', '-'), current) });
  await load();
}

export async function summary(ctx) {
  const [net, expenses] = await Promise.all([scoped(ctx, 'daily_net_sales_report'), scoped(ctx, 'daily_expense_report')]);
  const today = businessDate(ctx.store.time_zone);
  const root = ctx.mount(`${heading('Operating summary', 'Sales less returns and recorded expenses.')} ${note('This replaces the demo Profit & Loss calculation. Historical cost of goods sold, tax and a closed-period accounting ledger are not available in the current report contract. The result below is not net profit.')}<form data-summary-form><div class="filters">${field('Start date', 'start', { value: today.slice(0, 8) + '01', type: 'date' })}${field('End date', 'end', { value: today, type: 'date' })}<button class="primary-btn" type="submit">Apply period</button></div></form><div data-summary></div>`);
  if (!root) return;
  const render = () => {
    const { start, end } = Object.fromEntries(new FormData($('[data-summary-form]', root)));
    if (start > end) throw new Error('Start date must not be after end date.');
    const inRange = r => r.report_date >= start && r.report_date <= end;
    const sales = net.filter(inRange).reduce((s, r) => s.plus(r.net_sales), new Decimal(0));
    const costs = expenses.filter(inRange).reduce((s, r) => s.plus(r.expense_total), new Decimal(0));
    $('[data-summary]', root).innerHTML = `<div class="stats">${stat('Net sales', ctx.money(sales.toNumber()), 'Gross sales less active returns')}${stat('Recorded expenses', ctx.money(costs.toNumber()))}${stat('Sales less expenses', ctx.money(sales.minus(costs).toNumber()), 'Before cost of goods, tax and other costs')}</div>`;
  };
  $('[data-summary-form]', root).onsubmit = event => { event.preventDefault(); try { render(); } catch (error) { notify(error.message, true); } };
  render();
}

export async function settings(ctx) {
  const root = ctx.mount(`${heading('Store settings', 'Your assigned business, store and operational timezone.', button('Set timezone', 'timezone', '', false))}<div class="grid-two">${panel('Business details', `<dl><dt>Organization</dt><dd>${e(ctx.organization?.organization_name || '—')}</dd><dt>Store</dt><dd>${e(ctx.store.store_name)}</dd><dt>Store type</dt><dd>${e(ctx.store.store_type_code.replaceAll('_', ' '))}</dd><dt>Timezone</dt><dd>${e(ctx.store.time_zone)}</dd><dt>Currency</dt><dd>${e(ctx.organization?.currency_code || 'Not configured — amounts are displayed without a currency symbol')}</dd></dl>${supportDetails({ 'Store reference': ctx.store.store_id })}`)}${panel('Account & administration', `<dl><dt>Name</dt><dd>${e(ctx.profile.user_name)}</dd><dt>Role</dt><dd>${e(ctx.owner ? 'Organization Owner' : ctx.profile.role === 'manager' ? 'Manager' : 'Worker')}</dd></dl>${supportDetails({ 'User reference': ctx.profile.user_id })}${note('Business signup creates your own business, store and organization owner account. Owners can view all stores and staff on the Organization page. Contact an administrator for additional stores, manager assignments, store types or other business changes. There is no cross-store switch.')}`)}</div>`);
  if (!root) return;
  bind(root, { timezone: async () => {
    const zones = await list('store_time_zones', { order: 'time_zone' });
    actionForm('Set store timezone', select('IANA timezone', 'time_zone', options(zones, 'time_zone', 'time_zone', ctx.store.time_zone)) + note('For Zambia use Africa/Lusaka (CAT, UTC+2). Reports use the store timezone, not the browser timezone.'), values => rpc('set_store_time_zone', { p_time_zone: values.time_zone }), ctx);
  } });
}
