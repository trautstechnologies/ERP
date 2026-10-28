// Presentation only: keep controllers, authorization, RPCs and the offline queue shared.
import Decimal from 'decimal.js';
import { e, stat, table, row, dateLabel } from './ui.js';
import { businessDate } from './domain.js';
import { openMobileSale } from '../pages/mobile-sale.js';

const pageStyles = {
  products: ['productsPage', 'products-header', 'product-stats', 'products-toolbar', 'productTable', 'productSearch'],
  inventory: ['inventoryPage', 'inventory-header', 'inventory-stats', 'inventory-toolbar', 'inventoryTable', 'inventorySearch'],
  sales: ['salesPage', 'pos-heading', '', '', 'posSalesHistory'],
  accounts: ['accountsPage', 'accounts-header', 'account-stats', 'accounts-toolbar', 'staffTable', 'staffSearch'],
  suppliers: ['suppliersPurchasesPage', 'sp-header', 'sp-stats', 'sp-toolbar', 'spSupplierTable'],
  purchases: ['suppliersPurchasesPage', 'sp-header', 'sp-stats', 'sp-toolbar', 'spPurchaseTable'],
  expenses: ['expensesPage', 'exp-header', 'exp-stats', 'exp-toolbar', 'expTable'],
  reports: ['reportsPage', 'reports-header', 'reports-stats', 'reports-toolbar', 'reportTransactionsTable'],
  summary: ['profitLossPage', 'pl-header', 'pl-stats', 'pl-toolbar', 'plMonthlyTable'],
  settings: ['settingsPage', 'settings-header', '', '', ''],
};

function labelTables(root) {
  for (const table of root.querySelectorAll('table')) {
    table.classList.add('mobile-card-table'); table.setAttribute('role', 'table');
    const headers = [...table.querySelectorAll('thead th')].map(th => th.textContent);
    table.querySelectorAll('thead,tbody').forEach(group => group.setAttribute('role', 'rowgroup'));
    table.querySelectorAll('th').forEach(th => th.setAttribute('role', 'columnheader'));
    for (const tr of table.querySelectorAll('tr')) tr.setAttribute('role', 'row');
    for (const tr of table.querySelectorAll('tbody tr')) {
      [...tr.cells].forEach((td, index) => {
        td.setAttribute('role', 'cell');
        td.dataset.label = td.hasAttribute('colspan') ? '' : headers[index] || '';
        td.toggleAttribute('data-mobile-actions', Boolean(td.querySelector('button,a.primary-btn,a.secondary-btn')));
      });
    }
  }
}

