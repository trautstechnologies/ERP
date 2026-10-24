import { queueEntries, retrySale, syncSales, verifySale } from '../lib/offline.js';
import { panel, e, table, row, button, notify } from '../lib/ui.js';
import { heading, bind, scoped, itemSummary } from './shared.js';
export async function syncPage(ctx) {
  const entries = await queueEntries();
  let products = [];
  try { products = await scoped(ctx, 'products'); } catch { /* The queue remains recoverable even if its catalog snapshot is unavailable. */ }
  const root = ctx.mount(`${heading('Offline & sync', 'Cached stock may be out of date. Pending sales are not confirmed sales.', button('Sync now', 'sync'))}${panel('Saved on this device', '<p>First login and account changes require internet. Other actions require a connection. Keep this browser’s storage until every pending sale is resolved. Clearing browser data removes unsynced records.</p>' + table(['Saved', 'Items', 'Status', 'Payment', 'Details', 'Actions'], entries.map(x => row([e(new Date(x.created).toLocaleString()), e(itemSummary(x.body.p_items, products)), e(x.status === 'sending' ? 'Needs review (interrupted)' : x.status), e(x.body.p_payment_method), e(x.error || (x.status === 'synced' ? 'Accepted by Supabase' : 'Awaiting server confirmation')) + `<details><summary>Transaction reference</summary>${e(x.id)}</details>`, x.status !== 'synced' ? button('Check server', 'verify', x.id) + button('Review / retry', 'retry', x.id) : 'Complete']))))}`);
  if (!root) return;
  bind(root, {
    verify: async id => { await verifySale(id); await ctx.refresh(); notify('Confirmed against server history.'); },
    sync: async () => { await syncSales(); await ctx.refresh(); },
    retry: async id => {
      if (!confirm('Check Sales online using this transaction reference first. Retrying uses the SAME reference so it cannot create a second sale. A duplicate response needs review; do not enter the sale again. Continue?')) return;
      await retrySale(id); await ctx.refresh(); notify('Synchronization checked. Review the transaction status.');
    },
  });
}
