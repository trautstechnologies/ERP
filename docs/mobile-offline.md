# Mobile app and offline use

Open `/mobile.html` on the deployed site. The existing entry pages under `MOBILE version/assets/index.html/` launch the same authenticated mobile app. Run development with `npm run dev`; publish the complete `dist` directory after `npm run build`. This is a mobile web app, not a compiled Android APK. It shares the web app's Supabase configuration and backend functions.

The mobile navigation, sidebar, header and colors come from the uploaded mobile design. Backend forms and pages use the shared production modules, including organization overview, products, inventory, supplier phone numbers, purchases, expenses, worker management, reports, batches, returns, audit and settings. Access follows the existing manager/worker and organization owner rules. Old demo scripts remain as reference files but are no longer loaded; demo localStorage records are never imported as real business transactions.

## Working offline

1. Sign in online on the device. Open each page you will need while connected to save its data.
2. Production builds cache application files using a service worker over HTTPS (localhost works for development). Let the first load finish before disconnecting. Development builds do not cache application files for offline reloads.
3. Cached access is available for up to 24 hours after the last online identity check, using the same signed-in account. First login requires internet. Account and store status are rechecked on synchronization.
4. Offline pages show cached data. Stock and reports are snapshots, not reservations or confirmation of pending sales. Offline organization overview is unavailable.
5. Record sales normally. A successful local save means **pending sync**, not a completed Supabase sale. The Offline & sync page lists locally saved requests and their statuses.
6. Reconnect while the app is open. Pending sales upload automatically. You can also select Sync now. The server applies its current stock, price, permission and batch rules. Prices can change while offline; current server prices determine the confirmed total. Supabase records the sale date when it accepts the request; the queue also retains the original device save time.
7. Rejected uploads remain under review with their error. An interrupted upload can remain “Needs review.” Use Check server to match the server sale’s account, store, payment method and item quantities. A match resolves a lost acknowledgement without resubmitting. Otherwise check Sales using the transaction reference before retrying. Retrying always uses the original reference; never enter the same sale as a new request.

Offline sales are the only queued write operation. Purchases, stock changes, returns, refunds, supplier/product edits and account changes require a connection. This keeps operations that depend on current permissions, batches and stock under immediate server validation. The queue runs when the app is open, not as a guaranteed Android background task.

## Storage and recovery

Business snapshots and the durable sales queue use IndexedDB. Records are separated by Supabase project, account and assigned store. Web Locks serialize uploads across tabs. Use an up-to-date Chrome or compatible Android WebView with IndexedDB, Web Locks, HTTPS and service workers. Private browsing, storage limits and browser cleanup may prevent persistence; local-save failures are shown instead of reporting a successful sale.

Do not clear browser data or uninstall the browser while unsynced sales remain. Local records are not encrypted independently of the browser; protect the device and avoid shared public devices. Signing out hides the account's cached data; it retains pending transactions for that account to recover after signing in again. Keep the same browser profile until resolved.

The service worker caches only application assets, never Supabase requests, tokens or API responses. Database snapshots are stored separately in IndexedDB. Cached access cannot authorize a server operation; Supabase RLS and RPCs remain authoritative. Clearing site storage removes local records permanently.

## Theme

The sun/moon button is available on login and application pages in both versions. Dark colors match the mobile palette: background `#0b1524`, cards `#17283e`, inner surfaces `#20324a`, text `#e8eff9`. The choice is stored on the device; without a saved choice, the operating system preference is used.


## Restored mobile presentation (26 October 2026)

The uploaded mobile module styles are reused, with presentation adapters for the live backend's actual columns. The dashboard restores six summary cards, the gross-sales chart with 7-/30-day controls, restock/recent-sales sections and monthly metrics. Mobile lists use labeled cards; labels come from the real table headers and survive searching/filtering. New backend pages use the same card treatment. Suppliers and Purchases share the original navigation group with two route-backed tabs.

Dashboard Record sale and Sales → New Sale open the original-style product picker and cart. The cart submits through the existing `record_sale` RPC or offline queue using the same UUID/frozen-payload handling. Quantity editing stays whole-item-only; prices/totals remain server-authoritative. The optional received/change calculator is a client-side aid, not an added payment API. Dashboard statistics use the scoped backend records, not the demo profit/debt fields. Desktop web presentation remains separate.
