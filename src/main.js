import { restoreMobileLayout } from './lib/mobile-layout.js';
import { mountMobileShell } from './lib/mobile-shell.js';
import './lib/theme.js';
import { storage, setOfflineIdentity, queueEntries, syncSales } from './lib/offline.js';
import { syncPage } from './pages/sync.js';
import './styles/original/dashboard.css';
import './styles/app.css';
import { createIcons, LayoutDashboard, Package, ShoppingCart, Boxes, Truck, ClipboardList, Wallet, ChartNoAxesCombined, UsersRound, ChartNoAxesColumn, CalendarDays, Undo2, History, Settings, LogOut, Menu } from 'lucide';
import { configured, configurationError, supabase, recoveryContext } from './lib/client.js';
import { list, unwrap, signupOwner, organizationOwnerAccess } from './lib/api.js';
import { $, e, notify, closeDialog } from './lib/ui.js';
import { installSearchableSelects } from './lib/searchable-select.js';
import { forgotPassword, resetPassword, clearRecoveryUrl } from './lib/password-recovery.js';
import { managerPages } from './lib/domain.js';
import { branding, mountBranding } from './lib/branding.js';
import { overview, products, inventory } from './pages/catalog.js';
import { sales, purchases, suppliers, expenses, accounts } from './pages/operations.js';
import { batches, returns, audit } from './pages/stock.js';
import { reports, summary, settings } from './pages/reports.js';
import { organizationPage } from './pages/organization.js';

installSearchableSelects();

const routes = {
  sync: ['Offline & sync', 'history', syncPage],
  organization: ['Organization', 'boxes', organizationPage],
  dashboard: ['Dashboard', 'layout-dashboard', overview],
  products: ['Products', 'package', products],
  sales: ['Sales', 'shopping-cart', sales],
  inventory: ['Inventory', 'boxes', inventory],
  suppliers: ['Suppliers', 'truck', suppliers],
  purchases: ['Purchases', 'clipboard-list', purchases],
  expenses: ['Expenses', 'wallet', expenses],
  summary: ['Operating Summary', 'chart-no-axes-combined', summary],
  accounts: ['Manage Accounts', 'users-round', accounts],
  reports: ['Reports', 'chart-no-axes-column', reports],
  batches: ['Batches & Expiry', 'calendar-days', batches],
  returns: ['Returns & Refunds', 'undo-2', returns],
  audit: ['Audit History', 'history', audit],
  settings: ['Settings', 'settings', settings],
};
const icons = { LayoutDashboard, Package, ShoppingCart, Boxes, Truck, ClipboardList, Wallet, ChartNoAxesCombined, UsersRound, ChartNoAxesColumn, CalendarDays, Undo2, History, Settings, LogOut, Menu };

let profile, store, organization, generation = 0, shellUser, sessionUser;
let currentKey = 'dashboard';
let isOwner = false;
let disposeMobilePage;
let recoveryActive = false;
const app = $('#app');

function iconRefresh() { createIcons({ icons }); }

async function loadIdentity() {
  if (!navigator.onLine) {
    const userId = await storage('offline-user');
    const saved = userId && await storage('identity:' + userId);
    if (!saved || Date.now() - saved.saved > 86400000) throw new Error('Sign in online to prepare offline access (valid for 24 hours).');
    ({ profile, store, organization } = saved); isOwner = false;
    setOfflineIdentity(saved);
    return { id: userId };
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) { profile = null; throw new Error('Please sign in again.'); }
  const records = await list('profiles', { filters: { user_id: data.user.id }, cache: false });
  const next = records[0];
  if (!next || next.status !== 'active' || !next.store_id || !['user', 'manager'].includes(next.role)) { profile = null; throw new Error('An active account with a store assignment is required. Contact your manager.'); }
  const stores = await list('stores', { filters: { store_id: next.store_id }, cache: false });
  if (!stores[0]?.active) { profile = null; throw new Error('Your store is inactive or unavailable. Contact an administrator.'); }
  profile = next; store = stores[0];
  setOfflineIdentity({ profile, store });
  organization = store.organization_id ? (await list('organizations', { filters: { organization_id: store.organization_id }, cache: false }))[0] : null;
  isOwner = await organizationOwnerAccess();
  try { await storage('identity:' + data.user.id, { profile, store, organization, saved: Date.now() }); await storage('offline-user', data.user.id); } catch { /* Storage errors must not prevent online access. */ }
  return data.user;
}

