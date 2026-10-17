/* TRAUTS REPORTS & ANALYTICS */

(() => {
  const SALES_KEY = "trauts_demo_sales_v1";
  const $ = id => document.getElementById(id);

  if (!$("reportsPage")) return;

  let filteredSales = [];

  function getSales() {
    try {
      const data = JSON.parse(
        localStorage.getItem(SALES_KEY)
      );

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

  function localDateKey(dateValue) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getFilteredSales() {
    const start = $("reportStart").value;
    const end = $("reportEnd").value;

    return getSales().filter(sale => {
      const day = localDateKey(sale.date);

      if (!day) return false;
      if (start && day < start) return false;
      if (end && day > end) return false;

      return true;
    });
  }

  function cell(row, value) {
    const td = document.createElement("td");
    td.textContent = String(value);
    row.appendChild(td);
    return td;
  }

  function showEmpty(tbody, message, columns) {
    const row = document.createElement("tr");
    const td = cell(row, message);
    td.colSpan = columns;
    tbody.appendChild(row);
  }

  function renderSummary() {
    const revenue = filteredSales.reduce(
      (sum, sale) => sum + sale.totalNgwee, 0
    );

    const transactions = filteredSales.length;

    const items = filteredSales.reduce(
      (sum, sale) =>
        sum + sale.items.reduce(
          (count, item) => count + item.qty, 0
        ),
      0
    );

    const average = transactions
      ? revenue / transactions
      : 0;

    $("reportRevenue").textContent = money(revenue);
    $("reportTransactions").textContent = transactions;
    $("reportItems").textContent = items;
    $("reportAverage").textContent = money(average);
  }

  function renderRevenueChart() {
    const chart = $("reportRevenueChart");
    chart.replaceChildren();

    const totals = new Map();

    filteredSales.forEach(sale => {
      const day = localDateKey(sale.date);

      totals.set(
        day,
        (totals.get(day) || 0) + sale.totalNgwee
      );
    });

    const data = [...totals.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14);

    if (!data.length) {
      chart.textContent = "No sales for this date range.";
      return;
    }

    const max = Math.max(
      ...data.map(([, total]) => total),
      1
    );

    data.forEach(([day, total]) => {
      const column = document.createElement("div");
      column.className = "report-bar-column";

      const bar = document.createElement("div");
      bar.className = "report-bar";
      bar.style.height =
        `${Math.max(1, total / max * 100)}%`;
      bar.title = `${day}: ${money(total)}`;

      const label = document.createElement("span");
      label.className = "report-bar-label";
      label.textContent = day.slice(5);

      column.append(bar, label);
      chart.appendChild(column);
    });
  }

  function renderPayments() {
    const container = $("reportPayments");
    container.replaceChildren();

    const totals = new Map();

    filteredSales.forEach(sale => {
      const method = sale.paymentMethod || "unknown";

      totals.set(
        method,
        (totals.get(method) || 0) + sale.totalNgwee
      );
    });

    const grandTotal = [...totals.values()].reduce(
      (sum, value) => sum + value, 0
    );

    if (!totals.size) {
      container.textContent = "No payment data yet.";
      return;
    }

    totals.forEach((value, method) => {
      const percentage = grandTotal
        ? value / grandTotal * 100
        : 0;

      const row = document.createElement("div");
      row.className = "report-payment-row";

      const info = document.createElement("div");
      info.className = "report-payment-info";

      const label = document.createElement("span");
      label.textContent = method
        .replaceAll("_", " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());

      const amount = document.createElement("strong");
      amount.textContent =
        `${money(value)} (${percentage.toFixed(1)}%)`;

      info.append(label, amount);

      const track = document.createElement("div");
      track.className = "report-payment-track";

      const fill = document.createElement("div");
      fill.className = "report-payment-fill";
      fill.style.width = `${percentage}%`;

      track.appendChild(fill);
      row.append(info, track);
      container.appendChild(row);
    });
  }

  function renderTopProducts() {
    const tbody = $("reportTopProducts");
    tbody.replaceChildren();

    const products = new Map();

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const key = String(item.id);
        const previous = products.get(key) || {
          name: item.name,
          qty: 0,
          grossNgwee: 0
        };

        previous.qty += item.qty;
        previous.grossNgwee +=
          item.qty * item.priceNgwee;

        products.set(key, previous);
      });
    });

    const ranked = [...products.values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    ranked.forEach(product => {
      const row = document.createElement("tr");

      cell(row, product.name);
      cell(row, product.qty);
      cell(row, money(product.grossNgwee));

      tbody.appendChild(row);
    });

    if (!ranked.length) {
      showEmpty(tbody, "No product sales yet.", 3);
    }
  }

  function renderTransactions() {
    const tbody = $("reportTransactionsTable");
    tbody.replaceChildren();

    const sorted = [...filteredSales].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    sorted.forEach(sale => {
      const row = document.createElement("tr");

      cell(row, sale.receiptNo);
      cell(row, new Date(sale.date).toLocaleString());
      cell(row, sale.paymentMethod);
      cell(
        row,
        sale.items.reduce(
          (sum, item) => sum + item.qty, 0
        )
      );
      cell(row, money(sale.totalNgwee));

      tbody.appendChild(row);
    });

    if (!sorted.length) {
      showEmpty(tbody, "No transactions found.", 5);
    }
  }

  function refreshReports() {
    const start = $("reportStart").value;
    const end = $("reportEnd").value;

    if (start && end && start > end) {
      $("reportMessage").textContent =
        "The start date must not be after the end date.";
      return;
    }

    $("reportMessage").textContent = "";
    filteredSales = getFilteredSales();

    renderSummary();
    renderRevenueChart();
    renderPayments();
    renderTopProducts();
    renderTransactions();
  }

  function exportCSV() {
    if (!filteredSales.length) {
      $("reportMessage").textContent =
        "There are no transactions to export.";
      return;
    }

    function csvCell(value) {
      // Prevent spreadsheet formula execution.
      let text = String(value ?? "");

      if (/^[\s]*[=+\-@\t\r]/.test(text)) {
        text = "'" + text;
      }

      return '"' + text.replaceAll('"', '""') + '"';
    }

    const rows = [
      [
        "Receipt",
        "Date",
        "Payment Method",
        "Items Sold",
        "Subtotal (K)",
        "Discount (K)",
        "Total (K)"
      ]
    ];

    filteredSales.forEach(sale => {
      const items = sale.items.reduce(
        (sum, item) => sum + item.qty, 0
      );

      rows.push([
        sale.receiptNo,
        sale.date,
        sale.paymentMethod,
        items,
        (sale.subtotalNgwee / 100).toFixed(2),
        (sale.discountNgwee / 100).toFixed(2),
        (sale.totalNgwee / 100).toFixed(2)
      ]);
    });

    const csv = rows
      .map(row => row.map(csvCell).join(","))
      .join("\r\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "trauts-sales-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  $("reportStart").addEventListener(
    "change", refreshReports
  );

  $("reportEnd").addEventListener(
    "change", refreshReports
  );

  $("resetReportDates").addEventListener("click", () => {
    $("reportStart").value = "";
    $("reportEnd").value = "";
    refreshReports();
  });

  $("exportReportBtn").addEventListener(
    "click", exportCSV
  );

  window.refreshTrautsReports = refreshReports;

  window.addEventListener("storage", event => {
    if (event.key === SALES_KEY) {
      refreshReports();
    }
  });

  refreshReports();
})();
