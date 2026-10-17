/* ============================================
   TRAUTS SHOP MANAGER
   EXPENSES MANAGEMENT MODULE
   ============================================ */

(() => {
  "use strict";

  const EXPENSES_KEY = "trauts_demo_expenses_v1";

  const CATEGORIES = [
    "Rent",
    "Electricity",
    "Water",
    "Transport",
    "Salaries & Wages",
    "Internet & Airtime",
    "Marketing",
    "Maintenance",
    "Office Supplies",
    "Bank & Transaction Fees",
    "Taxes & Licences",
    "Other"
  ];

  const $ = id => document.getElementById(id);

  function readExpenses() {
    try {
      const data = JSON.parse(
        localStorage.getItem(EXPENSES_KEY)
      );

      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveExpenses(expenses) {
    localStorage.setItem(
      EXPENSES_KEY,
      JSON.stringify(expenses)
    );

    window.dispatchEvent(
      new Event("trauts:expenses-updated")
    );
  }

  function uid() {
    return crypto.randomUUID();
  }

  function localDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function moneyFromNgwee(ngwee) {
    return "K " + (ngwee / 100).toLocaleString(
      "en-ZM",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
  }

  function make(tag, text, className) {
    const element = document.createElement(tag);

    if (text !== undefined) {
      element.textContent = String(text);
    }

    if (className) {
      element.className = className;
    }

    return element;
  }

  function addCell(row, value) {
    const td = make("td", value);
    row.appendChild(td);
    return td;
  }

  function showMessage(text, isError = false) {
    const message = $("expMessage");
    message.textContent = text;
    message.style.color = isError
      ? "#b91c1c"
      : "#166534";
  }

  // ==========================================
  // CREATE SIDEBAR NAVIGATION
  // ==========================================

  const sidebar = document.querySelector(".sidebar-nav");
  const main = document.querySelector("main.main");

  if (!sidebar || !main) {
    console.error("TRAUTS dashboard layout not found.");
    return;
  }

  const nav = sidebar.querySelector(
  '[data-page="Expenses"]'
    ) || document.createElement("button");

  nav.type = "button";
  nav.className = "nav";
  nav.dataset.page = "Expenses";

  nav.innerHTML = `
    <i data-lucide="wallet"></i>
    <span>Expenses</span>
  `;

  const supplierNav = sidebar.querySelector(
    '[data-page="Suppliers & Purchases"]'
  );

  if (!nav.isConnected) {
  if (supplierNav) {
    supplierNav.insertAdjacentElement("afterend", nav);
  } else {
    sidebar.appendChild(nav);
  }
}

  // ==========================================
  // CREATE EXPENSES PAGE
  // ==========================================

  const page = document.createElement("section");

  page.id = "expensesPage";
  page.hidden = true;

  page.innerHTML = `
    <div class="exp-header">
      <div>
        <h2>Expenses Management</h2>
        <p>
          Record and monitor business operating expenses
        </p>
      </div>

      <button id="expAddBtn"
        class="exp-primary" type="button">
        + Record Expense
      </button>
    </div>

    <div class="exp-stats">

      <article class="exp-stat">
        <p>Total Expenses</p>
        <h2 id="expTotal">K 0.00</h2>
      </article>

      <article class="exp-stat">
        <p>This Month</p>
        <h2 id="expThisMonth">K 0.00</h2>
      </article>

      <article class="exp-stat">
        <p>Expense Records</p>
        <h2 id="expCount">0</h2>
      </article>

      <article class="exp-stat">
        <p>Filtered Total</p>
        <h2 id="expFilteredTotal">K 0.00</h2>
      </article>

    </div>

    <section class="exp-panel"
      id="expFormPanel" hidden>

      <h3 id="expFormTitle">Record Expense</h3>

      <form id="expForm" class="exp-form">

        <div class="exp-field">
          <label for="expDate">Expense Date *</label>
          <input id="expDate" type="date" required>
        </div>

        <div class="exp-field">
          <label for="expCategory">Category *</label>
          <select id="expCategory" required></select>
        </div>

        <div class="exp-field">
          <label for="expAmount">Amount (K) *</label>
          <input id="expAmount"
            type="number" min="0.01"
            step="0.01" required>
        </div>

        <div class="exp-field">
          <label for="expPaymentMethod">
            Payment Method
          </label>
          <select id="expPaymentMethod">
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank_transfer">
              Bank Transfer
            </option>
            <option value="card">Card</option>
          </select>
        </div>

        <div class="exp-field">
          <label for="expReference">
            Receipt / Reference
          </label>
          <input id="expReference" maxlength="100"
            placeholder="Optional">
        </div>

        <div class="exp-field">
          <label for="expPaidTo">
            Paid To
          </label>
          <input id="expPaidTo" maxlength="120"
            placeholder="e.g. Landlord">
        </div>

        <div class="exp-field exp-full">
          <label for="expDescription">
            Description *
          </label>
          <textarea id="expDescription"
            rows="3" maxlength="400"
            placeholder="What was this expense for?"
            required></textarea>
        </div>

        <div class="exp-actions exp-full">
          <button class="exp-primary"
            type="submit">
            Save Expense
          </button>

          <button id="expCancelBtn"
            class="exp-secondary"
            type="button">
            Cancel
          </button>
        </div>

      </form>
    </section>

    <section class="exp-panel">
      <h3>Filter Expenses</h3>

      <div class="exp-filters">

        <div class="exp-field">
          <label for="expSearch">
            Search
          </label>
          <input id="expSearch"
            type="search"
            placeholder="Description, recipient, reference...">
        </div>

        <div class="exp-field">
          <label for="expCategoryFilter">
            Category
          </label>
          <select id="expCategoryFilter"></select>
        </div>

        <div class="exp-field">
          <label for="expStartDate">
            From Date
          </label>
          <input id="expStartDate" type="date">
        </div>

        <div class="exp-field">
          <label for="expEndDate">
            To Date
          </label>
          <input id="expEndDate" type="date">
        </div>

        <div class="exp-actions exp-full">
          <button id="expClearFilters"
            class="exp-secondary"
            type="button">
            Clear Filters
          </button>
        </div>

      </div>
    </section>

    <section class="exp-panel">

      <div class="exp-toolbar">
        <h3>Expense History</h3>
      </div>

      <div class="exp-table-wrap">
        <table class="exp-table">

          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Paid To</th>
              <th>Payment</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody id="expTable"></tbody>

        </table>
      </div>

    </section>

    <p id="expMessage"
      class="exp-message"
      role="status"></p>
  `;

    // Find the placeholder page in dashboard.html
    const placeholder = document.getElementById("modulePage");

    // Add the Expenses page to the Dashboard
    if (placeholder && placeholder.parentElement === main) {
    main.insertBefore(page, placeholder);
    } else {
    main.appendChild(page);
    }

  // ==========================================
  // NAVIGATION
  // ==========================================

  nav.addEventListener("click", () => {
    sidebar.querySelectorAll(".nav")
      .forEach(button => {
        button.classList.remove("active");
      });

    nav.classList.add("active");

    [
      "overview",
      "productsPage",
      "salesPage",
      "inventoryPage",
      "suppliersPurchasesPage",
      "accountsPage",
      "reportsPage",
      "settingsPage",
      "modulePage"
    ].forEach(id => {
      const section = $(id);
      if (section) section.hidden = true;
    });

    page.hidden = false;
    $("pageTitle").textContent = "Expenses";

    renderExpenses();
  });

  sidebar.querySelectorAll(".nav")
    .forEach(button => {
      if (button === nav) return;

      button.addEventListener("click", () => {
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

  // ==========================================
  // CATEGORY OPTIONS
  // ==========================================

  const categorySelect = $("expCategory");
  const categoryFilter = $("expCategoryFilter");

  categorySelect.replaceChildren(
    new Option("Select category", "")
  );

  categoryFilter.replaceChildren(
    new Option("All Categories", "")
  );

  CATEGORIES.forEach(category => {
    categorySelect.add(
      new Option(category, category)
    );

    categoryFilter.add(
      new Option(category, category)
    );
  });

  // ==========================================
  // ADD / EDIT EXPENSE
  // ==========================================

  let editingExpenseId = null;

  function openExpenseForm(expenseId = null) {
    editingExpenseId = expenseId;

    $("expForm").reset();
    $("expDate").value = localDate();

    $("expFormTitle").textContent =
      expenseId === null
        ? "Record Expense"
        : "Edit Expense";

    if (expenseId !== null) {
      const expense = readExpenses().find(
        item => item.id === expenseId
      );

      if (!expense) {
        showMessage("Expense not found.", true);
        return;
      }

      $("expDate").value = expense.date;
      $("expCategory").value = expense.category;

      $("expAmount").value =
        (expense.amountNgwee / 100).toFixed(2);

      $("expPaymentMethod").value =
        expense.paymentMethod;

      $("expReference").value =
        expense.reference || "";

      $("expPaidTo").value =
        expense.paidTo || "";

      $("expDescription").value =
        expense.description;
    }

    $("expFormPanel").hidden = false;

    $("expFormPanel").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    $("expDate").focus();
  }

  $("expAddBtn").addEventListener("click", () => {
    openExpenseForm();
  });

  $("expCancelBtn").addEventListener("click", () => {
    $("expFormPanel").hidden = true;
    editingExpenseId = null;
  });

  $("expForm").addEventListener("submit", event => {
    event.preventDefault();

    const date = $("expDate").value;
    const category = $("expCategory").value;
    const description =
      $("expDescription").value.trim();

    const paidTo = $("expPaidTo").value.trim();
    const reference =
      $("expReference").value.trim();

    const paymentMethod =
      $("expPaymentMethod").value;

    const amount = Number(
      $("expAmount").value
    );

    const amountNgwee = Math.round(amount * 100);

    if (!date || !category || !description) {
      showMessage(
        "Complete all required fields.",
        true
      );
      return;
    }

    if (
      !Number.isFinite(amount) ||
      !Number.isSafeInteger(amountNgwee) ||
      amountNgwee <= 0
    ) {
      showMessage(
        "Enter a valid expense amount.",
        true
      );
      return;
    }

    const expenses = readExpenses();

    const expenseData = {
      date,
      category,
      description,
      paidTo,
      reference,
      paymentMethod,
      amountNgwee
    };

    if (editingExpenseId !== null) {
      const index = expenses.findIndex(
        item => item.id === editingExpenseId
      );

      if (index === -1) {
        showMessage("Expense not found.", true);
        return;
      }

      expenses[index] = {
        ...expenses[index],
        ...expenseData,
        updatedAt: new Date().toISOString()
      };
    } else {
      expenses.push({
        id: uid(),
        ...expenseData,
        createdAt: new Date().toISOString()
      });
    }

    try {
      saveExpenses(expenses);
    } catch (error) {
      console.error(error);
      showMessage(
        "Could not save expense. Browser storage unavailable.",
        true
      );
      return;
    }

    editingExpenseId = null;
    $("expFormPanel").hidden = true;

    renderExpenses();

    showMessage("Expense saved successfully.");
  });

  // ==========================================
  // DELETE EXPENSE
  // ==========================================

  function deleteExpense(expenseId) {
    const expenses = readExpenses();

    const expense = expenses.find(
      item => item.id === expenseId
    );

    if (!expense) return;

    const confirmed = confirm(
      `Delete this ${expense.category} expense of ` +
      `${moneyFromNgwee(expense.amountNgwee)}?`
    );

    if (!confirmed) return;

    const updated = expenses.filter(
      item => item.id !== expenseId
    );

    try {
      saveExpenses(updated);
    } catch {
      showMessage(
        "Could not delete expense.",
        true
      );
      return;
    }

    if (editingExpenseId === expenseId) {
      editingExpenseId = null;
      $("expFormPanel").hidden = true;
    }

    renderExpenses();
    showMessage("Expense deleted.");
  }

  // ==========================================
  // FILTERS
  // ==========================================

  function getFilteredExpenses(expenses) {
    const search =
      $("expSearch").value.trim().toLowerCase();

    const category =
      $("expCategoryFilter").value;

    const startDate =
      $("expStartDate").value;

    const endDate =
      $("expEndDate").value;

    return expenses.filter(expense => {
      const matchesSearch = [
        expense.description,
        expense.paidTo,
        expense.reference,
        expense.category
      ].some(value =>
        String(value || "")
          .toLowerCase()
          .includes(search)
      );

      const matchesCategory =
        !category || expense.category === category;

      const matchesStart =
        !startDate || expense.date >= startDate;

      const matchesEnd =
        !endDate || expense.date <= endDate;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStart &&
        matchesEnd
      );
    });
  }

  [
    "expSearch",
    "expCategoryFilter",
    "expStartDate",
    "expEndDate"
  ].forEach(id => {
    const control = $(id);

    control.addEventListener(
      id === "expSearch" ? "input" : "change",
      renderExpenses
    );
  });

  $("expClearFilters").addEventListener("click", () => {
    $("expSearch").value = "";
    $("expCategoryFilter").value = "";
    $("expStartDate").value = "";
    $("expEndDate").value = "";

    renderExpenses();
  });

  // ==========================================
  // RENDER EXPENSES
  // ==========================================

  function renderExpenses() {
    const expenses = readExpenses();

    const filtered = getFilteredExpenses(expenses);

    const currentMonth =
      localDate().slice(0, 7);

    const total = expenses.reduce(
      (sum, expense) =>
        sum + expense.amountNgwee,
      0
    );

    const monthlyTotal = expenses
      .filter(expense =>
        expense.date.startsWith(currentMonth)
      )
      .reduce(
        (sum, expense) =>
          sum + expense.amountNgwee,
        0
      );

    const filteredTotal = filtered.reduce(
      (sum, expense) =>
        sum + expense.amountNgwee,
      0
    );

    $("expTotal").textContent =
      moneyFromNgwee(total);

    $("expThisMonth").textContent =
      moneyFromNgwee(monthlyTotal);

    $("expCount").textContent =
      expenses.length;

    $("expFilteredTotal").textContent =
      moneyFromNgwee(filteredTotal);

    const tbody = $("expTable");
    tbody.replaceChildren();

    const sorted = [...filtered].sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.createdAt.localeCompare(a.createdAt)
    );

    sorted.forEach(expense => {
      const row = make("tr");

      addCell(row, expense.date);
      addCell(row, expense.category);
      addCell(row, expense.description);
      addCell(row, expense.paidTo || "—");

      const methodNames = {
        cash: "Cash",
        mobile_money: "Mobile Money",
        bank_transfer: "Bank Transfer",
        card: "Card"
      };

      addCell(
        row,
        methodNames[expense.paymentMethod] ||
        expense.paymentMethod
      );

      addCell(
        row,
        moneyFromNgwee(expense.amountNgwee)
      );

      const actionsCell = make("td");
      const actions = make(
        "div",
        undefined,
        "exp-row-actions"
      );

      const editButton = make(
        "button",
        "Edit",
        "exp-secondary"
      );

      editButton.type = "button";

      editButton.addEventListener("click", () => {
        openExpenseForm(expense.id);
      });

      const deleteButton = make(
        "button",
        "Delete",
        "exp-danger"
      );

      deleteButton.type = "button";

      deleteButton.addEventListener("click", () => {
        deleteExpense(expense.id);
      });

      actions.append(editButton, deleteButton);
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);

      tbody.appendChild(row);
    });

    if (!sorted.length) {
      const row = make("tr");
      const td = make(
        "td",
        "No expenses found.",
        "exp-empty"
      );

      td.colSpan = 7;
      row.appendChild(td);
      tbody.appendChild(row);
    }
  }

  // ==========================================
  // EXTERNAL REFRESH SUPPORT
  // ==========================================

  window.refreshTrautsExpenses = renderExpenses;

  window.addEventListener(
    "storage",
    event => {
      if (event.key === EXPENSES_KEY) {
        renderExpenses();
      }
    }
  );

  renderExpenses();
})();
