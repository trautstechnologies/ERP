/* TRAUTS SETTINGS — FRONTEND DEMO */

(() => {
  const SETTINGS_KEY = "trauts_demo_settings_v1";
  const $ = id => document.getElementById(id);

  if (!$("settingsPage")) return;

  const defaults = {
    shopName: "TRAUTS Shop",
    shopPhone: "",
    shopAddress: "",
    currency: "ZMW",
    receiptFooter: "Thank you for shopping with us!",
    printReceipt: true,
    lowStockThreshold: 5,
    managerName: "Administrator",
    managerEmail: "admin@trauts.example"
  };

  function loadSettings() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(SETTINGS_KEY)
      );

      if (
        saved &&
        typeof saved === "object" &&
        !Array.isArray(saved)
      ) {
        return { ...defaults, ...saved };
      }
    } catch {
      // Fall back to defaults.
    }

    return { ...defaults };
  }

  function fillForm(settings) {
    $("settingShopName").value = settings.shopName;
    $("settingShopPhone").value = settings.shopPhone;
    $("settingShopAddress").value = settings.shopAddress;
    $("settingReceiptFooter").value =
      settings.receiptFooter;

    $("settingPrintReceipt").checked =
      settings.printReceipt;

    $("settingLowStock").value =
      settings.lowStockThreshold;

    $("settingManagerName").value =
      settings.managerName;

    $("settingManagerEmail").value =
      settings.managerEmail;
  }

  function readForm() {
    return {
      shopName: $("settingShopName").value.trim(),
      shopPhone: $("settingShopPhone").value.trim(),
      shopAddress: $("settingShopAddress").value.trim(),
      currency: "ZMW",
      receiptFooter:
        $("settingReceiptFooter").value.trim(),
      printReceipt: $("settingPrintReceipt").checked,
      lowStockThreshold:
        Number($("settingLowStock").value),
      managerName:
        $("settingManagerName").value.trim(),
      managerEmail:
        $("settingManagerEmail").value.trim()
    };
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
      );
      return true;
    } catch {
      $("settingsMessage").textContent =
        "Could not save settings to browser storage.";
      return false;
    }
  }

  $("settingsForm").addEventListener(
    "submit",
    event => {
      event.preventDefault();

      const settings = readForm();

      if (
        !settings.shopName ||
        !settings.managerName ||
        !settings.managerEmail ||
        !Number.isSafeInteger(
          settings.lowStockThreshold
        ) ||
        settings.lowStockThreshold < 0
      ) {
        $("settingsMessage").textContent =
          "Please enter valid settings.";
        return;
      }

      if (!saveSettings(settings)) return;

      $("settingsMessage").textContent =
        "Settings saved successfully.";

      window.dispatchEvent(
        new Event("trauts:settings-updated")
      );
    }
  );

  $("resetSettingsBtn").addEventListener(
    "click",
    () => {
      if (!confirm(
        "Restore all shop settings to their defaults?"
      )) return;

      if (!saveSettings(defaults)) return;

      fillForm(defaults);

      $("settingsMessage").textContent =
        "Default settings restored.";

      window.dispatchEvent(
        new Event("trauts:settings-updated")
      );
    }
  );

  window.refreshTrautsSettings = () => {
    fillForm(loadSettings());
  };

  window.addEventListener("storage", event => {
    if (event.key === SETTINGS_KEY) {
      window.refreshTrautsSettings();
    }
  });

  window.refreshTrautsSettings();
})();
