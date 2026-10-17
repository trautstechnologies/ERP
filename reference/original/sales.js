/* ============================================
   TRAUTS SHOP MANAGER
   SALES / POS + STOCK + RESTOCK ALERTS
   Frontend demo using localStorage
   ============================================ */

(() => {
  "use strict";

  const PRODUCT_KEY = "trauts_demo_products_v1";
  const MOVEMENT_KEY = "trauts_demo_movements_v1";
  const SALES_KEY = "trauts_demo_sales_v1";
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
  // PRODUCT CATALOG
  // ==========================================

  function renderProductList() {
    const search = $("posSearch");

    const query = search
      ? search.value.trim().toLowerCase()
      : "";

    const products = getProducts().filter(product =>
      `${product.name} ${product.sku || ""}`
        .toLowerCase()
        .includes(query)
    );

    const list = $("posProductList");
    list.replaceChildren();

    products.forEach(product => {
      const card = document.createElement("div");
      card.className = "pos-product";

      const title = document.createElement("h4");
      title.textContent = product.name;

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

      button.addEventListener("click", () => {
        addToCart(product.id);
      });

      card.append(title, price, stock, button);
      list.appendChild(card);
    });

    if (!products.length) {
      const empty = document.createElement("p");
      empty.textContent = "No products found.";
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

    const sales = getSales().slice().reverse();

    sales.forEach(sale => {
      const row = document.createElement("tr");

      makeCell(row, sale.receiptNo);
      makeCell(
        row,
        new Date(sale.date).toLocaleString()
      );

      makeCell(
        row,
        (sale.items || []).reduce(
          (sum, item) => sum + Number(item.qty || 0),
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

      button.addEventListener("click", () => {
        printReceipt(sale);
      });

      action.appendChild(button);
      row.appendChild(action);
      tbody.appendChild(row);
    });

    if (!sales.length) {
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

    if (
      offerReceipt &&
      confirm("Sale completed. Print receipt?")
    ) {
      printReceipt(sale);
    }
  }

  // ==========================================
  // PRINT RECEIPT
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
  window.refreshTrautsSales();
})();
