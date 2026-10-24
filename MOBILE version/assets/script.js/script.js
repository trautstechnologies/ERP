
/* ==========================================
   TRAUTS SHOP MANAGER
   LOGIN & SIGNUP
   ========================================== */

const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");

const nameGroup = document.getElementById("nameGroup");
const confirmGroup = document.getElementById("confirmGroup");

const fullName = document.getElementById("fullName");
const confirmPassword = document.getElementById("confirmPassword");
const password = document.getElementById("password");

const submitBtn = document.getElementById("submitBtn");
const form = document.getElementById("authForm");
const message = document.getElementById("message");

let isSignup = false;

// ==========================================
// SWITCH BETWEEN LOGIN AND SIGNUP
// ==========================================

function switchMode(signup) {
  isSignup = signup;

  loginTab.classList.toggle("active", !signup);
  signupTab.classList.toggle("active", signup);

  nameGroup.classList.toggle("hidden", !signup);
  confirmGroup.classList.toggle("hidden", !signup);

  fullName.required = signup;
  confirmPassword.required = signup;

  password.autocomplete = signup
    ? "new-password"
    : "current-password";

  submitBtn.textContent = signup
    ? "Create Account"
    : "Login";
    const forgotPasswordBtn =
      document.getElementById("forgotPasswordBtn");

    if (forgotPasswordBtn) {
      forgotPasswordBtn.hidden = signup;
    }

  form.reset();
  message.textContent = "";
}

// ==========================================
// LOGIN AND SIGNUP TABS
// ==========================================

loginTab.addEventListener("click", () => {
  switchMode(false);
});

signupTab.addEventListener("click", () => {
  switchMode(true);
});

// ==========================================
// CHECK BUSINESS SETUP
// ==========================================

function isBusinessSetupComplete() {
  try {
    const business = JSON.parse(
      localStorage.getItem("trauts_demo_business_v1")
    );

    return business?.setupComplete === true;
  } catch (error) {
    console.error(
      "Unable to check business setup:",
      error
    );

    return false;
  }
}

// ==========================================
// REDIRECT AFTER LOGIN OR SIGNUP
// ==========================================

function redirectToDashboard() {
  if (isBusinessSetupComplete()) {
    window.location.href = "dashboard.html";
  } else {
    window.location.href = "business-setup.html";
  }
}

// ==========================================
// FORM SUBMISSION
// ==========================================

form.addEventListener("submit", (event) => {
  event.preventDefault();

  message.style.color = "#dc2626";
  message.textContent = "";

  // SIGNUP VALIDATION
  if (isSignup) {
    if (password.value !== confirmPassword.value) {
      message.textContent = "Passwords do not match!";
      return;
    }

    message.style.color = "#15803d";
    message.textContent =
      "Signup details validated. Opening business setup...";

    // Demo signup: no real account is created yet.
    // New business owners proceed to onboarding.
    window.location.href = "business-setup.html";

    return;
  }

  // LOGIN (FRONTEND DEMO ONLY)
  message.style.color = "#15803d";
  message.textContent =
    "Login form validated. Redirecting...";

  // Authentication will be implemented with Supabase.
  redirectToDashboard();
});


/* ==========================================
   TRAUTS MOBILE LOGIN ENHANCEMENTS
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {

  // SHOW / HIDE PASSWORDS

  document.querySelectorAll(".password-toggle")
    .forEach(button => {

      const input = document.getElementById(
        button.dataset.target
      );

      if (!input) return;

      button.addEventListener("click", () => {

        const show = input.type === "password";

        input.type = show ? "text" : "password";

        button.classList.toggle("is-visible", show);

        button.setAttribute(
          "aria-label",
          show ? "Hide password" : "Show password"
        );

        button.setAttribute(
          "aria-pressed",
          String(show)
        );
      });
    });


  // ANDROID KEYBOARD NAVIGATION

  const fullName = document.getElementById("fullName");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const confirmPassword =
    document.getElementById("confirmPassword");
  const confirmGroup =
    document.getElementById("confirmGroup");

  function handleEnter(input, getNext) {

    if (!input) return;

    input.addEventListener("keydown", event => {

      if (event.key !== "Enter" || event.isComposing) {
        return;
      }

      event.preventDefault();

      const next = getNext();

      if (next) {
        next.focus();
      } else {
        input.blur();
      }
    });
  }

  handleEnter(fullName, () => email);

  handleEnter(email, () => password);

  handleEnter(password, () => {

    const signingUp =
      confirmGroup &&
      !confirmGroup.classList.contains("hidden") &&
      confirmGroup.getClientRects().length > 0;

    return signingUp ? confirmPassword : null;
  });

  handleEnter(confirmPassword, () => null);


  // UPDATE KEYBOARD LABEL FOR LOGIN / SIGN UP

  function updateKeyboardHint() {
    const signingUp =
      confirmGroup &&
      !confirmGroup.classList.contains("hidden");

    password.enterKeyHint = signingUp
      ? "next"
      : "done";
  }

  document.getElementById("loginTab")
    ?.addEventListener("click", updateKeyboardHint);

  document.getElementById("signupTab")
    ?.addEventListener("click", updateKeyboardHint);

  updateKeyboardHint();

});


/* ==========================================
   TRAUTS PASSWORD RESET INTERFACE
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {

  const forgotBtn =
    document.getElementById("forgotPasswordBtn");

  const overlay =
    document.getElementById("passwordResetOverlay");

  const closeBtn =
    document.getElementById("closePasswordReset");

  const resetForm =
    document.getElementById("passwordResetForm");

  const resetEmail =
    document.getElementById("resetEmail");

  const resetMessage =
    document.getElementById("passwordResetMessage");

  if (
    !forgotBtn ||
    !overlay ||
    !closeBtn ||
    !resetForm ||
    !resetEmail ||
    !resetMessage
  ) {
    return;
  }

  // OPEN RESET WINDOW
  forgotBtn.addEventListener("click", () => {

    const loginEmail =
      document.getElementById("email");

    resetEmail.value =
      loginEmail?.value.trim() || "";

    resetMessage.textContent = "";

    overlay.hidden = false;
    resetEmail.focus();
  });

  // CLOSE RESET WINDOW
  function closeResetWindow() {
    overlay.hidden = true;
    resetForm.reset();
    resetMessage.textContent = "";
    forgotBtn.focus();
  }

  closeBtn.addEventListener(
    "click",
    closeResetWindow
  );

  // CLOSE WHEN BACKDROP IS TAPPED
  overlay.addEventListener("click", event => {
    if (event.target === overlay) {
      closeResetWindow();
    }
  });

  // CLOSE WITH ESCAPE KEY
  document.addEventListener("keydown", event => {
    if (
      event.key === "Escape" &&
      !overlay.hidden
    ) {
      closeResetWindow();
    }
  });

  // DEMO RESET SUBMISSION
  resetForm.addEventListener("submit", event => {
    event.preventDefault();

    // Real reset emails will be connected
    // once Supabase Auth is implemented.

    resetMessage.textContent =
      "Password reset emails are not available " +
      "yet. No email has been sent.";
  });

});