function login(message = '', { success = false, email = '' } = {}) {
  generation++;
  disposeMobilePage?.(); disposeMobilePage = null;
  setOfflineIdentity(null);
  closeDialog(); shellUser = null; isOwner = false; profile = store = organization = null;
  app.innerHTML = `<main class="auth-container"><section class="auth-card">${branding()}<h2>Welcome back</h2><p class="muted">Sign in to your assigned store.</p><form id="loginForm"><label class="form-group">Email address<input name="email" type="email" required autocomplete="username" value="${e(email)}"></label><label class="form-group">Password<input name="password" type="password" required autocomplete="current-password"></label><button class="primary-btn" type="submit">Login</button><p id="loginError" role="alert">${e(message)}</p></form><button type="button" class="auth-link" id="forgotPasswordBtn">Forgot password?</button><p class="auth-help">Need an account? Contact your manager. Worker accounts are created by a manager.</p><button type="button" class="secondary-btn auth-signup" id="signupBtn" hidden>Sign up as organization owner</button><p class="footer">© Powered by Trauts technologies · <a href="${import.meta.env.BASE_URL}user-guide.html" target="_blank" rel="noopener">User guide</a></p></section></main>`;
  mountBranding(app);
  $('#forgotPasswordBtn').onclick = () => {
    const email = $('#loginForm [name="email"]').value;
    generation++;
    forgotPassword({ email, onBack: () => login() });
  };
  const signupButton = $('#signupBtn');
  signupButton.onclick = ownerSignup;
  // Do not offer account creation until its atomic database provisioning is deployed.
  supabase.rpc('owner_signup_available').then(({ data, error }) => {
    if (signupButton.isConnected && !error && data === true) signupButton.hidden = false;
  }).catch(() => { /* Existing users can still sign in if availability cannot be checked. */ });
  if (success) { $('#loginError').setAttribute('role', 'status'); $('#loginError').style.color = '#237a48'; }
  $('#loginForm').onsubmit = async event => {
    event.preventDefault();
    const form = event.target;
    const submit = $('button', form); submit.disabled = true;
    $('#loginError').textContent = '';
    try {
      const values = new FormData(form);
      await unwrap(await supabase.auth.signInWithPassword({ email: String(values.get('email')).trim(), password: values.get('password') }));
      await loadIdentity(); form.reset(); await enter();
    } catch (error) { if ($('#loginError')) $('#loginError').textContent = error.message; }
    finally { submit.disabled = false; }
  };
}

