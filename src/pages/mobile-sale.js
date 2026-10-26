// Original mobile product picker/cart, backed by the shared sale RPC and outbox.
import Decimal from 'decimal.js';
import { rpc } from '../lib/api.js';
import { $, e, actionForm, select, field, note } from '../lib/ui.js';
import { quantity } from '../lib/domain.js';
import { payOptions, parseLines } from './shared.js';

export function openMobileSale(ctx, products, inventory = []) {
  const active = products.filter(p => p.active);
  const cart = new Map();
  const modal = actionForm('Record sale', `<div id="trautsQuickSaleModal"><div class="pos-layout">
    <section class="panel pos-products"><h3>Select Products</h3><input id="posSearch" type="search" aria-label="Search sale products" placeholder="Search product name or SKU…"><div id="posProductList" class="pos-product-list"></div></section>
    <section class="panel pos-checkout"><h3>Current Sale</h3><div id="posCart"></div><div class="pos-totals"><div><span>Subtotal</span><strong id="posSubtotal"></strong></div><div class="pos-grand-total"><span>Total</span><strong id="posTotal"></strong></div>${select('Payment method', 'payment_method', payOptions())}${field('Amount received (optional cash calculator)', 'amount_received', { type: 'number', min: '0', step: '0.01', required: false })}<div><span>Change (estimate)</span><strong id="posChange"></strong></div></div>${note('Totals and change are previews. Prices and stock are confirmed when the sale is accepted. Amount received is a calculator only; it is not stored as a payment or transferred. Offline sales remain pending until synced.')}</section>
  </div></div>`, (values, id) => rpc('record_sale', {
    p_request_id: id, p_payment_method: values.payment_method, p_items: parseLines(values, products),
  }), ctx, { mutation: true, label: 'Complete sale' });
  modal.classList.add('mobile-sale-dialog');
  const editable = () => modal.dataset.frozen !== 'true' && modal.dataset.busy !== 'true';
  const total = () => [...cart].reduce((sum, [id, count]) => sum.plus(new Decimal(products.find(p => p.product_id === id).selling_price).times(count)), new Decimal(0));
  const totals = () => {
    const value = total();
    $('#posSubtotal', modal).textContent = $('#posTotal', modal).textContent = ctx.money(value.toNumber());
    const received = $('[name="amount_received"]', modal).value;
    let change = new Decimal(0);
    try { if (received && new Decimal(received).isFinite()) change = Decimal.max(0, new Decimal(received).minus(value)); } catch { /* Native validation explains malformed calculator input. */ }
    $('#posChange', modal).textContent = ctx.money(change.toNumber());
  };
  const renderCart = () => {
    $('#posCart', modal).innerHTML = cart.size ? [...cart].map(([id, count], index) => {
      const product = products.find(p => p.product_id === id);
      return `<div class="pos-cart-row"><div><strong>${e(product.product_name)}</strong><small>${e(ctx.money(product.selling_price))} each</small><input type="hidden" name="line_${index}_product" value="${e(id)}"></div><div class="pos-quantity"><button type="button" data-cart-step="-1" data-product="${e(id)}" aria-label="Decrease ${e(product.product_name)}">−</button><input type="number" min="1" max="9007199254740991" step="1" required name="line_${index}_quantity" value="${count}" data-cart-quantity="${e(id)}" aria-label="Quantity for ${e(product.product_name)}"><button type="button" data-cart-step="1" data-product="${e(id)}" aria-label="Increase ${e(product.product_name)}">+</button></div><button type="button" class="pos-secondary" data-cart-remove="${e(id)}" aria-label="Remove ${e(product.product_name)}">Remove</button></div>`;
    }).join('') : '<p class="empty">Choose products to start this sale.</p>';
    totals();
  };
  const renderProducts = () => {
    const term = $('#posSearch', modal).value.trim().toLowerCase();
    $('#posProductList', modal).innerHTML = active.filter(p => `${p.product_name} ${p.sku || ''}`.toLowerCase().includes(term)).map(product => {
      const stock = inventory.find(i => i.product_id === product.product_id);
      return `<article class="pos-product"><h4>${e(product.product_name)}</h4><p>${e(ctx.money(product.selling_price))}</p>${stock ? `<p>Stock snapshot: ${e(stock.sellable_quantity)}</p>` : ''}<button type="button" class="pos-primary" data-cart-add="${e(product.product_id)}" aria-label="Add ${e(product.product_name)}">Add to Sale</button></article>`;
    }).join('') || '<p class="empty">No matching products.</p>';
  };
  $('#posSearch', modal).oninput = renderProducts;
  $('[name="amount_received"]', modal).oninput = totals;
  modal.addEventListener('click', event => {
    if (!editable()) return;
    const add = event.target.closest('[data-cart-add]');
    const step = event.target.closest('[data-cart-step]');
    const remove = event.target.closest('[data-cart-remove]');
    try {
    if (add) {
      const id = add.dataset.cartAdd;
      cart.set(id, quantity((cart.get(id) || 0) + 1));
    } else if (step) {
      const id = step.dataset.product;
      const next = (cart.get(id) || 0) + Number(step.dataset.cartStep);
      if (next < 1) cart.delete(id); else cart.set(id, quantity(next));
    } else if (remove) cart.delete(remove.dataset.cartRemove);
    else return;
    renderCart();
    } catch (error) {
      const message = $('.form-error', modal); message.hidden = false; message.textContent = error.message;
    }
  });
  modal.addEventListener('input', event => {
    const input = event.target.closest('[data-cart-quantity]');
    if (!input || !editable() || !input.checkValidity()) return;
    try { cart.set(input.dataset.cartQuantity, quantity(input.value)); totals(); } catch { /* Form and server validation remain authoritative. */ }
  });
  renderProducts(); renderCart();
  return modal;
}
