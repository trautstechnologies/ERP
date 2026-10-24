
/* ============================================================
   TRAUTS REPORTS & ANALYTICS — ANDROID + DESKTOP
   Complete replacement for script.js/reports.js

   Keeps original reporting calculations and desktop CSV download.
   Android/mobile opens an in-app CSV viewer with Copy and Share.
   Does not change saved sales or other business data.
   ============================================================ */
(() => {
  "use strict";

  const SALES_KEY = "trauts_demo_sales_v1";
  const $ = id => document.getElementById(id);

  if (!$("reportsPage")) return;

  let filteredSales = [];
  const isMobile = () =>
    window.matchMedia("(max-width: 767px)").matches;

  function getSales() {
    try {
      const data = JSON.parse(localStorage.getItem(SALES_KEY));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function money(ngwee) {
    return "K " + (ngwee / 100).toLocaleString("en-ZM", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function localDateKey(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
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

  /* ==========================================================
     REPORT SUMMARY
     ========================================================== */

  function renderSummary() {
    const revenue = filteredSales.reduce(
      (sum, sale) => sum + sale.totalNgwee, 0
    );

    const transactions = filteredSales.length;

    const items = filteredSales.reduce(
      (sum, sale) => sum + sale.items.reduce(
        (count, item) => count + item.qty, 0
      ),
      0
    );

    const average = transactions ? revenue / transactions : 0;

    $("reportRevenue").textContent = money(revenue);
    $("reportTransactions").textContent = transactions;
    $("reportItems").textContent = items;
    $("reportAverage").textContent = money(average);
  }

  /* ==========================================================
     DAILY REVENUE CHART
     ========================================================== */

  function renderRevenueChart() {
    const chart = $("reportRevenueChart");
    chart.replaceChildren();

    const totals = new Map();

    filteredSales.forEach(sale => {
      const day = localDateKey(sale.date);
      totals.set(day, (totals.get(day) || 0) + sale.totalNgwee);
    });

    const data = [...totals.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14);

    if (!data.length) {
      chart.textContent = "No sales for this date range.";
      return;
    }

    const max = Math.max(...data.map(([, total]) => total), 1);

    data.forEach(([day, total]) => {
      const column = document.createElement("div");
      column.className = "report-bar-column";

      const bar = document.createElement("div");
      bar.className = "report-bar";
      bar.style.height = `${Math.max(1, total / max * 100)}%`;
      bar.title = `${day}: ${money(total)}`;

      const label = document.createElement("span");
      label.className = "report-bar-label";
      label.textContent = day.slice(5);

      column.append(bar, label);
      chart.appendChild(column);
    });
  }

  /* ==========================================================
     PAYMENT METHODS
     ========================================================== */

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
      label.textContent = method.replaceAll("_", " ")
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

  /* ==========================================================
     TOP-SELLING PRODUCTS
     ========================================================== */

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
        previous.grossNgwee += item.qty * item.priceNgwee;

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

  /* ==========================================================
     TRANSACTION HISTORY
     ========================================================== */

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
        sale.items.reduce((sum, item) => sum + item.qty, 0)
      );
      cell(row, money(sale.totalNgwee));

      tbody.appendChild(row);
    });

    if (!sorted.length) {
      showEmpty(tbody, "No transactions found.", 5);
    }
  }

  /* ==========================================================
     REFRESH REPORTS
     ========================================================== */

  function refreshReports() {
    const start = $("reportStart").value;
    const end = $("reportEnd").value;

    if (start && end && start > end) {
      $("reportMessage").textContent =
        "The start date must not be after the end date.";
      return false;
    }

    $("reportMessage").textContent = "";
    filteredSales = getFilteredSales();

    renderSummary();
    renderRevenueChart();
    renderPayments();
    renderTopProducts();
    renderTransactions();

    return true;
  }

  /* ==========================================================
     GENERATE ORIGINAL SEVEN-COLUMN SALES CSV
     ========================================================== */

  function buildSalesCSV() {
    function csvCell(value) {
      let text = String(value ?? "");

      // Prevent spreadsheet formula injection.
      if (/^[\s]*[=+\-@\t\r]/.test(text)) {
        text = "'" + text;
      }

      return '"' + text.replaceAll('"', '""') + '"';
    }

    const rows = [[
      "Receipt",
      "Date",
      "Payment Method",
      "Items Sold",
      "Subtotal (K)",
      "Discount (K)",
      "Total (K)"
    ]];

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

    return rows
      .map(row => row.map(csvCell).join(","))
      .join("\r\n");
  }

  /* ==========================================================
     ANDROID CSV EXPORT WINDOW
     ========================================================== */

  function ensureMobileCsvDialog() {
    if ($("trautsReportsExportDialog")) return;

    const style = document.createElement("style");
    style.id = "trautsReportsExportStyles";

    style.textContent = `
      #trautsReportsExportDialog[hidden] {
        display: none !important;
      }

      @media (max-width: 767px) {

        #trautsReportsExportDialog {
          position: fixed;
          inset: 0;
          z-index: 47000;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          padding: 10px;
          background: rgba(5, 15, 29, .80);
        }

        #trautsReportsExportDialog .tr-export-card {
          width: 100%;
          max-width: 520px;
          max-height: calc(100dvh - 20px);
          overflow-y: auto;
          box-sizing: border-box;
          padding: 17px 15px;
          border-radius: 16px;
          background: #ffffff;
          color: #17283e;
          border: 1px solid #dfe6ef;
          box-shadow: 0 15px 45px rgba(0,0,0,.3);
        }

        #trautsReportsExportDialog h2 {
          font-size: 20px;
          margin: 0 0 9px;
          color: inherit;
        }

        #trautsReportsExportDialog p {
          margin: 8px 0;
          line-height: 1.5;
          font-size: 13px;
          color: inherit;
        }

        #trautsReportsExportText {
          width: 100%;
          height: 220px;
          box-sizing: border-box;
          margin: 10px 0 0;
          padding: 10px;
          font: 12px/1.5 monospace;
          resize: vertical;
          background: #f6f8fc;
          color: #17283e;
          border: 1px solid #bac8d9;
          border-radius: 10px;
          white-space: pre;
        }

        #trautsReportsExportDialog .tr-export-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-top: 12px;
        }

        #trautsReportsExportDialog button {
          min-height: 47px;
          padding: 9px 8px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          touch-action: manipulation;
        }

        #trExportCopy,
        #trExportShare {
          background: #2855a0;
          color: #ffffff;
          border: 1px solid #2855a0;
        }

        #trExportClose {
          background: #edf2f8;
          color: #243952;
          border: 1px solid #bac8d9;
        }

        #trExportMessage {
          min-height: 19px;
          overflow-wrap: anywhere;
        }

        /* DARK MODE */

        html.trauts-dark
        #trautsReportsExportDialog .tr-export-card {
          background: #17283e !important;
          color: #e8eff9 !important;
          border-color: #364a63 !important;
        }

        html.trauts-dark #trautsReportsExportText {
          background: #0d1c2e !important;
          color: #e8eff9 !important;
          border-color: #52647b !important;
        }

        html.trauts-dark #trExportClose {
          background: #29425e !important;
          color: #ffffff !important;
          border-color: #526c86 !important;
        }

        html.trauts-dark #trExportCopy,
        html.trauts-dark #trExportShare {
          background: #336bc0 !important;
          color: #ffffff !important;
          border-color: #6897dd !important;
        }
      }
    `;

    document.head.appendChild(style);

    const dialog = document.createElement("div");
    dialog.id = "trautsReportsExportDialog";
    dialog.hidden = true;

    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "trExportHeading");

    dialog.innerHTML = `
      <section class="tr-export-card">

        <h2 id="trExportHeading">Reports CSV</h2>

        <p>
          Full transaction report, including subtotal,
          discount, and total.

          Tap <strong>Copy CSV</strong> to paste it into
          a spreadsheet or text file.

          <strong>Share CSV</strong> sends a .csv file
          if Android supports file sharing.
        </p>

        <textarea
          id="trautsReportsExportText"
          readonly
          spellcheck="false"
          aria-label="Reports CSV data">
        </textarea>

        <p id="trExportMessage" role="status"></p>

        <div class="tr-export-actions">

          <button type="button" id="trExportCopy">
            Copy CSV
          </button>

          <button type="button" id="trExportShare">
            Share CSV
          </button>

          <button type="button" id="trExportClose">
            Close
          </button>

        </div>

      </section>
    `;

    document.body.appendChild(dialog);

    let priorFocus = null;

    function close() {
      dialog.hidden = true;

      if (priorFocus?.isConnected) {
        priorFocus.focus();
      }

      priorFocus = null;
    }

    dialog.addEventListener("click", event => {
      if (event.target === dialog) {
        close();
      }
    });

    $("trExportClose").addEventListener("click", close);

    document.addEventListener("keydown", event => {
      if (!dialog.hidden && event.key === "Escape") {
        event.preventDefault();
        close();
      }
    });

    /* COPY CSV */

    $("trExportCopy").addEventListener("click", async () => {
      const field = $("trautsReportsExportText");
      let copied = false;

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(field.value);
          copied = true;
        }
      } catch {
        // Clipboard API may be unavailable in Android WebView.
      }

      if (!copied) {
        field.focus();
        field.select();

        try {
          copied = document.execCommand("copy");
        } catch {
          // Manual text selection remains available.
        }
      }

      $("trExportMessage").textContent = copied
        ? "CSV copied. Paste it into a spreadsheet or text file."
        : "Select the CSV text above and use Android's Copy option.";
    });

    /* SHARE CSV */

    $("trExportShare").addEventListener("click", async () => {
      const message = $("trExportMessage");

      if (
        typeof navigator.share !== "function" ||
        typeof File !== "function"
      ) {
        message.textContent =
          "File sharing is unavailable in this WebView. Use Copy CSV.";
        return;
      }

      const file = new File(
        ["\uFEFF" + $("trautsReportsExportText").value],
        "trauts-sales-report.csv",
        { type: "text/csv" }
      );

      try {
        if (!navigator.canShare?.({ files: [file] })) {
          message.textContent =
            "CSV file sharing is not supported here. Use Copy CSV.";
          return;
        }

        await navigator.share({
          files: [file],
          title: "TRAUTS Sales Report"
        });

        message.textContent = "CSV shared successfully.";

      } catch (error) {
        if (error?.name !== "AbortError") {
          message.textContent =
            "Could not share the CSV. Use Copy CSV instead.";
        }
      }
    });

    /* OPEN THE CSV WINDOW */

    dialog.showCsv = (csv, button) => {
      priorFocus = button;

      $("trautsReportsExportText").value = csv;
      $("trExportMessage").textContent = "";

      dialog.hidden = false;
      $("trautsReportsExportText").focus();
    };
  }

  /* ==========================================================
     EXPORT CSV
     ========================================================== */

  function exportCSV() {
    // Recheck the date filters and data before exporting.
    if (!refreshReports()) return;

    if (!filteredSales.length) {
      $("reportMessage").textContent =
        "There are no transactions to export.";
      return;
    }

    const csv = buildSalesCSV();

    /* ANDROID: IN-APP CSV WINDOW */

    if (isMobile()) {
      ensureMobileCsvDialog();

      $("trautsReportsExportDialog").showCsv(
        csv,
        $("exportReportBtn")
      );

      return;
    }

    /* DESKTOP: ORIGINAL DOWNLOAD METHOD */

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

  /* ==========================================================
     DATE FILTERS AND REFRESH EVENTS
     ========================================================== */

  $("reportStart").addEventListener(
    "change",
    refreshReports
  );

  $("reportEnd").addEventListener(
    "change",
    refreshReports
  );

  $("resetReportDates").addEventListener("click", () => {
    $("reportStart").value = "";
    $("reportEnd").value = "";
    refreshReports();
  });

  $("exportReportBtn").addEventListener(
    "click",
    exportCSV
  );

  window.refreshTrautsReports = refreshReports;

  window.addEventListener("storage", event => {
    if (event.key === SALES_KEY) {
      refreshReports();
    }
  });

  refreshReports();

})();