function ownerSignup() {
  generation++;
  closeDialog();
  app.innerHTML = `<main class="auth-container"><section class="auth-card">${branding()}<h2>Create an organization owner account</h2><p class="muted">Set up a new business and store. You will be its organization owner, with manager access to your assigned store. Staff accounts are created by a manager after setup.</p><form id="signupForm"><label class="form-group">Your name<input name="user_name" required maxlength="150" autocomplete="name"></label><label class="form-group">Business / organization name<input name="organization_name" required maxlength="150" autocomplete="organization"></label><label class="form-group">Store name<input name="store_name" required maxlength="150"></label><label class="form-group">Email address<input name="email" type="email" required autocomplete="email"></label><label class="form-group">Phone number (optional)<input name="phone" type="tel" maxlength="30" autocomplete="tel"></label><label class="form-group">Password<input name="password" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></label><p class="muted">Use at least 12 characters.</p><label class="form-group">Confirm password<input name="confirm_password" type="password" required autocomplete="new-password"></label><p id="signupError" role="alert"></p><button class="primary-btn" type="submit">Create business</button><button class="secondary-btn auth-signup" type="button" id="backToLogin">Back to login</button></form></section></main>`;
  mountBranding(app);
  $('#backToLogin').onclick = () => login();
  $('#signupForm').onsubmit = async event => {
    event.preventDefault();
    const form = event.target;
    const submit = $('button[type="submit"]', form);
    if (submit.disabled) return;
    const back = $('#backToLogin');
    const errorBox = $('#signupError');
    errorBox.textContent = '';
    let uncertain = false, created = false;
    try {
      const values = Object.fromEntries(new FormData(form));
      if (values.password !== values.confirm_password) throw new Error('Passwords do not match.');
      for (const key of ['user_name', 'organization_name', 'store_name']) {
        if (!values[key].trim()) throw new Error('Enter your name, business name and store name.');
      }
      submit.disabled = back.disabled = true;
      const email = values.email.trim();
      const result = await signupOwner({ email, password: values.password, user_name: values.user_name.trim(), organization_name: values.organization_name.trim(), store_name: values.store_name.trim(), phone: values.phone.trim() || null });
      created = true;
      form.reset();
      if (result.confirmation_required) {
        login('Check your email to confirm your account, then sign in. If you already have an account, sign in or contact your administrator.', { success: true, email });
      } else {
        history.replaceState(null, '', '#/dashboard');
        await loadIdentity();
        await enter();
        notify('Your business is ready. Start by adding products and receiving stock.');
      }
    } catch (error) {
      uncertain = created || Boolean(error.uncertain);
      errorBox.textContent = error.message;
      if (uncertain) {
        form.querySelectorAll('input').forEach(input => { input.readOnly = true; });
      }
    } finally { submit.disabled = uncertain; back.disabled = false; }
  };
}

function shell() {
  shellUser = `${profile.user_id}:${profile.role}:${profile.store_id}:${isOwner}`;
  const allowed = Object.entries(routes).filter(([key]) => (key !== 'organization' || isOwner) && (profile.role === 'manager' || !managerPages.has(key)));
  app.innerHTML = `<div class="layout"><aside class="sidebar" id="trautsSidebar">${branding(true)}<div class="menu-label">MAIN MENU</div><nav class="sidebar-nav">${allowed.map(([key, [name, icon]]) => `<a class="nav" href="#/${key}" data-route="${key}"><i data-lucide="${icon}"></i><span>${name}</span></a>`).join('')}</nav><div class="sidebar-footer"><div class="user-profile"><div class="user-avatar">${e(profile.user_name?.slice(0, 1) || 'U')}</div><div class="user-info"><strong>${e(profile.user_name)}</strong><small>${e(isOwner ? 'Organization Owner' : profile.role === 'manager' ? 'Shop Manager' : 'Shopkeeper')}</small></div></div><button id="logoutBtn" class="logout"><i data-lucide="log-out"></i>Logout</button></div></aside><main class="main"><button class="mobile-menu-btn" id="mobileMenuBtn" aria-controls="trautsSidebar" aria-expanded="false"><i data-lucide="menu"></i>Menu</button><header class="app-header"><div><p class="eyebrow">${e(organization?.organization_name || 'YOUR BUSINESS')}</p><h1 id="pageTitle">Dashboard</h1><p>${e(store.store_name)} · ${e(store.time_zone)} · ${e(isOwner ? 'Organization owner workspace' : profile.role === 'manager' ? 'Manager workspace' : 'Shopkeeper workspace')}</p></div></header><a class="sync-indicator" href="#/sync" id="syncStatus" role="status">Checking sync status…</a><p id="appMessage" hidden></p><section id="pageContent" aria-live="polite"></section><footer class="page-footer">TRAUTS Shop Manager · ${e(store.store_name)} · <a href="${import.meta.env.BASE_URL}${document.documentElement.hasAttribute('data-mobile-app') ? 'index.html' : 'mobile.html'}">${document.documentElement.hasAttribute('data-mobile-app') ? 'Web version' : 'Mobile version'}</a> · <a href="${import.meta.env.BASE_URL}user-guide.html" target="_blank" rel="noopener">User guide</a></footer></main></div>`;
  mountMobileShell(app);
  updateSyncStatus();
  mountBranding(app);
  $('#logoutBtn').onclick = async () => {
    $('#logoutBtn').disabled = true;
    const result = await supabase.auth.signOut();
    if (result.error) { notify(result.error.message, true); $('#logoutBtn').disabled = false; return; }
    sessionUser = null; login();
  };
  $('#mobileMenuBtn').onclick = () => {
    const open = $('#trautsSidebar').classList.toggle('mobile-open');
    $('#mobileMenuBtn').setAttribute('aria-expanded', String(open));
    const backdrop = $('#mobileSidebarBackdrop'); if (backdrop) backdrop.hidden = !open;
  };
  document.querySelectorAll('[data-route]').forEach(link => {
    link.addEventListener('click', event => {
      if (link.hash === location.hash || (!location.hash && link.dataset.route === 'dashboard')) {
        event.preventDefault();
        render();
      }
    });
  });
  iconRefresh();
}

