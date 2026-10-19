import Decimal from 'decimal.js';

export const paymentMethods = ['cash', 'card', 'bank_transfer', 'mobile_money', 'other'];
export const paymentLabels = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank transfer', mobile_money: 'Mobile Money', other: 'Other' };
export const paymentLabel = method => paymentLabels[method] || method || '—';
export const managerPages = new Set(['suppliers', 'purchases', 'expenses', 'summary', 'accounts', 'reports', 'returns', 'batches', 'audit', 'settings']);

export function quantity(value, { allowZero = false, signed = false } = {}) {
  let number;
  try { number = new Decimal(value); } catch { throw new Error('Enter a valid quantity.'); }
  if (!number.isFinite() || (signed ? number.isZero() : allowZero ? number.lt(0) : number.lte(0)) || !number.isInteger()) {
    throw new Error(`Enter ${signed ? 'a non-zero' : allowZero ? 'a non-negative' : 'a positive'} whole-number quantity.`);
  }
  if (number.abs().gt(Number.MAX_SAFE_INTEGER)) throw new Error('Quantity exceeds the precision supported by this browser form.');
  return number.toNumber();
}

export function price(value) {
  let number;
  try { number = new Decimal(value); } catch { throw new Error('Enter a valid amount.'); }
  if (!number.isFinite() || number.isNegative() || number.decimalPlaces() > 2) throw new Error('Use a non-negative amount with at most two decimal places.');
  return number.toNumber();
}

export function lineTotal(qty, unitPrice) {
  return new Decimal(qty).mul(unitPrice).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

export function remainingReturns(items, headers, originalItem, batchId = undefined) {
  const active = new Set(headers.filter(h => h.return_status === 'active').map(h => h.return_id));
  return items.filter(i => active.has(i.return_id) && i.sales_item_id === originalItem && (batchId === undefined || i.batch_id === batchId))
    .reduce((sum, i) => sum.plus(i.quantity), new Decimal(0)).toNumber();
}

export function canVoid(header, items, actions) {
  const lines = items.filter(i => i.return_id === header.return_id);
  return header.return_status === 'active' && header.refund_status !== 'refunded' && lines.length > 0 &&
    lines.every(i => i.disposition === 'quarantine' && new Decimal(i.quarantined_quantity).eq(i.quantity) && !actions.some(a => a.return_item_id === i.return_item_id));
}

export function businessDate(zone = 'Africa/Lusaka', date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = key => parts.find(p => p.type === key).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function csv(rows, columns) {
  const cell = value => {
    let text = String(value ?? '');
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [columns.map(cell).join(','), ...rows.map(row => columns.map(c => cell(row[c])).join(','))].join('\r\n');
}