function chart(ctx, sales, today, count) {
  const days = Array.from({ length: count }, (_, index) => {
    const date = new Date(`${today}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - count + 1 + index);
    const key = date.toISOString().slice(0, 10);
    return { key, value: sales.filter(s => s.status === 'completed' && businessDate(ctx.store.time_zone, new Date(s.sale_date)) === key).reduce((sum, s) => sum.plus(s.total_amount), new Decimal(0)).toNumber() };
  });
  const max = Math.max(1, ...days.map(day => day.value));
  const points = days.map((day, index) => `${20 + index / (count - 1) * 560},${155 - day.value / max * 120}`);
  return `<svg id="tldRevenueChart" viewBox="0 0 600 185" role="img" aria-label="Completed gross sales over the last ${count} days"><path class="tld-chart-area" d="M20,155 L${points.join(' L')} L580,155 Z" fill="#4479d122"></path><polyline class="tld-chart-line" points="${points.join(' ')}" fill="none" stroke="#4479d1" stroke-width="3"></polyline>${days.map((day, index) => `<circle class="tld-chart-dot" cx="${points[index].split(',')[0]}" cy="${points[index].split(',')[1]}" r="3" fill="#4479d1"><title>${e(dateLabel(day.key, 'full'))}: ${e(ctx.money(day.value))}</title></circle>`).join('')}<text x="20" y="180" fill="currentColor" font-size="12">${e(dateLabel(days[0].key, 'short'))}</text><text x="580" y="180" text-anchor="end" fill="currentColor" font-size="12">Today</text></svg>`;
}

function dashboard(root, ctx, data) {
  const { products, inventory, sales, low, saleItems, today, todaySales } = data;
  const completed = sales.filter(s => s.status === 'completed');
  const todays = completed.filter(s => businessDate(ctx.store.time_zone, new Date(s.sale_date)) === today);
  const monthly = completed.filter(s => businessDate(ctx.store.time_zone, new Date(s.sale_date)).slice(0, 7) === today.slice(0, 7));
  const monthTotal = monthly.reduce((sum, s) => sum.plus(s.total_amount), new Decimal(0));
  const monthIds = new Set(monthly.map(s => s.sale_id));
  const cards = [
    [ctx.manager ? 'Today’s Sales' : 'Your sales recorded today', ctx.money(todaySales), ctx.manager ? 'Sales minus returns' : 'Your completed sales before returns'],
    ['Today’s Transactions', todays.length, 'Confirmed sales'],
    ['Active Products', products.filter(p => p.active).length, 'Store catalog'],
    ['Sellable Stock Units', inventory.reduce((sum, i) => sum + Number(i.sellable_quantity || 0), 0), 'Latest stock snapshot'],
    [ctx.manager ? 'Products to Restock' : 'Products Available', ctx.manager ? low.length : inventory.filter(i => Number(i.sellable_quantity) > 0).length, 'Store availability'],
    ['Categories', new Set(products.map(p => p.category).filter(Boolean)).size, 'Product categories'],
  ];
  const card = ([title, value, detail], index) => `<article class="tld-card${index === 3 ? ' tld-card-featured' : ''}"><span>${e(title)}</span><strong>${e(value)}</strong><small>${e(detail)}</small></article>`;
  root.id = 'overview';
  root.innerHTML = `<div id="trautsLiveDashboard" class="trauts-live-dashboard"><div class="tld-heading"><div><h2>Business Overview</h2><p id="tldDateLabel">${e(dateLabel(today, 'full'))}</p></div><div class="trauts-mobile-dashboard-actions"><button type="button" id="trautsQuickSaleBtn" class="primary-btn">Record sale</button></div></div><div class="tld-cards">${cards.map(card).join('')}</div><section class="tld-panel tld-chart-panel"><div class="tld-chart-heading"><h3>Gross Sales</h3><div class="tld-chart-ranges"><button type="button" class="tld-range-btn active" data-days="7" aria-pressed="true">7 days</button><button type="button" class="tld-range-btn" data-days="30" aria-pressed="false">30 days</button></div></div><div class="tld-chart-container" data-mobile-chart>${chart(ctx, sales, today, 7)}</div></section><div class="tld-columns"><section class="tld-panel"><div class="tld-panel-heading"><h3>${ctx.manager ? 'Restock Alerts' : 'Available Inventory'}</h3></div>${table(['Product', 'Available', 'Threshold'], (ctx.manager ? low : inventory).slice(0, 6).map(i => row([e(i.product_name), e(i.quantity ?? i.sellable_quantity), e(i.reorder_level ?? '—')])) )}</section><section class="tld-panel"><div class="tld-panel-heading"><h3>Recent Sales</h3><span>Latest 5</span></div>${table(['Items', 'Date', 'Amount'], [...sales].sort((a, b) => b.sale_date.localeCompare(a.sale_date)).slice(0, 5).map(s => row([e(saleItems.filter(i => i.sale_id === s.sale_id).map(i => `${products.find(p => p.product_id === i.product_id)?.product_name || 'Product'} × ${i.quantity}`).join(', ') || 'Items unavailable'), e(dateLabel(businessDate(ctx.store.time_zone, new Date(s.sale_date)))), e(ctx.money(s.total_amount))])))}</section></div><section class="tld-panel"><h3>This Month at a Glance</h3><div class="tld-monthly"><div><span>Gross Sales</span><strong>${e(ctx.money(monthTotal.toNumber()))}</strong></div><div><span>Transactions</span><strong>${monthly.length}</strong></div><div><span>Items Sold</span><strong>${saleItems.filter(i => monthIds.has(i.sale_id)).reduce((sum, i) => sum + Number(i.quantity), 0)}</strong></div><div><span>Average Sale</span><strong>${e(ctx.money(monthly.length ? monthTotal.div(monthly.length).toNumber() : 0))}</strong></div></div></section><p class="tld-footnote">Today’s Sales deducts returns for managers and owners. The chart and monthly gross sales remain before returns. Stock is a snapshot; pending offline sales are shown in Offline & sync.</p></div>`;
  root.querySelector('#trautsQuickSaleBtn').onclick = () => openMobileSale(ctx, products, inventory);
  root.querySelectorAll('[data-days]').forEach(button => button.onclick = () => {
    root.querySelector('[data-mobile-chart]').innerHTML = chart(ctx, sales, today, Number(button.dataset.days));
    root.querySelectorAll('[data-days]').forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  });
}

export function restoreMobileLayout(root, route, ctx, data = {}) {
  if (!ctx.mobile) return;
  if (route === 'dashboard' && data.products) dashboard(root, ctx, data);
  const supplyNav = document.querySelector('[data-mobile-supply-nav]');
  if (supplyNav) supplyNav.classList.toggle('active', route === 'suppliers' || route === 'purchases');
  const style = pageStyles[route];
  if (style) {
    root.id = style[0];
    const heading = root.querySelector(':scope > .toolbar');
    heading?.classList.add(style[1]);
    const stats = root.querySelector(':scope > .stats');
    if (stats && style[2]) stats.classList.add(style[2]);
    const panel = root.querySelector(':scope > .panel');
    if (panel) {
      const title = panel.querySelector(':scope > h3');
      const search = panel.querySelector('[data-search]');
      if (title && style[3]) {
        const bar = document.createElement('div'); bar.className = style[3];
        panel.prepend(bar); bar.append(title); if (search) bar.append(search);
      }
      if (style[4] && panel.querySelector('tbody')) panel.querySelector('tbody').id = style[4];
      if (search && style[5]) search.id = style[5];
    }
    if (route === 'products') {
      const add = heading?.querySelector('[data-action="add"]'); if (add) add.id = 'addProductBtn';
      if (stats && data.low && ctx.manager) stats.lastElementChild.innerHTML = `<p>Low Stock</p><h2>${data.low.length}</h2>`;
      if (heading) heading.querySelector('h2').textContent = 'Products & Services';
    }
    if (route === 'inventory' && data.inventory) {
      const units = data.inventory.reduce((sum, i) => sum + Number(i.total_physical_quantity ?? i.physical_quantity ?? i.main_quantity ?? 0), 0);
      const value = data.inventory.reduce((sum, i) => sum.plus(new Decimal(i.total_physical_quantity ?? i.physical_quantity ?? i.main_quantity ?? 0).times(data.products.find(p => p.product_id === i.product_id)?.buying_price || 0)), new Decimal(0));
      const cards = document.createElement('div'); cards.className = 'inventory-stats';
      cards.innerHTML = stat('Total Stock Units', units) + stat(ctx.manager ? 'Low Stock Products' : 'Products Available', ctx.manager ? data.low.length : data.inventory.filter(i => Number(i.sellable_quantity) > 0).length) + stat('Stock Value (Current Cost)', ctx.money(value.toNumber()), 'Estimate using current buying prices');
      heading?.after(cards);
      if (ctx.manager && heading) {
        const action = document.createElement('button'); action.type = 'button'; action.id = 'recordMovementBtn';
        action.className = 'inventory-primary'; action.dataset.action = 'add-movement'; action.textContent = 'Record Stock Movement';
        heading.append(action);
      }
      if (heading) heading.querySelector('h2').textContent = 'Inventory Management';
    }
    if (route === 'suppliers' || route === 'purchases') {
      const tabs = document.createElement('div'); tabs.className = 'sp-tabs';
      tabs.innerHTML = `<a href="#/suppliers" class="sp-tab${route === 'suppliers' ? ' active' : ''}" ${route === 'suppliers' ? 'aria-current="page"' : ''}>Suppliers</a><a href="#/purchases" class="sp-tab${route === 'purchases' ? ' active' : ''}" ${route === 'purchases' ? 'aria-current="page"' : ''}>Purchases</a>`;
      heading?.after(tabs);
    }
    if (route === 'sales') {
      const add = heading?.querySelector('[data-action="add"]');
      if (add) { add.id = 'newSaleBtn'; add.textContent = 'New Sale'; }
      if (heading) heading.querySelector('h2').textContent = 'Point of Sale';
      panel?.classList.add('pos-history-panel');
      if (data.inventory) {
        const alerts = data.inventory.filter(i => Number(i.sellable_quantity) <= Number(i.reorder_level ?? 0));
        const box = document.createElement('section'); box.className = 'trauts-stock-alerts';
        box.innerHTML = `<div class="trauts-stock-alert-header"><div><h3>Stock Alerts</h3><p>Latest stock snapshot</p></div><span>${alerts.length} products</span></div><div id="posStockAlertList">${alerts.length ? alerts.slice(0, 6).map(i => `<div class="trauts-stock-alert-row"><strong>${e(i.product_name || data.products.find(p => p.product_id === i.product_id)?.product_name || 'Product')}</strong><span>${e(i.sellable_quantity)} available</span></div>`).join('') : '<p>No low-stock alerts in this snapshot.</p>'}</div>`;
        heading?.after(box);
      }
    }
  }
  const decorate = () => {
    const body = root.querySelector('[data-table] tbody');
    if (style?.[4] && body) body.id = style[4];
    labelTables(root);
  };
  decorate();
  // Search/filter controllers replace table content. Decorate replacements without rebinding handlers.
  const observer = new MutationObserver(() => {
    if (!root.isConnected) { observer.disconnect(); return; }
    decorate();
  });
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
