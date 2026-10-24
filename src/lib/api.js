import { cacheKey, storage, queueSale } from './offline.js';
import { supabase } from './client.js';

const identities = {
  profiles: 'user_id', stores: 'store_id', organizations: 'organization_id', products: 'product_id',
  suppliers: 'supplier_id', supplier_phones: 'supplier_phone_id', product_groups: 'product_group_id', selling_units: 'unit_code',
  sales: 'sale_id', sales_items: 'sales_item_id', purchases: 'purchase_id', purchase_items: 'purchase_item_id',
  expenses: 'expense_id', store_inventory: 'product_id', product_batches: 'batch_id',
  stock_movements: 'stock_movement_id', stock_movement_batches: 'allocation_id', batch_status_events: 'event_id',
  customer_returns: 'return_id', customer_return_items: 'return_item_id', return_stock_actions: 'action_id',
  batch_stock_migrations: 'migration_id', batch_stock_migration_items: 'migration_item_id',
  sellable_inventory: 'product_id', inventory_position: 'product_id', low_stock_report: 'product_id',
};

export function errorMessage(error) {
  if (error.status === 401 || ['PGRST301', 'PGRST303'].includes(error.code)) return 'Your session expired. Sign in again before continuing.';
  if (error.code === '23505') return 'This request or value already exists. Review the stored record before trying again.';
  if (error.code === '42501') return 'Your account does not have permission for this action.';
  if (error.code === 'PGRST202') return 'This backend function is unavailable. Check that its migration is deployed.';
  return error.message || 'The request could not be completed. Refresh the affected record before retrying.';
}

export async function unwrap(result) {
  if (result.error) throw Object.assign(new Error(errorMessage(result.error)), {
    code: result.error.code, details: result.error.details, hint: result.error.hint,
    httpStatus: result.status,
  });
  return result.data;
}

// Fetch every page, not only PostgREST's first page. All sort keys are stable.
export async function list(table, { select = '*', filters = {}, order, scope, cache = true } = {}) {
  const cacheId = JSON.stringify([table, select, filters, order, scope]);
  const dataKey = cache ? cacheKey('cache:' + cacheId) : null;
  if (!navigator.onLine) {
    const saved = dataKey && await storage(dataKey);
    if (!saved) throw new Error('This page has not been saved on this device. Open it online first.');
    return saved.data;
  }
  const rows = [];
  const ordering = order || identities[table] || 'report_date';
  const pageSize = 250;
  for (let start = 0; ; start += pageSize) {
    let query = supabase.from(table).select(select).order(ordering);
    if (table === 'daily_expense_report') query = query.order('category');
    if (scope) query = query.eq('store_id', scope);
    for (const [field, value] of Object.entries(filters)) query = value === null ? query.is(field, null) : query.eq(field, value);
    const data = await unwrap(await query.range(start, start + pageSize - 1));
    rows.push(...data);
    if (data.length < pageSize) {
      try { if (dataKey) await storage(dataKey, { data: rows, saved: Date.now() }); } catch { /* Online reads remain usable if storage is full. */ }
      return rows;
    }
  }
}

export async function insert(table, body) {
  if (!navigator.onLine) throw new Error('This action requires an internet connection.');
  return unwrap(await supabase.from(table).insert(body).select().single());
}

export async function patch(table, idField, id, body, storeId) {
  if (!navigator.onLine) throw new Error('This action requires an internet connection.');
  return unwrap(await supabase.from(table).update(body).eq(idField, id).eq('store_id', storeId).select().single());
}

export async function updateSupplierPhone(id, supplierId, phone) {
  if (!navigator.onLine) throw new Error('This action requires an internet connection.');
  return unwrap(await supabase.from('supplier_phones').update({ phone }).eq('supplier_phone_id', id).eq('supplier_id', supplierId).select().single());
}

export async function deleteSupplierPhone(id, supplierId) {
  if (!navigator.onLine) throw new Error('This action requires an internet connection.');
  return unwrap(await supabase.from('supplier_phones').delete().eq('supplier_phone_id', id).eq('supplier_id', supplierId).select().single());
}

export async function rpc(name, body) {
  if (!navigator.onLine) {
    if (name === 'record_sale') return queueSale(body);
    throw new Error('This action requires an internet connection.');
  }
  return unwrap(await supabase.rpc(name, body));
}

export async function createWorker(body) {
  if (!navigator.onLine) throw new Error('This action requires an internet connection.');
  const result = await supabase.functions.invoke('create-worker', { body });
  if (result.error) {
    let message = result.error.message;
    try { const payload = await result.error.context.json(); message = payload.error || payload.message || message; } catch { /* gateway/network errors may not be JSON */ }
    throw new Error(message || 'Account creation failed. Check whether the account exists before resubmitting.');
  }
  if (!result.data?.user_id || result.data.confirmation_required !== false) throw new Error('Unexpected worker response. Confirm the no-email create-worker revision is deployed; do not create the account again.');
  return result.data;
}


export async function signupOwner({ email, password, user_name, organization_name, store_name, phone }) {
  // Auth handles signup limits and email settings; the database creates the new store atomically.
  const result = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).href, data: { erp_owner_signup: { user_name, organization_name, store_name, phone } } },
  });
  if (result.error) throw Object.assign(new Error(result.error.message || 'Signup could not be completed.'), {
    uncertain: !result.error.status || result.error.status >= 500,
  });
  if (!result.data?.user?.id) throw Object.assign(new Error('Check your email or try signing in before submitting another signup.'), { uncertain: true });
  if (result.data.session) {
    try {
      const profile = await unwrap(await supabase.from('profiles').select('user_id,role,status,store_id').eq('user_id', result.data.user.id).single());
      if (profile?.role !== 'manager' || profile.status !== 'active' || !profile.store_id) {
        throw new Error('Your account needs store setup. Contact an administrator before signing up again.');
      }
    } catch (error) { throw Object.assign(error, { uncertain: true }); }
  }
  return { confirmation_required: !result.data.session };
}


export async function organizationOwnerAccess() {
  const result = await supabase.rpc('is_organization_owner');
  // Older installations keep their store login until the separately supplied SQL is installed.
  if (result.error?.code === 'PGRST202' || result.error?.code === '42883') return false;
  return (await unwrap(result)) === true;
}
