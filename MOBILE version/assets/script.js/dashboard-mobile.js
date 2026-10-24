
/* =============================================================
   TRAUTS ANDROID MOBILE
   Theme + headings + one reusable Record Sale window.
   The Sales page New Sale button AND Dashboard Quick Sale
   open the same transaction controls, without page switching.

   Shared navigation: dashboard.js (unchanged)
   Shared POS calculations and saving: sales.js (unchanged)
   Desktop/PC files: untouched
   ============================================================= */

(() => {
  "use strict";

  const THEME_KEY = "trauts_dashboard_theme_v1";
  const PHONE_QUERY = "(max-width: 767px)";

  let saleOpen = false;
  let posHome = null;
  let resetInProgress = false;
  let returnFocus = null;
  let priorOverflow = "";

  const el = id => document.getElementById(id);
  const isPhone = () => window.matchMedia(PHONE_QUERY).matches;

  function readTheme() {
    try {
      return localStorage.getItem(THEME_KEY) === "dark";
    } catch (_) {
      return false;
    }
  }

  function applyTheme(dark, save = false) {
    document.documentElement.classList.toggle(
      "trauts-dark",
      dark
    );

    const button = el("trautsThemeToggle");

    button?.setAttribute(
      "aria-pressed",
      String(dark)
    );

    button?.setAttribute(
      "aria-label",
      dark
        ? "Switch to light mode"
        : "Switch to dark mode"
    );

    if (el("trautsThemeSymbol")) {
      el("trautsThemeSymbol").textContent =
        dark ? "☀" : "☾";
    }

    if (save) {
      try {
        localStorage.setItem(
          THEME_KEY,
          dark ? "dark" : "light"
        );
      } catch (_) {
        // Theme remains functional without storage.
      }
    }
  }

  function updatePageHeading() {
    const active = document.querySelector(
      ".sidebar-nav .nav.active[data-page]"
    );

    const page = active?.dataset.page || "Dashboard";

    if (el("trautsPageTitle")) {
      el("trautsPageTitle").textContent = page;
    }

    if (el("trautsOverviewHeading")) {
      el("trautsOverviewHeading").hidden =
        page !== "Dashboard";
    }
  }

  /* =========================================================
     MOBILE SALES INTERFACE STYLES

     These rules are inserted after the shared stylesheets.
     They only apply to phone-sized screens.
     ========================================================= */

  function installMobileSalesStyles() {
    if (el("trautsSalesMobileStyles")) return;

    const style = document.createElement("style");
    style.id = "trautsSalesMobileStyles";

    style.textContent = `
      @media (max-width: 767px) {

        /* DASHBOARD QUICK ACTIONS */

        .trauts-mobile-dashboard-actions {
          display: flex;
          flex-direction: column;
          gap: 9px;
          width: 100%;
          max-width: 260px;
        }

        .trauts-mobile-dashboard-actions > button {
          width: 100%;
          min-height: 46px;
        }

        /* BOTH NEW SALE BUTTONS */

        #trautsQuickSaleBtn,
        #salesPage #newSaleBtn {
          display: block;
          width: 100%;
          min-height: 50px;
          padding: 12px 16px;
          border-radius: 12px;
          background: #2855a0 !important;
          border: 1px solid #2855a0 !important;
          color: #ffffff !important;
          font-size: 15px;
          font-weight: 700;
          text-align: center;
          cursor: pointer;
        }

        /* The Sales page is now a mobile sales hub.
           The transaction controls open in Record Sale. */

        #salesPage > .pos-layout {
          display: none !important;
        }

        /* SALES HEADER */

        #salesPage .pos-heading {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 14px;

          padding: 18px 15px;
          margin: 0 0 16px;

          border: 1px solid #dfe6ef;
          border-radius: 17px;
          background: #ffffff;
        }

        #salesPage .pos-heading h2 {
          margin: 0 0 3px;
          font-size: 22px;
        }

        #salesPage .pos-heading p {
          margin: 0;
          font-size: 13px;
        }

        /* STOCK ALERTS */

        #salesPage .trauts-stock-alerts {
          margin: 0 0 17px;
          padding: 15px 13px;
          border: 1px solid #dfe6ef;
          border-radius: 16px;
          background: #ffffff;
        }

        #salesPage .trauts-stock-alert-header {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 12px;
        }

        #salesPage .trauts-stock-alert-header h3 {
          margin: 0 0 4px;
          font-size: 16px;
        }

        #salesPage .trauts-stock-alert-header p {
          margin: 0;
          font-size: 12px;
        }

        #salesPage #posStockAlertList {
          display: grid;
          gap: 9px;
        }

        /* INDIVIDUAL STOCK ALERT CARDS */

        #salesPage .trauts-stock-alert-row {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          padding: 12px;
          min-width: 0;

          background: #f5f7fb;
          border: 1px solid #dfe6ef;
          border-radius: 12px;
        }

        #salesPage .trauts-stock-alert-row > div {
          width: 100%;
          min-width: 0;
        }

        #salesPage .trauts-stock-alert-row strong,
        #salesPage .trauts-stock-alert-row small {
          display: block;
          overflow-wrap: anywhere;
          white-space: normal;
        }

        #salesPage .trauts-stock-status {
          align-self: flex-start;
        }

        /* RECENT SALES - MOBILE RECEIPT CARDS */

        #salesPage .pos-history-panel {
          padding: 15px 13px;
          border-radius: 16px;
          min-width: 0;
        }

        #salesPage .pos-history-panel .table-wrap {
          overflow: visible !important;
        }

        #salesPage .pos-history-panel table,
        #salesPage .pos-history-panel tbody {
          display: block !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
        }

        #salesPage .pos-history-panel thead {
          display: none !important;
        }

        #salesPage .pos-history-panel tbody tr {
          display: grid !important;
          grid-template-columns:
            repeat(2, minmax(0, 1fr)) !important;

          gap: 10px;
          padding: 14px;
          margin: 0 0 10px;

          border: 1px solid #dfe6ef;
          border-radius: 13px;
          background: #f5f7fb;
        }

        #salesPage .pos-history-panel tbody td {
          display: flex !important;
          flex-direction: column;
          gap: 3px;

          border: 0 !important;
          padding: 0 !important;

          min-width: 0;
          white-space: normal !important;
          word-break: break-word;
          background: transparent !important;
        }

        #salesPage .pos-history-panel
        tbody td:first-child {
          grid-column: 1 / -1;
          font-weight: 700;
        }

        #salesPage .pos-history-panel
        tbody td:nth-child(2)::before {
          content: "Date";
        }

        #salesPage .pos-history-panel
        tbody td:nth-child(3)::before {
          content: "Items";
        }

        #salesPage .pos-history-panel
        tbody td:nth-child(4)::before {
          content: "Payment";
        }

        #salesPage .pos-history-panel
        tbody td:nth-child(5)::before {
          content: "Total";
        }

        #salesPage .pos-history-panel
        tbody td:nth-child(n+2)::before {
          font-size: 11px;
          font-weight: 400;
          opacity: .72;
        }

        #salesPage .pos-history-panel
        tbody td:nth-child(6),
        #salesPage .pos-history-panel
        tbody td[colspan] {
          grid-column: 1 / -1;
        }

        #salesPage .pos-history-panel
        tbody td:nth-child(6) button {
          width: 100%;
          min-height: 44px;
          border-radius: 10px;
        }

        /* RECORD SALE WINDOW */

        #trautsQuickSaleModal[hidden] {
          display: none !important;
        }

        #trautsQuickSaleModal {
          position: fixed;
          inset: 0;
          z-index: 30000;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 8px;
          background: rgba(5, 14, 27, .68);
        }

        .trauts-quick-sale-dialog {
          width: 100%;
          max-width: 600px;
          max-height: calc(100dvh - 16px);

          display: flex;
          flex-direction: column;
          overflow: hidden;

          border: 1px solid #dfe6ef;
          border-radius: 17px;
          background: #ffffff;
          color: #17283e;

          box-shadow:
            0 16px 44px rgba(0, 0, 0, .28);
        }

        .trauts-quick-sale-header {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;

          padding: 16px;
          border-bottom: 1px solid #dfe6ef;
        }

        .trauts-quick-sale-header h2 {
          margin: 0;
          font-size: 20px;
        }

        #trautsQuickSaleClose {
          flex: 0 0 44px;
          width: 44px;
          height: 44px;

          border: 1px solid #dfe6ef;
          border-radius: 12px;
          background: transparent;
          color: inherit;
          font-size: 26px;
        }

        .trauts-quick-sale-body {
          overflow-y: auto;
          min-height: 0;
          padding: 14px;

          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }

        /* MOVE EXISTING POS LAYOUT INTO THE DIALOG */

        #trautsQuickSaleModal .pos-layout {
          display: grid !important;
          grid-template-columns:
            minmax(0, 1fr) !important;

          gap: 14px !important;
          width: 100% !important;
        }

        #trautsQuickSaleModal .pos-products,
        #trautsQuickSaleModal .pos-checkout {
          width: 100% !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 15px 12px !important;
          box-sizing: border-box;
        }

        #trautsQuickSaleModal .pos-product-list {
          display: grid !important;
          grid-template-columns:
            minmax(0, 1fr) !important;
          gap: 10px;
        }

        #trautsQuickSaleModal .pos-product {
          padding: 12px;
          border-radius: 12px;
        }

        #trautsQuickSaleModal .pos-product .pos-primary,
        #trautsQuickSaleModal #completeSaleBtn {
          width: 100%;
          min-height: 48px;
        }

        #trautsQuickSaleModal input,
        #trautsQuickSaleModal select {
          max-width: 100%;
          box-sizing: border-box;
          font-size: 16px;
        }

        /* DARK THEME */

        html.trauts-dark #salesPage .pos-heading,
        html.trauts-dark #salesPage .trauts-stock-alerts,
        html.trauts-dark #salesPage .pos-history-panel {
          background: #17283e !important;
          color: #e8eff9 !important;
          border-color: #364a63 !important;
        }

        html.trauts-dark #salesPage .trauts-stock-alert-row,
        html.trauts-dark #salesPage
        .pos-history-panel tbody tr {
          background: #20324a !important;
          color: #e8eff9 !important;
          border-color: #364a63 !important;
        }

        html.trauts-dark .trauts-quick-sale-dialog {
          background: #101f32;
          color: #e8eff9;
          border-color: #364a63;
        }

        html.trauts-dark .trauts-quick-sale-header,
        html.trauts-dark #trautsQuickSaleClose {
          border-color: #364a63;
        }

        html.trauts-dark
        #trautsQuickSaleModal .pos-products,
        html.trauts-dark
        #trautsQuickSaleModal .pos-checkout {
          background: #17283e !important;
          color: #e8eff9 !important;
          border-color: #364a63 !important;
        }

        html.trauts-dark
        #trautsQuickSaleModal .pos-product,
        html.trauts-dark
        #trautsQuickSaleModal .pos-cart-row {
          background: #20324a !important;
          color: #e8eff9 !important;
          border-color: #364a63 !important;
        }

        html.trauts-dark
        #trautsQuickSaleModal input,
        html.trauts-dark
        #trautsQuickSaleModal select {
          background: #0d1c2e !important;
          color: #f0f5fc !important;
          border-color: #52647b !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* =========================================================
     SHARED MOBILE RECORD SALE MODAL
     ========================================================= */

  function ensureSaleModal() {
    const existing = el("trautsQuickSaleModal");
    if (existing) return existing;

    const modal = document.createElement("div");

    modal.id = "trautsQuickSaleModal";
    modal.hidden = true;

    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute(
      "aria-labelledby",
      "trautsQuickSaleHeading"
    );

    const dialog = document.createElement("div");
    dialog.className = "trauts-quick-sale-dialog";

    const header = document.createElement("div");
    header.className = "trauts-quick-sale-header";

    const heading = document.createElement("h2");
    heading.id = "trautsQuickSaleHeading";
    heading.textContent = "Record Sale";

    const close = document.createElement("button");
    close.id = "trautsQuickSaleClose";
    close.type = "button";
    close.setAttribute(
      "aria-label",
      "Close record sale"
    );
    close.textContent = "×";

    close.addEventListener(
      "click",
      closeSaleWindow
    );

    const body = document.createElement("div");
    body.id = "trautsQuickSaleBody";
    body.className = "trauts-quick-sale-body";

    header.append(heading, close);
    dialog.append(header, body);
    modal.appendChild(dialog);

    document.body.appendChild(modal);

    modal.addEventListener("click", event => {
      if (event.target === modal) {
        closeSaleWindow();
      }
    });

    return modal;
  }

  function closeSaleWindow() {
    if (!saleOpen) return;

    const layout = document.querySelector(
      "#trautsQuickSaleModal .pos-layout"
    );

    // Restore the real POS to its original position.
    if (layout && posHome?.placeholder?.parentNode) {
      posHome.placeholder.parentNode.insertBefore(
        layout,
        posHome.placeholder
      );

      posHome.placeholder.remove();
    }

    posHome = null;
    saleOpen = false;

    el("trautsQuickSaleModal").hidden = true;
    document.body.style.overflow = priorOverflow;

    if (returnFocus?.isConnected) {
      returnFocus.focus();
    }

    returnFocus = null;
  }

  function openSaleWindow(sourceButton) {
    if (!isPhone() || saleOpen) return;

    const layout = document.querySelector(
      "#salesPage .pos-layout"
    );

    const salesNewSale = el("newSaleBtn");

    if (!layout || !salesNewSale) {
      console.warn(
        "TRAUTS: Sales controls not ready."
      );
      return;
    }

    // Trigger the existing Sales module's
    // transaction initialization exactly once.
    resetInProgress = true;

    try {
      salesNewSale.click();
    } finally {
      resetInProgress = false;
    }

    // Move the EXISTING POS into the Record Sale dialog.
    // Do not create another cart or checkout implementation.

    const placeholder = document.createComment(
      "Restore TRAUTS POS here"
    );

    layout.parentNode.insertBefore(
      placeholder,
      layout
    );

    posHome = { placeholder };
    returnFocus = sourceButton || el("trautsQuickSaleBtn");

    const modal = ensureSaleModal();

    el("trautsQuickSaleBody").appendChild(layout);

    saleOpen = true;
    modal.hidden = false;

    priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    el("trautsQuickSaleClose")?.focus();
  }

  /* =========================================================
     SALES PAGE NEW SALE BUTTON
     ========================================================= */

  function installSalesNewSaleAction() {
    if (!isPhone()) return;

    const button = el("newSaleBtn");

    if (
      !button ||
      button.dataset.mobileSaleBound === "true"
    ) {
      return;
    }

    button.dataset.mobileSaleBound = "true";

    // Capture runs before the existing Sales click handler.
    // Internal reset calls are allowed through unchanged.

    button.addEventListener(
      "click",
      event => {
        if (resetInProgress) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        openSaleWindow(button);
      },
      true
    );
  }

  /* =========================================================
     DASHBOARD QUICK SALE BUTTON
     ========================================================= */

  function installDashboardButton() {
    if (
      !isPhone() ||
      el("trautsQuickSaleBtn")
    ) {
      return;
    }

    const refresh = el("tldRefresh");

    if (!refresh?.parentElement) {
      return;
    }

    const actions = document.createElement("div");
    actions.className = "trauts-mobile-dashboard-actions";

    refresh.parentElement.insertBefore(
      actions,
      refresh
    );

    // Moving Refresh Overview preserves its event listener.
    actions.appendChild(refresh);

    const button = document.createElement("button");
    button.id = "trautsQuickSaleBtn";
    button.type = "button";
    button.className = "tld-refresh";
    button.textContent = "+ New Sale";

    button.addEventListener("click", () => {
      openSaleWindow(button);
    });

    actions.appendChild(button);
  }

  /* =========================================================
     INITIALIZE MOBILE BEHAVIOUR
     ========================================================= */

  function initialize() {
    applyTheme(readTheme());

    el("trautsThemeToggle")?.addEventListener(
      "click",
      () => {
        const dark =
          document.documentElement.classList.contains(
            "trauts-dark"
          );

        applyTheme(!dark, true);
      }
    );

    updatePageHeading();

    const nav = document.querySelector(".sidebar-nav");

    if (nav) {
      new MutationObserver(
        updatePageHeading
      ).observe(nav, {
        attributes: true,
        attributeFilter: [
          "class",
          "aria-current"
        ],
        childList: true,
        subtree: true
      });
    }

    if (isPhone()) {
      installMobileSalesStyles();
      installSalesNewSaleAction();
      installDashboardButton();
    }

    window.addEventListener(
      "load",
      () => {
        installSalesNewSaleAction();
        installDashboardButton();
      },
      { once: true }
    );

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Escape" &&
          saleOpen
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          closeSaleWindow();
        }
      },
      true
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
})();

/* ============================================================
   TRAUTS ANDROID DASHBOARD — DAILY SALES BAR CHART

   Mobile only. Keeps the shared graph unchanged.
   Uses the same saved receipts as sales.js.
   ============================================================ */

(() => {
  "use strict";

  const MOBILE_QUERY = "(max-width: 767px)";
  const SALES_KEY = "trauts_demo_sales_v1";
  const chartId = "trautsMobileSalesBars";

  let selectedDays = 7;
  let selectedDate = "";
  let currentDays = [];

  const byId = id => document.getElementById(id);

  function dateKey(input) {
    if (
      typeof input === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(input)
    ) {
      return input;
    }

    const date = input instanceof Date
      ? input
      : new Date(input);

    if (Number.isNaN(date.getTime())) return "";

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
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

  function shortMoney(ngwee) {
    const value = ngwee / 100;

    if (value >= 1000000) {
      return `K ${(value / 1000000).toFixed(1)}m`;
    }

    if (value >= 1000) {
      return `K ${(value / 1000).toFixed(1)}k`;
    }

    return "K " + Math.round(value).toLocaleString(
      "en-ZM"
    );
  }

  function readSales() {
    try {
      const value = JSON.parse(
        localStorage.getItem(SALES_KEY)
      );

      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn(
        "TRAUTS: Could not read daily sales chart data.",
        error
      );
      return [];
    }
  }

  function daySeries() {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const days = [];
    const indexed = new Map();

    for (let i = selectedDays - 1; i >= 0; i--) {
      const date = new Date(today);

      date.setDate(today.getDate() - i);

      const item = {
        date,
        key: dateKey(date),
        total: 0,
        count: 0
      };

      days.push(item);
      indexed.set(item.key, item);
    }

    readSales().forEach(sale => {
      const day = indexed.get(dateKey(sale.date));
      const total = Number(sale.totalNgwee);

      if (
        day &&
        Number.isSafeInteger(total) &&
        total >= 0
      ) {
        day.total += total;
        day.count += 1;
      }
    });

    return days;
  }

  /* BAR CHART STYLING */

  function addStyles() {
    if (byId("trautsMobileBarChartStyles")) return;

    const style = document.createElement("style");
    style.id = "trautsMobileBarChartStyles";

    style.textContent = `
      .trauts-mobile-bar-panel {
        display: none;
      }

      @media (max-width: 767px) {

        #trautsLiveDashboard.trauts-mobile-chart-ready
        > .tld-chart-panel {
          display: none !important;
        }

        #trautsLiveDashboard .trauts-mobile-bar-panel {
          display: block !important;
          min-width: 0;
          margin: 0 0 20px;
          padding: 18px 14px 16px;

          border: 1px solid var(--tld-border, #dfe6ef);
          border-radius: 18px;
          background: var(--tld-surface, #ffffff);
          color: var(--tld-text, #17283e);

          box-shadow:
            0 5px 20px rgba(12, 28, 49, .045);
        }

        .trauts-mobile-bar-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 14px;
        }

        .trauts-mobile-bar-header h3 {
          margin: 0 0 4px;
          font-size: 18px;
          color: var(--tld-text, #17283e);
        }

        .trauts-mobile-bar-header p {
          margin: 0;
          font-size: 12px;
          color: var(--tld-muted, #617188);
        }

        .trauts-mobile-bar-periods {
          display: flex;
          flex: 0 0 auto;
          gap: 5px;
          padding: 4px;
          border-radius: 11px;
          background: var(--tld-subtle, #f5f7fb);
        }

        .trauts-mobile-bar-periods button {
          border: 0;
          border-radius: 8px;
          min-height: 36px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 700;

          background: transparent;
          color: var(--tld-muted, #617188);
          cursor: pointer;
          touch-action: manipulation;
        }

        .trauts-mobile-bar-periods
        button[aria-pressed="true"] {
          background: #2855a0;
          color: #ffffff;
        }

        .trauts-mobile-bar-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin: 0 0 16px;
        }

        .trauts-mobile-bar-metric {
          border: 1px solid var(--tld-border, #dfe6ef);
          border-radius: 12px;
          padding: 12px;
          background: var(--tld-subtle, #f5f7fb);
          min-width: 0;
        }

        .trauts-mobile-bar-metric span {
          display: block;
          color: var(--tld-muted, #617188);
          font-size: 11px;
          margin-bottom: 5px;
        }

        .trauts-mobile-bar-metric strong {
          display: block;
          color: var(--tld-text, #17283e);
          font-size: 18px;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .trauts-mobile-bar-legend {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          margin-bottom: 11px;
          color: var(--tld-muted, #617188);
        }

        .trauts-mobile-bar-legend::before {
          content: "";
          height: 10px;
          width: 10px;
          border-radius: 3px;
          background: #2855a0;
        }

        .trauts-mobile-bar-chart {
          display: flex;
          gap: 7px;
          min-width: 0;
        }

        .trauts-mobile-bar-axis {
          width: 48px;
          flex: 0 0 48px;
          height: 163px;

          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: space-between;

          color: var(--tld-muted, #617188);
          font-size: 10px;
          line-height: 1;
        }

        .trauts-mobile-bars-scroll {
          min-width: 0;
          flex: 1;
          overflow-x: auto;
          overscroll-behavior-x: contain;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 6px;
        }

        .trauts-mobile-bars-plot {
          display: flex;
          gap: 7px;
          width: 100%;
          min-width: calc(
            var(--trauts-bars-count) * 43px
          );

          border-bottom:
            1px solid var(--tld-border, #dfe6ef);
        }

        .trauts-mobile-day-bar {
          display: flex;
          flex: 1 0 36px;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          min-width: 36px;
          padding: 0 0 4px;

          border: 0;
          background: transparent;
          color: var(--tld-text, #17283e);
          font-family: inherit;
          font-size: 11px;
          touch-action: manipulation;
          cursor: pointer;
        }

        .trauts-mobile-bar-track {
          position: relative;
          height: 163px;
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;

          background-image: linear-gradient(
            to bottom,
            var(--tld-border, #dfe6ef) 1px,
            transparent 1px
          );
          background-size: 100% 25%;
        }

        .trauts-mobile-bar-fill {
          width: min(75%, 32px);
          min-height: 3px;
          border-radius: 6px 6px 0 0;

          background: linear-gradient(
            180deg,
            #508fda 0%,
            #2855a0 100%
          );

          transition: height .2s ease;
        }

        .trauts-mobile-day-bar[aria-pressed="true"]
        .trauts-mobile-bar-fill {
          background: linear-gradient(
            180deg,
            #7eacf1 0%,
            #315376 100%
          );

          outline: 2px solid #508fda;
          outline-offset: 1px;
        }

        .trauts-mobile-bar-day {
          font-weight: 700;
          white-space: nowrap;
        }

        .trauts-mobile-bar-count {
          display: block;
          padding: 2px 5px;
          border-radius: 6px;
          font-size: 10px;
          color: var(--tld-muted, #617188);
          background: var(--tld-subtle, #f5f7fb);
          white-space: nowrap;
        }

        .trauts-mobile-bar-details {
          margin-top: 13px;
          padding: 11px 12px;

          border: 1px solid var(--tld-border, #dfe6ef);
          border-radius: 11px;
          background: var(--tld-subtle, #f5f7fb);
          color: var(--tld-text, #17283e);

          font-size: 12px;
          line-height: 1.5;
        }

        .trauts-mobile-bar-details strong {
          color: var(--tld-text, #17283e);
        }

        .trauts-mobile-bar-empty {
          margin: 10px 0 0;
          font-size: 12px;
          color: var(--tld-muted, #617188);
        }

        .trauts-mobile-bar-empty[hidden] {
          display: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* INSTALL DAILY BAR CHART */

  function installChart() {
    if (!window.matchMedia(MOBILE_QUERY).matches) {
      return false;
    }

    if (byId(chartId)) return true;

    const dashboard = byId("trautsLiveDashboard");
    if (!dashboard) return false;

    const anchor = dashboard.querySelector(
      ".tld-chart-panel, .tld-cards"
    );

    if (!anchor) return false;

    addStyles();

    const panel = document.createElement("section");

    panel.id = chartId;
    panel.className = "trauts-mobile-bar-panel";

    panel.setAttribute(
      "aria-label",
      "Daily sales bar chart"
    );

    panel.innerHTML = `
      <div class="trauts-mobile-bar-header">
        <div>
          <h3>Daily Sales Performance</h3>
          <p>Daily revenue and number of transactions</p>
        </div>

        <div class="trauts-mobile-bar-periods"
             role="group"
             aria-label="Bar chart period">
          <button type="button"
                  data-days="7"
                  aria-pressed="true">
            7 days
          </button>

          <button type="button"
                  data-days="30"
                  aria-pressed="false">
            30 days
          </button>
        </div>
      </div>

      <div class="trauts-mobile-bar-summary">
        <div class="trauts-mobile-bar-metric">
          <span>Period sales</span>
          <strong id="trautsBarRevenue">K 0.00</strong>
        </div>

        <div class="trauts-mobile-bar-metric">
          <span>Transactions</span>
          <strong id="trautsBarTransactions">0</strong>
        </div>
      </div>

      <div class="trauts-mobile-bar-legend">
        Revenue per day · numbers under bars = transactions
      </div>

      <div class="trauts-mobile-bar-chart">
        <div class="trauts-mobile-bar-axis"
             id="trautsBarAxis"
             aria-hidden="true">
        </div>

        <div class="trauts-mobile-bars-scroll"
             id="trautsBarScroller">
          <div class="trauts-mobile-bars-plot"
               id="trautsBarPlot">
          </div>
        </div>
      </div>

      <div class="trauts-mobile-bar-details"
           id="trautsBarDetails"
           role="status"
           aria-live="polite">
      </div>

      <p class="trauts-mobile-bar-empty"
         id="trautsBarEmpty"
         hidden>
        No recorded sales in this period.
        The bars update when a sale is saved.
      </p>
    `;

    anchor.insertAdjacentElement("afterend", panel);

    dashboard.classList.add(
      "trauts-mobile-chart-ready"
    );

    panel.addEventListener("click", event => {
      const period = event.target.closest(
        "button[data-days]"
      );

      if (period) {
        selectedDays = Number(period.dataset.days);
        selectedDate = "";
        renderBarChart();
        return;
      }

      const bar = event.target.closest(
        "button[data-date]"
      );

      if (bar) {
        selectedDate = bar.dataset.date;
        updateSelectedDay();
      }
    });

    byId("tldRefresh")?.addEventListener(
      "click",
      renderBarChart
    );

    return true;
  }

  /* SELECTED DAY INFORMATION */

  function updateSelectedDay() {
    const selected = currentDays.find(
      day => day.key === selectedDate
    );

    if (!selected) return;

    byId(chartId)?.querySelectorAll(
      "button[data-date]"
    ).forEach(button => {
      button.setAttribute(
        "aria-pressed",
        String(
          button.dataset.date === selectedDate
        )
      );
    });

    const details = byId("trautsBarDetails");

    if (details) {
      details.textContent =
        `${selected.date.toLocaleDateString(
          "en-ZM",
          {
            weekday: "long",
            day: "numeric",
            month: "long"
          }
        )}: ${money(selected.total)} from ` +
        `${selected.count} ` +
        `${selected.count === 1
          ? "transaction"
          : "transactions"}.`;
    }
  }

  /* DRAW BAR CHART */

  function renderBarChart() {
    if (!installChart()) return;

    currentDays = daySeries();

    const plot = byId("trautsBarPlot");
    const axis = byId("trautsBarAxis");

    if (!plot || !axis) return;

    const revenue = currentDays.reduce(
      (sum, day) => sum + day.total,
      0
    );

    const transactions = currentDays.reduce(
      (sum, day) => sum + day.count,
      0
    );

    const highest = Math.max(
      0,
      ...currentDays.map(day => day.total)
    );

    byId("trautsBarRevenue").textContent = money(revenue);

    byId("trautsBarTransactions").textContent =
      String(transactions);

    byId("trautsBarEmpty").hidden =
      transactions > 0;

    byId(chartId).querySelectorAll(
      "button[data-days]"
    ).forEach(button => {
      button.setAttribute(
        "aria-pressed",
        String(
          Number(button.dataset.days) === selectedDays
        )
      );
    });

    axis.replaceChildren();

    for (let step = 4; step >= 0; step--) {
      const label = document.createElement("span");

      label.textContent = shortMoney(
        highest * step / 4
      );

      axis.appendChild(label);
    }

    plot.replaceChildren();

    plot.style.setProperty(
      "--trauts-bars-count",
      String(selectedDays)
    );

    for (const day of currentDays) {
      const bar = document.createElement("button");

      bar.type = "button";
      bar.className = "trauts-mobile-day-bar";
      bar.dataset.date = day.key;

      bar.title =
        `${day.key}: ${money(day.total)}, ` +
        `${day.count} transactions`;

      bar.setAttribute(
        "aria-label",
        bar.title
      );

      const track = document.createElement("span");
      track.className = "trauts-mobile-bar-track";

      const fill = document.createElement("span");
      fill.className = "trauts-mobile-bar-fill";

      fill.style.height =
        `${highest > 0 && day.total > 0
          ? Math.max(
              4,
              day.total / highest * 100
            )
          : 0}%`;

      track.appendChild(fill);

      const label = document.createElement("span");
      label.className = "trauts-mobile-bar-day";

      label.textContent = selectedDays === 7
        ? day.date.toLocaleDateString(
            "en-ZM",
            { weekday: "short" }
          )
        : String(day.date.getDate());

      const count = document.createElement("span");
      count.className = "trauts-mobile-bar-count";

      count.textContent =
        `${day.count} ` +
        `${day.count === 1
          ? "sale"
          : "sales"}`;

      bar.append(track, label, count);

      plot.appendChild(bar);
    }

    if (!currentDays.some(
      day => day.key === selectedDate
    )) {
      selectedDate =
        currentDays[currentDays.length - 1]?.key || "";
    }

    updateSelectedDay();

    if (selectedDays === 30) {
      const scroller = byId("trautsBarScroller");

      scroller.scrollLeft =
        scroller.scrollWidth - scroller.clientWidth;
    }
  }

  /* INITIALIZE CHART */

  function initialize() {
    renderBarChart();

    window.addEventListener(
      "load",
      renderBarChart,
      { once: true }
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

  window.addEventListener(
    "trauts:sales-updated",
    renderBarChart
  );

  window.addEventListener("storage", event => {
    if (
      event.key === SALES_KEY ||
      event.key === null
    ) {
      renderBarChart();
    }
  });
})();

/* =====================================================
   TRAUTS ANDROID — MANAGE ACCOUNTS FORM NAVIGATION

   - Add Staff takes the user directly to the form
   - Form heading says Create Account
   - Submit button says Create Account
   - Keeps existing account creation logic unchanged
   - Does not change Shopkeeper or Manager roles
   - Mobile only
   ===================================================== */

(() => {
  "use strict";

  function setupManageAccountsMobile() {

    if (!window.matchMedia("(max-width: 767px)").matches) {
      return;
    }

    const addStaffButton =
      document.getElementById("addStaffBtn");

    const staffFormPanel =
      document.getElementById("staffFormPanel");

    const staffForm =
      document.getElementById("staffForm");

    if (!addStaffButton || !staffFormPanel || !staffForm) {
      return;
    }

    // Prevent duplicate event listeners.
    if (addStaffButton.dataset.mobileJumpReady === "true") {
      return;
    }

    addStaffButton.dataset.mobileJumpReady = "true";

    // Update visible wording without touching account logic.
    const formHeading =
      staffFormPanel.querySelector("h3");

    if (formHeading) {
      formHeading.textContent = "Create Account";
    }

    const submitButton =
      staffForm.querySelector('button[type="submit"]');

    if (submitButton) {
      submitButton.textContent = "Create Account";
    }

    // Keep enough room for the mobile page header.
    staffFormPanel.style.scrollMarginTop = "85px";

    // The original Manage Accounts code opens the form.
    // This listener then navigates the screen to it.
    addStaffButton.addEventListener("click", () => {

      window.requestAnimationFrame(() => {

        // Ensure the form is visible.
        staffFormPanel.hidden = false;

        // Take the user directly to the form.
        staffFormPanel.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

      });

    });

  }

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      setupManageAccountsMobile,
      { once: true }
    );

  } else {

    setupManageAccountsMobile();

  }

})();


/* ============================================================
   TRAUTS ANDROID — SETTINGS + DYNAMIC NAMES + SAFE LOCAL RESET

   Only on Android/mobile widths. Reuses existing settings.js.

   Business Name:
     Settings > Business Information

   Manager Name:
     Settings > Manager Profile > Display Name

   Reset All Local Data clears Web Storage, then explicitly
   saves empty Products and Staff lists so built-in demo
   records are NOT recreated when the WebView reloads.
   ============================================================ */

(() => {
  "use strict";

  if (window.__trautsMobileSettingsBrandResetV1) return;
  window.__trautsMobileSettingsBrandResetV1 = true;

  const SETTINGS_KEY = "trauts_demo_settings_v1";
  const PRODUCTS_KEY = "trauts_demo_products_v1";
  const STAFF_KEY = "trauts_demo_staff_v1";

  const $ = id => document.getElementById(id);

  const isMobile = () =>
    window.matchMedia("(max-width: 767px)").matches;

  /* ==========================================================
     READ EXISTING SETTINGS
     ========================================================== */

  function readSettings() {
    try {
      const settings = JSON.parse(
        localStorage.getItem(SETTINGS_KEY)
      );

      return settings &&
        typeof settings === "object" &&
        !Array.isArray(settings)
          ? settings
          : {};

    } catch (_) {
      return {};
    }
  }

  /* ==========================================================
     DYNAMIC BUSINESS NAME AND MANAGER DISPLAY NAME
     ========================================================== */

  function renderBusinessName() {
    if (!isMobile()) return;

    const settings = readSettings();

    const configuredBusiness = String(
      settings.shopName || ""
    ).trim();

    const business =
      configuredBusiness || "Shop Manager";

    const manager = String(
      settings.managerName || ""
    ).trim() || "Administrator";

    // Business name at the top of every menu page.
    const headerName = document.querySelector(
      ".trauts-page-header .trauts-page-eyebrow"
    );

    if (headerName) {
      headerName.textContent =
        configuredBusiness || "TRAUTS SHOP MANAGER";
    }

    // Business name underneath TRAUTS in the sidebar.
    const brandName = document.querySelector(
      ".sidebar-brand > div:last-child > p"
    );

    if (brandName) {
      brandName.textContent = business;
    }

    // Manager Profile > Display Name.
    // Replaces the "Administrator" label.
    const managerLabel = document.querySelector(
      ".sidebar-footer .user-info strong"
    );

    if (managerLabel) {
      managerLabel.textContent = manager;
    }

    // Business name underneath the manager's name.
    const businessLabel = document.querySelector(
      ".sidebar-footer .user-info small"
    );

    if (businessLabel) {
      businessLabel.textContent = business;
    }
  }

  /* ==========================================================
     INITIALIZE SETTINGS ENHANCEMENTS
     ========================================================== */

  function setup() {
    if (!isMobile()) return;

    const page = $("settingsPage");
    const form = $("settingsForm");

    if (!page || !form) return;

    renderBusinessName();

    // Existing settings.js saves the form.
    // Refresh visible names immediately afterwards.
    form.addEventListener("submit", () => {
      window.setTimeout(renderBusinessName, 0);
    });

    // Also refresh after Restore Defaults.
    $("resetSettingsBtn")?.addEventListener(
      "click",
      () => {
        window.setTimeout(renderBusinessName, 0);
      }
    );

    window.addEventListener(
      "trauts:settings-updated",
      renderBusinessName
    );

    window.addEventListener(
      "pageshow",
      renderBusinessName
    );

    window.addEventListener("storage", event => {
      if (
        event.key === SETTINGS_KEY ||
        event.key === null
      ) {
        renderBusinessName();
      }
    });

    // Update when moving between menus.
    document.querySelectorAll(
      ".sidebar-nav [data-page]"
    ).forEach(button => {
      button.addEventListener(
        "click",
        renderBusinessName
      );
    });

    /* ========================================================
       RESET ALL LOCAL DATA BUTTON
       ======================================================== */

    if ($("trautsResetAllLocalBtn")) return;

    const dangerZone = document.createElement("section");

    dangerZone.id = "trautsResetLocalDataSection";
    dangerZone.className = "panel settings-panel";

    dangerZone.innerHTML = `
      <h3>Reset All Local Data</h3>

      <p>
        Delete this device's TRAUTS products, staff,
        sales, inventory, suppliers, purchases,
        expenses, settings, and audit records.

        This cannot be undone.
      </p>

      <button
        type="button"
        id="trautsResetAllLocalBtn">
        Reset All Local Data
      </button>
    `;

    // Keep Reset outside the form.
    // It must never submit Save Settings.
    form.insertAdjacentElement(
      "afterend",
      dangerZone
    );

    /* ========================================================
       RESET DIALOG STYLES
       ======================================================== */

    if (!$("trautsLocalResetDialogStyles")) {

      const style = document.createElement("style");

      style.id = "trautsLocalResetDialogStyles";

      style.textContent = `
        #trautsResetAllDialog[hidden] {
          display: none !important;
        }

        @media (max-width: 767px) {

          #trautsResetAllDialog {
            position: fixed;
            inset: 0;
            z-index: 48000;

            display: flex;
            align-items: center;
            justify-content: center;

            box-sizing: border-box;
            padding: 12px;

            background: rgba(5,15,29,.83);
          }

          #trautsResetAllDialog .trd-card {
            box-sizing: border-box;
            width: 100%;
            max-width: 470px;
            max-height: calc(100dvh - 24px);
            overflow-y: auto;

            padding: 18px;
            border-radius: 15px;

            border: 1px solid #df9e9e;
            background: #fff;
            color: #17283e;
          }

          #trautsResetAllDialog h2 {
            margin: 0 0 10px;
            font-size: 20px;
            color: inherit;
          }

          #trautsResetAllDialog p {
            font-size: 13px;
            line-height: 1.5;
            color: inherit;
          }

          #trautsResetAllDialog .trd-warning {
            padding: 11px;

            border: 1px solid #dc9494;
            border-radius: 10px;

            background: #fff1f0;
            color: #8b2020;
          }

          #trautsResetAllDialog label {
            display: block;
            margin: 13px 0 7px;

            font-size: 13px;
            font-weight: 700;
          }

          #trautsResetPhrase {
            box-sizing: border-box;
            width: 100%;
            min-height: 47px;

            padding: 10px;
            font-size: 16px;

            border-radius: 10px;
            border: 1px solid #bac8d9;

            background: #fff;
            color: #17283e;
          }

          #trautsResetAllDialog .trd-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;

            gap: 9px;
            margin-top: 12px;
          }

          #trautsResetAllDialog button {
            min-height: 48px;
            padding: 9px;

            font-size: 14px;
            font-weight: 700;
            border-radius: 10px;

            touch-action: manipulation;
          }

          #trautsResetCancel {
            background: #edf2f8;
            color: #243952;
            border: 1px solid #bac8d9;
          }

          #trautsResetConfirm {
            background: #b42318;
            color: #fff;
            border: 1px solid #b42318;
          }

          #trautsResetConfirm:disabled {
            opacity: .5;
          }

          #trautsResetError {
            min-height: 18px;
            color: #a51d1d !important;
          }

          /* DARK MODE */

          html.trauts-dark
          #trautsResetAllDialog .trd-card {
            background: #17283e !important;
            color: #e8eff9 !important;
            border-color: #a36f6f !important;
          }

          html.trauts-dark
          #trautsResetAllDialog .trd-warning {
            background: #40242c !important;
            color: #fecaca !important;
            border-color: #b45353 !important;
          }

          html.trauts-dark #trautsResetPhrase {
            background: #0d1c2e !important;
            color: #e8eff9 !important;
            border-color: #52647b !important;
          }

          html.trauts-dark #trautsResetCancel {
            background: #29425e !important;
            color: #fff !important;
            border-color: #526c86 !important;
          }

          html.trauts-dark #trautsResetError {
            color: #fecaca !important;
          }
        }
      `;

      document.head.appendChild(style);
    }

    /* ========================================================
       CREATE RESET CONFIRMATION DIALOG
       ======================================================== */

    const dialog = document.createElement("div");

    dialog.id = "trautsResetAllDialog";
    dialog.hidden = true;

    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    dialog.setAttribute(
      "aria-labelledby",
      "trautsResetHeading"
    );

    dialog.innerHTML = `
      <div class="trd-card">

        <h2 id="trautsResetHeading">
          Permanently reset TRAUTS?
        </h2>

        <div class="trd-warning">
          This will permanently remove all TRAUTS
          data saved in this app's Web Storage,
          including products and staff accounts.

          It cannot be undone, and it does not
          reverse real-world transactions.
        </div>

        <label for="trautsResetPhrase">
          Type RESET TRAUTS to confirm
        </label>

        <input
          id="trautsResetPhrase"
          type="text"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false">

        <p
          id="trautsResetError"
          role="alert">
        </p>

        <div class="trd-actions">

          <button
            type="button"
            id="trautsResetCancel">
            Keep My Data
          </button>

          <button
            type="button"
            id="trautsResetConfirm">
            Delete All Data
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(dialog);

    /* ========================================================
       OPEN AND CLOSE RESET DIALOG
       ======================================================== */

    let oldFocus = null;

    function closeDialog() {
      dialog.hidden = true;

      if (oldFocus?.isConnected) {
        oldFocus.focus();
      }

      oldFocus = null;
    }

    $("trautsResetAllLocalBtn").addEventListener(
      "click",
      () => {

        oldFocus = document.activeElement;

        $("trautsResetPhrase").value = "";
        $("trautsResetError").textContent = "";

        $("trautsResetConfirm").disabled = false;

        dialog.hidden = false;
        $("trautsResetPhrase").focus();
      }
    );

    $("trautsResetCancel").addEventListener(
      "click",
      closeDialog
    );

    dialog.addEventListener("click", event => {
      if (event.target === dialog) {
        closeDialog();
      }
    });

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Escape" &&
          !dialog.hidden
        ) {
          event.preventDefault();
          closeDialog();
        }
      },
      true
    );

    /* ========================================================
       RESET ALL LOCAL DATA — ONE CORRECT HANDLER
       ======================================================== */

    $("trautsResetConfirm").addEventListener(
      "click",
      () => {

        const error = $("trautsResetError");

        if (
          $("trautsResetPhrase").value.trim() !==
          "RESET TRAUTS"
        ) {
          error.textContent =
            "Enter RESET TRAUTS exactly to confirm.";

          return;
        }

        const button = $("trautsResetConfirm");

        button.disabled = true;
        error.textContent = "";

        try {

          /* CLEAR ALL EXISTING WEB STORAGE */

          localStorage.clear();
          sessionStorage.clear();

          /* PREVENT BUILT-IN SAMPLE RECORDS RETURNING */

          localStorage.setItem(
            PRODUCTS_KEY,
            "[]"
          );

          localStorage.setItem(
            STAFF_KEY,
            "[]"
          );

          /* VERIFY THE TWO EMPTY LISTS */

          if (
            localStorage.getItem(PRODUCTS_KEY) !== "[]" ||
            localStorage.getItem(STAFF_KEY) !== "[]"
          ) {
            throw new Error(
              "Empty product/staff lists could not be saved."
            );
          }

          /* RELOAD ALL TRAUTS MODULES */

          window.location.reload();

        } catch (cause) {

          console.error(
            "TRAUTS full local reset failed:",
            cause
          );

          error.textContent =
            "Reset could not finish. Some data may " +
            "already be cleared. Check app storage " +
            "and try again.";

          button.disabled = false;
        }
      }
    );
  }

  /* ==========================================================
     START MOBILE SETTINGS
     ========================================================== */

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      setup,
      { once: true }
    );

  } else {

    setup();

  }

})();

/* ==========================================================
   TRAUTS ANDROID — LOGOUT (DEMO SESSION EXIT)
   Append once at bottom of script.js/dashboard-mobile.js.
   Does not delete or modify business data.
   NOTE: This is NOT authentication or a security lock.
   ========================================================== */
(() => {
  "use strict";

  const FLAG = "trauts_mobile_session_exited_v1";
  const $ = id => document.getElementById(id);

  const onPhone = () =>
    window.matchMedia("(max-width: 767px)").matches;

  function start() {
    if (!onPhone() || !$("logoutBtn")) return;
    if ($("trautsLogoutConfirm")) return;

    /* MOBILE-ONLY STYLES */

    const css = document.createElement("style");
    css.id = "trautsLogoutMobileStyles";

    css.textContent = `
      #trautsLogoutConfirm[hidden],
      #trautsExitedScreen[hidden] {
        display: none !important;
      }

      @media (max-width: 767px) {

        #trautsLogoutConfirm,
        #trautsExitedScreen {
          position: fixed;
          inset: 0;
          z-index: 90000;

          display: flex;
          align-items: center;
          justify-content: center;

          box-sizing: border-box;
          padding: 14px;

          background: rgba(5,15,29,.87);
        }

        #trautsLogoutConfirm .tl-card,
        #trautsExitedScreen .tl-card {
          box-sizing: border-box;
          width: 100%;
          max-width: 460px;
          max-height: calc(100dvh - 28px);
          overflow-y: auto;

          padding: 23px 19px;
          border-radius: 18px;

          border: 1px solid #dfe6ef;
          background: #fff;
          color: #17283e;

          box-shadow: 0 20px 50px rgba(0,0,0,.28);
        }

        #trautsLogoutConfirm h2,
        #trautsExitedScreen h2 {
          font-size: 22px;
          line-height: 1.3;
          margin: 0 0 12px;
          color: inherit;
        }

        #trautsLogoutConfirm p,
        #trautsExitedScreen p {
          font-size: 14px;
          line-height: 1.6;
          margin: 8px 0 15px;
          color: inherit;
        }

        #trautsLogoutConfirm .tl-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-top: 19px;
        }

        #trautsLogoutConfirm button,
        #trautsExitedScreen button {
          box-sizing: border-box;
          min-height: 48px;
          padding: 11px;

          border-radius: 11px;
          font-size: 14px;
          font-weight: 700;

          touch-action: manipulation;
        }

        #trautsLogoutCancel {
          border: 1px solid #bac8d9;
          background: #edf2f8;
          color: #243952;
        }

        #trautsLogoutProceed,
        #trautsReturnToApp {
          border: 1px solid #2855a0;
          background: #2855a0;
          color: #ffffff;
        }

        #trautsReturnToApp {
          display: block;
          width: 100%;
          margin-top: 19px;
        }

        #trautsLogoutError {
          color: #b42318 !important;
          min-height: 0;
        }

        /* DARK MODE */

        html.trauts-dark
        #trautsLogoutConfirm .tl-card,
        html.trauts-dark
        #trautsExitedScreen .tl-card {
          background: #17283e !important;
          color: #e8eff9 !important;
          border-color: #364a63 !important;
        }

        html.trauts-dark #trautsLogoutCancel {
          background: #29425e !important;
          color: #ffffff !important;
          border-color: #526c86 !important;
        }

        html.trauts-dark #trautsLogoutProceed,
        html.trauts-dark #trautsReturnToApp {
          background: #336bc0 !important;
          color: #ffffff !important;
          border-color: #6897dd !important;
        }

        html.trauts-dark #trautsLogoutError {
          color: #fecaca !important;
        }
      }
    `;

    document.head.appendChild(css);

    /* LOGOUT CONFIRMATION WINDOW */

    const confirmDialog = document.createElement("div");

    confirmDialog.id = "trautsLogoutConfirm";
    confirmDialog.hidden = true;

    confirmDialog.setAttribute("role", "dialog");
    confirmDialog.setAttribute("aria-modal", "true");
    confirmDialog.setAttribute(
      "aria-labelledby",
      "tlConfirmTitle"
    );

    confirmDialog.innerHTML = `
      <section class="tl-card">

        <h2 id="tlConfirmTitle">
          Leave TRAUTS?
        </h2>

        <p>
          Your products, sales, staff accounts,
          reports and settings will stay saved
          on this device.

          Logout will NOT reset data.
        </p>

        <p>
          Real account sign-in is not enabled yet.
          This is a temporary session-exit screen,
          not a security lock.
        </p>

        <p id="trautsLogoutError" role="alert"></p>

        <div class="tl-actions">

          <button
            type="button"
            id="trautsLogoutCancel">
            Cancel
          </button>

          <button
            type="button"
            id="trautsLogoutProceed">
            Leave App
          </button>

        </div>

      </section>
    `;

    /* EXIT SCREEN */

    const exited = document.createElement("div");

    exited.id = "trautsExitedScreen";
    exited.hidden = true;

    exited.setAttribute("role", "dialog");
    exited.setAttribute("aria-modal", "true");
    exited.setAttribute(
      "aria-labelledby",
      "tlExitedTitle"
    );

    exited.innerHTML = `
      <section class="tl-card">

        <h2 id="tlExitedTitle">
          You left TRAUTS
        </h2>

        <p>
          Your business records are still saved
          on this device.
        </p>

        <p>
          This is a temporary exit screen.
          Because proper login is not built yet,
          returning does not require a password.
        </p>

        <button
          type="button"
          id="trautsReturnToApp">
          Return to TRAUTS
        </button>

      </section>
    `;

    document.body.append(confirmDialog, exited);

    /* CLOSE CONFIRMATION */

    function closeConfirm() {
      confirmDialog.hidden = true;
      $("logoutBtn")?.focus();
    }

    /* SHOW THE EXIT SCREEN */

    function showExited() {
      confirmDialog.hidden = true;
      exited.hidden = false;

      // Close the mobile navigation.
      const sidebar = $("trautsSidebar");

      sidebar?.classList.remove(
        "mobile-open",
        "open"
      );

      const backdrop = $("mobileSidebarBackdrop");

      if (backdrop) {
        backdrop.hidden = true;
      }

      $("mobileMenuBtn")?.setAttribute(
        "aria-expanded",
        "false"
      );

      document.body.classList.remove(
        "trauts-menu-open"
      );

      $("trautsReturnToApp").focus();
    }

    /* HANDLE LOGOUT BUTTON */

    document.addEventListener(
      "click",
      event => {

        const pressed = event.target?.closest?.(
          "#logoutBtn"
        );

        if (!pressed || !onPhone()) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        $("trautsLogoutError").textContent = "";

        confirmDialog.hidden = false;
        $("trautsLogoutCancel").focus();

      },
      true
    );

    /* CANCEL LOGOUT */

    $("trautsLogoutCancel").addEventListener(
      "click",
      closeConfirm
    );

    confirmDialog.addEventListener(
      "click",
      event => {
        if (event.target === confirmDialog) {
          closeConfirm();
        }
      }
    );

    document.addEventListener(
      "keydown",
      event => {
        if (
          !confirmDialog.hidden &&
          event.key === "Escape"
        ) {
          event.preventDefault();
          closeConfirm();
        }
      },
      true
    );

    /* CONFIRM SESSION EXIT */

    $("trautsLogoutProceed").addEventListener(
      "click",
      () => {

        try {
          localStorage.setItem(
            FLAG,
            "yes"
          );

          showExited();

        } catch (error) {

          console.error(
            "TRAUTS: Exit state was not saved.",
            error
          );

          $("trautsLogoutError").textContent =
            "Could not save the exit state. " +
            "Please check device storage.";
        }
      }
    );

    /* RETURN TO TRAUTS */

    $("trautsReturnToApp").addEventListener(
      "click",
      () => {

        try {
          localStorage.removeItem(FLAG);

        } catch (error) {

          console.error(
            "TRAUTS: Exit state could not be cleared.",
            error
          );

          return;
        }

        // Reload modules using their already-saved data.
        window.location.reload();

      }
    );

    /* RESTORE EXIT SCREEN AFTER APP RESTART */

    try {

      if (localStorage.getItem(FLAG) === "yes") {
        showExited();
      }

    } catch (error) {

      console.warn(
        "TRAUTS: Unable to read exit state.",
        error
      );

    }
  }

  /* INITIALIZE */

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );

  } else {

    start();

  }

})();
