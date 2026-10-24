
/* ==========================================
   TRAUTS UNIVERSAL PRODUCT FORM
   ADD + EDIT PRODUCTS
   ========================================== */

(() => {
  const PRODUCT_KEY = "trauts_demo_products_v1";
  const SETTINGS_KEY = "trauts_demo_settings_v1";

  const $ = id => document.getElementById(id);

  const modal = $("universalProductModal");
  const form = $("universalProductForm");

  if (!modal || !form) {
    console.error("Universal product form not found.");
    return;
  }

  let editingId = null;
  let lastFocusedElement = null;

  function readProducts() {
    try {
      const data = JSON.parse(
        localStorage.getItem(PRODUCT_KEY)
      );

      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function getDefaultThreshold() {
    try {
      const settings = JSON.parse(
        localStorage.getItem(SETTINGS_KEY)
      );

      const value = Number(
        settings?.lowStockThreshold ?? 5
      );

      return Number.isSafeInteger(value) && value >= 0
        ? value
        : 5;
    } catch {
      return 5;
    }
  }

  function parseOptions(value) {
    return [
      ...new Set(
        value.split(",")
          .map(item => item.trim())
          .filter(Boolean)
      )
    ];
  }

  function updateTypeFields() {
    const isService =
      $("universalType").value === "service";

    $("universalStockGroup").hidden = isService;
    $("universalThresholdGroup").hidden = isService;
    $("universalExpiryGroup").hidden = isService;
    $("universalVariantsGroup").hidden = isService;

    if (isService) {
      $("universalUnit").value = "service";
    } else if ($("universalUnit").value === "service") {
      $("universalUnit").value = "piece";
    }
  }

  function getProductVariants(product) {
    if (!Array.isArray(product.variants)) {
      return { sizes: [], colors: [] };
    }

    const first = product.variants[0];

    if (!first) {
      return { sizes: [], colors: [] };
    }

    return {
      sizes: Array.isArray(first.sizes)
        ? first.sizes
        : [],
      colors: Array.isArray(first.colors)
        ? first.colors
        : []
    };
  }

  function openForm(productId = null) {
    lastFocusedElement = document.activeElement;
    editingId = productId;

    form.reset();

    $("universalProductMessage").textContent = "";
    $("universalThreshold").value =
      getDefaultThreshold();

    $("universalFormTitle").textContent =
      productId === null
        ? "Add Product"
        : "Edit Product";

    $("universalVariantFields").hidden = true;

    if (productId !== null) {
      const product = readProducts().find(
        item => item.id === productId
      );

      if (!product) {
        alert("Product not found.");
        return;
      }

      $("universalName").value = product.name || "";
      $("universalSku").value = product.sku || "";
      $("universalType").value =
        product.type || "physical";

      $("universalCategory").value =
        product.category || "";

      $("universalUnit").value =
        product.unit || "piece";

      $("universalBuyingPrice").value =
        product.cost ?? product.buyingPrice ?? 0;

      $("universalSellingPrice").value =
        product.price ?? product.sellingPrice ?? 0;

      $("universalStock").value =
        product.stock ?? 0;

      $("universalThreshold").value =
        product.threshold ?? 5;

      $("universalExpiry").value =
        product.expiryDate || "";

      const variants = getProductVariants(product);

      const hasVariants =
        variants.sizes.length > 0 ||
        variants.colors.length > 0;

      $("universalHasVariants").checked =
        hasVariants;

      $("universalSizes").value =
        variants.sizes.join(", ");

      $("universalColors").value =
        variants.colors.join(", ");

      $("universalVariantFields").hidden =
        !hasVariants;
    }

    updateTypeFields();

    modal.hidden = false;
    document.body.style.overflow = "hidden";

    $("universalName").focus();
  }

  function closeForm() {
    modal.hidden = true;
    document.body.style.overflow = "";

    editingId = null;

    lastFocusedElement?.focus?.();
  }

  function saveProduct(event) {
    event.preventDefault();

    const message = $("universalProductMessage");
    message.textContent = "";

    const type = $("universalType").value;

    // Services require POS support first.
    if (type === "service") {
      message.textContent =
        "Service products will be enabled after " +
        "we upgrade the Point of Sale module.";
      return;
    }

    const name = $("universalName").value.trim();
    const sku = $("universalSku").value.trim();

    const category =
      $("universalCategory").value.trim();

    const unit = $("universalUnit").value;

    const cost = Number(
      $("universalBuyingPrice").value
    );

    const price = Number(
      $("universalSellingPrice").value
    );

    const stock = Number(
      $("universalStock").value
    );

    const threshold = Number(
      $("universalThreshold").value
    );

    if (!name || !sku || !category) {
      message.textContent =
        "Please complete all required fields.";
      return;
    }

    if (
      $("universalBuyingPrice").value.trim() === "" ||
      $("universalSellingPrice").value.trim() === "" ||
      $("universalStock").value.trim() === "" ||
      $("universalThreshold").value.trim() === "" ||
      !Number.isFinite(cost) ||
      !Number.isFinite(price) ||
      cost < 0 ||
      price < 0 ||
      !Number.isSafeInteger(stock) ||
      stock < 0 ||
      !Number.isSafeInteger(threshold) ||
      threshold < 0
    ) {
      message.textContent =
        "Enter valid prices and non-negative " +
        "whole-number stock quantities.";
      return;
    }

    const products = readProducts();

    const duplicate = products.some(product =>
      String(product.sku).toLowerCase() ===
        sku.toLowerCase() &&
      product.id !== editingId
    );

    if (duplicate) {
      message.textContent =
        "A product with this SKU already exists.";
      return;
    }

    const hasVariants =
      $("universalHasVariants").checked;

    const variants = hasVariants
      ? [{
          sizes: parseOptions(
            $("universalSizes").value
          ),
          colors: parseOptions(
            $("universalColors").value
          )
        }]
      : [];

    const productData = {
      name,
      sku,
      type: "physical",
      category,
      unit,
      cost,
      price,
      buyingPrice: cost,
      sellingPrice: price,
      stock,
      threshold,
      expiryDate: $("universalExpiry").value,
      variants
    };

    if (editingId !== null) {
      const index = products.findIndex(
        product => product.id === editingId
      );

      if (index === -1) {
        message.textContent =
          "Product no longer exists.";
        return;
      }

      products[index] = {
        ...products[index],
        ...productData,
        updatedAt: new Date().toISOString()
      };
    } else {
      products.push({
        id: crypto.randomUUID(),
        ...productData,
        createdAt: new Date().toISOString()
      });
    }

    try {
      localStorage.setItem(
        PRODUCT_KEY,
        JSON.stringify(products)
      );
    } catch (error) {
      console.error("Save failed:", error);

      message.textContent =
        "Could not save product. Check browser storage.";
      return;
    }

    closeForm();

    window.dispatchEvent(
      new Event("trauts:products-updated")
    );

    window.dispatchEvent(
      new Event("trauts:stock-updated")
    );

    window.refreshTrautsInventory?.();
    window.refreshTrautsDashboard?.();

    const productMessage =
      document.getElementById("productMessage");

    if (productMessage) {
      productMessage.textContent =
        "Product saved successfully.";
    }
  }

  // ======================================
  // EVENT LISTENERS
  // ======================================

  $("universalType").addEventListener(
    "change",
    updateTypeFields
  );

  $("universalHasVariants").addEventListener(
    "change",
    () => {
      $("universalVariantFields").hidden =
        !$("universalHasVariants").checked;
    }
  );

  $("closeUniversalProduct").addEventListener(
    "click",
    closeForm
  );

  $("cancelUniversalProduct").addEventListener(
    "click",
    closeForm
  );

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closeForm();
    }
  });

  document.addEventListener("keydown", event => {
    if (modal.hidden) return;

    if (event.key === "Escape") {
      closeForm();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = [
      ...modal.querySelectorAll(
        "button:not([disabled]), " +
        "input:not([disabled]), " +
        "select:not([disabled]), " +
        "textarea:not([disabled])"
      )
    ].filter(element =>
      element.getClientRects().length > 0
    );

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (
      event.shiftKey &&
      document.activeElement === first
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      document.activeElement === last
    ) {
      event.preventDefault();
      first.focus();
    }
  });

  form.addEventListener("submit", saveProduct);

  window.openUniversalProductForm = openForm;
})();
