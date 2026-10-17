/* ==========================================
   TRAUTS PRODUCTS MANAGEMENT
   ========================================== */

const PRODUCT_KEY = "trauts_demo_products_v1";

const defaultProducts = [
  {
    id: 1,
    name: "Cooking Oil 2L",
    sku: "OIL-002",
    type: "physical",
    category: "Groceries",
    unit: "piece",
    cost: 75,
    price: 95,
    buyingPrice: 75,
    sellingPrice: 95,
    stock: 24,
    threshold: 5,
    expiryDate: "",
    variants: []
  },
  {
    id: 2,
    name: "Sugar 2kg",
    sku: "SUG-002",
    type: "physical",
    category: "Groceries",
    unit: "piece",
    cost: 48,
    price: 62,
    buyingPrice: 48,
    sellingPrice: 62,
    stock: 18,
    threshold: 5,
    expiryDate: "",
    variants: []
  },
  {
    id: 3,
    name: "Laundry Soap",
    sku: "SOAP-001",
    type: "physical",
    category: "Household",
    unit: "piece",
    cost: 18,
    price: 28,
    buyingPrice: 18,
    sellingPrice: 28,
    stock: 4,
    threshold: 5,
    expiryDate: "",
    variants: []
  }
];

function loadProducts() {
  try {
    const saved = localStorage.getItem(PRODUCT_KEY);

    if (!saved) {
      return defaultProducts.map(p => ({ ...p }));
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid products data");
    }

    return parsed.map(p => {
      const cost = Number(
        p.cost ?? p.buyingPrice ?? 0
      );

      const price = Number(
        p.price ?? p.sellingPrice ?? 0
      );

      return {
        ...p,
        type: p.type || "physical",
        unit: p.unit || "piece",
        category: p.category || "General",
        cost,
        price,
        buyingPrice: cost,
        sellingPrice: price,
        stock: Number(p.stock ?? 0),
        threshold: Number(p.threshold ?? 5),
        expiryDate: p.expiryDate || "",
        variants: Array.isArray(p.variants)
          ? p.variants
          : []
      };
    });
  } catch (error) {
    console.error("Error loading products:", error);
    return defaultProducts.map(p => ({ ...p }));
  }
}

let products = loadProducts();

const productTable =
  document.getElementById("productTable");

const productSearch =
  document.getElementById("productSearch");

const categoryFilter =
  document.getElementById("categoryFilter");

const productMessage =
  document.getElementById("productMessage");

function formatKwacha(value) {
  return "K " + Number(value || 0).toLocaleString(
    "en-ZM",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

function isLowStock(product) {
  return product.type !== "service" &&
    Number(product.stock) <=
    Number(product.threshold);
}

function updateProductStats() {
  document.getElementById("productCount").textContent =
    products.length;

  document.getElementById("categoryCount").textContent =
    new Set(products.map(p => p.category)).size;

  document.getElementById("lowStockCount").textContent =
    products.filter(isLowStock).length;
}

function updateCategoryFilter() {
  const selected = categoryFilter.value;

  const categories = [
    ...new Set(
      products.map(p => p.category).filter(Boolean)
    )
  ].sort();

  categoryFilter.replaceChildren(
    new Option("All Categories", "")
  );

  categories.forEach(category => {
    categoryFilter.add(
      new Option(category, category)
    );
  });

  categoryFilter.value =
    categories.includes(selected) ? selected : "";
}

function renderProducts() {
  updateCategoryFilter();
  updateProductStats();

  productTable.replaceChildren();

  const search =
    productSearch.value.trim().toLowerCase();

  const category = categoryFilter.value;

  const filtered = products.filter(product => {
    const matchesSearch = [
      product.name,
      product.sku,
      product.category,
      product.unit
    ].some(value =>
      String(value || "")
        .toLowerCase()
        .includes(search)
    );

    const matchesCategory =
      !category || product.category === category;

    return matchesSearch && matchesCategory;
  });

  filtered.forEach(product => {
    const row = document.createElement("tr");

    function addCell(value) {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.appendChild(cell);
      return cell;
    }

    addCell(product.name);
    addCell(product.sku);
    addCell(product.category);
    addCell(formatKwacha(product.cost));
    addCell(formatKwacha(product.price));

    const stockCell = addCell(
      product.type === "service"
        ? "N/A"
        : product.stock
    );

    stockCell.className = isLowStock(product)
      ? "stock-low"
      : "stock-ok";

    const actions = document.createElement("td");

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "product-action";
    editButton.textContent = "Edit";

    editButton.addEventListener("click", () => {
      window.openUniversalProductForm?.(product.id);
    });

    const deleteButton =
      document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "product-action delete";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
      deleteProduct(product.id);
    });

    actions.append(editButton, deleteButton);
    row.appendChild(actions);
    productTable.appendChild(row);
  });

  if (filtered.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 7;
    cell.textContent = "No products found.";

    row.appendChild(cell);
    productTable.appendChild(row);
  }
}

function deleteProduct(id) {
  const product = products.find(p => p.id === id);

  if (!product) return;

  if (!confirm(`Delete ${product.name}?`)) {
    return;
  }

  const updated = products.filter(p => p.id !== id);

  try {
    localStorage.setItem(
      PRODUCT_KEY,
      JSON.stringify(updated)
    );
  } catch (error) {
    productMessage.textContent =
      "Could not delete product. Storage unavailable.";
    return;
  }

  products = updated;
  renderProducts();

  productMessage.textContent =
    "Product deleted successfully.";

  window.dispatchEvent(
    new Event("trauts:stock-updated")
  );

  window.dispatchEvent(
    new Event("trauts:products-updated")
  );
}

function reloadProducts() {
  products = loadProducts();
  renderProducts();
}

window.refreshTrautsProducts = reloadProducts;

document.getElementById("addProductBtn")
  .addEventListener("click", () => {
    window.openUniversalProductForm?.();
  });

productSearch.addEventListener(
  "input",
  renderProducts
);

categoryFilter.addEventListener(
  "change",
  renderProducts
);

window.addEventListener(
  "trauts:products-updated",
  reloadProducts
);

window.addEventListener(
  "storage",
  event => {
    if (event.key === PRODUCT_KEY) {
      reloadProducts();
    }
  }
);

renderProducts();
