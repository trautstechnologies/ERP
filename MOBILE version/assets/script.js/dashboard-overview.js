
/* ============================================
   TRAUTS SHOP MANAGER
   LIVE DASHBOARD OVERVIEW
   ============================================ */

(() => {
  "use strict";

  const KEYS = {
    products: "trauts_demo_products_v1",
    sales: "trauts_demo_sales_v1",
    expenses: "trauts_demo_expenses_v1",
    purchases: "trauts_demo_purchases_v1",
    settings: "trauts_demo_settings_v1"
  };

  const $ = id => document.getElementById(id);

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function readSettings() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.settings)) || {};
    } catch {
      return {};
    }
  }

  function money(ngwee) {
    return "K " + (Number(ngwee || 0) / 100)
      .toLocaleString("en-ZM", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
  }

  function localDate(value = new Date()) {
    const date = value instanceof Date
      ? value
      : new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function recordDate(value) {
    if (!value) return "";

    if (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      return value;
    }

    return localDate(value);
  }

  function isService(product) {
    return String(product.type || "").toLowerCase() === "service";
  }

  function stockOf(product) {
    const stock = Number(product.stock);
    return Number.isFinite(stock) && stock >= 0
      ? stock
      : 0;
  }

  function thresholdOf(product, settings) {
    const own = product.threshold;

    if (
      own !== undefined &&
      own !== null &&
      own !== "" &&
      Number.isInteger(Number(own)) &&
      Number(own) >= 0
    ) {
      return Number(own);
    }

    const global = Number(settings.lowStockThreshold);

    return Number.isInteger(global) && global >= 0
      ? global
      : 5;
  }

  function costNgwee(product) {
    const raw = product.cost ?? product.buyingPrice;

    if (
      raw === undefined ||
      raw === null ||
      raw === ""
    ) {
      return null;
    }

    const value = Number(raw);

    return Number.isFinite(value) && value >= 0
      ? Math.round(value * 100)
      : null;
  }

  function getSaleCost(sale, productMap) {
    let total = 0;
    let estimated = false;
    let missing = false;

    for (const item of sale.items || []) {
      const qty = Number(item.qty);

      if (!Number.isFinite(qty) || qty <= 0) {
        missing = true;
        continue;
      }

      let unitCost = null;

      if (
        item.costNgwee !== undefined &&
        item.costNgwee !== null &&
        item.costNgwee !== "" &&
        Number.isFinite(Number(item.costNgwee)) &&
        Number(item.costNgwee) >= 0
      ) {
        unitCost = Number(item.costNgwee);
      } else if (
        item.unitCostNgwee !== undefined &&
        item.unitCostNgwee !== null &&
        item.unitCostNgwee !== "" &&
        Number.isFinite(Number(item.unitCostNgwee)) &&
        Number(item.unitCostNgwee) >= 0
      ) {
        unitCost = Number(item.unitCostNgwee);
      } else {
        const product = productMap.get(String(item.id));

        if (product) {
          unitCost = costNgwee(product);
          if (unitCost !== null) estimated = true;
        }
      }

      if (unitCost === null) {
        missing = true;
        continue;
      }

      total += Math.round(unitCost * qty);
    }

    return { total, estimated, missing };
  }

  function supplierBalance(purchase) {
    // Purchase schema may differ between versions.
    // Only calculate a balance when the total and
    // amount paid are explicitly recorded in ngwee.
    const total = purchase.totalNgwee;
    const paid = purchase.paidNgwee;

    if (
      total === undefined ||
      total === null ||
      paid === undefined ||
      paid === null ||
      !Number.isFinite(Number(total)) ||
      !Number.isFinite(Number(paid))
    ) {
      return null;
    }

    return Math.max(0, Number(total) - Number(paid));
  }

  function createElement(tag, text, className) {
    const element = document.createElement(tag);

    if (text !== undefined) {
      element.textContent = String(text);
    }

    if (className) element.className = className;

    return element;
  }

  function findOverview() {
    return (
      $("overview") ||
      $("overviewPage") ||
      document.querySelector('[data-section="overview"]')
    );
  }

  function buildDashboard() {
    const overview = findOverview();

    if (!overview) {
      console.warn(
        "TRAUTS: Overview section not found."
      );
      return false;
    }

    if ($("trautsLiveDashboard")) return true;

    const wrapper = createElement(
      "div",
      undefined,
      "trauts-live-dashboard"
    );

    wrapper.id = "trautsLiveDashboard";

    wrapper.innerHTML = `
      <div class="tld-heading">
        <div>
          <h2>Business Overview</h2>
          <p id="tldDateLabel"></p>
        </div>
        <button
          type="button"
          id="tldRefresh"
          class="tld-refresh">
          Refresh Overview
        </button>
      </div>

      <div class="tld-cards">
        <article class="tld-card">
          <span>Today's Sales</span>
          <strong id="tldTodaySales">K 0.00</strong>
          <small id="tldTodayTransactions">
            0 transactions
          </small>
        </article>

        <article class="tld-card">
          <span>Today's Gross Profit</span>
          <strong id="tldGrossProfit">K 0.00</strong>
          <small>Revenue minus cost of goods sold</small>
        </article>

        <article class="tld-card">
          <span>Today's Expenses</span>
          <strong id="tldTodayExpenses">K 0.00</strong>
          <small>Recorded operating expenses</small>
        </article>

        <article class="tld-card tld-card-featured">
          <span>Estimated Net Operating Profit</span>
          <strong id="tldNetProfit">K 0.00</strong>
          <small>Gross profit minus expenses</small>
        </article>

        <article class="tld-card">
          <span>Products to Restock</span>
          <strong id="tldLowStockCount">0</strong>
          <small id="tldOutOfStockCount">
            0 out of stock
          </small>
        </article>

        <article class="tld-card">
          <span>Outstanding Supplier Balances</span>
          <strong id="tldSupplierBalance">K 0.00</strong>
          <small id="tldSupplierNote">
            Recorded unpaid purchases
          </small>
        </article>
      </div>

      <p id="tldCostNotice" class="tld-notice" hidden></p>

      <div class="tld-columns">
        <section class="tld-panel">
          <div class="tld-panel-heading">
            <h3>Restock Alerts</h3>
            <span id="tldRestockSummary"></span>
          </div>

          <div class="tld-table-wrap">
            <table class="tld-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Available</th>
                  <th>Threshold</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="tldRestockTable"></tbody>
            </table>
          </div>
        </section>

        <section class="tld-panel">
          <div class="tld-panel-heading">
            <h3>Recent Sales</h3>
            <span>Latest 5</span>
          </div>

          <div class="tld-table-wrap">
            <table class="tld-table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Date</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody id="tldRecentSales"></tbody>
            </table>
          </div>
        </section>
      </div>

      <section class="tld-panel">
        <h3>This Month at a Glance</h3>

        <div class="tld-monthly">
          <div>
            <span>Revenue</span>
            <strong id="tldMonthRevenue">K 0.00</strong>
          </div>

          <div>
            <span>Cost of Goods Sold</span>
            <strong id="tldMonthCogs">K 0.00</strong>
          </div>

          <div>
            <span>Operating Expenses</span>
            <strong id="tldMonthExpenses">K 0.00</strong>
          </div>

          <div>
            <span>Estimated Net Profit</span>
            <strong id="tldMonthNet">K 0.00</strong>
          </div>
        </div>
      </section>

      <p class="tld-footnote">
        Profit figures are management estimates.
        Supplier stock purchases are not deducted
        again as operating expenses.
      </p>
    `;

    // Insert above existing overview content.
    overview.prepend(wrapper);

    $("tldRefresh").addEventListener(
      "click",
      renderDashboard
    );

    return true;
  }

  function calculatePeriod(sales, expenses, productMap, filter) {
    let revenue = 0;
    let cogs = 0;
    let operatingExpenses = 0;
    let transactions = 0;
    let estimatedSales = 0;
    let missingCostSales = 0;

    sales.forEach(sale => {
      if (!filter(recordDate(sale.date))) return;

      const total = Number(sale.totalNgwee);

      if (!Number.isFinite(total)) return;

      const cost = getSaleCost(sale, productMap);

      revenue += total;
      cogs += cost.total;
      transactions++;

      if (cost.estimated) estimatedSales++;
      if (cost.missing) missingCostSales++;
    });

    expenses.forEach(expense => {
      if (!filter(recordDate(expense.date))) return;

      const amount = Number(expense.amountNgwee);

      if (Number.isFinite(amount)) {
        operatingExpenses += amount;
      }
    });

    return {
      revenue,
      cogs,
      operatingExpenses,
      gross: revenue - cogs,
      net: revenue - cogs - operatingExpenses,
      transactions,
      estimatedSales,
      missingCostSales
    };
  }

  function addTableCell(row, value) {
    const cell = createElement("td", value);
    row.appendChild(cell);
    return cell;
  }

  function renderDashboard() {
    if (!buildDashboard()) return;

    const products = readArray(KEYS.products);
    const sales = readArray(KEYS.sales);
    const expenses = readArray(KEYS.expenses);
    const purchases = readArray(KEYS.purchases);
    const settings = readSettings();

    const date = localDate();
    const month = date.slice(0, 7);

    const productMap = new Map(
      products.map(product => [
        String(product.id),
        product
      ])
    );

    const today = calculatePeriod(
      sales,
      expenses,
      productMap,
      record => record === date
    );

    const thisMonth = calculatePeriod(
      sales,
      expenses,
      productMap,
      record => record.startsWith(month)
    );

    $("tldDateLabel").textContent =
      `Live summary for ${new Date().toLocaleDateString(
        "en-ZM",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }
      )}`;

    $("tldTodaySales").textContent =
      money(today.revenue);

    $("tldTodayTransactions").textContent =
      `${today.transactions} transaction(s) today`;

    $("tldGrossProfit").textContent =
      money(today.gross);

    $("tldTodayExpenses").textContent =
      money(today.operatingExpenses);

    $("tldNetProfit").textContent =
      money(today.net);

    $("tldMonthRevenue").textContent =
      money(thisMonth.revenue);

    $("tldMonthCogs").textContent =
      money(thisMonth.cogs);

    $("tldMonthExpenses").textContent =
      money(thisMonth.operatingExpenses);

    $("tldMonthNet").textContent =
      money(thisMonth.net);

    for (const id of [
      "tldGrossProfit",
      "tldNetProfit",
      "tldMonthNet"
    ]) {
      const element = $(id);
      const value =
        id === "tldGrossProfit"
          ? today.gross
          : id === "tldMonthNet"
            ? thisMonth.net
            : today.net;

      element.classList.toggle(
        "tld-negative",
        value < 0
      );
    }

    // ======================================
    // RESTOCK ALERTS
    // ======================================

    const lowStock = products
      .filter(product => !isService(product))
      .filter(product =>
        stockOf(product) <=
        thresholdOf(product, settings)
      )
      .sort((a, b) =>
        stockOf(a) - stockOf(b)
      );

    const outOfStock = lowStock.filter(product =>
      stockOf(product) === 0
    );

    $("tldLowStockCount").textContent =
      lowStock.length;

    $("tldOutOfStockCount").textContent =
      `${outOfStock.length} out of stock`;

    $("tldRestockSummary").textContent =
      `${lowStock.length} product(s) need attention`;

    const restockTable = $("tldRestockTable");
    restockTable.replaceChildren();

    lowStock.forEach(product => {
      const row = createElement("tr");

      const productCell = createElement("td");

      const name = createElement(
        "strong",
        product.name
      );

      const sku = createElement(
        "small",
        product.sku || "No SKU"
      );

      productCell.append(name, sku);
      row.appendChild(productCell);

      addTableCell(row, stockOf(product));

      addTableCell(
        row,
        thresholdOf(product, settings)
      );

      const statusCell = createElement("td");
      const status = createElement(
        "span",
        stockOf(product) === 0
          ? "Out of stock"
          : "Low stock",
        stockOf(product) === 0
          ? "tld-status out"
          : "tld-status low"
      );

      statusCell.appendChild(status);
      row.appendChild(statusCell);

      restockTable.appendChild(row);
    });

    if (!lowStock.length) {
      const row = createElement("tr");
      const cell = addTableCell(
        row,
        "No products currently need restocking."
      );

      cell.colSpan = 4;
      restockTable.appendChild(row);
    }

    // ======================================
    // SUPPLIER BALANCES
    // ======================================

    let balance = 0;
    let unrecognized = 0;

    purchases.forEach(purchase => {
      const amount = supplierBalance(purchase);

      if (amount === null) {
        unrecognized++;
      } else {
        balance += amount;
      }
    });

    $("tldSupplierBalance").textContent =
      money(balance);

    $("tldSupplierNote").textContent =
      unrecognized
        ? `${unrecognized} purchase(s) could not be included`
        : "Unpaid balance across recorded purchases";

    // ======================================
    // RECENT SALES
    // ======================================

    const recentTable = $("tldRecentSales");
    recentTable.replaceChildren();

    const recent = sales.slice().sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    ).slice(0, 5);

    recent.forEach(sale => {
      const row = createElement("tr");

      addTableCell(
        row,
        sale.receiptNo || "—"
      );

      addTableCell(
        row,
        recordDate(sale.date) || "—"
      );

      addTableCell(
        row,
        money(sale.totalNgwee)
      );

      recentTable.appendChild(row);
    });

    if (!recent.length) {
      const row = createElement("tr");
      const cell = addTableCell(
        row,
        "No sales recorded yet."
      );

      cell.colSpan = 3;
      recentTable.appendChild(row);
    }

    // ======================================
    // COST ACCURACY NOTICE
    // ======================================

    const notice = $("tldCostNotice");

    const estimated =
      thisMonth.estimatedSales;

    const missing =
      thisMonth.missingCostSales;

    notice.hidden = estimated === 0 && missing === 0;

    if (!notice.hidden) {
      notice.textContent =
        `Profit accuracy: ${estimated} sale(s) ` +
        `use estimated buying costs and ${missing} ` +
        `sale(s) contain items with missing costs ` +
        `this month.`;
    }
  }

  // ==========================================
  // EXTERNAL REFRESH SUPPORT
  // ==========================================

  window.refreshTrautsDashboard = renderDashboard;

  [
    "trauts:products-updated",
    "trauts:stock-updated",
    "trauts:sales-updated",
    "trauts:expenses-updated",
    "trauts:purchases-updated"
  ].forEach(eventName => {
    window.addEventListener(
      eventName,
      renderDashboard
    );
  });

  window.addEventListener("storage", event => {
    if (
      Object.values(KEYS).includes(event.key) ||
      event.key === null
    ) {
      renderDashboard();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      renderDashboard,
      { once: true }
    );
  } else {
    renderDashboard();
  }
})();

