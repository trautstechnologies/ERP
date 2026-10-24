
/* ============================================
   TRAUTS SHOP MANAGER
   ANDROID SALES / POS + IN-APP RECEIPTS + AUDITED CANCELLATIONS
   Product search: name or SKU, with one-match Enter to add
   Frontend demo using localStorage
   ============================================ */

(() => {
  "use strict";

  const PRODUCT_KEY = "trauts_demo_products_v1";
  const MOVEMENT_KEY = "trauts_demo_movements_v1";
  const SALES_KEY = "trauts_demo_sales_v1";
  const CANCEL_KEY = "trauts_demo_cancelled_sales_v1";
  const SETTINGS_KEY = "trauts_demo_settings_v1";

  const $ = id => document.getElementById(id);

  if (!$("salesPage")) return;

  let cart = [];
  let lastReceipt = null;

  function readArray(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function getProducts() {
    return readArray(PRODUCT_KEY);
  }

  function getSales() {
    return readArray(SALES_KEY);
  }

  // Cancelled receipts are retained outside active sales so every existing
  // dashboard, report, chart and profit total excludes voided revenue.
  function getCancelledSales() {
    return readArray(CANCEL_KEY);
  }

  function isMobile() {
    // Android tablets should also use the safe in-app receipt viewer.
    return /Android/i.test(navigator.userAgent) ||
      window.matchMedia("(max-width: 767px)").matches;
  }

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    } catch {
      return {};
    }
  }

  function uid() {
    if (window.crypto?.randomUUID) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function money(valueNgwee) {
    return "K " + (Number(valueNgwee || 0) / 100)
      .toLocaleString("en-ZM", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
  }

  function ngwee(value) {
    return Math.round(Number(value) * 100);
  }

  function validMoney(value) {
    return Number.isSafeInteger(value) && value >= 0;
  }

  function makeCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = String(value);
    row.appendChild(cell);
    return cell;
  }

  function message(text) {
    const target = $("posMessage");
    if (target) target.textContent = text;
  }

  function isService(product) {
    return String(product.type || "").toLowerCase() === "service";
  }

  function getStock(product) {
    const value = Number(product.stock);
    return Number.isSafeInteger(value) && value >= 0
      ? value
      : 0;
  }

  function getThreshold(product) {
    const settings = getSettings();

    const globalThreshold = Number(settings.lowStockThreshold);
    const fallback =
      Number.isSafeInteger(globalThreshold) &&
      globalThreshold >= 0
        ? globalThreshold
        : 5;

    const ownThreshold = Number(product.threshold);

    return product.threshold !== undefined &&
      product.threshold !== null &&
      product.threshold !== "" &&
      Number.isSafeInteger(ownThreshold) &&
      ownThreshold >= 0
        ? ownThreshold
        : fallback;
  }

  function getSellingPriceNgwee(product) {
    const value = Number(
      product.price ?? product.sellingPrice
    );

    if (!Number.isFinite(value) || value < 0) {
      return null;
    }

    const result = ngwee(value);
    return validMoney(result) ? result : null;
  }

  function getBuyingCostNgwee(product) {
    const raw = product.cost ?? product.buyingPrice;

    if (raw === undefined || raw === null || raw === "") {
      return null;
    }

    const value = Number(raw);

    if (!Number.isFinite(value) || value < 0) {
      return null;
    }

    const result = ngwee(value);
    return validMoney(result) ? result : null;
  }

  function getSubtotal() {
    return cart.reduce(
      (sum, item) => sum + item.priceNgwee * item.qty,
      0
    );
  }

  function getDiscount() {
    const raw = $("posDiscount").value;

    if (raw.trim() === "") return 0;

    return ngwee(raw);
  }

  function getReceived() {
    const raw = $("posAmountPaid").value;

    if (raw.trim() === "") return 0;

    return ngwee(raw);
  }

  // ==========================================
  // LOW STOCK AND RESTOCK ALERTS
  // ==========================================

  function createStockAlerts() {
    if ($("posStockAlerts")) return;

    const section = document.createElement("section");
    section.id = "posStockAlerts";
    section.className = "trauts-stock-alerts";

    section.innerHTML = `
      <div class="trauts-stock-alert-header">
        <div>
          <h3>Stock Alerts & Restocking</h3>
          <p>
            Products that are running low or out of stock
          </p>
        </div>
        <strong id="posAlertCount">0 alerts</strong>
      </div>

      <div id="posStockAlertList"></div>
    `;

    const salesPage = $("salesPage");
    const firstChild = salesPage.firstElementChild;

    if (firstChild) {
      firstChild.insertAdjacentElement("afterend", section);
    } else {
      salesPage.appendChild(section);
    }
  }

  function renderStockAlerts() {
    const list = $("posStockAlertList");
    const counter = $("posAlertCount");

    if (!list || !counter) return;

    const products = getProducts()
      .filter(product => !isService(product));

    const alerts = products
      .filter(product =>
        getStock(product) <= getThreshold(product)
      )
      .sort((a, b) => {
        const aOut = getStock(a) === 0 ? 0 : 1;
        const bOut = getStock(b) === 0 ? 0 : 1;

        return aOut - bOut ||
          getStock(a) - getStock(b);
      });

    counter.textContent =
      `${alerts.length} ${alerts.length === 1 ? "alert" : "alerts"}`;

    list.replaceChildren();

    if (!alerts.length) {
      const good = document.createElement("p");
      good.className = "trauts-stock-good";
      good.textContent =
        "All products are above their restock thresholds.";

      list.appendChild(good);
      return;
    }

    alerts.forEach(product => {
      const stock = getStock(product);
      const threshold = getThreshold(product);
      const outOfStock = stock === 0;

      const row = document.createElement("div");
      row.className = "trauts-stock-alert-row";

      const details = document.createElement("div");

      const name = document.createElement("strong");
      name.textContent = product.name;

      const sku = document.createElement("small");
      sku.textContent =
        `SKU: ${product.sku || "—"} · ` +
        `${stock} available · ` +
        `Restock threshold: ${threshold}`;

      details.append(name, sku);

      const status = document.createElement("span");
      status.className = outOfStock
        ? "trauts-stock-status out"
        : "trauts-stock-status low";

      status.textContent = outOfStock
        ? "Out of stock"
        : "Low stock";

      row.append(details, status);
      list.appendChild(row);
    });
  }

  // ==========================================
  // PRODUCT SEARCH BY NAME OR SKU
  // ==========================================

  function normalizeSearch(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function matchingProducts() {
    const query = normalizeSearch($("posSearch")?.value);
    const products = getProducts();
    if (!query) return products;

    // Match words in product names OR SKU.
    const words = query.split(" ").filter(Boolean);

    return products.filter(product => {
      const name = normalizeSearch(product.name);
      const sku = normalizeSearch(product.sku);
      const nameOrSku = `${name} ${sku}`;

      return words.every(word => nameOrSku.includes(word));
    });
  }

  function installProductNameSearch() {
    const input = $("posSearch");

    if (!input || input.dataset.trautsNameSearch === "ready") {
      return;
    }

    input.dataset.trautsNameSearch = "ready";
    input.placeholder = "Type product name or SKU...";
    input.setAttribute(
      "aria-label",
      "Search products by name or SKU"
    );
    input.setAttribute("autocomplete", "off");

    if (isMobile()) {
      const hint = document.createElement("p");
      hint.id = "trautsProductNameSearchHint";

      hint.style.cssText =
        "font-size:12px;line-height:1.4;margin:7px 0 12px;" +
        "color:var(--trauts-muted,var(--tld-muted,#617188));";

      hint.textContent =
        "Enter a product name or SKU. Tap Add to Cart; " +
        "if only one product matches, press Enter to add it.";

      input.insertAdjacentElement("afterend", hint);
    }

    // Enter adds a product only when exactly one matches.
    input.addEventListener("keydown", event => {
      if (event.key !== "Enter" || event.isComposing) return;

      event.preventDefault();

      const matches = matchingProducts();

      if (matches.length !== 1) {
        message(
          matches.length
            ? "Several products match. Tap Add to Cart on the correct product."
            : "No product found. Search by its name or SKU."
        );
        return;
      }

      addToCart(matches[0].id);

      if (!$("posMessage")?.textContent) {
        input.value = "";
        renderProductList();
      }
    });
  }

  function renderProductList() {
    const products = matchingProducts();
    const list = $("posProductList");

    list.replaceChildren();

    products.forEach(product => {
      const card = document.createElement("div");
      card.className = "pos-product";

      const title = document.createElement("h4");
      title.textContent =
        product.name || product.sku || "Unnamed product";

      const sku = document.createElement("small");
      sku.className = "trauts-pos-product-sku";
      sku.textContent = product.sku
        ? `SKU: ${product.sku}`
        : "";

      sku.style.cssText =
        "display:block;opacity:.8;font-size:12px;";

      const price = document.createElement("p");
      const priceNgwee = getSellingPriceNgwee(product);

      price.textContent = priceNgwee === null
        ? "Price unavailable"
        : money(priceNgwee);

      const stock = document.createElement("p");
      const service = isService(product);
      const available = getStock(product);
      const threshold = getThreshold(product);

      if (service) {
        stock.textContent = "Service";
      } else if (available === 0) {
        stock.textContent = "OUT OF STOCK";
        stock.style.color = "#b91c1c";
        stock.style.fontWeight = "700";
      } else if (available <= threshold) {
        stock.textContent =
          `${available} units · LOW STOCK`;
        stock.style.color = "#b45309";
        stock.style.fontWeight = "700";
      } else {
        stock.textContent =
          `${available} units available`;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "pos-primary";

      const inCart = cart.find(item =>
        String(item.id) === String(product.id)
      );

      const cartQty = inCart ? inCart.qty : 0;
      const unavailable =
        !service && cartQty >= available;

      button.disabled =
        unavailable || priceNgwee === null;

      button.textContent = unavailable
        ? "Out of Stock"
        : "Add to Cart";

      button.setAttribute(
        "aria-label",
        `Add ${product.name || product.sku} to cart`
      );

      button.addEventListener("click", () => {
        addToCart(product.id);
      });

      card.append(title, sku, price, stock, button);
      list.appendChild(card);
    });

    if (!products.length) {
      const empty = document.createElement("p");

      empty.textContent =
        "No matching products. Try another product name or SKU.";

      list.appendChild(empty);
    }

    renderStockAlerts();
  }

  // ==========================================
  // SHOPPING CART
  // ==========================================

  function addToCart(productId) {
    const product = getProducts().find(item =>
      String(item.id) === String(productId)
    );

    if (!product) {
      message("Product not found.");
      return;
    }

    const priceNgwee = getSellingPriceNgwee(product);

    if (priceNgwee === null) {
      message("This product has no valid selling price.");
      return;
    }

    const existing = cart.find(item =>
      String(item.id) === String(productId)
    );

    const quantity = existing ? existing.qty : 0;

    if (
      !isService(product) &&
      quantity >= getStock(product)
    ) {
      message(`Not enough stock for ${product.name}.`);
      return;
    }

    if (existing) {
      existing.qty++;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        sku: product.sku || "",
        priceNgwee,
        qty: 1
      });
    }

    message("");
    renderCart();
    renderProductList();
  }

  function changeQuantity(productId, difference) {
    const item = cart.find(product =>
      String(product.id) === String(productId)
    );

    if (!item) return;

    const product = getProducts().find(p =>
      String(p.id) === String(productId)
    );

    const next = item.qty + difference;

    if (
      difference > 0 &&
      (!product ||
        (!isService(product) &&
          next > getStock(product)))
    ) {
      message("Insufficient stock.");
      return;
    }

    if (next <= 0) {
      cart = cart.filter(p =>
        String(p.id) !== String(productId)
      );
    } else {
      item.qty = next;
    }

    message("");
    renderCart();
    renderProductList();
  }

  function renderCart() {
    const container = $("posCart");
    container.replaceChildren();

    cart.forEach(item => {
      const row = document.createElement("div");
      row.className = "pos-cart-row";

      const details = document.createElement("div");

      const name = document.createElement("strong");
      name.textContent = item.name;

      const amount = document.createElement("small");
      amount.textContent =
        ` ${money(item.priceNgwee * item.qty)}`;

      details.append(
        name,
        document.createElement("br"),
        amount
      );

      const controls = document.createElement("div");
      controls.className = "pos-quantity";

      const minus = document.createElement("button");
      minus.type = "button";
      minus.textContent = "−";

      minus.setAttribute(
        "aria-label",
        `Remove one ${item.name}`
      );

      minus.addEventListener("click", () => {
        changeQuantity(item.id, -1);
      });

      const count = document.createElement("span");
      count.textContent = item.qty;

      const plus = document.createElement("button");
      plus.type = "button";
      plus.textContent = "+";

      plus.setAttribute(
        "aria-label",
        `Add one ${item.name}`
      );

      plus.addEventListener("click", () => {
        changeQuantity(item.id, 1);
      });

      controls.append(minus, count, plus);
      row.append(details, controls);
      container.appendChild(row);
    });

    if (!cart.length) {
      const empty = document.createElement("p");
      empty.textContent = "No items in cart.";
      container.appendChild(empty);
    }

    updateTotals();
  }

  // ==========================================
  // PAYMENT TOTALS
  // ==========================================

  function updateTotals() {
    const subtotal = getSubtotal();
    const discount = getDiscount();
    const total = subtotal - discount;
    const received = getReceived();

    $("posSubtotal").textContent = money(subtotal);

    $("posTotal").textContent =
      money(Math.max(0, total));

    $("posChange").textContent =
      money(
        validMoney(received) && total >= 0
          ? Math.max(0, received - total)
          : 0
      );

    $("completeSaleBtn").disabled =
      !cart.length ||
      !validMoney(discount) ||
      discount > subtotal ||
      !validMoney(received) ||
      received < total;
  }

  // ==========================================
  // SALES HISTORY
  // ==========================================

  function renderSalesHistory() {
    const tbody = $("posSalesHistory");
    tbody.replaceChildren();

    const active = getSales().map(sale => ({
      ...sale,
      _cancelled: false
    }));

    const cancelled = getCancelledSales()
      .filter(record => record && record.sale)
      .map(record => ({
        ...record.sale,
        _cancelled: true,
        _cancellation: record
      }));

    const all = active.concat(cancelled).sort((a, b) =>
      new Date(b.date).getTime() -
      new Date(a.date).getTime()
    );

    all.forEach(sale => {
      const row = document.createElement("tr");

      if (sale._cancelled) {
        row.classList.add("pos-sale-cancelled");
      }

      makeCell(
        row,
        sale._cancelled
          ? `${sale.receiptNo} · CANCELLED`
          : sale.receiptNo
      );

      makeCell(
        row,
        new Date(sale.date).toLocaleString()
      );

      makeCell(
        row,
        (sale.items || []).reduce(
          (sum, item) =>
            sum + Number(item.qty || 0),
          0
        )
      );

      makeCell(row, sale.paymentMethod);
      makeCell(row, money(sale.totalNgwee));

      const action = document.createElement("td");
      const button = document.createElement("button");

      button.type = "button";
      button.className = "pos-secondary";
      button.textContent = "Receipt";

      button.setAttribute(
        "aria-label",
        `View receipt ${sale.receiptNo}`
      );

      button.addEventListener("click", () => {
        viewReceipt(sale);
      });

      action.appendChild(button);
      row.appendChild(action);
      tbody.appendChild(row);
    });

    if (!all.length) {
      const row = document.createElement("tr");
      const cell = makeCell(
        row,
        "No sales recorded yet."
      );

      cell.colSpan = 6;
      tbody.appendChild(row);
    }
  }

  // ==========================================
  // COMPLETE SALE AND DEDUCT INVENTORY
  // ==========================================

  function completeSale() {
    if (!cart.length) {
      message("Add products to the cart.");
      return;
    }

    const subtotal = getSubtotal();
    const discount = getDiscount();
    const total = subtotal - discount;
    const received = getReceived();
    const paymentMethod = $("posPaymentMethod").value;

    if (
      !validMoney(subtotal) ||
      !validMoney(discount) ||
      discount > subtotal ||
      !validMoney(received) ||
      received < total
    ) {
      message("Check the discount and payment amount.");
      return;
    }

    const products = getProducts();
    const movements = readArray(MOVEMENT_KEY);
    const sales = getSales();

    const productMap = new Map(
      products.map(product => [
        String(product.id),
        product
      ])
    );

    // Validate current inventory and prices.
    for (const item of cart) {
      const product = productMap.get(String(item.id));

      if (!product) {
        message(`${item.name} no longer exists.`);
        return;
      }

      if (
        !Number.isSafeInteger(item.qty) ||
        item.qty <= 0
      ) {
        message("Invalid cart quantity.");
        return;
      }

      if (
        !isService(product) &&
        getStock(product) < item.qty
      ) {
        message(
          `Insufficient stock for ${item.name}.`
        );
        return;
      }

      if (
        getSellingPriceNgwee(product) !==
        item.priceNgwee
      ) {
        message(
          `Price changed for ${item.name}. ` +
          "Start a new sale."
        );
        return;
      }
    }

    const date = new Date().toISOString();

    const receiptNo =
      "TR-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase();

    // Save the buying cost at checkout.
    const savedItems = cart.map(item => {
      const product = productMap.get(String(item.id));

      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        priceNgwee: item.priceNgwee,
        costNgwee: getBuyingCostNgwee(product),
        qty: item.qty
      };
    });

    const sale = {
      id: uid(),
      receiptNo,
      date,
      items: savedItems,
      subtotalNgwee: subtotal,
      discountNgwee: discount,
      totalNgwee: total,
      receivedNgwee: received,
      changeNgwee: received - total,
      paymentMethod
    };

    // Deduct stock for physical products only.
    for (const item of cart) {
      const product = productMap.get(String(item.id));

      if (isService(product)) continue;

      const previousStock = getStock(product);
      const nextStock = previousStock - item.qty;

      product.stock = nextStock;

      movements.push({
        id: uid(),
        date,
        productId: product.id,
        productName: product.name,
        type: "out",
        quantity: item.qty,
        change: -item.qty,
        previousStock,
        balance: nextStock,
        note: `Sale ${receiptNo}`
      });
    }

    sales.push(sale);

    // Demo-only multi-key save with rollback attempt.
    const keys = [
      PRODUCT_KEY,
      MOVEMENT_KEY,
      SALES_KEY
    ];

    const values = [
      products,
      movements,
      sales
    ];

    const originals = keys.map(key =>
      localStorage.getItem(key)
    );

    try {
      keys.forEach((key, index) => {
        localStorage.setItem(
          key,
          JSON.stringify(values[index])
        );
      });
    } catch (error) {
      keys.forEach((key, index) => {
        try {
          if (originals[index] === null) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(
              key,
              originals[index]
            );
          }
        } catch {
          // Browser storage may remain inconsistent.
        }
      });

      message(
        "Checkout could not be saved. " +
        "Verify stock and sales history."
      );

      return;
    }

    lastReceipt = sale;
    cart = [];

    $("posDiscount").value = "0";
    $("posAmountPaid").value = "0";

    renderCart();
    renderProductList();
    renderSalesHistory();

    // Refresh other TRAUTS modules.
    window.dispatchEvent(
      new Event("trauts:products-updated")
    );

    window.dispatchEvent(
      new Event("trauts:stock-updated")
    );

    window.dispatchEvent(
      new Event("trauts:sales-updated")
    );

    window.refreshTrautsInventory?.();
    window.refreshTrautsDashboard?.();
    window.refreshTrautsProfitLoss?.();

    const lowCount = getProducts().filter(product =>
      !isService(product) &&
      getStock(product) <= getThreshold(product)
    ).length;

    message(
      `Sale completed. Receipt: ${receiptNo}. ` +
      `Products needing restocking: ${lowCount}.`
    );

    const settings = getSettings();

    const offerReceipt =
      typeof settings.printReceipt === "boolean"
        ? settings.printReceipt
        : true;

    // Android WebView must NOT open a popup window for receipts.
    // A native WebView may show a blank screen or close on Back.
    if (offerReceipt && isMobile()) {
      viewReceipt(sale);
    } else if (
      offerReceipt &&
      !isMobile() &&
      confirm("Sale completed. Print receipt?")
    ) {
      printReceipt(sale);
    }
  }

  // ==========================================
  // IN-APP RECEIPTS AND AUDITED CANCELLATIONS
  // ==========================================

  let receiptOpen = false;
  let receiptHasHistoryEntry = false;
  let receiptReturnFocus = null;
  let receiptOldOverflow = "";
  let displayedReceipt = null;

  function receiptText(id, value) {
    const target = $(id);

    if (target) {
      target.textContent = String(value ?? "");
    }
  }

  function ensureReceiptDialog() {
    if ($("trautsReceiptModal")) {
      return $("trautsReceiptModal");
    }

    const style = document.createElement("style");
    style.id = "trautsReceiptStyles";

    style.textContent = `
      #trautsReceiptModal[hidden] {
        display: none !important;
      }

      #trautsReceiptModal {
        position: fixed;
        inset: 0;
        z-index: 35000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        box-sizing: border-box;
        background: rgba(6, 16, 30, .75);
      }

      .trauts-receipt-dialog {
        width: 100%;
        max-width: 560px;
        max-height: calc(100dvh - 16px);
        background: #ffffff;
        color: #17283e;
        font-family: system-ui, -apple-system, Arial, sans-serif;
        display: flex;
        flex-direction: column;
        border: 1px solid #dfe6ef;
        border-radius: 17px;
        overflow: hidden;
        box-shadow: 0 16px 44px #0005;
      }

      .trauts-receipt-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        padding: 15px 16px;
        border-bottom: 1px solid #dfe6ef;
      }

      .trauts-receipt-top h2 {
        margin: 0;
        font-size: 21px;
      }

      #trautsReceiptClose {
        flex: 0 0 44px;
        height: 44px;
        border-radius: 10px;
        border: 1px solid #dfe6ef;
        background: transparent;
        color: inherit;
        font-size: 27px;
      }

      .trauts-receipt-body {
        padding: 16px;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }

      .trauts-receipt-shop {
        font-weight: 800;
        font-size: 18px;
      }

      .trauts-receipt-subtitle {
        margin: 5px 0 13px;
        color: #60728a;
      }

      .trauts-receipt-status {
        display: inline-block;
        padding: 5px 9px;
        border-radius: 8px;
        background: #e4f2e9;
        color: #166534;
        font-size: 12px;
        font-weight: 700;
        margin: 0 0 12px;
      }

      .trauts-receipt-status.is-cancelled {
        background: #fee2e2;
        color: #991b1b;
      }

      .trauts-receipt-line {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
        margin: 9px 0;
        font-size: 14px;
      }

      .trauts-receipt-line span:last-child,
      .trauts-receipt-line strong:last-child {
        flex: 0 0 auto;
        text-align: right;
      }

      .trauts-receipt-divider {
        border: 0;
        border-top: 1px solid #dfe6ef;
        margin: 14px 0;
      }

      .trauts-receipt-item {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin: 12px 0;
        font-size: 14px;
      }

      .trauts-receipt-item small {
        display: block;
        color: #66788f;
        margin-top: 4px;
      }

      .trauts-receipt-item > strong {
        white-space: nowrap;
      }

      .trauts-receipt-total {
        font-size: 17px;
        font-weight: 800;
      }

      .trauts-receipt-footer {
        display: flex;
        flex-direction: column;
        gap: 9px;
        padding: 14px 16px;
        border-top: 1px solid #dfe6ef;
      }

      .trauts-receipt-footer button {
        width: 100%;
        min-height: 45px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      #trautsReceiptDone {
        background: #2855a0;
        color: white;
        border: 1px solid #2855a0;
      }

      #trautsReceiptCancel {
        background: transparent;
        color: #b42318;
        border: 1px solid #cc7a76;
      }

      #trautsCancelPanel[hidden],
      #trautsReceiptCancel[hidden] {
        display: none !important;
      }

      #trautsCancelPanel {
        padding: 12px;
        border: 1px solid #dd918c;
        background: #fff4f2;
        border-radius: 12px;
      }

      #trautsCancelPanel p {
        margin: 0 0 9px;
        font-size: 13px;
        color: #7f1d1d;
      }

      #trautsCancelReason {
        width: 100%;
        min-height: 65px;
        box-sizing: border-box;
        border: 1px solid #b5c4d6;
        border-radius: 9px;
        padding: 10px;
        font: inherit;
        font-size: 15px;
        color: #17283e;
        background: white;
      }

      .trauts-cancel-actions {
        display: flex;
        gap: 8px;
        margin-top: 9px;
      }

      .trauts-cancel-actions button {
        flex: 1;
        min-width: 0;
        border-radius: 9px;
        min-height: 44px;
        padding: 7px;
      }

      #trautsCancelConfirm {
        color: white;
        background: #b42318;
        border: 1px solid #b42318;
      }

      #trautsCancelKeep {
        color: #17283e;
        background: white;
        border: 1px solid #b5c4d6;
      }

      #trautsCancelError {
        color: #991b1b;
        font-size: 13px;
        margin-top: 9px;
      }

      #trautsCancelError:empty {
        display: none;
      }

      .trauts-receipt-cancel-info {
        margin-top: 12px;
        padding: 11px;
        border-radius: 10px;
        border: 1px solid #dfe6ef;
        font-size: 13px;
        overflow-wrap: anywhere;
      }

      html.trauts-dark .trauts-receipt-dialog {
        background: #101f32;
        color: #e8eff9;
        border-color: #364a63;
      }

      html.trauts-dark .trauts-receipt-top,
      html.trauts-dark .trauts-receipt-footer,
      html.trauts-dark #trautsReceiptClose,
      html.trauts-dark .trauts-receipt-divider,
      html.trauts-dark .trauts-receipt-cancel-info {
        border-color: #364a63;
      }

      html.trauts-dark .trauts-receipt-subtitle,
      html.trauts-dark .trauts-receipt-item small {
        color: #b6c7dc;
      }

      html.trauts-dark #trautsCancelPanel {
        background: #361d24;
        border-color: #b45353;
      }

      html.trauts-dark #trautsCancelPanel p,
      html.trauts-dark #trautsCancelError {
        color: #fecaca;
      }

      html.trauts-dark #trautsCancelReason {
        background: #0d1c2e;
        color: #e8eff9;
        border-color: #52647b;
      }
    `;

    document.head.appendChild(style);

    const modal = document.createElement("div");

    modal.id = "trautsReceiptModal";
    modal.hidden = true;

    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute(
      "aria-labelledby",
      "trautsReceiptTitle"
    );

    modal.innerHTML = `
      <section class="trauts-receipt-dialog">

        <header class="trauts-receipt-top">
          <h2 id="trautsReceiptTitle">
            Transaction Receipt
          </h2>

          <button
            id="trautsReceiptClose"
            type="button"
            aria-label="Close receipt">
            ×
          </button>
        </header>

        <div class="trauts-receipt-body">

          <div
            id="trautsReceiptShop"
            class="trauts-receipt-shop">
          </div>

          <p class="trauts-receipt-subtitle">
            TRAUTS · Transaction details
          </p>

          <span
            id="trautsReceiptStatus"
            class="trauts-receipt-status">
          </span>

          <div id="trautsReceiptMeta"></div>

          <hr class="trauts-receipt-divider">

          <div id="trautsReceiptItems"></div>

          <hr class="trauts-receipt-divider">

          <div id="trautsReceiptTotals"></div>

          <div
            id="trautsReceiptCancelInfo"
            class="trauts-receipt-cancel-info"
            hidden>
          </div>

        </div>

        <footer class="trauts-receipt-footer">

          <div id="trautsCancelPanel" hidden>

            <p>
              <strong>Cancel this transaction?</strong>
              This removes it from active sales totals and
              restores recorded stock deductions. The
              original receipt remains in the cancellation
              log. Only return goods to stock if they have
              actually been returned. Refunds to customers
              must be handled separately.
            </p>

            <label for="trautsCancelReason">
              Reason for cancellation
            </label>

            <textarea
              id="trautsCancelReason"
              maxlength="300"
              placeholder="e.g. Wrong items entered">
            </textarea>

            <div
              id="trautsCancelError"
              role="alert">
            </div>

            <div class="trauts-cancel-actions">

              <button
                id="trautsCancelKeep"
                type="button">
                Keep sale
              </button>

              <button
                id="trautsCancelConfirm"
                type="button">
                Confirm cancellation
              </button>

            </div>

          </div>

          <button
            id="trautsReceiptCancel"
            type="button">
            Cancel transaction
          </button>

          <button
            id="trautsReceiptDone"
            type="button">
            Close receipt
          </button>

        </footer>

      </section>
    `;

    document.body.appendChild(modal);

    $("trautsReceiptClose").addEventListener(
      "click",
      () => closeReceipt()
    );

    $("trautsReceiptDone").addEventListener(
      "click",
      () => closeReceipt()
    );

    modal.addEventListener("click", event => {
      if (event.target === modal) {
        closeReceipt();
      }
    });

    $("trautsReceiptCancel").addEventListener(
      "click",
      () => {
        $("trautsCancelPanel").hidden = false;
        $("trautsCancelError").textContent = "";
        $("trautsCancelReason").value = "";
        $("trautsCancelReason").focus();
      }
    );

    $("trautsCancelKeep").addEventListener(
      "click",
      () => {
        $("trautsCancelPanel").hidden = true;
      }
    );

    $("trautsCancelConfirm").addEventListener(
      "click",
      cancelDisplayedSale
    );

    return modal;
  }

  function addReceiptLine(
    container,
    left,
    right,
    emphasis = false
  ) {
    const line = document.createElement("div");
    line.className = "trauts-receipt-line";

    if (emphasis) {
      line.classList.add("trauts-receipt-total");
    }

    const label = document.createElement("span");

    const value = document.createElement(
      emphasis ? "strong" : "span"
    );

    label.textContent = String(left);
    value.textContent = String(right);

    line.append(label, value);
    container.appendChild(line);
  }

  function renderReceipt(sale) {
    displayedReceipt = sale;
    const cancelled = Boolean(sale._cancelled);

    receiptText(
      "trautsReceiptShop",
      getSettings().shopName || "TRAUTS SHOP"
    );

    const badge = $("trautsReceiptStatus");

    badge.textContent =
      cancelled ? "CANCELLED" : "COMPLETED";

    badge.classList.toggle(
      "is-cancelled",
      cancelled
    );

    const meta = $("trautsReceiptMeta");
    meta.replaceChildren();

    addReceiptLine(
      meta,
      "Receipt",
      sale.receiptNo || "—"
    );

    addReceiptLine(
      meta,
      "Date",
      new Date(sale.date).toLocaleString()
    );

    addReceiptLine(
      meta,
      "Payment",
      sale.paymentMethod || "—"
    );

    const items = $("trautsReceiptItems");
    items.replaceChildren();

    (sale.items || []).forEach(item => {
      const line = document.createElement("div");
      line.className = "trauts-receipt-item";

      const name = document.createElement("span");
      const sub = document.createElement("small");

      name.textContent = String(
        item.name || "Product"
      );

      sub.textContent =
        `${item.qty} × ${money(item.priceNgwee)}`;

      name.appendChild(sub);

      const cost = document.createElement("strong");

      cost.textContent = money(
        Number(item.priceNgwee || 0) *
        Number(item.qty || 0)
      );

      line.append(name, cost);
      items.appendChild(line);
    });

    const totals = $("trautsReceiptTotals");
    totals.replaceChildren();

    addReceiptLine(
      totals,
      "Subtotal",
      money(sale.subtotalNgwee)
    );

    addReceiptLine(
      totals,
      "Discount",
      money(sale.discountNgwee)
    );

    addReceiptLine(
      totals,
      "Total",
      money(sale.totalNgwee),
      true
    );

    addReceiptLine(
      totals,
      "Received",
      money(sale.receivedNgwee)
    );

    addReceiptLine(
      totals,
      "Change",
      money(sale.changeNgwee)
    );

    const cancelInfo = $("trautsReceiptCancelInfo");

    cancelInfo.hidden = !cancelled;

    cancelInfo.textContent =
      cancelled && sale._cancellation
        ? `Cancelled: ${
            new Date(
              sale._cancellation.cancelledAt
            ).toLocaleString()
          }. Reason: ${
            sale._cancellation.reason
          }. Reversed stock: ${
            (sale._cancellation.reversedStock || []).length
          } item(s).`
        : "";

    $("trautsReceiptCancel").hidden = cancelled;
    $("trautsCancelPanel").hidden = true;
  }

  function viewReceipt(sale) {
    if (!isMobile()) {
      printReceipt(sale);
      return;
    }

    const modal = ensureReceiptDialog();

    if (!receiptOpen) {
      receiptReturnFocus = document.activeElement;
      receiptOldOverflow = document.body.style.overflow;

      document.body.style.overflow = "hidden";
      receiptOpen = true;

      // An Android WebView using goBack() can use
      // this history entry to dismiss the receipt.
      try {
        history.pushState(
          { trautsReceiptOpen: true },
          "",
          location.href
        );

        receiptHasHistoryEntry = true;
      } catch (_) {
        receiptHasHistoryEntry = false;
      }
    }

    renderReceipt(sale);
    modal.hidden = false;
    $("trautsReceiptClose").focus();
  }

  function closeReceipt(fromBack = false) {
    if (!receiptOpen) return;

    receiptOpen = false;
    $("trautsReceiptModal").hidden = true;
    document.body.style.overflow = receiptOldOverflow;
    displayedReceipt = null;

    if (!fromBack && receiptHasHistoryEntry) {
      receiptHasHistoryEntry = false;

      if (history.state?.trautsReceiptOpen) {
        history.back();
      }
    } else {
      receiptHasHistoryEntry = false;
    }

    if (receiptReturnFocus?.isConnected) {
      receiptReturnFocus.focus();
    }

    receiptReturnFocus = null;
  }

  window.addEventListener("popstate", () => {
    if (receiptOpen) {
      closeReceipt(true);
    }
  });

  document.addEventListener(
    "keydown",
    event => {
      if (receiptOpen && event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeReceipt();
      }
    },
    true
  );

  // ==========================================
  // AUDITED TRANSACTION CANCELLATION
  // ==========================================

  function commitCancellation(reason) {
    const selected = displayedReceipt;

    if (!selected || selected._cancelled) {
      return "This transaction is already cancelled.";
    }

    const sales = getSales();

    const activeIndex = sales.findIndex(sale =>
      String(sale.id) === String(selected.id) &&
      String(sale.receiptNo) ===
      String(selected.receiptNo)
    );

    if (activeIndex < 0) {
      return (
        "This sale is no longer active. " +
        "Refresh sales history."
      );
    }

    const sale = sales[activeIndex];
    const cancelledSales = getCancelledSales();

    if (cancelledSales.some(record =>
      String(record.originalSaleId) ===
      String(sale.id)
    )) {
      return "This sale already has a cancellation record.";
    }

    const products = getProducts();
    const movements = readArray(MOVEMENT_KEY);

    const productMap = new Map(
      products.map(product => [
        String(product.id),
        product
      ])
    );

    const receiptNote = `Sale ${sale.receiptNo}`;
    const reversedStock = [];
    const timestamp = new Date().toISOString();

    // Reverse actual stock-out movements from this sale.
    // Services have no stock movement to reverse.
    const originals = movements.filter(movement =>
      movement.note === receiptNote &&
      movement.type === "out"
    );

    // Validate original quantities before changing stock.
    const soldQuantities = new Map();

    for (const item of sale.items || []) {
      const qty = Number(item.qty);

      if (
        !Number.isSafeInteger(qty) ||
        qty <= 0
      ) {
        return (
          "Cannot cancel: the original receipt " +
          "quantity is invalid."
        );
      }

      soldQuantities.set(
        String(item.id),
        qty
      );
    }

    const originallyDeducted = new Map();

    for (const original of originals) {
      const id = String(original.productId);
      const qty = Number(original.quantity);

      if (
        !soldQuantities.has(id) ||
        !Number.isSafeInteger(qty) ||
        qty <= 0
      ) {
        return (
          "Cannot cancel: recorded stock " +
          "movements do not match this sale."
        );
      }

      originallyDeducted.set(
        id,
        (originallyDeducted.get(id) || 0) + qty
      );
    }

    for (const [id, qty] of originallyDeducted) {
      if (qty !== soldQuantities.get(id)) {
        return (
          "Cannot cancel: original stock quantities " +
          "do not match the receipt."
        );
      }
    }

    for (const item of sale.items || []) {
      const id = String(item.id);
      const product = productMap.get(id);

      if (
        !originallyDeducted.has(id) &&
        product &&
        !isService(product)
      ) {
        return (
          `Cannot cancel: the original stock deduction ` +
          `for ${item.name} cannot be verified. ` +
          "Review its movement history first."
        );
      }
    }

    for (const original of originals) {
      const product = productMap.get(
        String(original.productId)
      );

      if (!product) {
        return (
          `Cannot cancel: ${
            original.productName || "a product"
          } was deleted. Restore the product first ` +
          "to prevent stock loss."
        );
      }

      const qty = Number(original.quantity);
      const stock = Number(product.stock);

      if (
        !Number.isSafeInteger(stock) ||
        stock < 0 ||
        !Number.isSafeInteger(stock + qty)
      ) {
        return (
          "Cannot cancel because a stock " +
          "reversal is invalid."
        );
      }

      product.stock = stock + qty;

      const reversal = {
        id: uid(),
        date: timestamp,
        productId: product.id,
        productName: product.name,
        type: "in",
        quantity: qty,
        change: qty,
        previousStock: stock,
        balance: product.stock,
        note:
          `Cancellation ${sale.receiptNo}: ${reason}`,
        reversalOf: original.id || null,
        receiptNo: sale.receiptNo,
        reason,
        source: "sale_cancellation"
      };

      movements.push(reversal);

      reversedStock.push({
        productId: product.id,
        productName: product.name,
        quantity: qty,
        movementId: reversal.id
      });
    }

    const audit = {
      id: uid(),
      originalSaleId: sale.id,
      receiptNo: sale.receiptNo,
      cancelledAt: timestamp,
      reason,
      sale,
      reversedStock,
      status: "cancelled"
    };

    sales.splice(activeIndex, 1);
    cancelledSales.push(audit);

    const keys = [
      PRODUCT_KEY,
      MOVEMENT_KEY,
      SALES_KEY,
      CANCEL_KEY
    ];

    const updated = [
      products,
      movements,
      sales,
      cancelledSales
    ];

    const previous = keys.map(key =>
      localStorage.getItem(key)
    );

    try {
      keys.forEach((key, index) => {
        localStorage.setItem(
          key,
          JSON.stringify(updated[index])
        );
      });
    } catch (error) {
      // Best-effort rollback for demo localStorage.
      keys.forEach((key, index) => {
        try {
          if (previous[index] === null) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(
              key,
              previous[index]
            );
          }
        } catch (_) {
          // Storage may remain inconsistent.
        }
      });

      return (
        "Cancellation could not be saved. " +
        "Check stock and sales history."
      );
    }

    // Refresh other TRAUTS modules.
    renderProductList();
    renderCart();
    renderSalesHistory();

    window.dispatchEvent(
      new Event("trauts:products-updated")
    );

    window.dispatchEvent(
      new Event("trauts:stock-updated")
    );

    window.dispatchEvent(
      new Event("trauts:sales-updated")
    );

    window.dispatchEvent(
      new Event("trauts:sale-cancelled")
    );

    window.refreshTrautsInventory?.();
    window.refreshTrautsDashboard?.();
    window.refreshTrautsProfitLoss?.();
    window.refreshTrautsReports?.();

    message(
      `Sale ${sale.receiptNo} cancelled. ` +
      "Stock reversals recorded."
    );

    renderReceipt({
      ...sale,
      _cancelled: true,
      _cancellation: audit
    });

    return null;
  }

  function cancelDisplayedSale() {
    const reason = $("trautsCancelReason").value.trim();
    const error = $("trautsCancelError");

    if (reason.length < 3) {
      error.textContent =
        "Enter a reason (at least 3 characters).";
      return;
    }

    const problem = commitCancellation(reason);

    if (problem) {
      error.textContent = problem;
    }
  }

  // ==========================================
  // DESKTOP RECEIPT PRINTING
  // ==========================================

  function printReceipt(sale) {
    const popup = window.open(
      "",
      "_blank",
      "width=420,height=650"
    );

    if (!popup) {
      message("Allow pop-ups to print the receipt.");
      return;
    }

    const doc = popup.document;
    doc.title = sale.receiptNo;

    const style = doc.createElement("style");

    style.textContent = `
      body {
        font-family: Arial, sans-serif;
        max-width: 320px;
        margin: 25px auto;
        color: #111;
      }

      h2, .center {
        text-align: center;
      }

      .line {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin: 8px 0;
      }

      hr {
        border: 0;
        border-top: 1px dashed #999;
      }
    `;

    doc.head.appendChild(style);

    function line(left, right) {
      const row = doc.createElement("div");
      row.className = "line";

      const a = doc.createElement("span");
      const b = doc.createElement("span");

      a.textContent = left;
      b.textContent = right;

      row.append(a, b);
      doc.body.appendChild(row);
    }

    const settings = getSettings();

    const title = doc.createElement("h2");

    title.textContent =
      settings.shopName || "TRAUTS SHOP";

    doc.body.appendChild(title);

    const subtitle = doc.createElement("p");
    subtitle.className = "center";
    subtitle.textContent = "Sales Receipt";

    doc.body.appendChild(subtitle);

    line("Receipt", sale.receiptNo);

    line(
      "Date",
      new Date(sale.date).toLocaleString()
    );

    doc.body.appendChild(
      doc.createElement("hr")
    );

    (sale.items || []).forEach(item => {
      line(
        `${item.name} × ${item.qty}`,
        money(item.priceNgwee * item.qty)
      );
    });

    doc.body.appendChild(
      doc.createElement("hr")
    );

    line("Subtotal", money(sale.subtotalNgwee));
    line("Discount", money(sale.discountNgwee));
    line("TOTAL", money(sale.totalNgwee));
    line("Payment", sale.paymentMethod);
    line("Received", money(sale.receivedNgwee));
    line("Change", money(sale.changeNgwee));

    const thanks = doc.createElement("p");
    thanks.className = "center";

    thanks.textContent =
      settings.receiptFooter ??
      "Thank you for shopping with us!";

    doc.body.appendChild(thanks);

    popup.focus();
    popup.print();
  }

  // ==========================================
  // EVENTS
  // ==========================================

  $("posSearch").addEventListener(
    "input",
    renderProductList
  );

  $("posDiscount").addEventListener(
    "input",
    updateTotals
  );

  $("posAmountPaid").addEventListener(
    "input",
    updateTotals
  );

  $("completeSaleBtn").addEventListener(
    "click",
    completeSale
  );

  $("newSaleBtn").addEventListener("click", () => {
    cart = [];
    lastReceipt = null;
    $("posSearch").value = "";

    $("posDiscount").value = "0";
    $("posAmountPaid").value = "0";

    message("");
    renderCart();
    renderProductList();
  });

  window.refreshTrautsSales = () => {
    renderProductList();
    renderCart();
    renderSalesHistory();
  };

  window.addEventListener(
    "trauts:products-updated",
    () => {
      renderProductList();
      renderCart();
    }
  );

  window.addEventListener(
    "trauts:stock-updated",
    () => {
      renderProductList();
      renderCart();
    }
  );

  window.addEventListener("storage", event => {
    if (
      [
        PRODUCT_KEY,
        SALES_KEY,
        SETTINGS_KEY
      ].includes(event.key)
    ) {
      window.refreshTrautsSales();
    }
  });

  createStockAlerts();
  installProductNameSearch();
  window.refreshTrautsSales();

})();
