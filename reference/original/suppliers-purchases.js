/* ============================================
   TRAUTS SHOP MANAGER
   SUPPLIERS & PURCHASES MODULE
   Demo storage: localStorage
   ============================================ */

(() => {
  "use strict";

  const SUPPLIERS_KEY = "trauts_demo_suppliers_v1";
  const PURCHASES_KEY = "trauts_demo_purchases_v1";
  const PRODUCTS_KEY = "trauts_demo_products_v1";
  const MOVEMENTS_KEY = "trauts_demo_movements_v1";

  const $ = id => document.getElementById(id);

  const money = value =>
    "K " + Number(value || 0).toLocaleString("en-ZM", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const uid = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  function read(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function write(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function today() {
    return new Date().toLocaleDateString("en-CA");
  }

  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }

  function cell(row, value) {
    const td = el("td", value);
    row.appendChild(td);
    return td;
  }

  function button(label, callback, variant = "secondary") {
    const btn = el("button", label, `sp-button ${variant}`);
    btn.type = "button";
    btn.addEventListener("click", callback);
    return btn;
  }

  function notify(message, error = false) {
    const target = $("spMessage");
    if (!target) return;
    target.textContent = message;
    target.style.color = error ? "#b91c1c" : "#166534";
  }

  // --------------------------------------------
  // CREATE NAVIGATION + PAGE
  // --------------------------------------------

  const sidebar = document.querySelector(".sidebar-nav");
  const main = document.querySelector("main.main");

  if (!sidebar || !main) {
    console.error("TRAUTS dashboard layout not found.");
    return;
  }

  const nav = sidebar.querySelector(
  '[data-page="Suppliers & Purchases"]'
    ) || document.createElement("button");
  nav.className = "nav";
  nav.type = "button";
  nav.dataset.page = "Suppliers & Purchases";
  nav.innerHTML =
    '<i data-lucide="truck"></i>' +
    '<span>Suppliers & Purchases</span>';

  const inventoryNav = sidebar.querySelector(
    '[data-page="Inventory"]'
  );

  if (!nav.isConnected) {
  if (inventoryNav) {
    inventoryNav.insertAdjacentElement("afterend", nav);
  } else {
    sidebar.appendChild(nav);
  }
}

  const page = document.createElement("section");
  page.id = "suppliersPurchasesPage";
  page.hidden = true;

  page.innerHTML = `
    <div class="sp-header">
      <div>
        <h2>Suppliers & Purchases</h2>
        <p>Track suppliers, stock deliveries and payments</p>
      </div>
    </div>

    <div class="sp-stats">
      <article class="sp-stat">
        <small>Total Suppliers</small>
        <strong id="spSupplierCount">0</strong>
      </article>

      <article class="sp-stat">
        <small>Total Purchases Ordered</small>
        <strong id="spPurchaseValue">K 0.00</strong>
      </article>

      <article class="sp-stat">
        <small>Outstanding Stock Units</small>
        <strong id="spOutstandingUnits">0</strong>
      </article>

      <article class="sp-stat">
        <small>Supplier Balances</small>
        <strong id="spSupplierDebt">K 0.00</strong>
      </article>
    </div>

    <div class="sp-tabs">
      <button type="button" class="sp-tab active"
        data-sp-tab="purchases">Purchases</button>
      <button type="button" class="sp-tab"
        data-sp-tab="suppliers">Suppliers</button>
    </div>

    <div id="spPurchasesTab">

      <section class="sp-panel">
        <div class="sp-toolbar">
          <h3>Purchase History</h3>
          <button id="spNewPurchase"
            class="sp-button" type="button">
            + New Purchase
          </button>
        </div>

        <div class="sp-table-wrap">
          <table class="sp-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Supplier</th>
                <th>Product</th>
                <th>Ordered</th>
                <th>Received</th>
                <th>Remaining</th>
                <th>Total</th>
                <th>Balance</th>
                <th>Status / Actions</th>
              </tr>
            </thead>
            <tbody id="spPurchaseTable"></tbody>
          </table>
        </div>
      </section>

      <section id="spPurchaseFormPanel"
        class="sp-panel" hidden>
        <h3>Record Purchase</h3>

        <form id="spPurchaseForm" class="sp-form">
          <div class="sp-field">
            <label for="spPurchaseSupplier">Supplier *</label>
            <select id="spPurchaseSupplier" required></select>
          </div>

          <div class="sp-field">
            <label for="spPurchaseProduct">Product *</label>
            <select id="spPurchaseProduct" required></select>
          </div>

          <div class="sp-field">
            <label for="spPurchaseDate">Purchase Date *</label>
            <input id="spPurchaseDate" type="date" required>
          </div>

          <div class="sp-field">
            <label for="spPurchaseRef">Invoice / Reference</label>
            <input id="spPurchaseRef" maxlength="80">
          </div>

          <div class="sp-field">
            <label for="spPurchaseQty">Quantity Ordered *</label>
            <input id="spPurchaseQty" type="number"
              min="1" step="1" required>
          </div>

          <div class="sp-field">
            <label for="spReceivedQty">
              Quantity Received Now *
            </label>
            <input id="spReceivedQty" type="number"
              min="0" step="1" value="0" required>
          </div>

          <div class="sp-field">
            <label for="spUnitCost">
              Buying Cost per Unit (K) *
            </label>
            <input id="spUnitCost" type="number"
              min="0" step="0.01" required>
          </div>

          <div class="sp-field">
            <label for="spAmountPaid">
              Amount Paid to Supplier (K) *
            </label>
            <input id="spAmountPaid" type="number"
              min="0" step="0.01" value="0" required>
          </div>

          <div class="sp-field sp-full">
            <label for="spPurchaseNote">Notes</label>
            <textarea id="spPurchaseNote" rows="2"
              maxlength="300"></textarea>
          </div>

          <div class="sp-actions sp-full">
            <button class="sp-button" type="submit">
              Save Purchase
            </button>
            <button id="spCancelPurchase"
              class="sp-button secondary" type="button">
              Cancel
            </button>
          </div>
        </form>
      </section>

      <section id="spReceivePanel" class="sp-panel" hidden>
        <h3>Receive Remaining Stock</h3>

        <form id="spReceiveForm" class="sp-form">
          <div class="sp-field">
            <label for="spReceiveAmount">
              Quantity Received *
            </label>
            <input id="spReceiveAmount" type="number"
              min="1" step="1" required>
          </div>

          <div class="sp-field">
            <label for="spReceiveDate">Delivery Date *</label>
            <input id="spReceiveDate" type="date" required>
          </div>

          <div class="sp-actions sp-full">
            <button class="sp-button" type="submit">
              Confirm Delivery
            </button>
            <button id="spCancelReceive"
              class="sp-button secondary" type="button">
              Cancel
            </button>
          </div>
        </form>
      </section>

      <section id="spPaymentPanel" class="sp-panel" hidden>
        <h3>Record Supplier Payment</h3>

        <form id="spPaymentForm" class="sp-form">
          <div class="sp-field">
            <label for="spPaymentAmount">Payment (K) *</label>
            <input id="spPaymentAmount" type="number"
              min="0.01" step="0.01" required>
          </div>

          <div class="sp-field">
            <label for="spPaymentDate">Payment Date *</label>
            <input id="spPaymentDate" type="date" required>
          </div>

          <div class="sp-actions sp-full">
            <button class="sp-button" type="submit">
              Save Payment
            </button>
            <button id="spCancelPayment"
              class="sp-button secondary" type="button">
              Cancel
            </button>
          </div>
        </form>
      </section>

    </div>

    <div id="spSuppliersTab" hidden>

      <section class="sp-panel">
        <div class="sp-toolbar">
          <h3>Supplier Directory</h3>
          <button id="spNewSupplier"
            class="sp-button" type="button">
            + Add Supplier
          </button>
        </div>

        <div class="sp-table-wrap">
          <table class="sp-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Products Supplied</th>
                <th>Balance Owed</th>
              </tr>
            </thead>
            <tbody id="spSupplierTable"></tbody>
          </table>
        </div>
      </section>

      <section id="spSupplierFormPanel"
        class="sp-panel" hidden>
        <h3>Add Supplier</h3>

        <form id="spSupplierForm" class="sp-form">
          <div class="sp-field">
            <label for="spSupplierName">Supplier Name *</label>
            <input id="spSupplierName" maxlength="120" required>
          </div>

          <div class="sp-field">
            <label for="spSupplierPhone">Phone Number</label>
            <input id="spSupplierPhone" type="tel"
              maxlength="30">
          </div>

          <div class="sp-field">
            <label for="spSupplierAddress">Address</label>
            <input id="spSupplierAddress" maxlength="200">
          </div>

          <div class="sp-field">
            <label for="spSupplierProducts">
              Products Supplied
            </label>
            <input id="spSupplierProducts"
              placeholder="e.g. Sugar, Cooking Oil"
              maxlength="300">
          </div>

          <div class="sp-actions sp-full">
            <button class="sp-button" type="submit">
              Save Supplier
            </button>
            <button id="spCancelSupplier"
              class="sp-button secondary" type="button">
              Cancel
            </button>
          </div>
        </form>
      </section>

    </div>

    <p id="spMessage" class="sp-message"
      role="status"></p>
  `;

  const placeholder = document.getElementById("modulePage");

    if (placeholder && placeholder.parentElement === main) {
    main.insertBefore(page, placeholder);
    } else {
    main.appendChild(page);
    }

  // --------------------------------------------
  // NAVIGATION INTEGRATION
  // --------------------------------------------

  nav.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-nav .nav")
      .forEach(item => item.classList.remove("active"));

    nav.classList.add("active");

    [
      "overview",
      "productsPage",
      "salesPage",
      "inventoryPage",
      "accountsPage",
      "reportsPage",
      "settingsPage",
      "modulePage"
    ].forEach(id => {
      if ($(id)) $(id).hidden = true;
    });

    page.hidden = false;
    $("pageTitle").textContent = "Suppliers & Purchases";
    render();
  });

  // Hide our page when another nav item is selected.
  sidebar.querySelectorAll(".nav").forEach(item => {
    if (item === nav) return;

    item.addEventListener("click", () => {
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

  // --------------------------------------------
  // TABS
  // --------------------------------------------

  document.querySelectorAll("[data-sp-tab]")
    .forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("[data-sp-tab]")
          .forEach(t => t.classList.remove("active"));

        tab.classList.add("active");

        const showSuppliers =
          tab.dataset.spTab === "suppliers";

        $("spSuppliersTab").hidden = !showSuppliers;
        $("spPurchasesTab").hidden = showSuppliers;

        notify("");
        render();
      });
    });

  // --------------------------------------------
  // FORM VISIBILITY
  // --------------------------------------------

  function closeForms() {
    [
      "spSupplierFormPanel",
      "spPurchaseFormPanel",
      "spReceivePanel",
      "spPaymentPanel"
    ].forEach(id => {
      $(id).hidden = true;
    });
  }

  function openPanel(id) {
    closeForms();
    $(id).hidden = false;
    $(id).scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  $("spNewSupplier").addEventListener("click", () => {
    $("spSupplierForm").reset();
    openPanel("spSupplierFormPanel");
  });

  $("spNewPurchase").addEventListener("click", () => {
    const suppliers = read(SUPPLIERS_KEY);
    const products = read(PRODUCTS_KEY);

    if (!suppliers.length) {
      notify("Add a supplier before recording purchases.", true);
      document.querySelector(
        '[data-sp-tab="suppliers"]'
      ).click();
      return;
    }

    if (!products.length) {
      notify("Add products in Products first.", true);
      return;
    }

    $("spPurchaseForm").reset();
    $("spPurchaseDate").value = today();
    $("spReceivedQty").value = 0;
    $("spAmountPaid").value = 0;

    populateSelects();
    updateSuggestedCost();
    openPanel("spPurchaseFormPanel");
  });

  [
    ["spCancelSupplier", "spSupplierFormPanel"],
    ["spCancelPurchase", "spPurchaseFormPanel"],
    ["spCancelReceive", "spReceivePanel"],
    ["spCancelPayment", "spPaymentPanel"]
  ].forEach(([buttonId, panelId]) => {
    $(buttonId).addEventListener("click", () => {
      $(panelId).hidden = true;
    });
  });

  // --------------------------------------------
  // SUPPLIERS
  // --------------------------------------------

  $("spSupplierForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("spSupplierName").value.trim();
    const phone = $("spSupplierPhone").value.trim();
    const address = $("spSupplierAddress").value.trim();
    const supplied = $("spSupplierProducts").value.trim();

    if (!name) {
      notify("Supplier name is required.", true);
      return;
    }

    const suppliers = read(SUPPLIERS_KEY);

    if (suppliers.some(s =>
      s.name.toLowerCase() === name.toLowerCase()
    )) {
      notify("This supplier already exists.", true);
      return;
    }

    suppliers.push({
      id: uid(),
      name,
      phone,
      address,
      productsSupplied: supplied,
      createdAt: new Date().toISOString()
    });

    try {
      write(SUPPLIERS_KEY, suppliers);
    } catch {
      notify("Could not save supplier.", true);
      return;
    }

    closeForms();
    render();
    notify("Supplier saved successfully.");
  });

  // --------------------------------------------
  // SELECT PRODUCTS AND SUPPLIERS
  // --------------------------------------------

  function populateSelects() {
    const supplierSelect = $("spPurchaseSupplier");
    const productSelect = $("spPurchaseProduct");

    supplierSelect.replaceChildren();
    productSelect.replaceChildren();

    supplierSelect.add(new Option("Select supplier", ""));
    productSelect.add(new Option("Select product", ""));

    read(SUPPLIERS_KEY).forEach(s => {
      supplierSelect.add(new Option(s.name, s.id));
    });

    read(PRODUCTS_KEY)
      .filter(p => p.type !== "service")
      .forEach(p => {
        productSelect.add(
          new Option(`${p.name} (${p.sku})`, String(p.id))
        );
      });
  }

  function updateSuggestedCost() {
    const product = read(PRODUCTS_KEY).find(
      p => String(p.id) === $("spPurchaseProduct").value
    );

    $("spUnitCost").value =
      product ? Number(product.cost ?? 0).toFixed(2) : "";
  }

  $("spPurchaseProduct").addEventListener(
    "change",
    updateSuggestedCost
  );

  // --------------------------------------------
  // INVENTORY UPDATE
  // --------------------------------------------

  function addStock(products, productId, qty, cost) {
    const product = products.find(
      p => String(p.id) === String(productId)
    );

    if (!product) {
      throw new Error("Product no longer exists.");
    }

    const previousStock = Number(product.stock || 0);
    const previousCost = Number(product.cost || 0);
    const nextStock = previousStock + qty;

    // Weighted average buying cost.
    if (qty > 0 && nextStock > 0) {
      const averageCost =
        (previousStock * previousCost + qty * cost) /
        nextStock;

      product.cost = Number(averageCost.toFixed(2));
      product.buyingPrice = product.cost;
    }

    product.stock = nextStock;

    return {
      product,
      previousStock,
      nextStock
    };
  }

  function movement(product, qty, balance, reference) {
    return {
      id: uid(),
      productId: product.id,
      productName: product.name,
      type: "in",
      quantity: qty,
      change: qty,
      balance,
      note: `Supplier delivery: ${reference}`,
      date: new Date().toISOString()
    };
  }

  function notifyInventory() {
    window.dispatchEvent(
      new Event("trauts:products-updated")
    );

    window.dispatchEvent(
      new Event("trauts:stock-updated")
    );

    window.refreshTrautsInventory?.();
    window.refreshTrautsDashboard?.();
  }

  // --------------------------------------------
  // SAVE PURCHASE
  // --------------------------------------------

  $("spPurchaseForm").addEventListener("submit", event => {
    event.preventDefault();

    const supplierId = $("spPurchaseSupplier").value;
    const productId = $("spPurchaseProduct").value;

    const qty = Number($("spPurchaseQty").value);
    const received = Number($("spReceivedQty").value);
    const cost = Number($("spUnitCost").value);
    const paid = Number($("spAmountPaid").value);

    const date = $("spPurchaseDate").value;
    const reference =
      $("spPurchaseRef").value.trim() ||
      `PUR-${Date.now()}`;

    const note = $("spPurchaseNote").value.trim();

    const suppliers = read(SUPPLIERS_KEY);
    const products = read(PRODUCTS_KEY);
    const purchases = read(PURCHASES_KEY);
    const movements = read(MOVEMENTS_KEY);

    const supplier = suppliers.find(s => s.id === supplierId);
    const product = products.find(
      p => String(p.id) === productId
    );

    if (!supplier || !product || !date) {
      notify("Select a supplier, product and date.", true);
      return;
    }

    if (
      !Number.isSafeInteger(qty) ||
      !Number.isSafeInteger(received) ||
      qty <= 0 ||
      received < 0 ||
      received > qty ||
      !Number.isFinite(cost) ||
      !Number.isFinite(paid) ||
      cost < 0 ||
      paid < 0
    ) {
      notify("Check quantities, buying cost and payment.", true);
      return;
    }

    const totalNgwee = Math.round(qty * cost * 100);
    const paidNgwee = Math.round(paid * 100);

    if (!Number.isSafeInteger(totalNgwee) ||
        !Number.isSafeInteger(paidNgwee) ||
        paidNgwee > totalNgwee) {
      notify("Payment cannot exceed purchase total.", true);
      return;
    }

    if (received > 0) {
      const result = addStock(
        products,
        productId,
        received,
        cost
      );

      movements.push(
        movement(
          result.product,
          received,
          result.nextStock,
          reference
        )
      );
    }

    purchases.push({
      id: uid(),
      reference,
      supplierId,
      supplierName: supplier.name,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      unit: product.unit || "piece",
      date,
      qtyOrdered: qty,
      qtyReceived: received,
      unitCostNgwee: Math.round(cost * 100),
      totalNgwee,
      paidNgwee,
      deliveries: received > 0
        ? [{ date, qty: received }]
        : [],
      payments: paidNgwee > 0
        ? [{ date, amountNgwee: paidNgwee }]
        : [],
      note,
      createdAt: new Date().toISOString()
    });

    try {
      // Demo-only multi-key persistence.
      // Production needs an atomic database transaction.
      const keys = [
        PRODUCTS_KEY,
        MOVEMENTS_KEY,
        PURCHASES_KEY
      ];

      const values = [products, movements, purchases];

      const backups = keys.map(key =>
        localStorage.getItem(key)
      );

      try {
        keys.forEach((key, i) => write(key, values[i]));
      } catch (error) {
        keys.forEach((key, i) => {
          try {
            if (backups[i] === null) {
              localStorage.removeItem(key);
            } else {
              localStorage.setItem(key, backups[i]);
            }
          } catch {}
        });
        throw error;
      }
    } catch {
      notify("Purchase could not be saved.", true);
      return;
    }

    closeForms();
    render();
    notify("Purchase saved. Received stock added to inventory.");
    notifyInventory();
  });

  // --------------------------------------------
  // RECEIVE REMAINING STOCK
  // --------------------------------------------

  let selectedPurchaseId = null;

  function openReceive(purchaseId) {
    selectedPurchaseId = purchaseId;

    const purchase = read(PURCHASES_KEY).find(
      p => p.id === purchaseId
    );

    if (!purchase) return;

    const remaining =
      purchase.qtyOrdered - purchase.qtyReceived;

    $("spReceiveAmount").value = remaining;
    $("spReceiveAmount").max = remaining;
    $("spReceiveDate").value = today();

    openPanel("spReceivePanel");
  }

  $("spReceiveForm").addEventListener("submit", event => {
    event.preventDefault();

    const qty = Number($("spReceiveAmount").value);
    const date = $("spReceiveDate").value;

    const purchases = read(PURCHASES_KEY);
    const products = read(PRODUCTS_KEY);
    const movements = read(MOVEMENTS_KEY);

    const purchase = purchases.find(
      p => p.id === selectedPurchaseId
    );

    if (!purchase) {
      notify("Purchase not found.", true);
      return;
    }

    const remaining =
      purchase.qtyOrdered - purchase.qtyReceived;

    if (
      !Number.isSafeInteger(qty) ||
      qty <= 0 ||
      qty > remaining ||
      !date
    ) {
      notify(
        `Enter a quantity between 1 and ${remaining}.`,
        true
      );
      return;
    }

    let result;

    try {
      result = addStock(
        products,
        purchase.productId,
        qty,
        purchase.unitCostNgwee / 100
      );
    } catch (error) {
      notify(error.message, true);
      return;
    }

    purchase.qtyReceived += qty;
    purchase.deliveries.push({ date, qty });

    movements.push(
      movement(
        result.product,
        qty,
        result.nextStock,
        purchase.reference
      )
    );

    try {
      const keys = [
        PRODUCTS_KEY,
        MOVEMENTS_KEY,
        PURCHASES_KEY
      ];

      const values = [products, movements, purchases];
      const backups = keys.map(key =>
        localStorage.getItem(key)
      );

      try {
        keys.forEach((key, i) => write(key, values[i]));
      } catch (error) {
        keys.forEach((key, i) => {
          try {
            if (backups[i] === null) {
              localStorage.removeItem(key);
            } else {
              localStorage.setItem(key, backups[i]);
            }
          } catch {}
        });
        throw error;
      }
    } catch {
      notify("Delivery could not be saved.", true);
      return;
    }

    closeForms();
    render();
    notify(`${qty} units received and added to inventory.`);
    notifyInventory();
  });

  // --------------------------------------------
  // SUPPLIER PAYMENTS
  // --------------------------------------------

  function openPayment(purchaseId) {
    selectedPurchaseId = purchaseId;

    const purchase = read(PURCHASES_KEY).find(
      p => p.id === purchaseId
    );

    if (!purchase) return;

    const balance =
      (purchase.totalNgwee - purchase.paidNgwee) / 100;

    $("spPaymentAmount").value = balance.toFixed(2);
    $("spPaymentAmount").max = balance.toFixed(2);
    $("spPaymentDate").value = today();

    openPanel("spPaymentPanel");
  }

  $("spPaymentForm").addEventListener("submit", event => {
    event.preventDefault();

    const amount = Number($("spPaymentAmount").value);
    const date = $("spPaymentDate").value;

    const purchases = read(PURCHASES_KEY);
    const purchase = purchases.find(
      p => p.id === selectedPurchaseId
    );

    if (!purchase) {
      notify("Purchase not found.", true);
      return;
    }

    const amountNgwee = Math.round(amount * 100);
    const balanceNgwee =
      purchase.totalNgwee - purchase.paidNgwee;

    if (
      !Number.isSafeInteger(amountNgwee) ||
      amountNgwee <= 0 ||
      amountNgwee > balanceNgwee ||
      !date
    ) {
      notify("Enter a valid payment within the balance.", true);
      return;
    }

    purchase.paidNgwee += amountNgwee;
    purchase.payments.push({ date, amountNgwee });

    try {
      write(PURCHASES_KEY, purchases);
    } catch {
      notify("Payment could not be saved.", true);
      return;
    }

    closeForms();
    render();
    notify("Supplier payment recorded successfully.");
  });

  // --------------------------------------------
  // RENDER TABLES AND TOTALS
  // --------------------------------------------

  function render() {
    const suppliers = read(SUPPLIERS_KEY);
    const purchases = read(PURCHASES_KEY);

    const orderedValue = purchases.reduce(
      (sum, p) => sum + p.totalNgwee, 0
    );

    const outstanding = purchases.reduce(
      (sum, p) =>
        sum + p.qtyOrdered - p.qtyReceived,
      0
    );

    const debt = purchases.reduce(
      (sum, p) =>
        sum + p.totalNgwee - p.paidNgwee,
      0
    );

    $("spSupplierCount").textContent =
      suppliers.length;

    $("spPurchaseValue").textContent =
      money(orderedValue / 100);

    $("spOutstandingUnits").textContent =
      outstanding;

    $("spSupplierDebt").textContent =
      money(debt / 100);

    renderSuppliers(suppliers, purchases);
    renderPurchases(purchases);
  }

  function renderSuppliers(suppliers, purchases) {
    const tbody = $("spSupplierTable");
    tbody.replaceChildren();

    suppliers.forEach(supplier => {
      const row = el("tr");

      const debt = purchases
        .filter(p => p.supplierId === supplier.id)
        .reduce(
          (sum, p) =>
            sum + p.totalNgwee - p.paidNgwee,
          0
        );

      cell(row, supplier.name);
      cell(row, supplier.phone || "—");
      cell(row, supplier.address || "—");
      cell(row, supplier.productsSupplied || "—");
      cell(row, money(debt / 100));

      tbody.appendChild(row);
    });

    if (!suppliers.length) {
      const row = el("tr");
      const td = cell(
        row,
        "No suppliers yet. Click Add Supplier."
      );
      td.colSpan = 5;
      tbody.appendChild(row);
    }
  }

  function renderPurchases(purchases) {
    const tbody = $("spPurchaseTable");
    tbody.replaceChildren();

    [...purchases].reverse().forEach(purchase => {
      const row = el("tr");

      const remaining =
        purchase.qtyOrdered - purchase.qtyReceived;

      const balance =
        purchase.totalNgwee - purchase.paidNgwee;

      const status =
        purchase.qtyReceived === 0
          ? "Pending"
          : remaining === 0
            ? "Fully Received"
            : "Partially Received";

      cell(row, purchase.reference);
      cell(row, purchase.supplierName);
      cell(row, purchase.productName);
      cell(row, purchase.qtyOrdered);
      cell(row, purchase.qtyReceived);
      cell(row, remaining);
      cell(row, money(purchase.totalNgwee / 100));
      cell(row, money(balance / 100));

      const actionsCell = el("td");
      actionsCell.appendChild(
        el("span", status, "sp-pill")
      );

      const actions = el("div", undefined, "sp-row-actions");
      actions.style.marginTop = "8px";

      if (remaining > 0) {
        actions.appendChild(
          button("Receive", () => openReceive(purchase.id))
        );
      }

      if (balance > 0) {
        actions.appendChild(
          button("Pay", () => openPayment(purchase.id))
        );
      }

      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);
      tbody.appendChild(row);
    });

    if (!purchases.length) {
      const row = el("tr");
      const td = cell(
        row,
        "No purchases recorded yet."
      );
      td.colSpan = 9;
      tbody.appendChild(row);
    }
  }

  window.addEventListener(
    "trauts:products-updated",
    () => {
      if (!page.hidden) render();
    }
  );

  render();
})();
