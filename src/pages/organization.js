import { list, rpc } from '../lib/api.js';
import { $, e, badge, button, table, row, panel, stat, note, dialog, dateLabel, actionForm, field, select, options } from '../lib/ui.js';
import { heading, bind } from './shared.js';

export async function organizationPage(ctx) {
  if (!ctx.owner) throw new Error('Organization owner access is required.');
  // The backend derives the organization from the authenticated owner, not a browser-supplied ID.
  const data = await rpc('get_organization_overview');
  if (!data?.organization || !Array.isArray(data.stores)) throw new Error('Organization details are unavailable. Please reopen this page.');
  const business = data.organization;
  const stores = data.stores;
  const members = store => Array.isArray(store.staff) ? store.staff : [];
  const access = person => person.is_owner ? 'Organization Owner' : person.role === 'manager' ? 'Manager' : 'Worker';
  const team = stores.flatMap(store => members(store).map(person => ({ ...person, store_name: store.store_name })));
  const root = ctx.mount(`${heading('Organization', 'Your business, stores and their teams.', button('Add store', 'add-store', '', false))}<div class="stats">${stat('Stores', stores.length)}${stat('Managers, including owner', team.filter(p => p.role === 'manager').length)}${stat('Workers', team.filter(p => p.role === 'user').length)}</div>${panel('Business details', `<dl><dt>Business name</dt><dd>${e(business.organization_name)}</dd><dt>Legal name</dt><dd>${e(business.legal_name || 'Not added')}</dd><dt>Currency</dt><dd>${e(business.currency_code || 'Not configured')}</dd><dt>Tax number</dt><dd>${e(business.tax_number || 'Not added')}</dd></dl>`)}${note(`Your assigned store is ${ctx.store.store_name}. Use the other pages to manage this store. This page provides a view of all stores and teams in your organization.`)}<div class="filters"><input class="search-input" type="search" data-organization-search aria-label="Search organization" placeholder="Search stores, names or phone numbers…"></div>${panel('Stores', '<div data-organization-stores></div>')}${panel('Managers and workers', '<div data-organization-team></div>')}`);
  if (!root) return;
  const matches = (values, term) => values.some(value => String(value ?? '').toLowerCase().includes(term));
  const render = (term = '') => {
    const visibleStores = stores.filter(store => matches([store.store_name, store.address, store.store_type, store.active ? 'active' : 'inactive', ...members(store).flatMap(p => [p.user_name, p.phone, access(p)])], term));
    $('[data-organization-stores]', root).innerHTML = table(['Store', 'Type', 'Address', 'Timezone', 'Status', 'Managers', 'Workers', 'Actions'], visibleStores.map(store => row([
      `${e(store.store_name)}${store.store_id === ctx.profile.store_id ? '<br><small>Your assigned store</small>' : ''}`, e((store.store_type || '').replaceAll('_', ' ')), e(store.address || 'Not added'), e(store.time_zone), badge(store.active ? 'active' : 'inactive'), e(members(store).filter(p => p.role === 'manager').length), e(members(store).filter(p => p.role === 'user').length), button('View store', 'view-store', store.store_id),
    ])));
    $('[data-organization-team]', root).innerHTML = table(['Name', 'Access', 'Store', 'Phone', 'Status'], team.filter(person => matches([person.user_name, person.store_name, person.phone, person.status, access(person)], term)).map(person => row([e(person.user_name), e(access(person)), e(person.store_name), e(person.phone || 'Not added'), badge(person.status)])));
  };
  $('[data-organization-search]', root).oninput = event => render(event.target.value.trim().toLowerCase());
  bind(root, {
    'add-store': async () => {
      const [types, zones] = await Promise.all([
        list('store_types', { order: 'store_type_code' }),
        list('store_time_zones', { order: 'time_zone' }),
      ]);
      if (!root.isConnected) return;
      if (!types.length || !zones.length) throw new Error('Store types and timezones must be configured before adding a store.');
      actionForm('Add store', note(`This store will belong to ${business.organization_name}. It starts empty. Your assigned store stays ${ctx.store.store_name}; creating a store does not assign a manager or move staff.`)
        + field('Store name', 'store_name', { maxLength: 150 })
        + field('Address (optional)', 'address', { required: false, maxLength: 500 })
        + select('Store type', 'store_type_code', options(types, 'store_type_code', 'display_name', ctx.store.store_type_code))
        + select('Timezone', 'time_zone', options(zones, 'time_zone', 'time_zone', ctx.store.time_zone))
        + note('For Zambia select Africa/Lusaka (CAT, UTC+2).'),
      (values, id) => {
        const name = values.store_name.trim();
        if (!name) throw new Error('Enter a store name.');
        return rpc('create_organization_store', {
          p_request_id: id, p_store_name: name, p_address: values.address.trim() || null,
          p_store_type_code: values.store_type_code, p_time_zone: values.time_zone,
        });
      }, ctx, { mutation: true, label: 'Create store' });
    },
    'view-store': id => {
      const store = stores.find(item => item.store_id === id);
      if (!store) return;
      dialog(store.store_name, `<dl><dt>Address</dt><dd>${e(store.address || 'Not added')}</dd><dt>Store type</dt><dd>${e((store.store_type || '').replaceAll('_', ' '))}</dd><dt>Timezone</dt><dd>${e(store.time_zone)}</dd><dt>Status</dt><dd>${badge(store.active ? 'active' : 'inactive')}</dd></dl><h3>Store team</h3>${table(['Name', 'Access', 'Phone', 'Status', 'Started'], members(store).map(person => row([e(person.user_name), e(access(person)), e(person.phone || 'Not added'), badge(person.status), e(dateLabel(person.start_date))])))}`);
    },
  });
  render();
}