async function render() {
  if (recoveryActive) return;
  const token = ++generation;
  disposeMobilePage?.(); disposeMobilePage = null;
  closeDialog();
  try {
    await loadIdentity();
    if (token !== generation) return;
    if (shellUser !== `${profile.user_id}:${profile.role}:${profile.store_id}:${isOwner}`) shell();
    const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
    const requested = path || 'dashboard';
    const intent = requested === 'sales' && new URLSearchParams(query).get('action') === 'new' ? 'new-sale' : null;
    currentKey = routes[requested] ? requested : 'dashboard';
    if (managerPages.has(currentKey) && profile.role !== 'manager') currentKey = 'dashboard';
    if (currentKey === 'organization' && !isOwner) currentKey = 'dashboard';
    $('#pageTitle').textContent = routes[currentKey][0];
    document.title = `${routes[currentKey][0]} | TRAUTS`;
    document.querySelectorAll('[data-route]').forEach(node => node.classList.toggle('active', node.dataset.route === currentKey));
    $('#trautsSidebar').classList.remove('mobile-open');
    const backdrop = $('#mobileSidebarBackdrop'); if (backdrop) backdrop.hidden = true;
    $('#mobileMenuBtn').setAttribute('aria-expanded', 'false');
    $('#pageContent').innerHTML = '<p class="loading" role="status">Loading store data…</p>';
    $('#appMessage').hidden = true;
    const captured = { ...profile };
    const ctx = {
      profile: captured, store: { ...store }, organization,
      intent,
      owner: isOwner,
      mobile: document.documentElement.hasAttribute('data-mobile-app'),
      manager: profile.role === 'manager',
      money: value => new Intl.NumberFormat('en-ZM', organization?.currency_code ? { style: 'currency', currency: organization.currency_code } : { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0)),
      async guard() {
        await loadIdentity();
        if (profile.user_id !== captured.user_id || profile.store_id !== captured.store_id || profile.role !== captured.role) throw new Error('Your account assignment changed. Reload before continuing.');
      },
      refresh: () => render(),
      mount(html, presentation) {
        if (token !== generation) return null;
        // Give each page its own event root; old delegated handlers leave with it.
        const root = document.createElement('div');
        root.innerHTML = html;
        disposeMobilePage?.();
        disposeMobilePage = restoreMobileLayout(root, currentKey, ctx, presentation);
        $('#pageContent').replaceChildren(root);
        iconRefresh();
        return root;
      },
    };
    await routes[currentKey][2](ctx);
    if (token === generation && intent && currentKey === 'sales') {
      history.replaceState(null, '', '#/sales');
    }
  } catch (error) {
    if (token !== generation) return;
    if (!profile || !shellUser) { login(error.message); return; }
    $('#pageContent').innerHTML = '<section class="panel"><h2>Unable to load this page</h2><p>Check your connection, session, and deployed backend migrations, then refresh.</p></section>';
    notify(error.message, true);
  }
}

