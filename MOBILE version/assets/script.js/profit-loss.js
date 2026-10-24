
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

  const sidebar = document.querySelector(".sidebar-nav");
  const main = document.querySelector("main.main");

  if (!sidebar || !main) {
    console.error("TRAUTS dashboard layout missing.");
    return;
  }

  const nav = sidebar.querySelector('[data-page="Profit & Loss"]')
    || create("button");

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

  const page = create("section");
  page.id = "profitLossPage";
  page.hidden = true;

  page.innerHTML = `
    <div class="pl-header">
      <div>
        <h2>Profit & Loss</h2>
        <p>Understand your sales, costs and profitability</p>
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

  main.insertBefore(page, $("modulePage") || null);

  nav.addEventListener("click", () => {
    sidebar.querySelectorAll(".nav")
      .forEach(button => button.classList.remove("active"));

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
    if ($("pageTitle")) {
      $("pageTitle").textContent = "Profit & Loss";
    }
    if ($("trautsPageTitle")) {
      $("trautsPageTitle").textContent = "Profit & Loss";
    }

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
        Number.isFinite(Number(item.unitCostNgwee))
      ) {
        unitCost = Number(item.unitCostNgwee);
      } else {
        const product = productMap.get(String(item.id));

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

    expenses.forEach(expense => {
      const date = dateOnly(expense.date);
      if (!inPeriod(date, start, end)) return;

      const amount = Number(expense.amountNgwee || 0);
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
      stockReceived += Math.round(unitCost * received);
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
    $("plExpenses").textContent = money(data.operatingExpenses);
    $("plNet").textContent = money(data.net);
    $("plMargin").textContent = data.margin;

    signedStyle($("plGross"), data.gross);
    signedStyle($("plNet"), data.net);

    $("plSummaryRevenue").textContent = money(data.revenue);
    $("plSummaryCogs").textContent = money(data.cogs);
    $("plSummaryGross").textContent = money(data.gross);
    $("plSummaryExpenses").textContent = money(data.operatingExpenses);
    $("plSummaryNet").textContent = money(data.net);

    signedStyle($("plSummaryNet"), data.net);

    $("plPurchaseOrders").textContent = money(data.purchaseOrders);
    $("plStockReceived").textContent = money(data.stockReceived);
    $("plSupplierPaid").textContent = money(data.supplierPaid);
    $("plSupplierBalance").textContent = money(data.supplierBalance);

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

    const monthlyTable = $("plMonthlyTable");
    monthlyTable.replaceChildren();

    data.months.forEach(month => {
      const row = create("tr");
      const net = month.revenue - month.cogs - month.expenses;

      addCell(row, month.month);
      addCell(row, money(month.revenue), true);
      addCell(row, money(month.cogs), true);
      addCell(row, money(month.expenses), true);

      const netCell = addCell(row, money(net), true);
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

    const categoryTable = $("plExpenseCategories");
    categoryTable.replaceChildren();

    data.categories.forEach(([name, amount]) => {
      const row = create("tr");
      addCell(row, name);
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

  function csvEscape(value) {
    const text = String(value ?? "");
    const safe = /^[=+\-@\t\r]/.test(text)
      ? "'" + text
      : text;
    return '"' + safe.replace(/"/g, '""') + '"';
  }

  function openMobileCsv(csv) {
    let dialog = $("plMobileCsvModal");

    if (!dialog) {
      const style = create("style");

      style.textContent = `
        #plMobileCsvModal[hidden] {display:none!important}
        #plMobileCsvModal {
          position:fixed;inset:0;z-index:46500;
          display:flex;align-items:center;justify-content:center;
          padding:9px;box-sizing:border-box;
          background:rgba(5,15,29,.78)
        }
        #plMobileCsvModal .plcsv-card {
          width:100%;max-width:550px;
          max-height:calc(100dvh - 18px);overflow:auto;
          box-sizing:border-box;padding:16px;border-radius:15px;
          background:#fff;color:#17283e;
          border:1px solid #dfe6ef
        }
        #plMobileCsvModal h2 {
          font-size:19px;margin:0 0 8px;color:inherit
        }
        #plMobileCsvModal p {
          font-size:13px;line-height:1.5;color:inherit
        }
        #plMobileCsvText {
          display:block;width:100%;height:230px;
          box-sizing:border-box;padding:10px;
          font:12px/1.55 monospace;
          background:#f6f8fc;color:#17283e;
          border:1px solid #b8c7d8;border-radius:9px;
          white-space:pre;resize:vertical
        }
        #plMobileCsvModal .plcsv-actions {
          display:grid;grid-template-columns:1fr 1fr;
          gap:8px;margin-top:11px
        }
        #plMobileCsvModal button {
          min-height:46px;box-sizing:border-box;
          border-radius:10px;padding:8px;
          touch-action:manipulation;font-weight:700
        }
        #plCsvCopy,#plCsvShare {
          background:#2855a0;color:#fff;
          border:1px solid #2855a0
        }
        #plCsvClose {
          background:#edf2f8;color:#243952;
          border:1px solid #bac8d9
        }
        #plCsvStatus {min-height:21px}

        html.trauts-dark #plMobileCsvModal .plcsv-card {
          background:#17283e!important;color:#e8eff9!important;
          border-color:#364a63!important
        }
        html.trauts-dark #plMobileCsvText {
          background:#0d1c2e!important;color:#e8eff9!important;
          border-color:#52647b!important
        }
        html.trauts-dark #plCsvClose {
          background:#29425e!important;color:#fff!important;
          border-color:#526c86!important
        }
        html.trauts-dark #plCsvCopy,
        html.trauts-dark #plCsvShare {
          background:#336bc0!important;color:#fff!important;
          border-color:#6897dd!important
        }
      `;

      document.head.appendChild(style);

      dialog = create("div");
      dialog.id = "plMobileCsvModal";
      dialog.hidden = true;
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-labelledby", "plCsvHeading");

      dialog.innerHTML = `
        <section class="plcsv-card">
          <h2 id="plCsvHeading">Profit & Loss CSV</h2>
          <p>
            The report is ready. Tap <strong>Share CSV</strong>
            to send a CSV file to a supported Android app,
            or <strong>Copy CSV</strong> and paste the data
            into a spreadsheet or text file.
            Saving directly to Downloads requires Android
            file-save support in the app.
          </p>
          <textarea id="plMobileCsvText" readonly
            spellcheck="false"
            aria-label="CSV report content"></textarea>
          <p id="plCsvStatus" role="status"></p>
          <div class="plcsv-actions">
            <button type="button" id="plCsvCopy">Copy CSV</button>
            <button type="button" id="plCsvShare">Share CSV</button>
            <button type="button" id="plCsvClose">Close</button>
          </div>
        </section>
      `;

      document.body.appendChild(dialog);

      $("plCsvClose").addEventListener("click", () => {
        dialog.hidden = true;
      });

      dialog.addEventListener("click", event => {
        if (event.target === dialog) dialog.hidden = true;
      });

      $("plCsvCopy").addEventListener("click", async () => {
        const field = $("plMobileCsvText");
        let copied = false;

        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(field.value);
            copied = true;
          }
        } catch (_) {}

        if (!copied) {
          field.focus();
          field.select();
          try {
            copied = document.execCommand("copy");
          } catch (_) {}
        }

        $("plCsvStatus").textContent = copied
          ? "CSV copied. Paste it into a file or spreadsheet."
          : "Select the CSV text and use Android's Copy option.";
      });

      $("plCsvShare").addEventListener("click", async () => {
        const csvContent = $("plMobileCsvText").value;
        const status = $("plCsvStatus");

        if (typeof navigator.share !== "function") {
          status.textContent =
            "File sharing is unavailable in this WebView. Use Copy CSV.";
          return;
        }

        const file = new File(
          ["\uFEFF" + csvContent],
          "trauts-profit-loss.csv",
          {type: "text/csv"}
        );

        try {
          if (navigator.canShare?.({files: [file]})) {
            await navigator.share({
              files: [file],
              title: "TRAUTS Profit & Loss"
            });
          } else {
            status.textContent =
              "File sharing is not supported here. Use Copy CSV.";
          }
        } catch (error) {
          if (error?.name !== "AbortError") {
            status.textContent =
              "Could not share the CSV. Use Copy CSV instead.";
          }
        }
      });
    }

    $("plMobileCsvText").value = csv;
    $("plCsvStatus").textContent = "";
    dialog.hidden = false;
    $("plMobileCsvText").focus();
  }

  $("plExportBtn").addEventListener("click", () => {
    render();
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
      ["Operating Expenses", (d.operatingExpenses / 100).toFixed(2)],
      ["Estimated Net Operating Profit", (d.net / 100).toFixed(2)],
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
          (month.revenue - month.cogs - month.expenses) / 100
        ).toFixed(2)
      ]);
    });

    rows.push([]);
    rows.push(["Expense Category", "Amount (K)"]);

    d.categories.forEach(([name, amount]) => {
      rows.push([name, (amount / 100).toFixed(2)]);
    });

    rows.push([]);
    rows.push([
      "Note",
      "Historical cost estimates may affect accuracy."
    ]);

    const csv = rows.map(row =>
      row.map(csvEscape).join(",")
    ).join("\r\n");

    if (window.matchMedia("(max-width: 767px)").matches) {
      openMobileCsv(csv);
      return;
    }

    const blob = new Blob(
      ["\uFEFF" + csv],
      {type: "text/csv;charset=utf-8;"}
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