/* ==========================================
   TRAUTS MOBILE DASHBOARD
   SALES PERFORMANCE GRAPH

   Add BELOW the existing dashboard code.
   Keeps existing business calculations.
   ========================================== */

(() => {
  "use strict";

  const SALES_KEY = "trauts_demo_sales_v1";

  let selectedDays = 7;

  const byId = id => document.getElementById(id);

  // ==========================================
  // DATE AND CURRENCY HELPERS
  // ==========================================

  function dateKey(input) {
    if (
      typeof input === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(input)
    ) {
      return input;
    }

    const d = input instanceof Date
      ? input
      : new Date(input);

    if (Number.isNaN(d.getTime())) return "";

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  function money(ngwee) {
    return "K " + (ngwee / 100).toLocaleString(
      "en-ZM",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
  }

  // ==========================================
  // CREATE GRAPH INTERFACE
  // ==========================================

  function installGraph() {
    const wrapper = byId("trautsLiveDashboard");

    if (!wrapper) return false;

    if (byId("tldRevenueChart")) return true;

    const cards = wrapper.querySelector(".tld-cards");

    if (!cards) return false;

    const title = wrapper.querySelector(
      ".tld-heading h2"
    );

    if (title) {
      title.textContent = "Performance Snapshot";
    }

    cards.insertAdjacentHTML("afterend", `
      <section
        class="tld-panel tld-chart-panel"
        aria-labelledby="tldChartHeading">

        <div class="tld-chart-heading">
          <div>
            <h3 id="tldChartHeading">
              Sales Performance
            </h3>

            <p>
              Recorded daily revenue in Zambian kwacha
            </p>
          </div>

          <div
            class="tld-chart-ranges"
            role="group"
            aria-label="Chart period">

            <button
              type="button"
              class="tld-range-btn"
              data-days="7"
              aria-pressed="true">
              7 days
            </button>

            <button
              type="button"
              class="tld-range-btn"
              data-days="30"
              aria-pressed="false">
              30 days
            </button>

          </div>
        </div>

        <div class="tld-chart-summary">
          <span id="tldChartPeriod">
            Last 7 days
          </span>

          <strong id="tldChartTotal">
            K 0.00
          </strong>
        </div>

        <div class="tld-chart-container">
          <svg
            id="tldRevenueChart"
            viewBox="0 0 640 238"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Daily sales revenue chart">
          </svg>
        </div>

        <p
          id="tldChartEmpty"
          class="tld-chart-empty"
          hidden>
        </p>

      </section>
    `);

    wrapper.querySelectorAll(".tld-range-btn")
      .forEach(button => {

        button.addEventListener("click", () => {
          selectedDays = Number(button.dataset.days);
          renderGraph();
        });

      });

    return true;
  }

  // ==========================================
  // DRAW SALES GRAPH
  // ==========================================

  function renderGraph() {
    if (!installGraph()) return;

    let sales = [];

    try {
      const data = JSON.parse(
        localStorage.getItem(SALES_KEY)
      );

      sales = Array.isArray(data) ? data : [];

    } catch (error) {
      console.warn(
        "TRAUTS: Cannot read sales for graph",
        error
      );
    }

    const now = new Date();
    now.setHours(12, 0, 0, 0);

    const days = [];
    const totals = new Map();

    // Prepare the days shown on the graph.

    for (let i = selectedDays - 1; i >= 0; i--) {
      const day = new Date(now);

      day.setDate(now.getDate() - i);

      const key = dateKey(day);

      days.push({ day, key });
      totals.set(key, 0);
    }

    // Add recorded sales to their correct dates.

    sales.forEach(sale => {
      const key = dateKey(sale.date);
      const amount = Number(sale.totalNgwee);

      if (
        totals.has(key) &&
        Number.isFinite(amount)
      ) {
        totals.set(
          key,
          totals.get(key) + amount
        );
      }
    });

    const values = days.map(
      day => totals.get(day.key)
    );

    const total = values.reduce(
      (sum, value) => sum + value,
      0
    );

    byId("tldChartTotal").textContent = money(total);

    byId("tldChartPeriod").textContent =
      `Last ${selectedDays} days`;

    // Show a message when no sales have been recorded.

    const empty = byId("tldChartEmpty");

    empty.hidden = values.some(value => value !== 0);

    empty.textContent =
      "No sales recorded in this period. " +
      "The chart will update when sales are entered.";

    // Highlight the selected period button.

    document.querySelectorAll(
      "#trautsLiveDashboard .tld-range-btn"
    ).forEach(button => {

      const active =
        Number(button.dataset.days) === selectedDays;

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    });

    // ========================================
    // SVG GRAPH
    // ========================================

    const svg = byId("tldRevenueChart");

    svg.replaceChildren();

    const ns = "http://www.w3.org/2000/svg";

    function draw(tag, attrs, text) {
      const element = document.createElementNS(
        ns,
        tag
      );

      Object.entries(attrs).forEach(([key, value]) => {
        element.setAttribute(key, String(value));
      });

      if (text !== undefined) {
        element.textContent = text;
      }

      svg.appendChild(element);

      return element;
    }

    const left = 65;
    const right = 620;
    const top = 20;
    const bottom = 188;

    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);

    const span = Math.max(max - min, 100);

    const floor = min < 0
      ? min - span * 0.1
      : 0;

    const ceiling = max + span * 0.1;

    const range = ceiling - floor || 1;

    const x = index =>
      left +
      index * (right - left) /
      Math.max(days.length - 1, 1);

    const y = value =>
      bottom -
      (value - floor) / range *
      (bottom - top);

    // Horizontal grid lines and currency labels.

    for (let i = 0; i <= 4; i++) {
      const value =
        floor + range * (4 - i) / 4;

      const yy =
        top + (bottom - top) * i / 4;

      draw("line", {
        x1: left,
        x2: right,
        y1: yy,
        y2: yy,
        class: "tld-chart-grid"
      });

      const kwacha = value / 100;

      const axis =
        Math.abs(kwacha) >= 1000
          ? `K ${(kwacha / 1000).toFixed(1)}k`
          : `K ${kwacha.toFixed(0)}`;

      draw("text", {
        x: left - 12,
        y: yy + 4,
        "text-anchor": "end",
        class: "tld-chart-axis"
      }, axis);
    }

    // Convert each day's revenue to graph coordinates.

    const coords = values.map((value, index) => [
      x(index),
      y(value)
    ]);

    const line = coords.map(
      ([xx, yy], index) =>
        `${index ? "L" : "M"} ` +
        `${xx.toFixed(1)} ${yy.toFixed(1)}`
    ).join(" ");

    const zero = y(0);

    const area =
      `M ${x(0)} ${zero} ` +
      coords.map(
        ([xx, yy]) => `L ${xx} ${yy}`
      ).join(" ") +
      ` L ${x(days.length - 1)} ${zero} Z`;

    // Graph shading and main line.

    draw("path", {
      d: area,
      class: "tld-chart-area"
    });

    draw("path", {
      d: line,
      class: "tld-chart-line"
    });

    // Show fewer date labels in 30-day mode.

    const indexes = selectedDays === 7
      ? [0, 1, 2, 3, 4, 5, 6]
      : [0, 7, 14, 21, 29];

    indexes.forEach(index => {
      draw("text", {
        x: x(index),
        y: 220,
        "text-anchor": "middle",
        class: "tld-chart-axis"
      },
      days[index].day.toLocaleDateString(
        "en-ZM",
        {
          day: "numeric",
          month: "short"
        }
      ));
    });

    // Display the recorded value for each point.

    coords.forEach(([xx, yy], index) => {
      const dot = draw("circle", {
        cx: xx,
        cy: yy,
        r: selectedDays === 7 ? 4 : 2.5,
        class: "tld-chart-dot"
      });

      const tooltip = document.createElementNS(
        ns,
        "title"
      );

      tooltip.textContent =
        `${days[index].key}: ${money(values[index])}`;

      dot.appendChild(tooltip);
    });

    svg.setAttribute(
      "aria-label",
      `Daily sales revenue for the last ` +
      `${selectedDays} days, total ${money(total)}`
    );
  }

  // ==========================================
  // INITIALIZE AND REFRESH
  // ==========================================

  function initialize() {
    renderGraph();

    byId("tldRefresh")?.addEventListener(
      "click",
      renderGraph
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

  // Refresh when business records change.

  [
    "trauts:sales-updated",
    "trauts:products-updated",
    "trauts:stock-updated",
    "trauts:expenses-updated",
    "trauts:purchases-updated"
  ].forEach(name => {
    window.addEventListener(name, renderGraph);
  });

  window.addEventListener("storage", event => {
    if (
      event.key === SALES_KEY ||
      event.key === null
    ) {
      renderGraph();
    }
  });

})();