async function enter() {
  if (recoveryActive) return;
  shell(); await render();
  if (navigator.onLine && shellUser) {
    try { if (await syncSales()) await render(); } catch (error) { notify(error.message, true); }
  }
}

function finishRecovery() {
  recoveryActive = false;
  recoveryContext.requested = recoveryContext.fromLink = false;
  recoveryContext.userId = null;
  clearRecoveryUrl();
}

function beginRecovery(userId) {
  if (recoveryActive && $('#passwordResetForm')) return;
  recoveryActive = true;
  generation++;
  shellUser = null; isOwner = false; profile = store = organization = null;
  resetPassword({ userId,
    onComplete: message => { finishRecovery(); login(message, { success: true }); },
    onCancel: () => { finishRecovery(); login(); },
  });
}

if (!configured) {
  app.innerHTML = `<main class="auth-container"><section class="auth-card">${branding()}<h2>Connect your store</h2>${configurationError ? `<p role="alert">${e(configurationError)}</p>` : ''}<p>Copy <code>.env.example</code> to <code>.env</code>, enter your Supabase URL and public anon key, then restart the development server.</p><p>Never use a service-role key in this application.</p></section></main>`;
  mountBranding(app);
} else {
  // Listen before awaiting startup: recovery events must take precedence over dashboard entry.
  supabase.auth.onAuthStateChange((event, nextSession) => {
    const nextUser = nextSession?.user.id;
    if (event === 'PASSWORD_RECOVERY' && nextUser) {
      sessionUser = nextUser;
      recoveryActive = true;
      setTimeout(() => beginRecovery(nextUser), 0);
    } else if (event === 'SIGNED_OUT') {
      storage('offline-user', null).catch(() => {});
      sessionUser = null;
      if (!recoveryActive) login();
    } else if (recoveryActive || recoveryContext.requested) {
      if (nextUser) sessionUser = nextUser;
    // Never await Supabase calls inside this callback (Auth holds an internal lock).
    } else if (event === 'SIGNED_IN' && nextUser && sessionUser && nextUser !== sessionUser) {
      sessionUser = nextUser;
      setTimeout(() => render(), 0);
    } else if (nextUser) sessionUser = nextUser;
  });
  if (!navigator.onLine && !recoveryContext.requested) {
    sessionUser = await storage('offline-user');
    if (sessionUser) {
      try { await loadIdentity(); await enter(); } catch (error) { login(error.message); }
    } else login('Sign in online before using this device offline.');
  } else {
  const initialized = await supabase.auth.initialize();
  const session = await supabase.auth.getSession();
  if (session.error && !recoveryContext.requested) throw session.error;
  sessionUser = session.data.session?.user.id;
  if (recoveryContext.requested || recoveryContext.userId) {
    if (!initialized.error && sessionUser && (recoveryContext.fromLink || recoveryContext.userId === sessionUser)) {
      beginRecovery(sessionUser);
    } else {
      finishRecovery();
      forgotPassword({ message: 'This reset link is invalid or has expired. Request a new link below.', onBack: () => login() });
    }
  } else if (sessionUser) {
    try { await loadIdentity(); await enter(); } catch (error) { login(error.message); }
  } else login();
  }
  window.addEventListener('hashchange', () => { if (shellUser) render(); });
}

async function updateSyncStatus() {
  const node = document.getElementById('syncStatus');
  if (!node) return;
  try {
    const entries = await queueEntries();
    const pending = entries.filter(x => x.status !== 'synced').length;
    node.textContent = `${navigator.onLine ? 'Online' : 'Offline · showing cached data'} · ${pending} sale(s) awaiting sync or review`;
  } catch { node.textContent = 'Offline storage unavailable · keep an internet connection'; }
}
window.addEventListener('trauts-sync', updateSyncStatus);
window.addEventListener('offline', updateSyncStatus);
window.addEventListener('online', async () => {
  await updateSyncStatus();
  if (!shellUser) return;
  try { await loadIdentity(); await syncSales(); await render(); }
  catch (error) { notify(error.message, true); }
});
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}
