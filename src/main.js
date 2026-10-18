import './styles/original/dashboard.css';
import './styles/app.css';
import { createIcons, LayoutDashboard, Package, ShoppingCart, Boxes, Truck, ClipboardList, Wallet, ChartNoAxesCombined, UsersRound, ChartNoAxesColumn, CalendarDays, Undo2, History, Settings, LogOut, Menu } from 'lucide';
import { configured, configurationError, supabase } from './lib/client.js';
import { list, unwrap } from './lib/api.js';
import { $, e, notify, closeDialog } from './lib/ui.js';
import { managerPages } from './lib/domain.js';
import { branding, mountBranding } from './lib/branding.js';
import { overview, products, inventory } from './pages/catalog.js';
import { sales, purchases, suppliers, expenses, accounts } from './pages/operations.js';
import { batches, returns, audit } from './pages/stock.js';
import { reports, summary, settings } from './pages/reports.js';

const routes = {
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
const app = $('#app');

function iconRefresh() { createIcons({ icons }); }

async function loadIdentity() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) { profile = null; throw new Error('Please sign in again.'); }
  const records = await list('profiles', { filters: { user_id: data.user.id } });
  const next = records[0];
  if (!next || next.status !== 'active' || !next.store_id || !['user', 'manager'].includes(next.role)) { profile = null; throw new Error('An active account with a store assignment is required. Contact your manager.'); }
  const stores = await list('stores', { filters: { store_id: next.store_id } });
  if (!stores[0]?.active) { profile = null; throw new Error('Your store is inactive or unavailable. Contact an administrator.'); }
  profile = next; store = stores[0];
  organization = store.organization_id ? (await list('organizations', { filters: { organization_id: store.organization_id } }))[0] : null;
  return data.user;
}

function login(message = '') {
  generation++;
  closeDialog(); shellUser = null; profile = store = organization = null;
  app.innerHTML = `<main class="auth-container"><section class="auth-card">${branding()}<h2>Welcome back</h2><p class="muted">Sign in to your assigned store.</p><form id="loginForm"><label class="form-group">Email address<input name="email" type="email" required autocomplete="username"></label><label class="form-group">Password<input name="password" type="password" required autocomplete="current-password"></label><button class="primary-btn" type="submit">Login</button><p id="loginError" role="alert">${e(message)}</p></form><p class="auth-help">Need an account or password assistance? Contact your manager. Worker accounts are created by a manager.</p><p class="footer">© Powered by Trauts technologies · <a href="${import.meta.env.BASE_URL}user-guide.html" target="_blank" rel="noopener">User guide</a></p></section></main>`;
  mountBranding(app);
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

function shell() {
  shellUser = `${profile.user_id}:${profile.role}:${profile.store_id}`;
  const allowed = Object.entries(routes).filter(([key]) => profile.role === 'manager' || !managerPages.has(key));
  app.innerHTML = `<div class="layout"><aside class="sidebar" id="trautsSidebar">${branding(true)}<div class="menu-label">MAIN MENU</div><nav class="sidebar-nav">${allowed.map(([key, [name, icon]]) => `<a class="nav" href="#/${key}" data-route="${key}"><i data-lucide="${icon}"></i><span>${name}</span></a>`).join('')}</nav><div class="sidebar-footer"><div class="user-profile"><div class="user-avatar">${e(profile.user_name?.slice(0, 1) || 'U')}</div><div class="user-info"><strong>${e(profile.user_name)}</strong><small>${e(profile.role === 'manager' ? 'Shop Manager' : 'Shopkeeper')}</small></div></div><button id="logoutBtn" class="logout"><i data-lucide="log-out"></i>Logout</button></div></aside><main class="main"><button class="mobile-menu-btn" id="mobileMenuBtn" aria-controls="trautsSidebar" aria-expanded="false"><i data-lucide="menu"></i>Menu</button><header class="app-header"><div><p class="eyebrow">${e(organization?.organization_name || 'YOUR BUSINESS')}</p><h1 id="pageTitle">Dashboard</h1><p>${e(store.store_name)} · ${e(store.time_zone)} · ${e(profile.role === 'manager' ? 'Manager workspace' : 'Shopkeeper workspace')}</p></div></header><p id="appMessage" hidden></p><section id="pageContent" aria-live="polite"></section><footer class="page-footer">TRAUTS Shop Manager · ${e(store.store_name)} · <a href="${import.meta.env.BASE_URL}user-guide.html" target="_blank" rel="noopener">User guide</a></footer></main></div>`;
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
  const token = ++generation;
  closeDialog();
  try {
    await loadIdentity();
    if (token !== generation) return;
    if (shellUser !== `${profile.user_id}:${profile.role}:${profile.store_id}`) shell();
    const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
    const requested = path || 'dashboard';
    const intent = requested === 'sales' && new URLSearchParams(query).get('action') === 'new' ? 'new-sale' : null;
    currentKey = routes[requested] ? requested : 'dashboard';
    if (managerPages.has(currentKey) && profile.role !== 'manager') currentKey = 'dashboard';
    $('#pageTitle').textContent = routes[currentKey][0];
    document.title = `${routes[currentKey][0]} | TRAUTS`;
    document.querySelectorAll('[data-route]').forEach(node => node.classList.toggle('active', node.dataset.route === currentKey));
    $('#trautsSidebar').classList.remove('mobile-open');
    $('#mobileMenuBtn').setAttribute('aria-expanded', 'false');
    $('#pageContent').innerHTML = '<p class="loading" role="status">Loading store data…</p>';
    $('#appMessage').hidden = true;
    const captured = { ...profile };
    const ctx = {
      profile: captured, store: { ...store }, organization,
      intent,
      manager: profile.role === 'manager',
      money: value => new Intl.NumberFormat('en-ZM', organization?.currency_code ? { style: 'currency', currency: organization.currency_code } : { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0)),
      async guard() {
        await loadIdentity();
        if (profile.user_id !== captured.user_id || profile.store_id !== captured.store_id || profile.role !== captured.role) throw new Error('Your account assignment changed. Reload before continuing.');
      },
      refresh: () => render(),
      mount(html) { if (token !== generation) return null; $('#pageContent').innerHTML = html; iconRefresh(); return $('#pageContent'); },
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

async function enter() { shell(); await render(); }

if (!configured) {
  app.innerHTML = `<main class="auth-container"><section class="auth-card">${branding()}<h2>Connect your store</h2>${configurationError ? `<p role="alert">${e(configurationError)}</p>` : ''}<p>Copy <code>.env.example</code> to <code>.env</code>, enter your Supabase URL and public anon key, then restart the development server.</p><p>Never use a service-role key in this application.</p></section></main>`;
  mountBranding(app);
} else {
  const session = await supabase.auth.getSession();
  if (session.error) throw session.error;
  sessionUser = session.data.session?.user.id;
  if (sessionUser) { try { await loadIdentity(); await enter(); } catch (error) { login(error.message); } }
  else login();
  supabase.auth.onAuthStateChange((event, nextSession) => {
    const nextUser = nextSession?.user.id;
    if (event === 'SIGNED_OUT') { sessionUser = null; login(); }
    // Never await Supabase calls inside this callback (Auth holds an internal lock).
    else if (event === 'SIGNED_IN' && nextUser && sessionUser && nextUser !== sessionUser) {
      sessionUser = nextUser;
      setTimeout(() => render(), 0);
    } else if (nextUser) sessionUser = nextUser;
  });
  window.addEventListener('hashchange', () => { if (shellUser) render(); });
}
