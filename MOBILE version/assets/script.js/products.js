
/* ============================================================
   TRAUTS PRODUCTS — ANDROID ASSET VERSION

   Original catalogue behaviour + mobile-only Products fixes:
   - Reasoned, audited deletion (sales and movements kept)
   - Optional SKU with automatic unique code
   - Android-friendly category selector and custom categories
   - Millilitre (ml) unit
   - High-contrast close button in dark mode

   Other pages, navigation and POS calculations are unchanged.
   Desktop-sized behaviour remains the original implementation.
   ============================================================ */

(() => {
  "use strict";

  const KEY = "trauts_demo_products_v1";
  const DELETED_KEY = "trauts_demo_deleted_products_v1";
  const NEW_CATEGORY = "__trauts_new_category__";

  const $ = id => document.getElementById(id);

  const isPhone = () =>
    window.matchMedia("(max-width: 767px)").matches;

  const defaults = [
    {
      id: 1,
      name: "Cooking Oil 2L",
      sku: "OIL-002",
      category: "Groceries",
      cost: 75,
      price: 95,
      stock: 24,
      threshold: 5
    },
    {
      id: 2,
      name: "Sugar 2kg",
      sku: "SUG-002",
      category: "Groceries",
      cost: 48,
      price: 62,
      stock: 18,
      threshold: 5
    },
    {
      id: 3,
      name: "Laundry Soap",
      sku: "SOAP-001",
      category: "Household",
      cost: 18,
      price: 28,
      stock: 4,
      threshold: 5
    }
  ];

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      const value =
        raw === null ? defaults : JSON.parse(raw);

      return Array.isArray(value) ? value : defaults;
    } catch (_) {
      return defaults;
    }
  }

  function readDeletions() {
    try {
      const value = JSON.parse(
        localStorage.getItem(DELETED_KEY)
      );

      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function setMessage(text) {
    if ($("productMessage")) {
      $("productMessage").textContent = text;
    }
  }

  function broadcast() {
    window.dispatchEvent(
      new Event("trauts:products-updated")
    );

    window.dispatchEvent(
      new Event("trauts:stock-updated")
    );

    window.refreshTrautsInventory?.();
    window.refreshTrautsDashboard?.();
    window.refreshTrautsProfitLoss?.();
  }

  const money = value =>
    "K " + Number(value ?? 0).toFixed(2);

  /* ============================================================
     PRODUCT CATALOGUE — ORIGINAL DISPLAY, SEARCH AND FILTERS
     ============================================================ */

  function render() {
    const products = read();
    const filter = $("categoryFilter");
    const searchInput = $("productSearch");
    const table = $("productTable");

    if (!filter || !searchInput || !table) {
      return;
    }

    const selected = filter.value;

    const categories = [
      ...new Set(
        products.map(p =>
          String(p.category || "General")
        )
      )
    ].sort();

    filter.replaceChildren(
      new Option("All Categories", "")
    );

    categories.forEach(category => {
      filter.add(new Option(category, category));
    });

    filter.value = categories.includes(selected)
      ? selected
      : "";

    $("productCount").textContent = products.length;

    $("categoryCount").textContent =
      categories.length;

    $("lowStockCount").textContent =
      products.filter(p =>
        p.type !== "service" &&
        Number(p.stock ?? 0) <=
        Number(p.threshold ?? 5)
      ).length;

    const query =
      searchInput.value.trim().toLowerCase();

    const displayed = products.filter(p =>
      [p.name, p.sku, p.category].some(value =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      ) &&
      (
        !filter.value ||
        String(p.category || "General") ===
        filter.value
      )
    );

    table.replaceChildren();

    for (const product of displayed) {
      const row = document.createElement("tr");

      const cell = value => {
        const td = document.createElement("td");
        td.textContent = String(value);
        row.appendChild(td);
        return td;
      };

      cell(product.name);
      cell(product.sku || "—");
      cell(product.category || "General");
      cell(money(
        product.cost ?? product.buyingPrice
      ));
      cell(money(
        product.price ?? product.sellingPrice
      ));

      const stock = cell(
        product.type === "service"
          ? "N/A"
          : product.stock ?? 0
      );

      stock.className =
        product.type !== "service" &&
        Number(product.stock ?? 0) <=
        Number(product.threshold ?? 5)
          ? "stock-low"
          : "stock-ok";

      const actions = document.createElement("td");

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "product-action";
      edit.textContent = "Edit";

      edit.addEventListener("click", () =>
        window.openUniversalProductForm?.(
          product.id
        )
      );

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "product-action delete";
      remove.textContent = "Delete";

      remove.addEventListener("click", () => {
        if (isPhone()) {
          askToDelete(product, remove);
          return;
        }

        // Preserve the original desktop-sized behaviour.
        if (!confirm(
          `Delete ${product.name}?`
        )) {
          return;
        }

        try {
          localStorage.setItem(
            KEY,
            JSON.stringify(
              read().filter(item =>
                String(item.id) !==
                String(product.id)
              )
            )
          );

          window.dispatchEvent(
            new Event("trauts:products-updated")
          );

          window.dispatchEvent(
            new Event("trauts:stock-updated")
          );

          setMessage("Product deleted.");
        } catch (_) {
          setMessage("Unable to delete product.");
        }
      });

      actions.append(edit, remove);
      row.appendChild(actions);
      table.appendChild(row);
    }

    if (!displayed.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 7;
      cell.textContent = "No products found.";

      row.appendChild(cell);
      table.appendChild(row);
    }
  }

  /* ============================================================
     PHONE-ONLY PRESENTATION STYLES
     ============================================================ */

  function addMobileStyles() {
    if ($("trautsMobileProductExtraStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "trautsMobileProductExtraStyles";

    style.textContent = `
      @media (max-width: 767px) {

        #universalProductModal #closeUniversalProduct {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 44px !important;
          height: 44px !important;
          min-width: 44px !important;
          font-size: 30px !important;
          line-height: 1 !important;
          opacity: 1 !important;
          visibility: visible !important;
          color: #17283e !important;
          background: #f1f5fa !important;
          border: 1px solid #bac8d9 !important;
          border-radius: 11px !important;
        }

        html.trauts-dark
        #universalProductModal #closeUniversalProduct {
          color: #ffffff !important;
          background: #29425e !important;
          border-color: #7488a1 !important;
          opacity: 1 !important;
        }

        #trautsCustomCategoryGroup[hidden] {
          display: none !important;
        }

        #trautsCustomCategoryGroup {
          margin-top: 8px;
        }

        #trautsCustomCategoryGroup label {
          display: block;
          font-weight: 700;
          font-size: 12px;
          margin-bottom: 5px;
        }

        #trautsCustomCategoryGroup input,
        #universalProductModal #universalCategory {
          width: 100% !important;
          min-height: 45px;
          padding: 10px 11px;
          border-radius: 10px;
          font-size: 16px;
          box-sizing: border-box;
          background: #ffffff;
          color: #17283e;
          border: 1px solid #bac8d9;
        }

        html.trauts-dark
        #trautsCustomCategoryGroup input,
        html.trauts-dark
        #universalProductModal #universalCategory {
          background: #0d1c2e;
          color: #e8eff9;
          border-color: #52647b;
        }

        #trautsDeleteProductDialog[hidden] {
          display: none !important;
        }

        #trautsDeleteProductDialog {
          position: fixed;
          inset: 0;
          z-index: 41000;
          display: flex;
          justify-content: center;
          align-items: center;
          box-sizing: border-box;
          padding: 12px;
          background: rgba(6, 16, 30, .75);
        }

        #trautsDeleteProductDialog .trauts-delete-card {
          width: 100%;
          max-width: 500px;
          max-height: calc(100dvh - 24px);
          box-sizing: border-box;
          overflow-y: auto;
          padding: 20px 16px;
          border: 1px solid #dfe6ef;
          border-radius: 17px;
          background: #ffffff;
          color: #17283e;
          box-shadow: 0 16px 45px #0004;
        }

        #trautsDeleteProductDialog h2 {
          margin: 0 0 10px;
          font-size: 21px;
          color: inherit;
        }

        #trautsDeleteProductDialog p {
          font-size: 13px;
          line-height: 1.55;
          color: inherit;
        }

        #trautsDeleteProductDialog label {
          display: block;
          font-weight: 700;
          margin: 14px 0 6px;
        }

        #trautsDeleteReason {
          width: 100%;
          min-height: 75px;
          padding: 10px 12px;
          box-sizing: border-box;
          border: 1px solid #bac8d9;
          border-radius: 10px;
          background: #ffffff;
          color: #17283e;
          font: inherit;
          font-size: 16px;
        }

        #trautsDeleteError {
          color: #af2424 !important;
          min-height: 18px;
          font-size: 12px;
        }

        #trautsDeleteProductDialog .trauts-delete-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-top: 14px;
        }

        #trautsDeleteProductDialog .trauts-delete-actions button {
          min-height: 47px;
          border-radius: 10px;
          border: 1px solid #bac8d9;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
        }

        #trautsDeleteKeep {
          color: #17283e;
          background: #f1f5fa;
        }

        #trautsDeleteProceed {
          color: #ffffff;
          background: #ab2525;
          border-color: #ab2525 !important;
        }

        html.trauts-dark
        #trautsDeleteProductDialog .trauts-delete-card {
          color: #e8eff9;
          background: #17283e;
          border-color: #364a63;
        }

        html.trauts-dark #trautsDeleteReason {
          color: #e8eff9;
          background: #0d1c2e;
          border-color: #52647b;
        }

        html.trauts-dark #trautsDeleteKeep {
          color: #e8eff9;
          background: #29425e;
          border-color: #526c86;
        }

        html.trauts-dark #trautsDeleteError {
          color: #fecaca !important;
        }

        #trautsDeletedProductHistory {
          margin-top: 16px;
          padding: 14px;
          border: 1px solid #dfe6ef;
          background: #ffffff;
          color: #17283e;
          border-radius: 13px;
        }

        #trautsDeletedProductHistory summary {
          cursor: pointer;
          font-weight: 700;
          font-size: 14px;
        }

        #trautsDeletedProductHistory .trauts-deleted-entry {
          display: grid;
          gap: 4px;
          padding: 12px 0;
          margin-top: 10px;
          border-top: 1px solid #dfe6ef;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        html.trauts-dark #trautsDeletedProductHistory {
          background: #17283e;
          color: #e8eff9;
          border-color: #364a63;
        }

        html.trauts-dark
        #trautsDeletedProductHistory .trauts-deleted-entry {
          border-color: #364a63;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* ============================================================
     AUDITED PRODUCT DELETION
     ============================================================ */

  let selected = null;
  let focusBeforeDelete = null;

  function createDeleteDialog() {
    if ($("trautsDeleteProductDialog")) {
      return;
    }

    const modal = document.createElement("div");

    modal.id = "trautsDeleteProductDialog";
    modal.hidden = true;

    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute(
      "aria-labelledby",
      "trautsDeleteTitle"
    );

    const card = document.createElement("section");
    card.className = "trauts-delete-card";

    const heading = document.createElement("h2");
    heading.id = "trautsDeleteTitle";
    heading.textContent = "Delete this product?";

    const description = document.createElement("p");
    description.id = "trautsDeleteDetails";

    const warning = document.createElement("p");
    warning.textContent =
      "This removes the product from active lists and " +
      "frees its name and code. Past sales receipts and " +
      "stock movements remain recorded. Old sale " +
      "cancellations involving this product may require " +
      "restoring it first.";

    const label = document.createElement("label");
    label.htmlFor = "trautsDeleteReason";
    label.textContent = "Reason for deletion";

    const reason = document.createElement("textarea");
    reason.id = "trautsDeleteReason";
    reason.maxLength = 300;
    reason.placeholder =
      "e.g. Incorrect entry or discontinued product";

    const error = document.createElement("p");
    error.id = "trautsDeleteError";
    error.setAttribute("role", "alert");

    const actions = document.createElement("div");
    actions.className = "trauts-delete-actions";

    const keep = document.createElement("button");
    keep.id = "trautsDeleteKeep";
    keep.type = "button";
    keep.textContent = "Keep product";

    const proceed = document.createElement("button");
    proceed.id = "trautsDeleteProceed";
    proceed.type = "button";
    proceed.textContent = "Delete product";

    actions.append(keep, proceed);

    card.append(
      heading,
      description,
      warning,
      label,
      reason,
      error,
      actions
    );

    modal.appendChild(card);
    document.body.appendChild(modal);

    keep.addEventListener(
      "click",
      closeDeleteDialog
    );

    proceed.addEventListener(
      "click",
      deleteSelectedProduct
    );

    modal.addEventListener("click", event => {
      if (event.target === modal) {
        closeDeleteDialog();
      }
    });

    document.addEventListener(
      "keydown",
      event => {
        if (
          !modal.hidden &&
          event.key === "Escape"
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          closeDeleteDialog();
        }
      },
      true
    );
  }

  function askToDelete(product, button) {
    createDeleteDialog();

    selected = {
      id: product.id,
      name: product.name
    };

    focusBeforeDelete = button;

    $("trautsDeleteDetails").textContent =
      `Are you sure you want to delete “${product.name}”? ` +
      `Code: ${product.sku || "none"}. ` +
      `Current stock: ${product.stock ?? 0}.`;

    $("trautsDeleteReason").value = "";
    $("trautsDeleteError").textContent = "";

    $("trautsDeleteProductDialog").hidden = false;
    $("trautsDeleteReason").focus();
  }

  function closeDeleteDialog() {
    $("trautsDeleteProductDialog").hidden = true;

    selected = null;

    if (focusBeforeDelete?.isConnected) {
      focusBeforeDelete.focus();
    }

    focusBeforeDelete = null;
  }

  function deleteSelectedProduct() {
    const reason =
      $("trautsDeleteReason").value.trim();

    const error = $("trautsDeleteError");

    if (reason.length < 3) {
      error.textContent =
        "Please enter a reason (at least 3 characters).";
      return;
    }

    const products = read();

    const product = products.find(p =>
      String(p.id) === String(selected?.id)
    );

    if (
      !product ||
      product.name !== selected.name
    ) {
      error.textContent =
        "Product changed or disappeared. " +
        "Refresh Products and try again.";
      return;
    }

    const removed = readDeletions();

    removed.push({
      id:
        "DEL-" +
        Date.now() +
        "-" +
        Math.random()
          .toString(36)
          .slice(2, 8),

      productId: product.id,
      name: product.name,
      sku: product.sku || "",
      product: { ...product },
      reason,
      deletedAt: new Date().toISOString()
    });

    const active = products.filter(p =>
      String(p.id) !== String(product.id)
    );

    const oldProducts = localStorage.getItem(KEY);
    const oldDeleted =
      localStorage.getItem(DELETED_KEY);

    try {
      localStorage.setItem(
        KEY,
        JSON.stringify(active)
      );

      localStorage.setItem(
        DELETED_KEY,
        JSON.stringify(removed)
      );
    } catch (_) {
      try {
        if (oldProducts === null) {
          localStorage.removeItem(KEY);
        } else {
          localStorage.setItem(KEY, oldProducts);
        }

        if (oldDeleted === null) {
          localStorage.removeItem(DELETED_KEY);
        } else {
          localStorage.setItem(
            DELETED_KEY,
            oldDeleted
          );
        }
      } catch (_) {
        // Rollback is best effort.
      }

      error.textContent =
        "Could not save deletion; check your device storage.";
      return;
    }

    closeDeleteDialog();

    setMessage(
      `“${product.name}” deleted. ` +
      "The reason is in Deleted Products History."
    );

    broadcast();
    renderDeletedHistory();
  }

  function renderDeletedHistory() {
    if (!$("productsPage")) {
      return;
    }

    let panel = $("trautsDeletedProductHistory");

    if (!panel) {
      panel = document.createElement("details");
      panel.id = "trautsDeletedProductHistory";

      const msg = $("productMessage");

      if (msg) {
        msg.insertAdjacentElement(
          "afterend",
          panel
        );
      } else {
        $("productsPage").appendChild(panel);
      }
    }

    const open = panel.open;

    panel.replaceChildren();

    const history = readDeletions();

    const summary = document.createElement("summary");
    summary.textContent =
      `Deleted Products History (${history.length})`;

    panel.appendChild(summary);

    history.slice().reverse().forEach(record => {
      const row = document.createElement("div");
      row.className = "trauts-deleted-entry";

      const name = document.createElement("strong");
      name.textContent =
        `${record.name || "Product"} — ` +
        `${record.sku || "No code"}`;

      const time = document.createElement("span");
      time.textContent =
        `Deleted: ${
          new Date(record.deletedAt).toLocaleString()
        }`;

      const note = document.createElement("span");
      note.textContent =
        `Reason: ${record.reason || "Not provided"}`;

      row.append(name, time, note);
      panel.appendChild(row);
    });

    if (history.length === 0) {
      const empty = document.createElement("p");
      empty.textContent =
        "No products have been deleted on this device.";

      panel.appendChild(empty);
    }

    panel.open = open;
  }

  /* ============================================================
     OPTIONAL SKU, MILLILITRE AND CATEGORY PICKER
     ============================================================ */

  function addMillilitre() {
    const select = $("universalUnit");

    if (
      !select ||
      Array.from(select.options).some(
        option => option.value === "ml"
      )
    ) {
      return;
    }

    const option = new Option(
      "Millilitre (ml)",
      "ml"
    );

    const litre = Array.from(select.options).find(
      option => option.value === "litre"
    );

    if (litre) {
      litre.insertAdjacentElement(
        "afterend",
        option
      );
    } else {
      select.add(option);
    }
  }

  function availableCategories() {
    const names = new Set([
      "General",
      "Groceries",
      "Clothing",
      "Electronics",
      "Hardware",
      "Beauty & Cosmetics",
      "Food & Beverages",
      "Household",
      "Stationery",
      "Services"
    ]);

    document.querySelectorAll(
      "#universalCategoryOptions option"
    ).forEach(option => {
      if (option.value.trim()) {
        names.add(option.value.trim());
      }
    });

    read().forEach(product => {
      if (
        String(product.category || "").trim()
      ) {
        names.add(
          String(product.category).trim()
        );
      }
    });

    return [...names].sort(
      (a, b) => a.localeCompare(b)
    );
  }

  function refreshCategoryChoices() {
    const select = $("universalCategory");

    if (!(select instanceof HTMLSelectElement)) {
      return;
    }

    const chosen = select.value;
    const names = availableCategories();

    if (
      chosen &&
      chosen !== NEW_CATEGORY &&
      !names.includes(chosen)
    ) {
      names.push(chosen);
    }

    select.replaceChildren();

    select.add(
      new Option("Select a category", "")
    );

    names
      .sort((a, b) => a.localeCompare(b))
      .forEach(name => {
        select.add(new Option(name, name));
      });

    select.add(
      new Option(
        "+ Add new category…",
        NEW_CATEGORY
      )
    );

    if (
      chosen &&
      Array.from(select.options).some(
        option => option.value === chosen
      )
    ) {
      select.value = chosen;
    }
  }

  function updateCategoryInput() {
    const select = $("universalCategory");
    const group = $("trautsCustomCategoryGroup");
    const input = $("trautsCustomCategoryName");

    if (!select || !group || !input) {
      return;
    }

    const newOne =
      select.value === NEW_CATEGORY;

    group.hidden = !newOne;
    input.required = newOne;

    if (!newOne) {
      input.value = "";
    }
  }

  function installMobileCategory() {
    const oldInput = $("universalCategory");

    if (
      !oldInput ||
      oldInput instanceof HTMLSelectElement
    ) {
      return;
    }

    const select = document.createElement("select");
    select.id = "universalCategory";
    select.required = true;

    select.setAttribute(
      "aria-label",
      "Select product category"
    );

    oldInput.replaceWith(select);

    const group = document.createElement("div");
    group.id = "trautsCustomCategoryGroup";
    group.hidden = true;

    const label = document.createElement("label");
    label.htmlFor = "trautsCustomCategoryName";
    label.textContent = "New category name";

    const input = document.createElement("input");
    input.id = "trautsCustomCategoryName";
    input.type = "text";
    input.maxLength = 60;
    input.placeholder = "e.g. Automotive";

    group.append(label, input);

    select.insertAdjacentElement(
      "afterend",
      group
    );

    refreshCategoryChoices();

    select.addEventListener("change", () => {
      updateCategoryInput();

      if (select.value === NEW_CATEGORY) {
        input.focus();
      }
    });

    const originalOpen =
      window.openUniversalProductForm;

    if (typeof originalOpen === "function") {
      window.openUniversalProductForm =
        function(id = null) {
          refreshCategoryChoices();

          const result = originalOpen(id);

          updateCategoryInput();

          return result;
        };
    }

    window.addEventListener(
      "trauts:products-updated",
      refreshCategoryChoices
    );
  }

  function automaticSku() {
    const used = new Set(
      read().map(p =>
        String(p.sku || "").toLowerCase()
      )
    );

    for (
      let attempt = 0;
      attempt < 20;
      attempt++
    ) {
      const code =
        "AUTO-" +
        Date.now()
          .toString(36)
          .toUpperCase() +
        "-" +
        Math.random()
          .toString(36)
          .slice(2, 7)
          .toUpperCase();

      if (!used.has(code.toLowerCase())) {
        return code;
      }
    }

    return (
      "AUTO-" +
      Date.now() +
      "-" +
      Math.floor(Math.random() * 1000000)
    );
  }

  function installFormEnhancements() {
    const sku = $("universalSku");
    const form = $("universalProductForm");

    if (!sku || !form) {
      return;
    }

    sku.required = false;
    sku.removeAttribute("required");

    sku.placeholder =
      "Optional — TRAUTS can create a code";

    const label = document.querySelector(
      'label[for="universalSku"]'
    );

    if (label) {
      label.textContent =
        "SKU / Product Code (optional)";
    }

    addMillilitre();
    installMobileCategory();

    // Prepare the form before universal-products.js
    // runs its existing save and validation logic.
    form.addEventListener(
      "submit",
      event => {
        const category = $("universalCategory");

        if (
          category?.value === NEW_CATEGORY
        ) {
          const name = $(
            "trautsCustomCategoryName"
          ).value.trim();

          if (!name) {
            event.preventDefault();
            event.stopImmediatePropagation();

            $("universalProductMessage").textContent =
              "Enter the new category name.";

            $("trautsCustomCategoryName").focus();

            return;
          }

          const match = Array.from(
            category.options
          ).find(option =>
            option.value.toLowerCase() ===
            name.toLowerCase()
          );

          if (match) {
            category.value = match.value;
          } else {
            category.insertBefore(
              new Option(name, name),
              category.lastElementChild
            );

            category.value = name;
          }

          updateCategoryInput();
        }

        if (!sku.value.trim()) {
          sku.value = automaticSku();
        }
      },
      true
    );
  }

  function initializeMobile() {
    if (
      !isPhone() ||
      !$("productsPage")
    ) {
      return;
    }

    addMobileStyles();
    installFormEnhancements();
    renderDeletedHistory();
  }

  /* ============================================================
     ORIGINAL PRODUCTS PAGE EVENTS
     ============================================================ */

  if (!$("productsPage")) {
    return;
  }

  $("addProductBtn")?.addEventListener(
    "click",
    () => window.openUniversalProductForm?.()
  );

  $("productSearch")?.addEventListener(
    "input",
    render
  );

  $("categoryFilter")?.addEventListener(
    "change",
    render
  );

  window.addEventListener(
    "trauts:products-updated",
    render
  );

  window.addEventListener(
    "storage",
    event => {
      if (event.key === KEY) {
        render();
      }

      if (event.key === DELETED_KEY) {
        renderDeletedHistory();
      }
    }
  );

  window.refreshTrautsProducts = render;

  render();

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeMobile,
      { once: true }
    );
  } else {
    initializeMobile();
  }

})();
