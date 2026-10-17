/* ==========================================
   TRAUTS SHOP MANAGER
   MAIN DASHBOARD NAVIGATION
   ========================================== */

(() => {
  "use strict";

  const pageTitle = document.getElementById("pageTitle");
  const sidebar = document.querySelector(".sidebar");
  const modulePage = document.getElementById("modulePage");
  const moduleTitle = document.getElementById("moduleTitle");

  const menuButton = document.getElementById("mobileMenuBtn");
  const backdrop = document.getElementById(
    "mobileSidebarBackdrop"
  );

  // Main pages already defined in dashboard.html
  const pages = {
    "Dashboard": "overview",
    "Products": "productsPage",
    "Sales": "salesPage",
    "Inventory": "inventoryPage",
    "Manage Accounts": "accountsPage",
    "Reports": "reportsPage",
    "Settings": "settingsPage",

    // Modules created dynamically by their scripts
    "Suppliers & Purchases": "suppliersPurchasesPage",
    "Expenses": "expensesPage",
    "Profit & Loss": "profitLossPage"
  };

  const refreshFunctions = {
    "Dashboard": "refreshTrautsDashboard",
    "Products": "refreshTrautsProducts",
    "Sales": "refreshTrautsSales",
    "Inventory": "refreshTrautsInventory",
    "Manage Accounts": "refreshTrautsAccounts",
    "Reports": "refreshTrautsReports",
    "Settings": "refreshTrautsSettings",
    "Suppliers & Purchases": "refreshTrautsSuppliersPurchases",
    "Expenses": "refreshTrautsExpenses",
    "Profit & Loss": "refreshTrautsProfitLoss"
  };

  const icons = {
    "Dashboard": "layout-dashboard",
    "Products": "package",
    "Sales": "shopping-cart",
    "Inventory": "boxes",
    "Suppliers & Purchases": "truck",
    "Expenses": "wallet",
    "Profit & Loss": "chart-no-axes-combined",
    "Manage Accounts": "users-round",
    "Reports": "chart-no-axes-column",
    "Settings": "settings"
  };

  function updateIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function ensureNavigationIcons() {
    document.querySelectorAll(".sidebar .nav").forEach(
      button => {
        const page = button.dataset.page;
        const iconName = icons[page];

        if (!iconName) return;

        const existingIcon = button.querySelector(
          "svg, i[data-lucide]"
        );

        if (!existingIcon) {
          const icon = document.createElement("i");
          icon.setAttribute("data-lucide", iconName);
          button.prepend(icon);
        }
      }
    );

    updateIcons();
  }

  function closeMobileMenu() {
    sidebar?.classList.remove("mobile-open");

    if (backdrop) {
      backdrop.hidden = true;
    }

    if (menuButton) {
      menuButton.setAttribute(
        "aria-expanded",
        "false"
      );
      menuButton.setAttribute(
        "aria-label",
        "Open navigation menu"
      );
    }

    document.body.classList.remove(
      "trauts-menu-open"
    );
  }

  function openMobileMenu() {
    sidebar?.classList.add("mobile-open");

    if (backdrop) {
      backdrop.hidden = false;
    }

    if (menuButton) {
      menuButton.setAttribute(
        "aria-expanded",
        "true"
      );
      menuButton.setAttribute(
        "aria-label",
        "Close navigation menu"
      );
    }

    document.body.classList.add(
      "trauts-menu-open"
    );
  }

  function showPage(page) {
    const targetId = pages[page];
    const target = targetId
      ? document.getElementById(targetId)
      : null;

    // Do not hide the current page if a module
    // has not finished creating its section.
    if (targetId && !target) {
      console.warn(
        `TRAUTS: Page "${page}" not found (#${targetId}).`
      );
      return;
    }

    // Hide every registered module section.
    Object.values(pages).forEach(id => {
      const section = document.getElementById(id);

      if (section) {
        section.hidden = true;
      }
    });

    if (modulePage) {
      modulePage.hidden = true;
    }

    // Show the selected page.
    if (target) {
      target.hidden = false;
    } else if (modulePage) {
      modulePage.hidden = false;

      if (moduleTitle) {
        moduleTitle.textContent = page;
      }
    }

    if (pageTitle) {
      pageTitle.textContent = page;
    }

    document.querySelectorAll(".sidebar .nav").forEach(
      button => {
        const active = button.dataset.page === page;

        button.classList.toggle("active", active);

        if (active) {
          button.setAttribute(
            "aria-current",
            "page"
          );
        } else {
          button.removeAttribute("aria-current");
        }
      }
    );

    closeMobileMenu();

    const refreshName = refreshFunctions[page];

    if (
      refreshName &&
      typeof window[refreshName] === "function"
    ) {
      window[refreshName]();
    }
  }

  // Event delegation handles navigation buttons
  // added later by module scripts.
  document.addEventListener("click", event => {
    const button = event.target.closest(
      ".sidebar .nav[data-page]"
    );

    if (!button) return;

    event.preventDefault();

    showPage(button.dataset.page);
  });

  // Mobile navigation
  menuButton?.addEventListener("click", () => {
    if (sidebar?.classList.contains("mobile-open")) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  });

  backdrop?.addEventListener(
    "click",
    closeMobileMenu
  );

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeMobileMenu();
    }
  });

  const desktopQuery = window.matchMedia(
    "(min-width: 901px)"
  );

  function handleScreenChange(event) {
    if (event.matches) {
      closeMobileMenu();
    }
  }

  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener(
      "change",
      handleScreenChange
    );
  } else {
    desktopQuery.addListener(handleScreenChange);
  }

  // Watch for modules adding sidebar buttons.
  const sidebarNav = document.querySelector(
    ".sidebar-nav"
  );

  if (sidebarNav) {
    const observer = new MutationObserver(() => {
      ensureNavigationIcons();
    });

    observer.observe(sidebarNav, {
      childList: true
    });
  }

  // Initialise navigation icons after scripts
  // have had an opportunity to create their pages.
  window.addEventListener("load", () => {
    ensureNavigationIcons();
  });

  ensureNavigationIcons();

  // Keep the live Dashboard visible initially.
  showPage("Dashboard");

  // Make this available to other modules.
  window.showTrautsPage = showPage;
})();
