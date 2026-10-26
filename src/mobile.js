// Restore the uploaded mobile presentation; controllers still use the shared backend.
import '../MOBILE version/assets/user.css/products.css';
import '../MOBILE version/assets/user.css/inventory.css';
import '../MOBILE version/assets/user.css/sales.css';
import '../MOBILE version/assets/user.css/manage-accounts.css';
import '../MOBILE version/assets/user.css/reports.css';
import '../MOBILE version/assets/user.css/settings.css';
import '../MOBILE version/assets/user.css/suppliers-purchases.css';
import '../MOBILE version/assets/user.css/expenses.css';
import '../MOBILE version/assets/user.css/profit-loss.css';
import '../MOBILE version/assets/user.css/dashboard-overview.css';
import '../MOBILE version/assets/user.css/dashboard-mobile.css';
import './styles/mobile-integration.css';
document.documentElement.setAttribute('data-mobile-app', '');
import('./main.js').catch(error => {
  console.error('TRAUTS mobile startup:', error.message);
  document.getElementById('app').textContent = 'Could not open TRAUTS Mobile. Reconnect and reload the page.';
});
