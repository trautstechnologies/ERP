import template from './mobile-shell.html?raw';
export function mountMobileShell(app) {
  if (!document.documentElement.hasAttribute('data-mobile-app')) return;
  const current = app.querySelector('.layout');
  const next = document.createElement('div'); next.innerHTML = template;
  const layout = next.firstElementChild;
  layout.querySelector('.sidebar-nav').replaceWith(current.querySelector('.sidebar-nav'));
  const supplierLink = layout.querySelector('[data-route="suppliers"]');
  const purchaseLink = layout.querySelector('[data-route="purchases"]');
  if (supplierLink && purchaseLink) {
    supplierLink.querySelector('span').textContent = 'Suppliers & Purchases';
    supplierLink.dataset.mobileSupplyNav = '';
    purchaseLink.hidden = true;
  }
  layout.querySelector('.sidebar-footer').replaceWith(current.querySelector('.sidebar-footer'));
  layout.querySelector('.brand-logo img').src = `${import.meta.env.BASE_URL}branding/trauts-logo.jpg`;
  layout.querySelector('#trautsPageTitle').id = 'pageTitle';
  const main = layout.querySelector('.main');
  const oldMain = current.querySelector('.main');
  oldMain.querySelector('.app-header').remove();
  main.append(...oldMain.childNodes);
  const backdrop = document.createElement('button');
  backdrop.id = 'mobileSidebarBackdrop'; backdrop.hidden = true;
  backdrop.setAttribute('aria-label', 'Close navigation');
  backdrop.onclick = () => {
    layout.querySelector('#trautsSidebar').classList.remove('mobile-open');
    layout.querySelector('#mobileMenuBtn').setAttribute('aria-expanded', 'false');
    backdrop.hidden = true;
  };
  main.append(backdrop);
  app.replaceChildren(layout);
}
