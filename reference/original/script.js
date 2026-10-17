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
