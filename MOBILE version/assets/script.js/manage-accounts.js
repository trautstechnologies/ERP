
/* ==========================================================
   TRAUTS SHOP MANAGER
   MANAGE ACCOUNTS — PERSISTENT ANDROID VERSION

   - Saves staff accounts to localStorage
   - Restores accounts after closing/reopening the app
   - Remembers active/inactive status
   - Preserves original demo staff on first initialization
   - Protects the sample Administrator account
   - Keeps Shopkeeper and Manager as placeholder roles
   - Opens the Create Account form visibly on Android
   ========================================================== */

(() => {
  "use strict";

  const STAFF_KEY = "trauts_demo_staff_v1";

  const $ = id => document.getElementById(id);

  const staffTable = $("staffTable");
  const staffSearch = $("staffSearch");
  const staffForm = $("staffForm");
  const staffFormPanel = $("staffFormPanel");
  const accountsMessage = $("accountsMessage");

  if (
    !staffTable ||
    !staffSearch ||
    !staffForm ||
    !staffFormPanel
  ) {
    console.error("TRAUTS: Manage Accounts HTML is missing.");
    return;
  }

  /* ========================================================
     ORIGINAL SAMPLE STAFF
     Used only when no staff data has been saved before.
     ======================================================== */

  const DEFAULT_STAFF = [
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

  /* ========================================================
     LOCAL STORAGE
     ======================================================== */

  function loadStaff() {
    let stored;

    try {
      stored = localStorage.getItem(STAFF_KEY);
    } catch (error) {
      console.error(
        "TRAUTS: Cannot access staff storage.",
        error
      );

      showMessage(
        "Staff storage is unavailable. Changes may not persist.",
        true
      );

      return [];
    }

    // First initialization only.
    if (stored === null) {
      const defaults = DEFAULT_STAFF.map(user => ({
        ...user
      }));

      try {
        localStorage.setItem(
          STAFF_KEY,
          JSON.stringify(defaults)
        );
      } catch (error) {
        console.error(
          "TRAUTS: Could not initialize staff storage.",
          error
        );

        showMessage(
          "Cannot initialize staff storage.",
          true
        );

        return [];
      }

      return defaults;
    }

    try {
      const saved = JSON.parse(stored);

      if (!Array.isArray(saved)) {
        throw new Error("Staff storage is not an array.");
      }

      // An empty saved list must stay empty.
      // Do not recreate sample staff over it.
      return saved.map(user => ({
        ...user,
        active: user.active === true ||
          (
            user.active === undefined &&
            user.status !== "inactive"
          )
      }));

    } catch (error) {
      console.error(
        "TRAUTS: Saved staff data is invalid.",
        error
      );

      showMessage(
        "Saved staff data could not be read. " +
        "Existing storage has not been overwritten.",
        true
      );

      return [];
    }
  }

  let staff = [];

  function saveStaff(nextStaff) {
    try {
      // Saving happens immediately, not when the app exits.
      localStorage.setItem(
        STAFF_KEY,
        JSON.stringify(nextStaff)
      );

      // Only update in-memory data after storage succeeds.
      staff = nextStaff;

      window.dispatchEvent(
        new Event("trauts:staff-updated")
      );

      return true;

    } catch (error) {
      console.error(
        "TRAUTS: Failed to save staff data.",
        error
      );

      showMessage(
        "Could not save staff information. " +
        "Please check available device storage.",
        true
      );

      return false;
    }
  }

  /* ========================================================
     MESSAGES AND HELPERS
     ======================================================== */

  function showMessage(text, error = false) {
    if (!accountsMessage) return;

    accountsMessage.textContent = text;

    const dark = document.documentElement
      .classList.contains("trauts-dark");

    accountsMessage.style.color = error
      ? (dark ? "#fecaca" : "#b91c1c")
      : (dark ? "#a7f3d0" : "#166534");
  }

  function roleName(role) {
    if (role === "manager") return "Manager";
    if (role === "shopkeeper") return "Shopkeeper";
    return String(role || "—");
  }

  function isProtectedAdministrator(user) {
    return (
      String(user.id) === "1" &&
      user.email === "admin@trauts.example"
    );
  }

  function generateStaffId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return (
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 11)
    );
  }

  function createCell(value) {
    const td = document.createElement("td");
    td.textContent = String(value ?? "");
    return td;
  }

  /* ========================================================
     STAFF STATISTICS
     ======================================================== */

  function updateStaffStats() {
    $("totalStaff").textContent = staff.length;

    $("activeStaff").textContent =
      staff.filter(user => user.active).length;

    $("inactiveStaff").textContent =
      staff.filter(user => !user.active).length;
  }

  /* ========================================================
     STAFF DIRECTORY
     ======================================================== */

  function renderStaff() {
    staffTable.replaceChildren();

    const query = staffSearch.value
      .trim()
      .toLowerCase();

    const filtered = staff.filter(user =>
      [
        user.name,
        user.email,
        roleName(user.role)
      ].some(value =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      )
    );

    filtered.forEach(user => {
      const row = document.createElement("tr");

      // Staff name.
      row.appendChild(
        createCell(user.name)
      );

      // Staff email.
      row.appendChild(
        createCell(user.email)
      );

      // Placeholder account role.
      row.appendChild(
        createCell(roleName(user.role))
      );

      /* STATUS BADGE */

      const statusCell = document.createElement("td");

      const badge = document.createElement("span");

      badge.className =
        "status-badge " +
        (user.active ? "active" : "inactive");

      badge.textContent =
        user.active ? "Active" : "Inactive";

      statusCell.appendChild(badge);
      row.appendChild(statusCell);

      /* ACTIVATE / DEACTIVATE */

      const actionCell = document.createElement("td");

      const actionButton = document.createElement("button");

      actionButton.type = "button";
      actionButton.className = "staff-action";

      actionButton.textContent =
        user.active ? "Deactivate" : "Activate";

      // Preserve the original Administrator safeguard.
      actionButton.disabled =
        isProtectedAdministrator(user);

      actionButton.addEventListener("click", () => {

        if (isProtectedAdministrator(user)) {
          showMessage(
            "The sample Administrator account cannot be deactivated.",
            true
          );
          return;
        }

        const currentStaff = [...staff];

        const index = currentStaff.findIndex(item =>
          String(item.id) === String(user.id)
        );

        if (index === -1) {
          showMessage("Staff account not found.", true);
          return;
        }

        const nextActive = !currentStaff[index].active;

        currentStaff[index] = {
          ...currentStaff[index],
          active: nextActive,
          updatedAt: new Date().toISOString()
        };

        // Persist before updating the screen.
        if (!saveStaff(currentStaff)) {
          return;
        }

        renderStaff();

        showMessage(
          nextActive
            ? "Account activated and saved successfully."
            : "Account deactivated and saved successfully."
        );

      });

      actionCell.appendChild(actionButton);
      row.appendChild(actionCell);

      staffTable.appendChild(row);
    });

    if (!filtered.length) {
      const row = document.createElement("tr");

      const emptyCell = createCell(
        staff.length
          ? "No staff matches your search."
          : "No staff accounts found. Tap Add Staff."
      );

      emptyCell.colSpan = 5;

      row.appendChild(emptyCell);
      staffTable.appendChild(row);
    }

    updateStaffStats();
  }

  /* ========================================================
     OPEN CREATE ACCOUNT FORM
     ======================================================== */

  $("addStaffBtn").addEventListener("click", () => {

    staffForm.reset();

    const heading = staffFormPanel.querySelector("h3");

    if (heading) {
      heading.textContent = "Create Account";
    }

    const submitButton =
      staffForm.querySelector('button[type="submit"]');

    if (submitButton) {
      submitButton.textContent = "Create Account";
    }

    showMessage("");

    staffFormPanel.hidden = false;

    // Open visibly, rather than silently beneath the table.
    staffFormPanel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  });

  /* ========================================================
     CANCEL CREATE ACCOUNT
     ======================================================== */

  $("cancelStaffBtn").addEventListener("click", () => {

    staffFormPanel.hidden = true;

    staffForm.reset();

    showMessage("");

  });

  /* ========================================================
     SEARCH STAFF
     ======================================================== */

  staffSearch.addEventListener(
    "input",
    renderStaff
  );

  /* ========================================================
     CREATE AND SAVE STAFF ACCOUNT
     ======================================================== */

  staffForm.addEventListener("submit", event => {
    event.preventDefault();

    const name = $("staffName").value.trim();

    const email = $("staffEmail")
      .value.trim().toLowerCase();

    const role = $("staffRole").value;

    /* VALIDATION */

    if (!name) {
      showMessage(
        "Please enter the staff member's name.",
        true
      );
      return;
    }

    if (!email || !$("staffEmail").checkValidity()) {
      showMessage(
        "Please enter a valid email address.",
        true
      );
      return;
    }

    if (
      role !== "shopkeeper" &&
      role !== "manager"
    ) {
      showMessage(
        "Please select an account role.",
        true
      );
      return;
    }

    if (
      staff.some(user =>
        String(user.email || "").toLowerCase() === email
      )
    ) {
      showMessage(
        "An account with this email already exists.",
        true
      );
      return;
    }

    /* CREATE RECORD */

    const newStaffMember = {
      id: generateStaffId(),
      name,
      email,
      role,
      active: true,
      createdAt: new Date().toISOString()
    };

    const updatedStaff = [
      ...staff,
      newStaffMember
    ];

    /* SAVE IMMEDIATELY TO LOCAL STORAGE */

    if (!saveStaff(updatedStaff)) {
      return;
    }

    /* SUCCESS */

    staffForm.reset();
    staffFormPanel.hidden = true;

    staffSearch.value = "";

    renderStaff();

    showMessage(
      "Account created and saved successfully."
    );

  });

  /* ========================================================
     REFRESH AFTER APP RESTART / DATA CHANGE
     ======================================================== */

  window.refreshTrautsAccounts = () => {
    staff = loadStaff();
    renderStaff();
  };

  window.addEventListener("storage", event => {
    if (event.key === STAFF_KEY || event.key === null) {
      staff = loadStaff();
      renderStaff();
    }
  });

  /* ========================================================
     INITIALIZE STAFF DIRECTORY
     ======================================================== */

  staff = loadStaff();

  // Always use the correct button text.
  const submitButton =
    staffForm.querySelector('button[type="submit"]');

  if (submitButton) {
    submitButton.textContent = "Create Account";
  }

  const formHeading = staffFormPanel.querySelector("h3");

  if (formHeading) {
    formHeading.textContent = "Create Account";
  }

  renderStaff();

})();
