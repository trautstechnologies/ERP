// IndexedDB records are partitioned by project, authenticated user and store.
import { supabase } from './client.js';
const project = import.meta.env.VITE_SUPABASE_URL || 'unconfigured';
let identity;
const changed = () => window.dispatchEvent(new Event('trauts-sync'));
const db = () => new Promise((resolve, reject) => {
  const request = indexedDB.open('trauts-offline-v1', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('records');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
export async function storage(key, value) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('records', value === undefined ? 'readonly' : 'readwrite');
    const store = tx.objectStore('records');
    const request = value === undefined ? store.get(project + ':' + key) : store.put(value, project + ':' + key);
    tx.oncomplete = () => { resolve(request.result); database.close(); };
    tx.onerror = () => { reject(tx.error); database.close(); };
    tx.onabort = () => { reject(tx.error || new Error('Local storage failed')); database.close(); };
  });
}
export function setOfflineIdentity(value) { identity = value; }
export function cacheKey(key) {
  if (!identity) return null;
  return `${identity.profile.user_id}:${identity.profile.store_id}:${key}`;
}
export async function cached(key, value) {
  const scoped = cacheKey('cache:' + key);
  if (!scoped) return undefined;
  return storage(scoped, value === undefined ? undefined : { data: value, saved: Date.now() });
}
export async function queueEntries(key = cacheKey('queue')) {
  return key ? (await storage(key)) || [] : [];
}
async function withLock(callback) {
  if (!navigator.locks) throw new Error('Offline sales require a browser with Web Locks support. Use a current Chrome or Android WebView.');
  const key = cacheKey('queue');
  if (!key) throw new Error('Sign in online before using offline sales.');
  const captured = structuredClone(identity);
  return navigator.locks.request(project + ':' + key, () => callback(key, captured));
}
export async function queueSale(body) {
  return withLock(async key => {
    const entries = await queueEntries(key);
    const existing = entries.find(x => x.id === body.p_request_id);
    if (existing && JSON.stringify(existing.body) !== JSON.stringify(body)) throw new Error('This request reference already has different entries. Review Offline & sync.');
    if (!existing) {
      entries.push({ id: body.p_request_id, body: structuredClone(body), status: 'pending', created: new Date().toISOString() });
      await storage(key, entries);
    }
    changed();
    return { offline: true };
  });
}
export async function syncSales() {
  if (!navigator.onLine || !identity) return 0;
  if (!(await queueEntries()).some(entry => entry.status === 'pending')) return 0;
  return withLock(async (key, captured) => {
    // Verify permissions online for every synchronization; cached roles never authorize writes.
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || auth.user?.id !== captured.profile.user_id) throw new Error('Sign in again to synchronize this account.');
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('user_id', auth.user.id).single();
    if (error || !profile || profile.status !== 'active' || profile.store_id !== captured.profile.store_id || profile.role !== captured.profile.role) throw new Error('Account access changed. Ask your manager to review pending sales.');
    const entries = await queueEntries(key);
    let synced = 0;
    for (const entry of entries.filter(x => x.status === 'pending')) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id !== captured.profile.user_id) throw new Error('Account changed. Pending sales were retained for the original account.');
      // Persist before dispatch: a crash must not silently resend an uncertain sale.
      entry.status = 'sending'; await storage(key, entries); changed();
      const result = await supabase.rpc('record_sale', entry.body);
      if (!result.error) { entry.status = 'synced'; entry.error = ''; synced++; }
      else {
        entry.status = 'review';
        entry.error = result.error.message || 'Unable to confirm transaction. Review the server sale before retrying.';
      }
      await storage(key, entries); changed();
      if (result.error && (!result.status || result.status >= 500)) break;
    }
    return synced;
  });
}
export async function retrySale(id) {
  await withLock(async key => {
    const entries = await queueEntries(key);
    const entry = entries.find(x => x.id === id);
    if (entry && entry.status !== 'synced') {
      entry.status = 'pending'; await storage(key, entries); changed();
    }
  });
  await syncSales();
}

// Resolve a lost acknowledgement only after matching the complete server transaction.
export async function verifySale(id) {
  if (!navigator.onLine) throw new Error('Connect to verify the server sale.');
  return withLock(async (key, captured) => {
    const entries = await queueEntries(key);
    const entry = entries.find(x => x.id === id);
    if (!entry) throw new Error('Local transaction unavailable.');
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || auth.user?.id !== captured.profile.user_id) throw new Error('Sign in as the original account to verify this sale.');
    const saleResult = await supabase.from('sales').select('*').eq('sale_id', id).eq('store_id', captured.profile.store_id).eq('user_id', captured.profile.user_id).maybeSingle();
    if (saleResult.error) throw new Error(saleResult.error.message);
    if (!saleResult.data) throw new Error('No matching server sale is visible. Keep this request and review or retry it using the original reference.');
    const items = await supabase.from('sales_items').select('product_id,quantity').eq('sale_id', id).eq('store_id', captured.profile.store_id);
    if (items.error) throw new Error(items.error.message);
    const signature = rows => {
      const totals = new Map();
      for (const row of rows) totals.set(row.product_id, (totals.get(row.product_id) || 0) + Number(row.quantity));
      return JSON.stringify([...totals].sort(([a], [b]) => a.localeCompare(b)));
    };
    if (saleResult.data.payment_method !== entry.body.p_payment_method || signature(items.data) !== signature(entry.body.p_items)) {
      throw new Error('The server reference has different sale details. Ask your manager to investigate; do not create another sale.');
    }
    entry.status = 'synced'; entry.error = 'Confirmed against server transaction history.';
    await storage(key, entries); changed();
  });
}
