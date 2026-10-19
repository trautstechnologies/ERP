import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quantity, price, lineTotal, remainingReturns, canVoid, businessDate, csv } from '../src/lib/domain.js';

test('whole quantities reject fractions while allowing zero reorder levels and signed adjustments', () => {
  assert.throws(() => quantity('0.125'));
  assert.equal(quantity('2'), 2);
  assert.equal(quantity('0', { allowZero: true }), 0);
  assert.equal(quantity('-1', { signed: true }), -1);
  for (const v of ['0', '-1', 'NaN', 'Infinity', '0.0001', 'bad']) assert.throws(() => quantity(v));
  assert.throws(() => quantity('0.5'));
  assert.throws(() => quantity('0', { signed: true }));
  assert.throws(() => quantity('9007199254740992'));
});

test('money previews use decimal, line-level rounding', () => {
  assert.equal(lineTotal(0.5, 0.03), 0.02);
  assert.equal(lineTotal(3, 0.1), 0.3);
  assert.equal(price('0'), 0);
  assert.throws(() => price('1.005'));
  assert.throws(() => price('Infinity'));
});

test('voided return quantities never consume the active return allowance', () => {
  const headers = [{ return_id: 'a', return_status: 'active' }, { return_id: 'v', return_status: 'voided' }];
  const items = [{ return_id: 'a', sales_item_id: 's', batch_id: 'b', quantity: 0.1 }, { return_id: 'a', sales_item_id: 's', batch_id: 'c', quantity: 0.2 }, { return_id: 'v', sales_item_id: 's', batch_id: 'b', quantity: 1 }];
  assert.equal(remainingReturns(items, headers, 's'), 0.3);
  assert.equal(remainingReturns(items, headers, 's', 'b'), 0.1);
});

test('only untouched quarantine returns display the void action', () => {
  const header = { return_id: 'a', return_status: 'active', refund_status: 'pending' };
  const items = [{ return_id: 'a', return_item_id: 'i', disposition: 'quarantine', quantity: 1, quarantined_quantity: 1 }];
  assert.equal(canVoid(header, items, []), true);
  assert.equal(canVoid({ ...header, refund_status: 'refunded' }, items, []), false);
  assert.equal(canVoid({ ...header, return_status: 'voided' }, items, []), false);
  assert.equal(canVoid(header, items, [{ return_item_id: 'i' }]), false);
  assert.equal(canVoid(header, [{ ...items[0], disposition: 'restock' }], []), false);
});

test('business dates use Zambia timezone instead of UTC date slicing', () => {
  assert.equal(businessDate('Africa/Lusaka', new Date('2026-10-16T23:30:00Z')), '2026-10-17');
});

test('CSV escaping blocks spreadsheet formulas and preserves quotes', () => {
  assert.equal(csv([{ name: '=SUM(A1)', note: 'a"b' }], ['name', 'note']), '"name","note"\r\n"\'=SUM(A1)","a""b"');
});
