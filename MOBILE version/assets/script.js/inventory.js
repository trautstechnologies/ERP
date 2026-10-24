
/* =====================================
   TRAUTS INVENTORY MANAGEMENT
   ===================================== */

(() => {
  const PRODUCT_KEY = "trauts_demo_products_v1";
  const MOVEMENT_KEY = "trauts_demo_movements_v1";

  const $ = id => document.getElementById(id);

  const inventoryPage = $("inventoryPage");
  const inventoryTable = $("inventoryTable");
  const movementHistory = $("movementHistory");
  const movementForm = $("movementForm");
  const movementFormPanel = $("movementFormPanel");
  const inventoryMessage = $("inventoryMessage");

  if (!inventoryPage) return;

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function getProducts() {
    // Products module initializes the demo catalog.
    return readArray(PRODUCT_KEY);
  }

  function getMovements() {
    return readArray(MOVEMENT_KEY);
  }

  function saveArray(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch {
      inventoryMessage.textContent =
        "Unable to save changes to browser storage.";
      return false;
    }
  }

  function kwacha(amount) {
    return "K " + Number(amount).toLocaleString(
      "en-ZM",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
  }

  function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = String(value);
    row.appendChild(cell);
    return cell;
  }

  function renderInventory() {
    const products = getProducts();
    const query = $("inventorySearch").value
      .trim().toLowerCase();

    const units = products.reduce(
      (total, p) => total + Number(p.stock || 0), 0
    );

    const lowStock = products.filter(
      p => Number(p.stock) <= Number(p.threshold ?? 5)
    ).length;

    const value = products.reduce(
      (total, p) =>
        total + Number(p.cost || 0) * Number(p.stock || 0),
      0
    );

    $("inventoryUnits").textContent = units;
    $("inventoryLowStock").textContent = lowStock;
    $("inventoryValue").textContent = kwacha(value);

    inventoryTable.replaceChildren();

    const filtered = products.filter(p =>
      `${p.name} ${p.sku}`.toLowerCase().includes(query)
    );

    filtered.forEach(product => {
      const row = document.createElement("tr");
      const stock = Number(product.stock);
      const threshold = Number(product.threshold ?? 5);

      addCell(row, product.name);
      addCell(row, product.sku);
      addCell(row, stock);
      addCell(row, threshold);

      const statusCell = document.createElement("td");
      const status = document.createElement("span");

      const state = stock === 0
        ? "empty"
        : stock <= threshold
          ? "low"
          : "ok";

      status.className = `inventory-status ${state}`;
      status.textContent =
        state === "empty" ? "Out of Stock" :
        state === "low" ? "Low Stock" : "In Stock";

      statusCell.appendChild(status);
      row.appendChild(statusCell);

      const actionCell = document.createElement("td");
      const button = document.createElement("button");

      button.className = "inventory-action";
      button.textContent = "Update Stock";

      button.addEventListener("click", () => {
        openMovementForm(product.id);
      });

      actionCell.appendChild(button);
      row.appendChild(actionCell);
      inventoryTable.appendChild(row);
    });

    if (filtered.length === 0) {
      const row = document.createElement("tr");
      const cell = addCell(row, "No matching products.");
      cell.colSpan = 6;
      inventoryTable.appendChild(row);
    }
  }

  function renderHistory() {
    movementHistory.replaceChildren();

    const movements = getMovements().slice().reverse();

    movements.forEach(item => {
      const row = document.createElement("tr");

      addCell(row, new Date(item.date).toLocaleString());
      addCell(row, item.productName);

      const typeLabel = {
        in: "Stock In",
        out: "Stock Out",
        adjustment: "Adjustment"
      };

      addCell(row, typeLabel[item.type] || item.type);

      const change = item.change > 0
        ? `+${item.change}`
        : String(item.change);

      addCell(row, change);
      addCell(row, item.balance);
      addCell(row, item.note || "—");

      movementHistory.appendChild(row);
    });

    if (movements.length === 0) {
      const row = document.createElement("tr");
      const cell = addCell(row, "No stock movements recorded yet.");
      cell.colSpan = 6;
      movementHistory.appendChild(row);
    }
  }

  function populateProductSelect(selectedId = "") {
    const select = $("movementProduct");
    select.replaceChildren();

    getProducts().forEach(product => {
      select.add(new Option(
        `${product.name} (${product.sku})`,
        String(product.id)
      ));
    });

    if (selectedId !== "") {
      select.value = String(selectedId);
    }
  }

  function updateQuantityLabel() {
    const adjustment =
      $("movementType").value === "adjustment";

    $("quantityLabel").textContent = adjustment
      ? "New Counted Stock Quantity"
      : "Quantity";

    $("movementQuantity").min = adjustment ? "0" : "1";
  }

  function openMovementForm(productId = "") {
    movementForm.reset();
    populateProductSelect(productId);
    updateQuantityLabel();
    movementFormPanel.hidden = false;
    $("movementQuantity").focus();
  }

  function closeMovementForm() {
    movementForm.reset();
    movementFormPanel.hidden = true;
  }

  movementForm.addEventListener("submit", event => {
    event.preventDefault();

    const products = getProducts();
    const productId = $("movementProduct").value;

    const product = products.find(
      p => String(p.id) === productId
    );

    if (!product) {
      inventoryMessage.textContent =
        "Please select a valid product.";
      return;
    }

    const type = $("movementType").value;
    const quantity = Number($("movementQuantity").value);

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < (type === "adjustment" ? 0 : 1)
    ) {
      inventoryMessage.textContent =
        "Enter a valid whole-number quantity.";
      return;
    }

    const previous = Number(product.stock);

    if (!Number.isSafeInteger(previous) || previous < 0) {
      inventoryMessage.textContent =
        "The current stock quantity is invalid.";
      return;
    }

    let newStock;

    if (type === "in") {
      newStock = previous + quantity;
    } else if (type === "out") {
      newStock = previous - quantity;
    } else if (type === "adjustment") {
      newStock = quantity;
    } else {
      return;
    }

    if (
      !Number.isSafeInteger(newStock) ||
      newStock < 0
    ) {
      inventoryMessage.textContent =
        "Insufficient stock or invalid quantity.";
      return;
    }

    const movement = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      productId: product.id,
      productName: product.name,
      type,
      change: newStock - previous,
      balance: newStock,
      note: $("movementNote").value.trim()
    };

    const oldProducts = localStorage.getItem(PRODUCT_KEY);
    product.stock = newStock;

    if (!saveArray(PRODUCT_KEY, products)) return;

    const movements = getMovements();
    movements.push(movement);

    if (!saveArray(MOVEMENT_KEY, movements)) {
      // Roll back the product change if history cannot be saved.
      try {
        if (oldProducts === null) {
          localStorage.removeItem(PRODUCT_KEY);
        } else {
          localStorage.setItem(PRODUCT_KEY, oldProducts);
        }
      } catch {
        inventoryMessage.textContent =
          "Storage error: verify stock before retrying.";
      }
      return;
    }

    closeMovementForm();
    renderInventory();
    renderHistory();

    inventoryMessage.textContent =
      "Stock movement recorded successfully.";

    // Let other frontend modules refresh their cached data.
    window.dispatchEvent(new Event("trauts:stock-updated"));
  });

  $("recordMovementBtn").addEventListener(
    "click",
    () => openMovementForm()
  );

  $("cancelMovementBtn").addEventListener(
    "click",
    closeMovementForm
  );

  $("inventorySearch").addEventListener(
    "input",
    renderInventory
  );

  $("movementType").addEventListener(
    "change",
    updateQuantityLabel
  );

  // Called when the Inventory tab is opened.
  window.refreshTrautsInventory = () => {
    renderInventory();
    renderHistory();
  };

  window.addEventListener("storage", event => {
    if (
      event.key === PRODUCT_KEY ||
      event.key === MOVEMENT_KEY
    ) {
      window.refreshTrautsInventory();
    }
  });

  window.refreshTrautsInventory();
})();
