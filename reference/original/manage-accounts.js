const staff = [
  {
    id: 1,
    name: "Administrator",
    email: "admin@trauts.example",
    role: "manager",
    active: true
  },
  {
    id: 2,
    name: "Mary Banda",
    email: "mary@trauts.example",
    role: "shopkeeper",
    active: true
  },
  {
    id: 3,
    name: "John Phiri",
    email: "john@trauts.example",
    role: "shopkeeper",
    active: false
  }
];

const staffTable = document.getElementById("staffTable");
const staffSearch = document.getElementById("staffSearch");
const staffForm = document.getElementById("staffForm");
const staffFormPanel =
  document.getElementById("staffFormPanel");
const accountsMessage =
  document.getElementById("accountsMessage");

function updateStaffStats() {
  document.getElementById("totalStaff").textContent =
    staff.length;

  document.getElementById("activeStaff").textContent =
    staff.filter(user => user.active).length;

  document.getElementById("inactiveStaff").textContent =
    staff.filter(user => !user.active).length;
}

function renderStaff() {
  staffTable.replaceChildren();

  const query = staffSearch.value.toLowerCase();

  const filtered = staff.filter(user =>
    [user.name, user.email, user.role]
      .some(value => value.toLowerCase().includes(query))
  );

  filtered.forEach(user => {
    const row = document.createElement("tr");

    function cell(value) {
      const td = document.createElement("td");
      td.textContent = value;
      return td;
    }

    row.appendChild(cell(user.name));
    row.appendChild(cell(user.email));
    row.appendChild(cell(user.role));

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");

    badge.className =
      "status-badge " + (user.active ? "active" : "inactive");

    badge.textContent = user.active ? "Active" : "Inactive";
    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    const actionCell = document.createElement("td");
    const button = document.createElement("button");

    button.className = "staff-action";
    button.textContent =
      user.active ? "Deactivate" : "Activate";

    // Demo safeguard: keep the sample admin active.
    button.disabled = user.id === 1;

    button.addEventListener("click", () => {
      user.active = !user.active;
      renderStaff();
    });

    actionCell.appendChild(button);
    row.appendChild(actionCell);
    staffTable.appendChild(row);
  });

  updateStaffStats();
}

document.getElementById("addStaffBtn")
  .addEventListener("click", () => {
    staffFormPanel.hidden = false;
  });

document.getElementById("cancelStaffBtn")
  .addEventListener("click", () => {
    staffFormPanel.hidden = true;
    staffForm.reset();
  });

staffSearch.addEventListener("input", renderStaff);

staffForm.addEventListener("submit", event => {
  event.preventDefault();

  const name =
    document.getElementById("staffName").value.trim();

  const email =
    document.getElementById("staffEmail")
      .value.trim().toLowerCase();

  const role =
    document.getElementById("staffRole").value;

  if (!name) {
    accountsMessage.textContent = "Enter a valid name.";
    return;
  }

  if (staff.some(user => user.email === email)) {
    accountsMessage.textContent =
      "An account with this email already exists.";
    return;
  }

  staff.push({
    id: Math.max(0, ...staff.map(user => user.id)) + 1,
    name,
    email,
    role,
    active: true
  });

  staffForm.reset();
  staffFormPanel.hidden = true;

  accountsMessage.textContent =
    "Demo staff account added successfully.";

  renderStaff();
});

renderStaff();
