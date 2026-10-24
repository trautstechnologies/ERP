
/* TRAUTS BUSINESS ONBOARDING */

(() => {
  const BUSINESS_KEY = "trauts_demo_business_v1";
  const SETTINGS_KEY = "trauts_demo_settings_v1";

  const $ = id => document.getElementById(id);

  let step = 1;

  const steps = [
    ...document.querySelectorAll(".setup-step")
  ];

  const progress = [
    ...document.querySelectorAll(
      ".setup-progress span"
    )
  ];

  function showStep(number) {
    step = number;

    steps.forEach(section => {
      section.hidden =
        Number(section.dataset.step) !== step;
    });

    progress.forEach((bar, index) => {
      bar.classList.toggle(
        "active",
        index < step
      );
    });

    $("setupBack").hidden = step === 1;
    $("setupNext").hidden = step === 3;
    $("setupFinish").hidden = step !== 3;

    $("setupMessage").textContent = "";
  }

  $("setupNext").addEventListener("click", () => {
    if (step === 2) {
      const name = $("businessName");

      if (!name.value.trim()) {
        $("setupMessage").textContent =
          "Please enter your business name.";
        name.focus();
        return;
      }
    }

    showStep(Math.min(step + 1, 3));
  });

  $("setupBack").addEventListener("click", () => {
    showStep(Math.max(step - 1, 1));
  });

  $("businessSetupForm").addEventListener(
    "submit",
    event => {
      event.preventDefault();

      const name = $("businessName").value.trim();

      if (!name) {
        showStep(2);
        $("setupMessage").textContent =
          "Business name is required.";
        return;
      }

      const type = document.querySelector(
        'input[name="businessType"]:checked'
      ).value;

      const features = [
        ...document.querySelectorAll(
          'input[name="features"]:checked'
        )
      ].map(input => input.value);

      const business = {
        id: crypto.randomUUID(),
        name,
        type,
        phone: $("businessPhone").value.trim(),
        address: $("businessAddress").value.trim(),
        currency: "ZMW",
        features,
        setupComplete: true,
        createdAt: new Date().toISOString()
      };

      try {
        const existing = JSON.parse(
          localStorage.getItem(SETTINGS_KEY)
        ) || {};

        localStorage.setItem(
          BUSINESS_KEY,
          JSON.stringify(business)
        );

        localStorage.setItem(
          SETTINGS_KEY,
          JSON.stringify({
            ...existing,
            shopName: business.name,
            shopPhone: business.phone,
            shopAddress: business.address,
            currency: "ZMW"
          })
        );

        window.location.href = "dashboard.html";
      } catch {
        $("setupMessage").textContent =
          "Could not save business setup.";
      }
    }
  );

  showStep(1);
})();
