
/* TRAUTS SHOPKEEPER PORTAL — DEMO */

(() => {
  const PRODUCT_KEY = "trauts_demo_products_v1";
  const MOVEMENT_KEY = "trauts_demo_movements_v1";
  const SALES_KEY = "trauts_demo_sales_v1";

  // Temporary identity until backend authentication exists.
  const STAFF_ID = "demo-shopkeeper-1";

  const $ = id => document.getElementById(id);
  let cart = [];

  function readArray(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function products() {
    return readArray(PRODUCT_KEY);
  }

  function sales() {
    return readArray(SALES_KEY);
  }

  function ngwee(value) {
    return Math.round(Number(value) * 100);
  }

  function money(value) {
    return "K " + (value / 100).toFixed(2);
  }

  function cell(row, text) {
    const td = document.createElement("td");
    td.textContent = String(text);
    row.appendChild(td);
    return td;
  }

  function navigate(page) {
    document.querySelectorAll(".nav").forEach(btn => {
      btn.classList.toggle(
        "active",
        btn.dataset.page === page
      );
    });

    $("pageTitle").textContent = page;

    const pages = {
      "Dashboard": "shopDashboard",
      "New Sale": "shopSales",
      "Products": "shopProducts",
      "Stock Lookup": "shopInventory",
      "My Sales": "shopHistory"
    };

    Object.values(pages).forEach(id => {
      $(id).hidden = id !== pages[page];
    });

    refresh();
  }

  function renderDashboard() {
    const today = new Date().toDateString();

    const mine = sales().filter(sale =>
      sale.staffId === STAFF_ID &&
      new Date(sale.date).toDateString() === today
    );

    const revenue = mine.reduce(
      (sum, sale) => sum + sale.totalNgwee, 0
    );

    $("mySalesToday").textContent = money(revenue);
    $("myTransactionsToday").textContent = mine.length;
  }

  function renderProducts() {
    const query = $("shopProductSearch").value
      .trim().toLowerCase();

    const list = $("shopProductList");
    list.replaceChildren();

    products().filter(p =>
      `${p.name} ${p.sku}`.toLowerCase().includes(query)
    ).forEach(product => {
      const card = document.createElement("div");
      card.className = "shop-product-card";

      const title = document.createElement("h4");
      title.textContent = product.name;

      const sku = document.createElement("p");
      sku.textContent = `SKU: ${product.sku}`;

      const price = document.createElement("p");
      price.textContent =
        `Price: ${money(ngwee(product.price))}`;

      card.append(title, sku, price);
      list.appendChild(card);
    });
  }

  function renderInventory() {
    const tbody = $("shopStockTable");
    tbody.replaceChildren();

    products().forEach(product => {
      const row = document.createElement("tr");
      const stock = Number(product.stock);
      const threshold = Number(product.threshold ?? 5);

      cell(row, product.name);
      cell(row, product.sku);
      cell(row, stock);
      cell(
        row,
        stock === 0 ? "Out of Stock" :
        stock <= threshold ? "Low Stock" : "In Stock"
      );

      tbody.appendChild(row);
    });
  }

  function renderSaleProducts() {
    const query = $("shopPosSearch").value
      .trim().toLowerCase();

    const list = $("shopPosProducts");
    list.replaceChildren();

    products().filter(p =>
      `${p.name} ${p.sku}`.toLowerCase().includes(query)
    ).forEach(product => {
      const card = document.createElement("div");
      card.className = "pos-product";

      const title = document.createElement("h4");
      title.textContent = product.name;

      const price = document.createElement("p");
      price.textContent = money(ngwee(product.price));

      const stock = document.createElement("p");
      stock.textContent = `${product.stock} available`;

      const button = document.createElement("button");
      button.className = "pos-primary";
      button.textContent = "Add to Cart";
      button.disabled = Number(product.stock) <= 0;

      button.addEventListener("click", () => {
        addToCart(product);
      });

      card.append(title, price, stock, button);
      list.appendChild(card);
    });
  }

  function addToCart(product) {
    const existing = cart.find(
      item => String(item.id) === String(product.id)
    );

    const quantity = existing?.qty || 0;

    if (quantity >= Number(product.stock)) {
      $("shopPosMessage").textContent =
        "Insufficient stock.";
      return;
    }

    if (existing) {
      existing.qty++;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        priceNgwee: ngwee(product.price),
        qty: 1
      });
    }

    renderCart();
  }

  function changeQty(id, change) {
    const item = cart.find(
      p => String(p.id) === String(id)
    );

    if (!item) return;

    const product = products().find(
      p => String(p.id) === String(id)
    );

    const next = item.qty + change;

    if (change > 0 &&
        (!product || next > Number(product.stock))) {
      $("shopPosMessage").textContent =
        "Insufficient stock.";
      return;
    }

    if (next <= 0) {
      cart = cart.filter(p => String(p.id) !== String(id));
    } else {
      item.qty = next;
    }

    renderCart();
  }

  function totals() {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.priceNgwee * item.qty,
      0
    );

    const discount = ngwee($("shopDiscount").value);
    const total = subtotal - discount;
    const received = ngwee($("shopReceived").value);

    return { subtotal, discount, total, received };
  }

  function renderCart() {
    const container = $("shopCart");
    container.replaceChildren();

    cart.forEach(item => {
      const row = document.createElement("div");
      row.className = "pos-cart-row";

      const details = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = item.name;

      const price = document.createElement("small");
      price.textContent =
        money(item.priceNgwee * item.qty);

      details.append(name, document.createElement("br"), price);

      const controls = document.createElement("div");
      controls.className = "pos-quantity";

      const minus = document.createElement("button");
      minus.textContent = "−";
      minus.addEventListener("click", () => {
        changeQty(item.id, -1);
      });

      const count = document.createElement("span");
      count.textContent = item.qty;

      const plus = document.createElement("button");
      plus.textContent = "+";
      plus.addEventListener("click", () => {
        changeQty(item.id, 1);
      });

      controls.append(minus, count, plus);
      row.append(details, controls);
      container.appendChild(row);
    });

    const { subtotal, discount, total, received } = totals();

    $("shopSubtotal").textContent = money(subtotal);
    $("shopTotal").textContent = money(Math.max(0, total));
    $("shopChange").textContent =
      money(Math.max(0, received - total));

    $("shopCheckoutBtn").disabled =
      cart.length === 0 ||
      !Number.isSafeInteger(discount) ||
      discount < 0 ||
      discount > subtotal ||
      !Number.isSafeInteger(received) ||
      received < total;
  }

  function completeSale() {
    const { subtotal, discount, total, received } = totals();

    if (
      !cart.length ||
      !Number.isSafeInteger(discount) ||
      discount < 0 ||
      discount > subtotal ||
      !Number.isSafeInteger(received) ||
      received < total
    ) {
      $("shopPosMessage").textContent =
        "Check cart and payment amount.";
      return;
    }

    const allProducts = products();
    const movements = readArray(MOVEMENT_KEY);
    const allSales = sales();

    for (const item of cart) {
      const product = allProducts.find(
        p => String(p.id) === String(item.id)
      );

      if (
        !product ||
        Number(product.stock) < item.qty ||
        ngwee(product.price) !== item.priceNgwee
      ) {
        $("shopPosMessage").textContent =
          "Stock or price changed. Review the cart.";
        return;
      }
    }

    const date = new Date().toISOString();
    const receiptNo =
      "TR-" + Date.now() + "-" +
      Math.random().toString(36).slice(2, 6).toUpperCase();

    const sale = {
      id: crypto.randomUUID(),
      receiptNo,
      date,
      staffId: STAFF_ID,
      items: cart.map(item => ({ ...item })),
      subtotalNgwee: subtotal,
      discountNgwee: discount,
      totalNgwee: total,
      receivedNgwee: received,
      changeNgwee: received - total,
      paymentMethod: $("shopPayment").value
    };

    cart.forEach(item => {
      const product = allProducts.find(
        p => String(p.id) === String(item.id)
      );

      product.stock -= item.qty;

      movements.push({
        id: crypto.randomUUID(),
        date,
        productId: product.id,
        productName: product.name,
        type: "out",
        change: -item.qty,
        balance: product.stock,
        note: `Sale ${receiptNo}`
      });
    });

    const keys = [
      PRODUCT_KEY,
      MOVEMENT_KEY,
      SALES_KEY
    ];

    const originals = keys.map(
      key => localStorage.getItem(key)
    );

    try {
      save(PRODUCT_KEY, allProducts);
      save(MOVEMENT_KEY, movements);
      save(SALES_KEY, [...allSales, sale]);
    } catch {
      keys.forEach((key, index) => {
        try {
          if (originals[index] === null) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, originals[index]);
          }
        } catch {
          // Storage recovery is best-effort only.
        }
      });

      $("shopPosMessage").textContent =
        "Checkout failed. Verify stock before retrying.";
      return;
    }

    cart = [];
    $("shopDiscount").value = "0";
    $("shopReceived").value = "0";

    $("shopPosMessage").textContent =
      `Sale completed: ${receiptNo}`;

    refresh();
  }

  function renderHistory() {
    const tbody = $("shopSalesTable");
    tbody.replaceChildren();

    sales()
      .filter(sale => sale.staffId === STAFF_ID)
      .reverse()
      .forEach(sale => {
        const row = document.createElement("tr");

        cell(row, sale.receiptNo);
        cell(row, new Date(sale.date).toLocaleString());
        cell(
          row,
          sale.items.reduce(
            (sum, item) => sum + item.qty, 0
          )
        );
        cell(row, money(sale.totalNgwee));

        tbody.appendChild(row);
      });
  }

  function refresh() {
    renderDashboard();
    renderProducts();
    renderInventory();
    renderSaleProducts();
    renderCart();
    renderHistory();
  }

  document.querySelectorAll(".nav").forEach(btn => {
    btn.addEventListener("click", () => {
      navigate(btn.dataset.page);
    });
  });

  document.querySelectorAll("[data-go]").forEach(btn => {
    btn.addEventListener("click", () => {
      navigate(btn.dataset.go);
    });
  });

  $("shopProductSearch").addEventListener(
    "input", renderProducts
  );

  $("shopPosSearch").addEventListener(
    "input", renderSaleProducts
  );

  $("shopDiscount").addEventListener(
    "input", renderCart
  );

  $("shopReceived").addEventListener(
    "input", renderCart
  );

  $("shopCheckoutBtn").addEventListener(
    "click", completeSale
  );

  $("shopNewSaleBtn").addEventListener("click", () => {
    cart = [];
    $("shopDiscount").value = "0";
    $("shopReceived").value = "0";
    $("shopPosMessage").textContent = "";
    renderCart();
  });

  $("logoutBtn").addEventListener("click", () => {
    window.location.href = "index.html";
  });

  window.addEventListener("storage", refresh);

  if (window.lucide) {
    lucide.createIcons();
  }

  navigate("Dashboard");
})();
