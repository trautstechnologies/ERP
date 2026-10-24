
/* ==========================================
   TRAUTS SHOP MANAGER
   MAIN DASHBOARD NAVIGATION

   One navigation controller for the dashboard.
   Mobile sidebar uses the "mobile-open" class.
   Business calculations stay in their own modules.
   ========================================== */

(() => {
  "use strict";

  const pages = {
    "Dashboard": "overview",
    "Products": "productsPage",
    "Sales": "salesPage",
    "Inventory": "inventoryPage",
    "Suppliers & Purchases": "suppliersPurchasesPage",
    "Expenses": "expensesPage",
    "Profit & Loss": "profitLossPage",
    "Manage Accounts": "accountsPage",
    "Reports": "reportsPage",
    "Settings": "settingsPage"
  };

  const refreshFunctions = {
    "Dashboard": "refreshTrautsDashboard",
    "Products": "refreshTrautsProducts",
    "Sales": "refreshTrautsSales",
    "Inventory": "refreshTrautsInventory",
    "Suppliers & Purchases": "refreshTrautsSuppliersPurchases",
    "Expenses": "refreshTrautsExpenses",
    "Profit & Loss": "refreshTrautsProfitLoss",
    "Manage Accounts": "refreshTrautsAccounts",
    "Reports": "refreshTrautsReports",
    "Settings": "refreshTrautsSettings"
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

  function initializeNavigation() {
    const sidebar =
      document.getElementById("trautsSidebar") ||
      document.querySelector(".sidebar");

    const menuButton =
      document.getElementById("mobileMenuBtn");

    const backdrop =
      document.getElementById("mobileSidebarBackdrop");

    const pageTitle =
      document.getElementById("trautsPageTitle") ||
      document.getElementById("pageTitle");

    const overviewHeading =
      document.getElementById("trautsOverviewHeading");

    const modulePage =
      document.getElementById("modulePage");

    const moduleTitle =
      document.getElementById("moduleTitle");

    const sidebarNav =
      document.querySelector(".sidebar-nav");

    if (!sidebar) {
      console.warn(
        "TRAUTS: Navigation sidebar not found."
      );
      return;
    }

    /* MOBILE MENU */

    function closeMobileMenu() {
      sidebar.classList.remove(
        "mobile-open",
        "open"
      );

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
      sidebar.classList.remove("open");
      sidebar.classList.add("mobile-open");

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

    /* NAVIGATION ICONS */

    function ensureNavigationIcons() {
      sidebar.querySelectorAll(
        ".nav[data-page]"
      ).forEach(button => {
        const iconName =
          icons[button.dataset.page];

        if (!iconName) return;

        if (!button.querySelector(
          "svg, i[data-lucide]"
        )) {
          const icon = document.createElement("i");

          icon.setAttribute(
            "data-lucide",
            iconName
          );

          button.prepend(icon);
        }
      });

      if (
        window.lucide &&
        typeof window.lucide.createIcons === "function"
      ) {
        window.lucide.createIcons();
      }
    }

    /* PAGE SWITCHING */

    function showPage(page) {
      if (!Object.prototype.hasOwnProperty.call(
        pages,
        page
      )) {
        console.warn(
          `TRAUTS: Unknown navigation page "${page}".`
        );
        return false;
      }

      const targetId = pages[page];

      const target =
        document.getElementById(targetId);

      // A dynamic business module may not have
      // created its section yet.

      if (!target) {
        console.warn(
          `TRAUTS: Page "${page}" not found (#${targetId}).`
        );

        if (!modulePage) {
          return false;
        }
      }

      // Hide every registered main page.

      Object.values(pages).forEach(id => {
        const section =
          document.getElementById(id);

        if (section) {
          section.hidden = true;
        }
      });

      // Hide the fallback page.

      if (modulePage) {
        modulePage.hidden = true;
      }

      // Display the selected page.

      if (target) {
        target.hidden = false;
      } else if (modulePage) {
        if (moduleTitle) {
          moduleTitle.textContent = page;
        }

        modulePage.hidden = false;
      }

      // Update headings.

      if (pageTitle) {
        pageTitle.textContent = page;
      }

      if (overviewHeading) {
        overviewHeading.hidden =
          page !== "Dashboard";
      }

      // Highlight the selected sidebar option.

      sidebar.querySelectorAll(
        ".nav[data-page]"
      ).forEach(button => {
        const selected =
          button.dataset.page === page;

        button.classList.toggle(
          "active",
          selected
        );

        if (selected) {
          button.setAttribute(
            "aria-current",
            "page"
          );
        } else {
          button.removeAttribute(
            "aria-current"
          );
        }
      });

      // Close sidebar after navigation.

      closeMobileMenu();

      // Refresh the selected module's statistics
      // if that module exposes a refresh function.

      const refreshName =
        refreshFunctions[page];

      const refresh =
        window[refreshName];

      if (typeof refresh === "function") {
        try {
          refresh();
        } catch (error) {
          console.error(
            `TRAUTS: Could not refresh ${page}.`,
            error
          );
        }
      }

      return true;
    }

    // Allow other modules to request navigation.

    window.showTrautsPage = showPage;

    /* SIDEBAR BUTTON CLICKS */

    // One listener works for existing buttons
    // and buttons added by other modules.

    sidebar.addEventListener("click", event => {
      const button = event.target.closest(
        ".nav[data-page]"
      );

      if (!button || !sidebar.contains(button)) {
        return;
      }

      event.preventDefault();

      showPage(button.dataset.page);
    });

    /* MOBILE MENU BUTTON */

    menuButton?.addEventListener(
      "click",
      () => {
        if (
          sidebar.classList.contains(
            "mobile-open"
          )
        ) {
          closeMobileMenu();
        } else {
          openMobileMenu();
        }
      }
    );

    /* BACKDROP */

    backdrop?.addEventListener(
      "click",
      closeMobileMenu
    );

    /* ESCAPE KEY */

    document.addEventListener(
      "keydown",
      event => {
        if (event.key === "Escape") {
          closeMobileMenu();
        }
      }
    );

    /* SCREEN SIZE CHANGES */

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
    } else if (desktopQuery.addListener) {
      desktopQuery.addListener(
        handleScreenChange
      );
    }

    /* MODULE NAVIGATION ICON UPDATES */

    if (sidebarNav) {
      const observer = new MutationObserver(
        ensureNavigationIcons
      );

      observer.observe(sidebarNav, {
        childList: true
      });
    }

    ensureNavigationIcons();

    window.addEventListener(
      "load",
      ensureNavigationIcons,
      { once: true }
    );

    /* INITIAL PAGE */

    showPage("Dashboard");
  }

  /* INITIALIZE AFTER HTML IS AVAILABLE */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeNavigation,
      { once: true }
    );
  } else {
    initializeNavigation();
  }

})();
