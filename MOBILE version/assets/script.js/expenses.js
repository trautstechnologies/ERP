
/* TRAUTS Android — Expenses (complete replacement)
   Integrated safe deletion; no duplicate patches or click interceptors.
   Existing storage keys and financial calculations are preserved. */
(() => {
  "use strict";

  const EXPENSES_KEY = "trauts_demo_expenses_v1";
  const DELETED_KEY = "trauts_demo_deleted_expenses_v1";
  const CATEGORIES = [
    "Rent", "Electricity", "Water", "Transport", "Salaries & Wages",
    "Internet & Airtime", "Marketing", "Maintenance", "Office Supplies",
    "Bank & Transaction Fees", "Taxes & Licences", "Other"
  ];
  const $ = id => document.getElementById(id);
  const sidebar = document.querySelector(".sidebar-nav");
  const main = document.querySelector("main.main");
  if (!sidebar || !main) return;

  function read(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }
  const readExpenses = () => read(EXPENSES_KEY);
  const readDeleted = () => read(DELETED_KEY);
  const uid = () => typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const money = ngwee => "K " + (Number(ngwee || 0) / 100)
    .toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function make(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }
  function cell(row, value) {
    row.appendChild(make("td", value));
  }
  function notifyFinancialViews() {
    window.dispatchEvent(new Event("trauts:expenses-updated"));
    window.refreshTrautsDashboard?.();
    window.refreshTrautsProfitLoss?.();
    window.refreshTrautsReports?.();
  }
  function saveExpenses(expenses) {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    notifyFinancialViews();
  }
  function message(text, error = false) {
    const target = $("expMessage");
    if (!target) return;
    target.textContent = text;
    const dark = document.documentElement.classList.contains("trauts-dark");
    target.style.color = error ? (dark ? "#fecaca" : "#b91c1c")
                               : (dark ? "#a7f3d0" : "#166534");
  }

  /* Reuse the existing navigation item; never add a duplicate. */
  let nav = sidebar.querySelector('[data-page="Expenses"]');
  if (!nav) {
    nav = make("button");
    nav.type = "button";
    nav.className = "nav";
    nav.dataset.page = "Expenses";
    nav.innerHTML = '<i data-lucide="wallet"></i><span>Expenses</span>';
    const suppliers = sidebar.querySelector('[data-page="Suppliers & Purchases"]');
    if (suppliers) suppliers.insertAdjacentElement("afterend", nav);
    else sidebar.appendChild(nav);
  }

  /* Original Expenses form IDs and classes are kept for mobile CSS. */
  const page = make("section");
  page.id = "expensesPage";
  page.hidden = true;
  page.innerHTML = `
    <div class="exp-header">
      <div><h2>Expenses Management</h2>
        <p>Record and monitor business operating expenses</p></div>
      <button id="expAddBtn" class="exp-primary" type="button">+ Record Expense</button>
    </div>
    <div class="exp-stats">
      <article class="exp-stat"><p>Total Expenses</p><h2 id="expTotal">K 0.00</h2></article>
      <article class="exp-stat"><p>This Month</p><h2 id="expThisMonth">K 0.00</h2></article>
      <article class="exp-stat"><p>Expense Records</p><h2 id="expCount">0</h2></article>
      <article class="exp-stat"><p>Filtered Total</p><h2 id="expFilteredTotal">K 0.00</h2></article>
    </div>
    <section id="expFormPanel" class="exp-panel" hidden>
      <h3 id="expFormTitle">Record Expense</h3>
      <form id="expForm" class="exp-form">
        <div class="exp-field"><label for="expDate">Expense Date *</label>
          <input id="expDate" type="date" required></div>
        <div class="exp-field"><label for="expCategory">Category *</label>
          <select id="expCategory" required></select></div>
        <div class="exp-field"><label for="expAmount">Amount (K) *</label>
          <input id="expAmount" type="number" min="0.01" step="0.01" required></div>
        <div class="exp-field"><label for="expPaymentMethod">Payment Method</label>
          <select id="expPaymentMethod">
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Card</option>
          </select></div>
        <div class="exp-field"><label for="expReference">Receipt / Reference</label>
          <input id="expReference" maxlength="100" placeholder="Optional"></div>
        <div class="exp-field"><label for="expPaidTo">Paid To</label>
          <input id="expPaidTo" maxlength="120" placeholder="e.g. Landlord"></div>
        <div class="exp-field exp-full"><label for="expDescription">Description *</label>
          <textarea id="expDescription" rows="3" maxlength="400"
            placeholder="What was this expense for?" required></textarea></div>
        <div class="exp-actions exp-full">
          <button class="exp-primary" type="submit">Save Expense</button>
          <button id="expCancelBtn" class="exp-secondary" type="button">Cancel</button>
        </div>
      </form>
    </section>
    <section class="exp-panel">
      <h3>Filter Expenses</h3>
      <div class="exp-filters">
        <div class="exp-field"><label for="expSearch">Search</label>
          <input id="expSearch" type="search" placeholder="Description, recipient, reference..."></div>
        <div class="exp-field"><label for="expCategoryFilter">Category</label>
          <select id="expCategoryFilter"></select></div>
        <div class="exp-field"><label for="expStartDate">From Date</label>
          <input id="expStartDate" type="date"></div>
        <div class="exp-field"><label for="expEndDate">To Date</label>
          <input id="expEndDate" type="date"></div>
        <div class="exp-actions exp-full">
          <button id="expClearFilters" class="exp-secondary" type="button">Clear Filters</button>
        </div>
      </div>
    </section>
    <section class="exp-panel">
      <div class="exp-toolbar"><h3>Expense History</h3></div>
      <div class="exp-table-wrap"><table class="exp-table">
        <thead><tr><th>Date</th><th>Category</th><th>Description</th>
          <th>Paid To</th><th>Payment</th><th>Amount</th><th>Actions</th></tr></thead>
        <tbody id="expTable"></tbody>
      </table></div>
    </section>
    <p id="expMessage" class="exp-message" role="status"></p>
    <details id="expDeletedHistory"><summary>Deleted Expenses History (0)</summary></details>
  `;
  const placeholder = $("modulePage");
  if (placeholder && placeholder.parentElement === main) main.insertBefore(page, placeholder);
  else main.appendChild(page);

  nav.addEventListener("click", () => {
    sidebar.querySelectorAll(".nav").forEach(item => item.classList.remove("active"));
    nav.classList.add("active");
    ["overview", "productsPage", "salesPage", "inventoryPage",
     "suppliersPurchasesPage", "accountsPage", "reportsPage",
     "settingsPage", "modulePage"].forEach(id => {
      if ($(id)) $(id).hidden = true;
    });
    page.hidden = false;
    if ($("pageTitle")) $("pageTitle").textContent = "Expenses";
    if ($("trautsPageTitle")) $("trautsPageTitle").textContent = "Expenses";
    renderExpenses();
  });
  sidebar.querySelectorAll(".nav").forEach(item => {
    if (item !== nav) item.addEventListener("click", () => { page.hidden = true; });
  });
  if (window.lucide?.createIcons) window.lucide.createIcons();
  else window.addEventListener("load", () => window.lucide?.createIcons?.());

  const category = $("expCategory");
  const categoryFilter = $("expCategoryFilter");
  category.add(new Option("Select category", ""));
  categoryFilter.add(new Option("All Categories", ""));
  CATEGORIES.forEach(name => {
    category.add(new Option(name, name));
    categoryFilter.add(new Option(name, name));
  });

  let editingId = null;
  function openExpense(expenseId = null) {
    $("expForm").reset();
    $("expDate").value = today();
    if (expenseId !== null) {
      const expense = readExpenses().find(e => String(e.id) === String(expenseId));
      if (!expense) { message("Expense not found.", true); return; }
      $("expDate").value = expense.date;
      $("expCategory").value = expense.category;
      $("expAmount").value = (expense.amountNgwee / 100).toFixed(2);
      $("expPaymentMethod").value = expense.paymentMethod;
      $("expReference").value = expense.reference || "";
      $("expPaidTo").value = expense.paidTo || "";
      $("expDescription").value = expense.description || "";
    }
    editingId = expenseId;
    $("expFormTitle").textContent = expenseId === null ? "Record Expense" : "Edit Expense";
    $("expFormPanel").hidden = false;
    $("expFormPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    $("expDate").focus();
  }
  $("expAddBtn").addEventListener("click", () => openExpense());
  $("expCancelBtn").addEventListener("click", () => {
    $("expFormPanel").hidden = true;
    editingId = null;
  });

  $("expForm").addEventListener("submit", event => {
    event.preventDefault();
    const date = $("expDate").value;
    const expenseCategory = $("expCategory").value;
    const description = $("expDescription").value.trim();
    const amount = Number($("expAmount").value);
    const amountNgwee = Math.round(amount * 100);
    if (!date || !expenseCategory || !description) {
      message("Complete all required fields.", true); return;
    }
    if (!Number.isFinite(amount) || !Number.isSafeInteger(amountNgwee) || amountNgwee <= 0) {
      message("Enter a valid expense amount.", true); return;
    }
    const expenses = readExpenses();
    const data = {
      date, category: expenseCategory, description,
      paidTo: $("expPaidTo").value.trim(),
      reference: $("expReference").value.trim(),
      paymentMethod: $("expPaymentMethod").value,
      amountNgwee
    };
    if (editingId !== null) {
      const index = expenses.findIndex(item => String(item.id) === String(editingId));
      if (index === -1) { message("Expense not found.", true); return; }
      expenses[index] = { ...expenses[index], ...data, updatedAt: new Date().toISOString() };
    } else {
      expenses.push({ id: uid(), ...data, createdAt: new Date().toISOString() });
    }
    try { saveExpenses(expenses); }
    catch (err) { console.error(err); message("Could not save expense.", true); return; }
    editingId = null;
    $("expFormPanel").hidden = true;
    renderExpenses();
    message("Expense saved successfully.");
  });

  /* Safe Delete: one handler, one dialog, no Android browser confirm(). */
  let pendingId = null;
  let pendingSnapshot = null;
  let returnFocus = null;
  const modal = make("div");
  modal.id = "expDeleteModal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "expDeleteTitle");
  modal.innerHTML = `
    <div class="exp-delete-card">
      <h2 id="expDeleteTitle">Delete Expense?</h2>
      <p id="expDeleteDetails"></p>
      <div class="exp-delete-warning"><strong>Warning</strong>
        <p>This will remove this expense from active records and update
          Expenses, Dashboard, Profit & Loss and Reports.</p>
        <p>The deleted expense and your reason will remain in Deleted Expenses History.
          Deleting a record does not refund an actual payment.</p>
      </div>
      <label for="expDeleteReason">Reason for deletion *</label>
      <textarea id="expDeleteReason" maxlength="300"
        placeholder="e.g. Duplicate expense recorded"></textarea>
      <p id="expDeleteError" role="alert"></p>
      <div class="exp-delete-actions">
        <button id="expKeepBtn" type="button">Keep Expense</button>
        <button id="expConfirmDeleteBtn" type="button">Delete Expense</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const style = make("style");
  style.id = "trautsExpensesDeleteStyles";
  style.textContent = `
    #expDeleteModal[hidden] { display: none !important; }
    #expDeleteModal { position: fixed; inset: 0; z-index: 45000;
      display: flex; align-items: center; justify-content: center;
      box-sizing: border-box; padding: 12px; background: rgba(5,15,29,.78); }
    #expDeleteModal .exp-delete-card { width: 100%; max-width: 480px;
      max-height: calc(100dvh - 24px); overflow-y: auto;
      box-sizing: border-box; padding: 19px 16px; border-radius: 16px;
      border: 1px solid #dfe6ef; background: #fff; color: #17283e;
      box-shadow: 0 18px 48px #0005; }
    #expDeleteModal h2 { margin: 0 0 10px; font-size: 21px; color: inherit; }
    #expDeleteModal p { font-size: 13px; line-height: 1.5;
      color: inherit; overflow-wrap: anywhere; }
    #expDeleteModal .exp-delete-warning { padding: 12px; border-radius: 11px;
      border: 1px solid #dc9d9d; background: #fff1f0; color: #872424; }
    #expDeleteModal .exp-delete-warning, #expDeleteModal .exp-delete-warning strong {
      color: #872424; }
    #expDeleteModal label { display: block; margin: 13px 0 6px; font-weight: 700; }
    #expDeleteReason { width: 100%; min-height: 82px; box-sizing: border-box;
      padding: 11px; font: inherit; font-size: 16px;
      border: 1px solid #bac8d9; border-radius: 10px;
      background: #fff; color: #17283e; }
    #expDeleteError { min-height: 16px; color: #991b1b !important; }
    #expDeleteModal .exp-delete-actions { display: grid;
      grid-template-columns: 1fr 1fr; gap: 9px; }
    #expDeleteModal .exp-delete-actions button { min-width: 0;
      min-height: 48px; border-radius: 10px; padding: 10px 8px;
      font: inherit; font-weight: 700; touch-action: manipulation; }
    #expKeepBtn { background: #edf2f8; color: #243952; border: 1px solid #bac8d9; }
    #expConfirmDeleteBtn { background: #b42318; color: #fff; border: 1px solid #b42318; }
    #expDeletedHistory { margin: 16px 0; padding: 14px; border-radius: 13px;
      border: 1px solid #dfe6ef; background: #fff; color: #17283e;
      overflow-wrap: anywhere; }
    #expDeletedHistory summary { cursor: pointer; font-size: 14px; font-weight: 700; }
    #expDeletedHistory .exp-deleted-item { display: grid; gap: 5px;
      padding: 12px 0; border-top: 1px solid #dfe6ef; font-size: 12px; }
    html.trauts-dark #expDeleteModal .exp-delete-card,
    html.trauts-dark #expDeletedHistory { background: #17283e !important;
      border-color: #364a63 !important; color: #e8eff9 !important; }
    html.trauts-dark #expDeleteModal .exp-delete-warning { background: #3c242c !important;
      border-color: #b45353 !important; color: #fecaca !important; }
    html.trauts-dark #expDeleteModal .exp-delete-warning strong { color: #fecaca !important; }
    html.trauts-dark #expDeleteReason { background: #0d1c2e !important;
      color: #e8eff9 !important; border-color: #52647b !important; }
    html.trauts-dark #expDeleteError { color: #fecaca !important; }
    html.trauts-dark #expKeepBtn { background: #29425e !important;
      color: #fff !important; border-color: #526c86 !important; }
    html.trauts-dark #expConfirmDeleteBtn { background: #b42318 !important;
      color: #fff !important; border-color: #de6d64 !important; }
    html.trauts-dark #expDeletedHistory .exp-deleted-item { border-color: #364a63 !important; }
  `;
  document.head.appendChild(style);

  function closeDelete() {
    modal.hidden = true;
    pendingId = null;
    pendingSnapshot = null;
    if (returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
  }
  function askDelete(expenseId) {
    const expense = readExpenses().find(item => String(item.id) === String(expenseId));
    if (!expense) { message("Expense not found.", true); renderExpenses(); return; }
    pendingId = expense.id;
    pendingSnapshot = JSON.stringify(expense);
    returnFocus = document.activeElement;
    $("expDeleteDetails").textContent =
      `${expense.category} • ${money(expense.amountNgwee)} • ${expense.date} • ${expense.description}`;
    $("expDeleteReason").value = "";
    $("expDeleteError").textContent = "";
    modal.hidden = false;
    $("expDeleteReason").focus();
  }
  $("expKeepBtn").addEventListener("click", closeDelete);
  modal.addEventListener("click", event => { if (event.target === modal) closeDelete(); });
  document.addEventListener("keydown", event => {
    if (!modal.hidden && event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeDelete();
    }
  }, true);
  $("expConfirmDeleteBtn").addEventListener("click", () => {
    const reason = $("expDeleteReason").value.trim();
    const error = $("expDeleteError");
    if (reason.length < 3) {
      error.textContent = "Please enter a reason of at least 3 characters.";
      return;
    }
    const expenses = readExpenses();
    const expense = expenses.find(item => String(item.id) === String(pendingId));
    if (!expense || JSON.stringify(expense) !== pendingSnapshot) {
      error.textContent = "Expense changed or disappeared. Close and retry.";
      return;
    }
    const records = readDeleted();
    records.push({ id: uid(), expenseId: expense.id, expense: { ...expense },
      reason, deletedAt: new Date().toISOString() });
    const remaining = expenses.filter(item => String(item.id) !== String(expense.id));
    const oldExpenses = localStorage.getItem(EXPENSES_KEY);
    const oldAudit = localStorage.getItem(DELETED_KEY);
    try {
      localStorage.setItem(DELETED_KEY, JSON.stringify(records));
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(remaining));
    } catch (err) {
      try {
        if (oldAudit === null) localStorage.removeItem(DELETED_KEY);
        else localStorage.setItem(DELETED_KEY, oldAudit);
        if (oldExpenses === null) localStorage.removeItem(EXPENSES_KEY);
        else localStorage.setItem(EXPENSES_KEY, oldExpenses);
      } catch (rollback) { console.error("TRAUTS rollback issue", rollback); }
      error.textContent = "Could not save deletion. Please verify stored expenses.";
      return;
    }
    closeDelete();
    if (editingId !== null && String(editingId) === String(expense.id)) {
      editingId = null;
      $("expFormPanel").hidden = true;
    }
    renderExpenses();
    renderDeleted();
    notifyFinancialViews();
    window.dispatchEvent(new Event("trauts:expense-deleted"));
    message("Expense deleted. Totals updated and reason saved in Deleted Expenses History.");
  });

  function renderDeleted() {
    const panel = $("expDeletedHistory");
    const wasOpen = panel.open;
    panel.replaceChildren(make("summary", `Deleted Expenses History (${readDeleted().length})`));
    const deleted = readDeleted();
    if (!deleted.length) panel.appendChild(make("p", "No deleted expenses on this device."));
    [...deleted].reverse().forEach(record => {
      const row = make("div", undefined, "exp-deleted-item");
      row.appendChild(make("strong", `${record.expense?.category || "Expense"} — ${money(record.expense?.amountNgwee || 0)}`));
      row.appendChild(make("span", `Expense date: ${record.expense?.date || "—"}`));
      row.appendChild(make("span", record.expense?.description || ""));
      row.appendChild(make("span", `Deleted: ${new Date(record.deletedAt).toLocaleString()}`));
      row.appendChild(make("span", `Reason: ${record.reason || "—"}`));
      panel.appendChild(row);
    });
    panel.open = wasOpen;
  }

  function filteredExpenses(expenses) {
    const query = $("expSearch").value.trim().toLowerCase();
    const selectedCategory = $("expCategoryFilter").value;
    const from = $("expStartDate").value;
    const to = $("expEndDate").value;
    return expenses.filter(item =>
      [item.description, item.paidTo, item.reference, item.category]
        .some(value => String(value || "").toLowerCase().includes(query)) &&
      (!selectedCategory || item.category === selectedCategory) &&
      (!from || item.date >= from) && (!to || item.date <= to)
    );
  }
  ["expSearch", "expCategoryFilter", "expStartDate", "expEndDate"].forEach(id => {
    $(id).addEventListener(id === "expSearch" ? "input" : "change", renderExpenses);
  });
  $("expClearFilters").addEventListener("click", () => {
    ["expSearch", "expCategoryFilter", "expStartDate", "expEndDate"]
      .forEach(id => { $(id).value = ""; });
    renderExpenses();
  });

  function renderExpenses() {
    const expenses = readExpenses();
    const filtered = filteredExpenses(expenses);
    const month = today().slice(0, 7);
    $("expTotal").textContent = money(expenses.reduce((sum, x) => sum + x.amountNgwee, 0));
    $("expThisMonth").textContent = money(expenses
      .filter(x => String(x.date || "").startsWith(month))
      .reduce((sum, x) => sum + x.amountNgwee, 0));
    $("expCount").textContent = expenses.length;
    $("expFilteredTotal").textContent = money(filtered
      .reduce((sum, x) => sum + x.amountNgwee, 0));
    const body = $("expTable");
    body.replaceChildren();
    const methods = { cash: "Cash", mobile_money: "Mobile Money",
      bank_transfer: "Bank Transfer", card: "Card" };
    filtered.sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || "")) ||
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    ).forEach(expense => {
      const row = make("tr");
      cell(row, expense.date);
      cell(row, expense.category);
      cell(row, expense.description);
      cell(row, expense.paidTo || "—");
      cell(row, methods[expense.paymentMethod] || expense.paymentMethod || "—");
      cell(row, money(expense.amountNgwee));
      const actions = make("div", undefined, "exp-row-actions");
      const edit = make("button", "Edit", "exp-secondary");
      edit.type = "button";
      edit.addEventListener("click", () => openExpense(expense.id));
      const remove = make("button", "Delete", "exp-danger");
      remove.type = "button";
      remove.addEventListener("click", () => askDelete(expense.id));
      actions.append(edit, remove);
      const actionCell = make("td");
      actionCell.appendChild(actions);
      row.appendChild(actionCell);
      body.appendChild(row);
    });
    if (!filtered.length) {
      const row = make("tr");
      const empty = make("td", "No expenses found.", "exp-empty");
      empty.colSpan = 7;
      row.appendChild(empty);
      body.appendChild(row);
    }
  }
  window.refreshTrautsExpenses = renderExpenses;
  window.addEventListener("storage", event => {
    if (event.key === EXPENSES_KEY) renderExpenses();
    if (event.key === DELETED_KEY) renderDeleted();
  });
  renderExpenses();
  renderDeleted();
})();
