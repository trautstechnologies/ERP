
/* ============================================
   TRAUTS SHOP MANAGER
   SUPPLIERS & PURCHASES MODULE
   Android Edit/Delete + Audit History
   Demo storage: localStorage
   ============================================ */

(() => {
  "use strict";

  const SUPPLIERS_KEY = "trauts_demo_suppliers_v1";
  const PURCHASES_KEY = "trauts_demo_purchases_v1";
  const PRODUCTS_KEY = "trauts_demo_products_v1";
  const MOVEMENTS_KEY = "trauts_demo_movements_v1";
  const AUDIT_KEY = "trauts_demo_supplier_purchase_audit_v1";

  const isMobile = () =>
    window.matchMedia("(max-width: 767px)").matches;

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
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
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
    const dark = document.documentElement
      .classList.contains("trauts-dark");

    target.style.color = error
      ? (dark ? "#fecaca" : "#b91c1c")
      : (dark ? "#a7f3d0" : "#166534");
  }

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

      <section id="spPurchaseFormPanel" class="sp-panel" hidden>
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

      <section id="spEditPurchasePanel" class="sp-panel" hidden>
        <h3>Edit Purchase</h3>
        <p id="spEditPurchaseNotice"
          class="sp-note" role="status"></p>

        <form id="spEditPurchaseForm" class="sp-form">

          <div class="sp-field">
            <label for="spEditPurchaseSupplier">Supplier *</label>
            <select id="spEditPurchaseSupplier" required></select>
          </div>

          <div class="sp-field">
            <label for="spEditPurchaseProduct">Product *</label>
            <select id="spEditPurchaseProduct" required></select>
          </div>

          <div class="sp-field">
            <label for="spEditPurchaseDate">Purchase Date *</label>
            <input id="spEditPurchaseDate" type="date" required>
          </div>

          <div class="sp-field">
            <label for="spEditPurchaseRef">
              Invoice / Reference *
            </label>
            <input id="spEditPurchaseRef"
              maxlength="80" required>
          </div>

          <div class="sp-field">
            <label for="spEditPurchaseQty">Quantity Ordered *</label>
            <input id="spEditPurchaseQty"
              type="number" min="1" step="1" required>
          </div>

          <div class="sp-field">
            <label for="spEditPurchaseCost">
              Buying Cost per Unit (K) *
            </label>
            <input id="spEditPurchaseCost"
              type="number" min="0" step="0.01" required>
          </div>

          <div class="sp-field sp-full">
            <label for="spEditPurchaseNote">Notes</label>
            <textarea id="spEditPurchaseNote"
              maxlength="300" rows="3"></textarea>
          </div>

          <div class="sp-actions sp-full">
            <button class="sp-button" type="submit">
              Save Changes
            </button>
            <button id="spCancelEditPurchase"
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
            <label for="spReceiveAmount">Quantity Received *</label>
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
                <th class="sp-mobile-head">Actions</th>
              </tr>
            </thead>
            <tbody id="spSupplierTable"></tbody>
          </table>
        </div>
      </section>

      <section id="spSupplierFormPanel" class="sp-panel" hidden>
        <h3 id="spSupplierFormTitle">Add Supplier</h3>

        <form id="spSupplierForm" class="sp-form">
          <div class="sp-field">
            <label for="spSupplierName">Supplier Name *</label>
            <input id="spSupplierName" maxlength="120" required>
          </div>

          <div class="sp-field">
            <label for="spSupplierPhone">Phone Number</label>
            <input id="spSupplierPhone" type="tel" maxlength="30">
          </div>

          <div class="sp-field">
            <label for="spSupplierAddress">Address</label>
            <input id="spSupplierAddress" maxlength="200">
          </div>

          <div class="sp-field">
            <label for="spSupplierProducts">Products Supplied</label>
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

    <p id="spMessage" class="sp-message" role="status"></p>

    <details id="spAuditHistory"
      class="sp-panel sp-audit-history">
      <summary>Supplier & Purchase Change History (0)</summary>
    </details>
  `;

  main.insertBefore(page, $("modulePage") || null);

  /* ==========================================
     NAVIGATION
     ========================================== */

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

    if ($("pageTitle")) {
      $("pageTitle").textContent = "Suppliers & Purchases";
    }

    if ($("trautsPageTitle")) {
      $("trautsPageTitle").textContent = "Suppliers & Purchases";
    }

    render();
  });

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

  /* ==========================================
     SHARED HELPERS
     ========================================== */

  function auditEvent(type, before, after, reason) {
    return {
      id: uid(),
      type,
      reason,
      before: before ? JSON.parse(JSON.stringify(before)) : null,
      after: after ? JSON.parse(JSON.stringify(after)) : null,
      date: new Date().toISOString()
    };
  }

  function commitBatch(pairs) {
    const originals = pairs.map(([key]) =>
      localStorage.getItem(key)
    );

    try {
      pairs.forEach(([key, data]) => {
        write(key, data);
      });
    } catch (error) {
      pairs.forEach(([key], index) => {
        try {
          if (originals[index] === null) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, originals[index]);
          }
        } catch (rollbackError) {
          console.error(
            "TRAUTS storage rollback failed",
            rollbackError
          );
        }
      });
      throw error;
    }
  }

  function refreshAccounting() {
    window.dispatchEvent(
      new Event("trauts:purchases-updated")
    );
    window.dispatchEvent(
      new Event("trauts:suppliers-updated")
    );

    window.refreshTrautsDashboard?.();
    window.refreshTrautsProfitLoss?.();
    window.refreshTrautsReports?.();
    window.refreshTrautsInventory?.();
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

  function closeForms() {
    [
      "spEditPurchasePanel",
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

  let editingSupplierId = null;
  let editingSupplierSnapshot = null;
  let editingPurchaseId = null;
  let editingPurchaseSnapshot = null;

  /* ==========================================
     SUPPLIER ADD / EDIT
     ========================================== */

  $("spNewSupplier").addEventListener("click", () => {
    editingSupplierId = null;
    editingSupplierSnapshot = null;
    $("spSupplierFormTitle").textContent = "Add Supplier";
    $("spSupplierForm").reset();
    openPanel("spSupplierFormPanel");
  });

  function openEditSupplier(id) {
    const record = read(SUPPLIERS_KEY).find(
      item => String(item.id) === String(id)
    );

    if (!record) {
      notify("Supplier not found.", true);
      render();
      return;
    }

    editingSupplierId = record.id;
    editingSupplierSnapshot = JSON.stringify(record);

    $("spSupplierFormTitle").textContent = "Edit Supplier";
    $("spSupplierForm").reset();

    $("spSupplierName").value = record.name;
    $("spSupplierPhone").value = record.phone || "";
    $("spSupplierAddress").value = record.address || "";
    $("spSupplierProducts").value =
      record.productsSupplied || "";

    openPanel("spSupplierFormPanel");
  }

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
      String(s.id) !== String(editingSupplierId) &&
      s.name.toLowerCase() === name.toLowerCase()
    )) {
      notify("This supplier already exists.", true);
      return;
    }

    if (editingSupplierId !== null) {
      const index = suppliers.findIndex(s =>
        String(s.id) === String(editingSupplierId)
      );

      if (
        index === -1 ||
        JSON.stringify(suppliers[index]) !== editingSupplierSnapshot
      ) {
        notify(
          "Supplier changed or disappeared. Close and try again.",
          true
        );
        return;
      }

      const previous = { ...suppliers[index] };

      suppliers[index] = {
        ...suppliers[index],
        name,
        phone,
        address,
        productsSupplied: supplied,
        updatedAt: new Date().toISOString()
      };

      const purchases = read(PURCHASES_KEY);

      purchases.forEach(p => {
        if (String(p.supplierId) === String(editingSupplierId)) {
          p.supplierName = name;
        }
      });

      const audit = read(AUDIT_KEY);

      audit.push(
        auditEvent(
          "supplier-edited",
          previous,
          suppliers[index],
          "Supplier details updated"
        )
      );

      try {
        commitBatch([
          [SUPPLIERS_KEY, suppliers],
          [PURCHASES_KEY, purchases],
          [AUDIT_KEY, audit]
        ]);
      } catch (_) {
        notify("Could not update supplier.", true);
        return;
      }

      editingSupplierId = null;
      editingSupplierSnapshot = null;
      closeForms();
      render();
      refreshAccounting();
      notify("Supplier updated. Related purchase names refreshed.");
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
    } catch (_) {
      notify("Could not save supplier.", true);
      return;
    }

    closeForms();
    render();
    notify("Supplier saved successfully.");
  });

  /* ==========================================
     PURCHASE ADD / RECORD STOCK
     ========================================== */

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

    $("spUnitCost").value = product
      ? Number(product.cost ?? 0).toFixed(2)
      : "";
  }

  $("spPurchaseProduct").addEventListener(
    "change",
    updateSuggestedCost
  );

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
    ["spCancelEditPurchase", "spEditPurchasePanel"],
    ["spCancelPurchase", "spPurchaseFormPanel"],
    ["spCancelReceive", "spReceivePanel"],
    ["spCancelPayment", "spPaymentPanel"]
  ].forEach(([buttonId, panelId]) => {
    $(buttonId).addEventListener("click", () => {
      $(panelId).hidden = true;

      if (buttonId === "spCancelSupplier") {
        editingSupplierId = null;
        editingSupplierSnapshot = null;
      }

      if (buttonId === "spCancelEditPurchase") {
        editingPurchaseId = null;
        editingPurchaseSnapshot = null;
      }
    });
  });

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

    const supplier = suppliers.find(
      s => String(s.id) === String(supplierId)
    );

    const product = products.find(
      p => String(p.id) === String(productId)
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

    if (
      !Number.isSafeInteger(totalNgwee) ||
      !Number.isSafeInteger(paidNgwee) ||
      paidNgwee > totalNgwee
    ) {
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
        ? [{date, qty: received}]
        : [],
      payments: paidNgwee > 0
        ? [{date, amountNgwee: paidNgwee}]
        : [],
      note,
      createdAt: new Date().toISOString()
    });

    try {
      commitBatch([
        [PRODUCTS_KEY, products],
        [MOVEMENTS_KEY, movements],
        [PURCHASES_KEY, purchases]
      ]);
    } catch (_) {
      notify("Purchase could not be saved.", true);
      return;
    }

    closeForms();
    render();
    notify("Purchase saved. Received stock added to inventory.");
    notifyInventory();
    refreshAccounting();
  });

  /* ==========================================
     RECEIVE REMAINING STOCK
     ========================================== */

  let selectedPurchaseId = null;

  function openReceive(purchaseId) {
    selectedPurchaseId = purchaseId;

    const purchase = read(PURCHASES_KEY).find(
      p => String(p.id) === String(purchaseId)
    );

    if (!purchase) return;

    const remaining = purchase.qtyOrdered - purchase.qtyReceived;

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
      p => String(p.id) === String(selectedPurchaseId)
    );

    if (!purchase) {
      notify("Purchase not found.", true);
      return;
    }

    const remaining = purchase.qtyOrdered - purchase.qtyReceived;

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

    if (!Array.isArray(purchase.deliveries)) {
      purchase.deliveries = [];
    }

    purchase.deliveries.push({date, qty});

    movements.push(
      movement(
        result.product,
        qty,
        result.nextStock,
        purchase.reference
      )
    );

    try {
      commitBatch([
        [PRODUCTS_KEY, products],
        [MOVEMENTS_KEY, movements],
        [PURCHASES_KEY, purchases]
      ]);
    } catch (_) {
      notify("Delivery could not be saved.", true);
      return;
    }

    closeForms();
    render();
    notify(`${qty} units received and added to inventory.`);
    notifyInventory();
    refreshAccounting();
  });

  /* ==========================================
     SUPPLIER PAYMENTS
     ========================================== */

  function openPayment(purchaseId) {
    selectedPurchaseId = purchaseId;

    const purchase = read(PURCHASES_KEY).find(
      p => String(p.id) === String(purchaseId)
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
      p => String(p.id) === String(selectedPurchaseId)
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

    if (!Array.isArray(purchase.payments)) {
      purchase.payments = [];
    }

    purchase.payments.push({date, amountNgwee});

    try {
      write(PURCHASES_KEY, purchases);
    } catch (_) {
      notify("Payment could not be saved.", true);
      return;
    }

    closeForms();
    render();
    notify("Supplier payment recorded successfully.");
    refreshAccounting();
  });

  /* ==========================================
     EDIT PURCHASE
     ========================================== */

  function openEditPurchase(id) {
    const record = read(PURCHASES_KEY).find(
      item => String(item.id) === String(id)
    );

    if (!record) {
      notify("Purchase not found.", true);
      render();
      return;
    }

    editingPurchaseId = record.id;
    editingPurchaseSnapshot = JSON.stringify(record);

    const suppliers = read(SUPPLIERS_KEY);
    const products = read(PRODUCTS_KEY);

    const supplierSelect = $("spEditPurchaseSupplier");
    const productSelect = $("spEditPurchaseProduct");

    supplierSelect.replaceChildren(
      new Option("Select supplier", "")
    );

    productSelect.replaceChildren(
      new Option("Select product", "")
    );

    suppliers.forEach(s => {
      supplierSelect.add(
        new Option(s.name, String(s.id))
      );
    });

    products.filter(p => p.type !== "service").forEach(p => {
      productSelect.add(
        new Option(`${p.name} (${p.sku})`, String(p.id))
      );
    });

    if (
      !Array.from(productSelect.options).some(
        option => option.value === String(record.productId)
      )
    ) {
      productSelect.add(
        new Option(
          record.productName + " (historical)",
          String(record.productId)
        )
      );
    }

    supplierSelect.value = String(record.supplierId);
    productSelect.value = String(record.productId);

    $("spEditPurchaseDate").value = record.date || "";
    $("spEditPurchaseRef").value = record.reference || "";
    $("spEditPurchaseQty").value = record.qtyOrdered;
    $("spEditPurchaseCost").value =
      (Number(record.unitCostNgwee) / 100).toFixed(2);
    $("spEditPurchaseNote").value = record.note || "";

    const hadDelivery =
      Number(record.qtyReceived) > 0 ||
      (record.deliveries || []).length > 0;

    const hadPayment =
      Number(record.paidNgwee) > 0 ||
      (record.payments || []).length > 0;

    const linked = hadDelivery || hadPayment;

    supplierSelect.disabled = linked;
    productSelect.disabled = hadDelivery;
    $("spEditPurchaseCost").disabled = hadDelivery;
    $("spEditPurchaseRef").disabled = hadDelivery;

    $("spEditPurchaseQty").min = Math.max(
      1,
      Number(record.qtyReceived) || 0
    );

    $("spEditPurchaseNotice").textContent = linked
      ? "This purchase has stock deliveries or payments. " +
        "Linked fields are locked. You may correct allowed " +
        "details, but cannot reverse stock or payments here."
      : "Edit the order details before stock or payments are recorded.";

    openPanel("spEditPurchasePanel");
  }

  $("spEditPurchaseForm").addEventListener("submit", event => {
    event.preventDefault();

    const purchases = read(PURCHASES_KEY);

    const index = purchases.findIndex(
      p => String(p.id) === String(editingPurchaseId)
    );

    if (
      index < 0 ||
      JSON.stringify(purchases[index]) !== editingPurchaseSnapshot
    ) {
      notify(
        "Purchase changed or disappeared. Close and reopen Edit.",
        true
      );
      return;
    }

    const previous = JSON.parse(
      JSON.stringify(purchases[index])
    );

    const received = Number(previous.qtyReceived) || 0;
    const qty = Number($("spEditPurchaseQty").value);
    const supplierId = $("spEditPurchaseSupplier").value;
    const productId = $("spEditPurchaseProduct").value;
    const date = $("spEditPurchaseDate").value;
    const reference = $("spEditPurchaseRef").value.trim();
    const cost = Number($("spEditPurchaseCost").value);

    const unitCostNgwee = Math.round(cost * 100);
    const totalNgwee = qty * unitCostNgwee;
    const paid = Number(previous.paidNgwee) || 0;

    const hadDelivery =
      received > 0 ||
      (previous.deliveries || []).length > 0;

    const hadPayment =
      paid > 0 ||
      (previous.payments || []).length > 0;

    if (
      !Number.isSafeInteger(qty) ||
      qty < 1 ||
      qty < received ||
      !Number.isFinite(cost) ||
      cost < 0 ||
      !Number.isSafeInteger(unitCostNgwee) ||
      !Number.isSafeInteger(totalNgwee) ||
      totalNgwee < paid ||
      !date ||
      !reference
    ) {
      notify(
        "Check quantity, dates, cost, and amount already paid. " +
        "Ordered cannot be below received.",
        true
      );
      return;
    }

    if (
      (hadDelivery || hadPayment) &&
      String(supplierId) !== String(previous.supplierId)
    ) {
      notify(
        "Supplier cannot change after stock receipt or payment.",
        true
      );
      return;
    }

    if (
      hadDelivery &&
      (
        String(productId) !== String(previous.productId) ||
        unitCostNgwee !== previous.unitCostNgwee ||
        reference !== previous.reference
      )
    ) {
      notify(
        "Product, cost and reference cannot change after delivery.",
        true
      );
      return;
    }

    const supplier = read(SUPPLIERS_KEY).find(
      x => String(x.id) === String(supplierId)
    );

    const product = read(PRODUCTS_KEY).find(
      x => String(x.id) === String(productId)
    );

    if (!supplier) {
      notify("Supplier no longer exists.", true);
      return;
    }

    if (!product && !hadDelivery) {
      notify("Product no longer exists.", true);
      return;
    }

    purchases[index] = {
      ...previous,
      supplierId: supplier.id,
      supplierName: supplier.name,
      productId: hadDelivery ? previous.productId : product.id,
      productName: hadDelivery ? previous.productName : product.name,
      productSku: hadDelivery ? previous.productSku : product.sku,
      unit: hadDelivery ? previous.unit : (product.unit || "piece"),
      date,
      reference,
      qtyOrdered: qty,
      unitCostNgwee,
      totalNgwee,
      note: $("spEditPurchaseNote").value.trim(),
      updatedAt: new Date().toISOString()
    };

    const audit = read(AUDIT_KEY);

    audit.push(
      auditEvent(
        "purchase-edited",
        previous,
        purchases[index],
        "Order details updated"
      )
    );

    try {
      commitBatch([
        [PURCHASES_KEY, purchases],
        [AUDIT_KEY, audit]
      ]);
    } catch (_) {
      notify("Could not update purchase.", true);
      return;
    }

    editingPurchaseId = null;
    editingPurchaseSnapshot = null;

    closeForms();
    render();
    refreshAccounting();

    notify(
      "Purchase updated. Existing deliveries and payments were preserved."
    );
  });

  /* ==========================================
     RENDER RECORDS AND FINANCIAL TOTALS
     ========================================== */

  function render() {
    const suppliers = read(SUPPLIERS_KEY);
    const purchases = read(PURCHASES_KEY);

    const orderedValue = purchases.reduce(
      (sum, p) => sum + p.totalNgwee,
      0
    );

    const outstanding = purchases.reduce(
      (sum, p) => sum + p.qtyOrdered - p.qtyReceived,
      0
    );

    const debt = purchases.reduce(
      (sum, p) => sum + p.totalNgwee - p.paidNgwee,
      0
    );

    $("spSupplierCount").textContent = suppliers.length;
    $("spPurchaseValue").textContent = money(orderedValue / 100);
    $("spOutstandingUnits").textContent = outstanding;
    $("spSupplierDebt").textContent = money(debt / 100);

    renderSuppliers(suppliers, purchases);
    renderPurchases(purchases);
    renderAudit();
  }

  function renderSuppliers(suppliers, purchases) {
    const tbody = $("spSupplierTable");
    tbody.replaceChildren();

    suppliers.forEach(supplier => {
      const row = el("tr");

      const debt = purchases
        .filter(p => p.supplierId === supplier.id)
        .reduce(
          (sum, p) => sum + p.totalNgwee - p.paidNgwee,
          0
        );

      cell(row, supplier.name);
      cell(row, supplier.phone || "—");
      cell(row, supplier.address || "—");
      cell(row, supplier.productsSupplied || "—");
      cell(row, money(debt / 100));

      if (isMobile()) {
        const actionCell = el("td");

        const actionGroup = el(
          "div",
          undefined,
          "sp-row-actions"
        );

        actionGroup.append(
          button(
            "Edit",
            () => openEditSupplier(supplier.id)
          ),
          button(
            "Delete",
            () => askDelete("supplier", supplier.id),
            "danger"
          )
        );

        actionCell.appendChild(actionGroup);
        row.appendChild(actionCell);
      }

      tbody.appendChild(row);
    });

    if (!suppliers.length) {
      const row = el("tr");
      const td = cell(
        row,
        "No suppliers yet. Click Add Supplier."
      );
      td.colSpan = isMobile() ? 6 : 5;
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

      const actions = el(
        "div",
        undefined,
        "sp-row-actions"
      );

      actions.style.marginTop = "8px";

      if (remaining > 0) {
        actions.appendChild(
          button(
            "Receive",
            () => openReceive(purchase.id)
          )
        );
      }

      if (balance > 0) {
        actions.appendChild(
          button(
            "Pay",
            () => openPayment(purchase.id)
          )
        );
      }

      if (isMobile()) {
        actions.append(
          button(
            "Edit",
            () => openEditPurchase(purchase.id)
          ),
          button(
            "Delete",
            () => askDelete("purchase", purchase.id),
            "danger"
          )
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

  /* ==========================================
     CHANGE HISTORY
     ========================================== */

  function renderAudit() {
    const history = $("spAuditHistory");
    if (!history) return;

    const entries = read(AUDIT_KEY);
    const wasOpen = history.open;

    history.replaceChildren();

    history.appendChild(
      el(
        "summary",
        `Supplier & Purchase Change History (${entries.length})`
      )
    );

    if (!entries.length) {
      history.appendChild(
        el("p", "No changes yet.")
      );
    }

    [...entries].reverse().slice(0, 100).forEach(entry => {
      const block = el(
        "div",
        undefined,
        "sp-audit-entry"
      );

      block.appendChild(
        el(
          "strong",
          entry.type?.replace(/-/g, " ") || "Change"
        )
      );

      block.appendChild(
        el("span", new Date(entry.date).toLocaleString())
      );

      block.appendChild(
        el("span", `Reason: ${entry.reason || "—"}`)
      );

      const beforeLabel =
        entry.before?.reference ||
        entry.before?.name ||
        "";

      const afterLabel =
        entry.after?.reference ||
        entry.after?.name ||
        "";

      block.appendChild(
        el(
          "span",
          `Record: ${afterLabel || beforeLabel}`
        )
      );

      history.appendChild(block);
    });

    history.open = wasOpen;
  }

  /* ==========================================
     SAFE DELETE CONFIRMATION
     ========================================== */

  let deleteTarget = null;

  const modal = el("div");
  modal.id = "spSafeDeleteModal";
  modal.hidden = true;

  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute(
    "aria-labelledby",
    "spDeleteTitle"
  );

  modal.innerHTML = `
    <section class="sp-delete-card">
      <h2 id="spDeleteTitle">Delete record?</h2>
      <p id="spDeleteDetails"></p>
      <p id="spDeleteWarning"
        class="sp-delete-warning"></p>

      <label for="spDeleteReason">
        Reason for deletion *
      </label>

      <textarea id="spDeleteReason"
        rows="3" maxlength="300"
        placeholder="e.g. Duplicate record"></textarea>

      <p id="spDeleteError" role="alert"></p>

      <div class="sp-delete-actions">
        <button id="spKeepRecord"
          type="button">Keep Record</button>
        <button id="spConfirmDelete"
          type="button">Delete Record</button>
      </div>
    </section>
  `;

  document.body.appendChild(modal);

  const style = el("style");
  style.id = "spMobileEditDeleteStyles";

  style.textContent = `
    .sp-mobile-head {display:none}
    #spAuditHistory {display:none}

    @media (max-width:767px) {
      #spAuditHistory {display:block}

      #suppliersPurchasesPage
      #spSupplierTable > tr > td:nth-child(6) {
        grid-column:1/-1;
        padding-top:10px!important;
        border-top:1px solid #dfe6ef!important
      }

      #suppliersPurchasesPage
      #spSupplierTable > tr > td:nth-child(6)::before {
        content:"ACTIONS";
        display:block;
        color:#617188;
        font-size:10px;
        font-weight:700
      }

      #suppliersPurchasesPage
      .sp-row-actions .sp-button.danger {
        background:#fff1f0!important;
        color:#a52222!important;
        border:1px solid #c37b7b!important
      }

      #suppliersPurchasesPage #spAuditHistory {
        margin-top:14px
      }

      #suppliersPurchasesPage #spAuditHistory summary {
        font-weight:700;
        cursor:pointer
      }

      #suppliersPurchasesPage .sp-audit-entry {
        display:grid;
        gap:5px;
        padding:12px 0;
        border-top:1px solid #dfe6ef;
        font-size:12px
      }

      #suppliersPurchasesPage #spEditPurchaseNotice {
        font-size:12px;
        line-height:1.5;
        padding:10px;
        border-radius:9px;
        border:1px solid #adc2da;
        background:#eff5fc;
        color:#254263
      }

      #spSafeDeleteModal[hidden] {
        display:none!important
      }

      #spSafeDeleteModal {
        position:fixed;
        inset:0;
        z-index:45500;
        display:flex;
        justify-content:center;
        align-items:center;
        padding:10px;
        box-sizing:border-box;
        background:rgba(4,15,30,.8)
      }

      #spSafeDeleteModal .sp-delete-card {
        width:100%;
        max-width:470px;
        max-height:calc(100dvh - 20px);
        overflow:auto;
        box-sizing:border-box;
        padding:17px;
        border-radius:16px;
        background:#fff;
        color:#17283e;
        border:1px solid #dfe6ef
      }

      #spSafeDeleteModal h2 {
        margin:0 0 10px;
        font-size:20px;
        color:inherit
      }

      #spSafeDeleteModal p {
        line-height:1.5;
        font-size:13px;
        color:inherit;
        overflow-wrap:anywhere
      }

      #spSafeDeleteModal label {
        display:block;
        margin:13px 0 6px;
        font-size:13px;
        font-weight:700
      }

      #spSafeDeleteModal .sp-delete-warning {
        padding:12px;
        border:1px solid #dca49b;
        border-radius:10px;
        background:#fff1f0;
        color:#8b2020
      }

      #spSafeDeleteModal #spDeleteReason {
        width:100%;
        min-height:75px;
        box-sizing:border-box;
        padding:10px;
        font:16px Arial,sans-serif;
        border:1px solid #bac8d9;
        border-radius:10px;
        background:#fff;
        color:#17283e
      }

      #spSafeDeleteModal #spDeleteError {
        min-height:18px;
        color:#b91c1c
      }

      #spSafeDeleteModal .sp-delete-actions {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:9px
      }

      #spSafeDeleteModal button {
        min-height:47px;
        border-radius:10px;
        padding:8px;
        font-weight:700
      }

      #spKeepRecord {
        background:#edf2f8;
        color:#243952;
        border:1px solid #bac8d9
      }

      #spConfirmDelete {
        background:#b42318;
        color:#fff;
        border:1px solid #b42318
      }

      #spConfirmDelete:disabled {
        opacity:.45;
        cursor:not-allowed
      }

      html.trauts-dark #suppliersPurchasesPage
      .sp-row-actions .sp-button.danger {
        background:#462832!important;
        color:#ffd4d4!important;
        border-color:#b86d74!important
      }

      html.trauts-dark #suppliersPurchasesPage
      #spSupplierTable > tr > td:nth-child(6) {
        border-color:#364a63!important
      }

      html.trauts-dark #suppliersPurchasesPage
      #spSupplierTable > tr > td:nth-child(6)::before {
        color:#b6c7dc!important
      }

      html.trauts-dark #suppliersPurchasesPage
      .sp-audit-entry {
        border-color:#364a63
      }

      html.trauts-dark #suppliersPurchasesPage
      #spEditPurchaseNotice {
        background:#203b59;
        color:#d7e7fa;
        border-color:#517da7
      }

      html.trauts-dark #spSafeDeleteModal .sp-delete-card {
        background:#17283e;
        color:#e8eff9;
        border-color:#364a63
      }

      html.trauts-dark #spSafeDeleteModal
      .sp-delete-warning {
        background:#3c242c;
        color:#fecaca;
        border-color:#b45353
      }

      html.trauts-dark #spSafeDeleteModal #spDeleteReason {
        background:#0d1c2e;
        color:#e8eff9;
        border-color:#52647b
      }

      html.trauts-dark #spSafeDeleteModal #spDeleteError {
        color:#fecaca
      }

      html.trauts-dark #spKeepRecord {
        background:#29425e;
        color:#fff;
        border-color:#526c86
      }
    }
  `;

  document.head.appendChild(style);

  function closeDelete() {
    deleteTarget = null;
    modal.hidden = true;
  }

  function askDelete(type, id) {
    const key =
      type === "purchase" ? PURCHASES_KEY : SUPPLIERS_KEY;

    const record = read(key).find(
      item => String(item.id) === String(id)
    );

    if (!record) {
      notify("Record no longer exists.", true);
      render();
      return;
    }

    const linked = type === "purchase"
      ? (
        Number(record.qtyReceived) > 0 ||
        Number(record.paidNgwee) > 0 ||
        (record.deliveries || []).length > 0 ||
        (record.payments || []).length > 0
      )
      : read(PURCHASES_KEY).some(
        p => String(p.supplierId) === String(id)
      );

    deleteTarget = {
      type,
      id,
      snapshot: JSON.stringify(record),
      blocked: linked
    };

    $("spDeleteTitle").textContent =
      type === "purchase"
        ? "Delete Purchase?"
        : "Delete Supplier?";

    $("spDeleteDetails").textContent =
      type === "purchase"
        ? `${record.reference} · ${record.supplierName} · ${record.productName}`
        : `${record.name}`;

    $("spDeleteWarning").textContent = linked
      ? (
        type === "purchase"
          ? "This purchase has a delivery or payment. " +
            "Deletion is blocked to protect inventory " +
            "and financial history. You can edit permitted " +
            "order details or record further deliveries " +
            "and payments normally."
          : "This supplier is linked to active purchases. " +
            "Deletion is blocked to protect the purchase " +
            "and payment audit trail. The supplier can " +
            "still be edited."
      )
      : "Warning: this record will leave the active " +
        "directory or purchase totals. A dated audit copy " +
        "with your reason will remain. This does not " +
        "reverse any real payment.";

    $("spDeleteReason").value = "";
    $("spDeleteReason").disabled = linked;
    $("spConfirmDelete").disabled = linked;
    $("spDeleteError").textContent = "";

    modal.hidden = false;

    if (!linked) {
      $("spDeleteReason").focus();
    }
  }

  $("spKeepRecord").addEventListener(
    "click",
    closeDelete
  );

  $("spConfirmDelete").addEventListener("click", () => {
    if (!deleteTarget || deleteTarget.blocked) return;

    const reason = $("spDeleteReason").value.trim();

    if (reason.length < 3) {
      $("spDeleteError").textContent =
        "Enter a reason of at least 3 characters.";
      return;
    }

    const {type, id, snapshot} = deleteTarget;

    const key =
      type === "purchase" ? PURCHASES_KEY : SUPPLIERS_KEY;

    const records = read(key);

    const current = records.find(
      x => String(x.id) === String(id)
    );

    if (
      !current ||
      JSON.stringify(current) !== snapshot
    ) {
      $("spDeleteError").textContent =
        "Record changed. Close and try again.";
      return;
    }

    const linked = type === "purchase"
      ? (
        Number(current.qtyReceived) > 0 ||
        Number(current.paidNgwee) > 0 ||
        (current.deliveries || []).length > 0 ||
        (current.payments || []).length > 0
      )
      : read(PURCHASES_KEY).some(
        p => String(p.supplierId) === String(id)
      );

    if (linked) {
      $("spDeleteError").textContent =
        "Linked delivery, payment or purchase found. " +
        "Deletion blocked.";
      return;
    }

    const audit = read(AUDIT_KEY);

    audit.push(
      auditEvent(
        type === "purchase"
          ? "purchase-deleted"
          : "supplier-deleted",
        current,
        null,
        reason
      )
    );

    try {
      commitBatch([
        [
          key,
          records.filter(
            x => String(x.id) !== String(id)
          )
        ],
        [AUDIT_KEY, audit]
      ]);
    } catch (_) {
      $("spDeleteError").textContent =
        "Could not save deletion.";
      return;
    }

    closeDelete();
    closeForms();
    render();
    refreshAccounting();

    notify(
      type === "purchase"
        ? "Pending purchase deleted; audit saved."
        : "Supplier deleted; audit saved."
    );
  });

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closeDelete();
    }
  });

  document.addEventListener(
    "keydown",
    event => {
      if (!modal.hidden && event.key === "Escape") {
        event.preventDefault();
        closeDelete();
      }
    },
    true
  );

  window.addEventListener(
    "trauts:products-updated",
    () => {
      if (!page.hidden) render();
    }
  );

  window.refreshTrautsSuppliersPurchases = render;

  window.addEventListener("storage", event => {
    if (
      [
        SUPPLIERS_KEY,
        PURCHASES_KEY,
        AUDIT_KEY
      ].includes(event.key) &&
      !page.hidden
    ) {
      render();
    }
  });

  render();
})();
