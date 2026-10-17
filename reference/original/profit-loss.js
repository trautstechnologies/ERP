/* ==========================================
   TRAUTS SHOP MANAGER
   PROFIT & LOSS MODULE
   ========================================== */

(() => {
  "use strict";

  const SALES_KEY = "trauts_demo_sales_v1";
  const PRODUCTS_KEY = "trauts_demo_products_v1";
  const EXPENSES_KEY = "trauts_demo_expenses_v1";
  const PURCHASES_KEY = "trauts_demo_purchases_v1";

  const $ = id => document.getElementById(id);

  function read(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
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

  function today() {
    const d = new Date();

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  function dateOnly(value) {
    if (!value) return "";

    // Preserve a local calendar date when already supplied.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
      return "";
    }

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  function create(tag, text, className) {
    const node = document.createElement(tag);

    if (text !== undefined) {
      node.textContent = String(text);
    }

    if (className) {
      node.className = className;
    }

    return node;
  }

  function addCell(row, value, right = false) {
    const td = create("td", value);

    if (right) td.className = "pl-right";

    row.appendChild(td);
    return td;
  }

  function percentage(part, whole) {
    if (whole <= 0) return "0.0%";
    return ((part / whole) * 100).toFixed(1) + "%";
  }

  function signedStyle(element, amount) {
    element.classList.toggle("pl-negative", amount < 0);
    element.classList.toggle("pl-positive", amount > 0);
  }

  // ==========================================
  // CREATE NAVIGATION
  // ==========================================

  const sidebar = document.querySelector(".sidebar-nav");
  const main = document.querySelector("main.main");

  if (!sidebar || !main) {
    console.error("TRAUTS dashboard layout missing.");
    return;
  }

  const nav = sidebar.querySelector(
  '[data-page="Profit & Loss"]'
    ) || create("button");
  nav.type = "button";
  nav.className = "nav";
  nav.dataset.page = "Profit & Loss";

  nav.innerHTML = `
    <i data-lucide="chart-no-axes-combined"></i>
    <span>Profit & Loss</span>
  `;

  const expensesNav = sidebar.querySelector(
    '[data-page="Expenses"]'
  );

  if (!nav.isConnected) {
  if (expensesNav) {
    expensesNav.insertAdjacentElement("afterend", nav);
  } else {
    sidebar.appendChild(nav);
  }
}

  // ==========================================
  // CREATE PAGE
  // ==========================================

  const page = create("section");
  page.id = "profitLossPage";
  page.hidden = true;

  page.innerHTML = `
    <div class="pl-header">
      <div>
        <h2>Profit & Loss</h2>
        <p>
          Understand your sales, costs and profitability
        </p>
      </div>

      <button id="plExportBtn"
        type="button" class="pl-primary">
        Export CSV
      </button>
    </div>

    <section class="pl-panel">
      <h3>Report Period</h3>

      <div class="pl-filters">
        <div class="pl-field">
          <label for="plStart">From</label>
          <input id="plStart" type="date">
        </div>

        <div class="pl-field">
          <label for="plEnd">To</label>
          <input id="plEnd" type="date">
        </div>

        <button id="plThisMonth"
          type="button" class="pl-primary">
          This Month
        </button>

        <button id="plAllTime"
          type="button" class="pl-secondary">
          All Time
        </button>
      </div>
    </section>

    <div class="pl-warning" id="plEstimateWarning">
      Profit figures may be estimates for older sales.
      The current product buying cost is used when a
      historical cost was not recorded at checkout.
    </div>

    <div class="pl-stats">
      <article class="pl-stat">
        <p>Sales Revenue</p>
        <h2 id="plRevenue">K 0.00</h2>
      </article>

      <article class="pl-stat">
        <p>Cost of Goods Sold</p>
        <h2 id="plCogs">K 0.00</h2>
      </article>

      <article class="pl-stat">
        <p>Gross Profit</p>
        <h2 id="plGross">K 0.00</h2>
      </article>

      <article class="pl-stat">
        <p>Operating Expenses</p>
        <h2 id="plExpenses">K 0.00</h2>
      </article>

      <article class="pl-stat highlight">
        <p>Estimated Net Operating Profit</p>
        <h2 id="plNet">K 0.00</h2>
      </article>

      <article class="pl-stat">
        <p>Net Profit Margin</p>
        <h2 id="plMargin">0.0%</h2>
      </article>
    </div>

    <section class="pl-panel">
      <h3>Profit Calculation</h3>

      <div class="pl-summary-row">
        <span>Sales Revenue</span>
        <strong id="plSummaryRevenue">K 0.00</strong>
      </div>

      <div class="pl-summary-row">
        <span>Less: Cost of Goods Sold</span>
        <strong id="plSummaryCogs">K 0.00</strong>
      </div>

      <div class="pl-summary-row">
        <span>Gross Profit</span>
        <strong id="plSummaryGross">K 0.00</strong>
      </div>

      <div class="pl-summary-row">
        <span>Less: Operating Expenses</span>
        <strong id="plSummaryExpenses">K 0.00</strong>
      </div>

      <div class="pl-summary-row total">
        <span>Estimated Net Operating Profit</span>
        <strong id="plSummaryNet">K 0.00</strong>
      </div>
    </section>

    <section class="pl-panel">
      <h3>Monthly Profit Breakdown</h3>

      <div class="pl-table-wrap">
        <table class="pl-table">
          <thead>
            <tr>
              <th>Month</th>
              <th class="pl-right">Revenue</th>
              <th class="pl-right">COGS</th>
              <th class="pl-right">Expenses</th>
              <th class="pl-right">Net Profit</th>
            </tr>
          </thead>

          <tbody id="plMonthlyTable"></tbody>
        </table>
      </div>
    </section>

    <section class="pl-panel">
      <h3>Expenses by Category</h3>

      <div class="pl-table-wrap">
        <table class="pl-table">
          <thead>
            <tr>
              <th>Category</th>
              <th class="pl-right">Amount</th>
            </tr>
          </thead>

          <tbody id="plExpenseCategories"></tbody>
        </table>
      </div>
    </section>

    <section class="pl-panel">
      <h3>Supplier Purchases — Reference Only</h3>

      <div class="pl-summary-row">
        <span>Purchase Orders Recorded</span>
        <strong id="plPurchaseOrders">K 0.00</strong>
      </div>

      <div class="pl-summary-row">
        <span>Value of Stock Received</span>
        <strong id="plStockReceived">K 0.00</strong>
      </div>

      <div class="pl-summary-row">
        <span>Payments to Suppliers</span>
        <strong id="plSupplierPaid">K 0.00</strong>
      </div>

      <div class="pl-summary-row">
        <span>Supplier Balances Owed</span>
        <strong id="plSupplierBalance">K 0.00</strong>
      </div>

      <p class="pl-note" style="margin-top:14px">
        Supplier purchase amounts are shown for reference.
        They are not deducted again from net profit.
        This section summarizes purchases recorded in
        the selected date range, not a full historical
        supplier liability statement.
      </p>
    </section>

    <p class="pl-note">
      This is a management estimate, not an audited
      accounting statement. Taxes, depreciation,
      returns and other adjustments may require
      additional accounting records.
    </p>
  `;

  const placeholder = document.getElementById("modulePage");

    if (placeholder && placeholder.parentElement === main) {
    main.insertBefore(page, placeholder);
    } else {
    main.appendChild(page);
    }

  // ==========================================
  // SIDEBAR NAVIGATION
  // ==========================================

  nav.addEventListener("click", () => {
    sidebar.querySelectorAll(".nav")
      .forEach(button => {
        button.classList.remove("active");
      });

    nav.classList.add("active");

    [
      "overview",
      "productsPage",
      "salesPage",
      "inventoryPage",
      "suppliersPurchasesPage",
      "expensesPage",
      "accountsPage",
      "reportsPage",
      "settingsPage",
      "modulePage"
    ].forEach(id => {
      if ($(id)) $(id).hidden = true;
    });

    page.hidden = false;
    $("pageTitle").textContent = "Profit & Loss";

    render();
  });

  sidebar.querySelectorAll(".nav").forEach(button => {
    if (button === nav) return;

    button.addEventListener("click", () => {
      page.hidden = true;
    });
  });

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  } else {
    window.addEventListener("load", () => {
      window.lucide?.createIcons?.();
    });
  }

  // ==========================================
  // REPORT CALCULATIONS
  // ==========================================

  function inPeriod(date, start, end) {
    if (!date) return false;

    return (!start || date >= start) &&
           (!end || date <= end);
  }

  function saleCost(sale, productMap) {
    let costNgwee = 0;
    let estimated = false;
    let missing = false;

    for (const item of sale.items || []) {
      const qty = Number(item.qty || 0);

      if (!Number.isFinite(qty) || qty <= 0) {
        continue;
      }

      let unitCost;

      // Future checkout records can store costNgwee
      // as the per-unit cost at the time of sale.
        if (
        item.costNgwee !== undefined &&
        item.costNgwee !== null &&
        item.costNgwee !== "" &&
        Number.isFinite(Number(item.costNgwee)) &&
        Number(item.costNgwee) >= 0
        ) {
        unitCost = Number(item.costNgwee);
        }else if (
        item.unitCostNgwee !== undefined &&
        Number.isFinite(Number(item.unitCostNgwee))
      ) {
        unitCost = Number(item.unitCostNgwee);
      } else {
        const product = productMap.get(
          String(item.id)
        );

        if (product) {
          const currentCost = Number(
            product.cost ?? product.buyingPrice
          );

          if (Number.isFinite(currentCost)) {
            unitCost = Math.round(currentCost * 100);
            estimated = true;
          }
        }
      }

      if (unitCost === undefined) {
        missing = true;
        continue;
      }

      costNgwee += Math.round(unitCost * qty);
    }

    return { costNgwee, estimated, missing };
  }

  function buildReport() {
    const start = $("plStart").value;
    const end = $("plEnd").value;

    const sales = read(SALES_KEY);
    const products = read(PRODUCTS_KEY);
    const expenses = read(EXPENSES_KEY);
    const purchases = read(PURCHASES_KEY);

    const productMap = new Map(
      products.map(product => [
        String(product.id),
        product
      ])
    );

    const months = new Map();
    const categories = new Map();

    let revenue = 0;
    let cogs = 0;
    let operatingExpenses = 0;
    let estimatedSales = 0;
    let missingCostSales = 0;

    function monthBucket(date) {
      const key = date.slice(0, 7);

      if (!months.has(key)) {
        months.set(key, {
          month: key,
          revenue: 0,
          cogs: 0,
          expenses: 0
        });
      }

      return months.get(key);
    }

    // SALES REVENUE AND COST OF GOODS SOLD
    sales.forEach(sale => {
      const date = dateOnly(sale.date);

      if (!inPeriod(date, start, end)) return;

      const total = Number(sale.totalNgwee || 0);

      if (!Number.isFinite(total)) return;

      const cost = saleCost(sale, productMap);

      revenue += total;
      cogs += cost.costNgwee;

      if (cost.estimated) estimatedSales++;
      if (cost.missing) missingCostSales++;

      const bucket = monthBucket(date);
      bucket.revenue += total;
      bucket.cogs += cost.costNgwee;
    });

    // OPERATING EXPENSES
    expenses.forEach(expense => {
      const date = dateOnly(expense.date);

      if (!inPeriod(date, start, end)) return;

      const amount = Number(
        expense.amountNgwee || 0
      );

      if (!Number.isFinite(amount)) return;

      operatingExpenses += amount;

      const bucket = monthBucket(date);
      bucket.expenses += amount;

      const category = expense.category || "Other";

      categories.set(
        category,
        (categories.get(category) || 0) + amount
      );
    });

    // PURCHASE INFORMATION
    // Reference only: NOT deducted from profit.
    let purchaseOrders = 0;
    let stockReceived = 0;
    let supplierPaid = 0;
    let supplierBalance = 0;

    purchases.forEach(purchase => {
      const date = dateOnly(purchase.date);

      if (!inPeriod(date, start, end)) return;

      const total = Number(purchase.totalNgwee || 0);
      const paid = Number(purchase.paidNgwee || 0);
      const unitCost = Number(
        purchase.unitCostNgwee || 0
      );

      const received = Number(
        purchase.qtyReceived || 0
      );

      purchaseOrders += total;
      supplierPaid += paid;
      supplierBalance += total - paid;

      stockReceived += Math.round(
        unitCost * received
      );
    });

    const gross = revenue - cogs;
    const net = gross - operatingExpenses;

    return {
      revenue,
      cogs,
      gross,
      operatingExpenses,
      net,
      margin: percentage(net, revenue),
      months: [...months.values()].sort(
        (a, b) => b.month.localeCompare(a.month)
      ),
      categories: [...categories.entries()].sort(
        (a, b) => b[1] - a[1]
      ),
      purchaseOrders,
      stockReceived,
      supplierPaid,
      supplierBalance,
      estimatedSales,
      missingCostSales
    };
  }

  // ==========================================
  // DISPLAY REPORT
  // ==========================================

  let latestReport = null;

  function render() {
    const start = $("plStart").value;
    const end = $("plEnd").value;

    if (start && end && start > end) {
      alert("The start date cannot be after the end date.");
      return;
    }

    const data = buildReport();
    latestReport = data;

    $("plRevenue").textContent = money(data.revenue);
    $("plCogs").textContent = money(data.cogs);
    $("plGross").textContent = money(data.gross);

    $("plExpenses").textContent =
      money(data.operatingExpenses);

    $("plNet").textContent = money(data.net);
    $("plMargin").textContent = data.margin;

    signedStyle($("plGross"), data.gross);
    signedStyle($("plNet"), data.net);

    $("plSummaryRevenue").textContent =
      money(data.revenue);

    $("plSummaryCogs").textContent =
      money(data.cogs);

    $("plSummaryGross").textContent =
      money(data.gross);

    $("plSummaryExpenses").textContent =
      money(data.operatingExpenses);

    $("plSummaryNet").textContent =
      money(data.net);

    signedStyle($("plSummaryNet"), data.net);

    $("plPurchaseOrders").textContent =
      money(data.purchaseOrders);

    $("plStockReceived").textContent =
      money(data.stockReceived);

    $("plSupplierPaid").textContent =
      money(data.supplierPaid);

    $("plSupplierBalance").textContent =
      money(data.supplierBalance);

    // COST ACCURACY WARNING
    const warning = $("plEstimateWarning");

    if (
      data.estimatedSales === 0 &&
      data.missingCostSales === 0
    ) {
      warning.hidden = true;
    } else {
      warning.hidden = false;

      warning.textContent =
        `${data.estimatedSales} sale(s) use current ` +
        `product costs as estimates. ` +
        `${data.missingCostSales} sale(s) have ` +
        `items with missing cost information. ` +
        `Profit may be inaccurate until checkout ` +
        `stores the cost at the time of sale.`;
    }

    // MONTHLY BREAKDOWN
    const monthlyTable = $("plMonthlyTable");
    monthlyTable.replaceChildren();

    data.months.forEach(month => {
      const row = create("tr");

      const net =
        month.revenue -
        month.cogs -
        month.expenses;

      addCell(row, month.month);
      addCell(row, money(month.revenue), true);
      addCell(row, money(month.cogs), true);
      addCell(row, money(month.expenses), true);

      const netCell = addCell(
        row,
        money(net),
        true
      );

      signedStyle(netCell, net);

      monthlyTable.appendChild(row);
    });

    if (!data.months.length) {
      const row = create("tr");
      const td = addCell(
        row,
        "No sales or expenses for this period."
      );

      td.colSpan = 5;
      monthlyTable.appendChild(row);
    }

    // EXPENSES BY CATEGORY
    const categoryTable = $("plExpenseCategories");
    categoryTable.replaceChildren();

    data.categories.forEach(([category, amount]) => {
      const row = create("tr");

      addCell(row, category);
      addCell(row, money(amount), true);

      categoryTable.appendChild(row);
    });

    if (!data.categories.length) {
      const row = create("tr");
      const td = addCell(
        row,
        "No operating expenses in this period."
      );

      td.colSpan = 2;
      categoryTable.appendChild(row);
    }
  }

  // ==========================================
  // DATE FILTERS
  // ==========================================

  $("plStart").addEventListener("change", render);
  $("plEnd").addEventListener("change", render);

  $("plThisMonth").addEventListener("click", () => {
    $("plStart").value = today().slice(0, 7) + "-01";
    $("plEnd").value = today();
    render();
  });

  $("plAllTime").addEventListener("click", () => {
    $("plStart").value = "";
    $("plEnd").value = "";
    render();
  });

  // ==========================================
  // CSV EXPORT
  // ==========================================

  function csvEscape(value) {
    const text = String(value ?? "");

    // Prevent spreadsheet formula injection.
    const safe = /^[=+\-@\t\r]/.test(text)
      ? "'" + text
      : text;

    return '"' + safe.replace(/"/g, '""') + '"';
  }

  $("plExportBtn").addEventListener("click", () => {
    if (!latestReport) render();

    const d = latestReport;

    const rows = [
      ["TRAUTS PROFIT & LOSS"],
      ["From", $("plStart").value || "All Time"],
      ["To", $("plEnd").value || "All Time"],
      [],
      ["Metric", "Amount (K)"],
      ["Sales Revenue", (d.revenue / 100).toFixed(2)],
      ["Cost of Goods Sold", (d.cogs / 100).toFixed(2)],
      ["Gross Profit", (d.gross / 100).toFixed(2)],
      [
        "Operating Expenses",
        (d.operatingExpenses / 100).toFixed(2)
      ],
      [
        "Estimated Net Operating Profit",
        (d.net / 100).toFixed(2)
      ],
      ["Net Profit Margin", d.margin],
      [],
      ["Month", "Revenue", "COGS", "Expenses", "Net Profit"]
    ];

    d.months.forEach(month => {
      rows.push([
        month.month,
        (month.revenue / 100).toFixed(2),
        (month.cogs / 100).toFixed(2),
        (month.expenses / 100).toFixed(2),
        (
          (month.revenue - month.cogs - month.expenses) /
          100
        ).toFixed(2)
      ]);
    });

    rows.push([]);
    rows.push(["Expense Category", "Amount (K)"]);

    d.categories.forEach(([category, amount]) => {
      rows.push([category, (amount / 100).toFixed(2)]);
    });

    rows.push([]);
    rows.push([
      "Note",
      "Historical cost estimates may affect accuracy."
    ]);

    const csv = rows.map(row =>
      row.map(csvEscape).join(",")
    ).join("\r\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "trauts-profit-loss.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  });

  // ==========================================
  // REFRESH WHEN DATA CHANGES
  // ==========================================

  window.refreshTrautsProfitLoss = render;

  [
    "trauts:products-updated",
    "trauts:stock-updated",
    "trauts:expenses-updated"
  ].forEach(eventName => {
    window.addEventListener(eventName, () => {
      if (!page.hidden) render();
    });
  });

  window.addEventListener("storage", event => {
    if ([
      SALES_KEY,
      PRODUCTS_KEY,
      EXPENSES_KEY,
      PURCHASES_KEY
    ].includes(event.key) && !page.hidden) {
      render();
    }
  });

  render();
})();
