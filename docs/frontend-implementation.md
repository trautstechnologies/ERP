# TRAUTS frontend implementation

## What changed

The supplied `ERP.txt` concatenated 33 HTML/CSS/JS source files plus a text-corrupted JPEG. The originals are preserved under `reference/original/`. The working implementation is a modular Vite application; it keeps the navy sidebar (`#142d59`), blue primary actions (`#173f8a`), pale backgrounds, brand positioning, cards, forms and tables. It removes fake login, hardcoded staff, invented transactions, demo setup, and localStorage business ledgers. Supabase Auth session storage remains normal.

The app uses a shared shell rather than separate copies of manager/shopkeeper pages. Workers have dashboard, products, sales and inventory; manager routes are guarded and hidden. Each navigation/mutation checks the current profile/store; database RLS and RPCs remain authoritative. Business owners can create their own new business/store/manager through Auth signup and an atomic database trigger; additional-store provisioning and reassignment remain administrative. See `owner-signup.md`.

## Feature map

| Screen | Live backend operations |
| --- | --- |
| Login | Supabase password sign-in/session refresh/logout; active profile/store validation |
| Dashboard | Scoped sales, catalog, sellable stock and low-stock summary |
| Products | Catalog, prices, SKU/category, supplier, whole-item products, activation (no variant/group controls) |
| Inventory | Main/return-holding/sellable balances, reorder level, untracked stock adjustment |
| Sales | Multi-item sale RPC, own/store history, item/batch trace, manager full cancellation |
| Suppliers | Scoped suppliers, edits, activation, contact-number listing/addition |
| Purchases | Multi-item receipt, per-item batch allocation, receipt history/details, full cancellation |
| Expenses | Scoped expense recording/history; optional verified cancellation RPC |
| Manage Accounts | No-email atomic worker creation through Edge Function, name/phone/status updates; no email column assumed |
| Batches & Expiry | Enable tracking on zero stock, existing-stock conversion with exact allocation sum, status changes, batch adjustment |
| Returns & Refunds | Multi-item original-sale returns, original batch selection, return holding/release/disposal, recording externally performed refunds, safe voids, audit history |
| Audit History | Read-only stock movements, batch allocations/status events, migration and quarantine action IDs |
| Reports | Database daily gross/net/return/refund/expense and low-stock views; date filters and CSV export |
| Operating Summary | Net sales less recorded expenses, explicitly before cost of goods and tax |
| Settings | Organization/store/account context, manager timezone RPC |

Products are inventory items in the current schema. The original demo's services and arbitrary business-specific fields have not been silently converted into inventory: those require backend support. Pack/tablet conversion, cross-store switching, tax/discounts, online card payments, and a historical cost-of-goods profit ledger are not implemented by this frontend.

## Backend prerequisites

1. Complete migration-history reconciliation and inspect the deployed schema using `docs/verify-backend-contract.sql`.
2. Apply the previously developed fractional, organization/type/variant, batching, existing-stock migration, customer returns and return-void migrations. These SQL sources are not copied into a guessed migration history here.
3. Deploy the updated no-email `create-worker` function provided in the conversation. Its success contract is HTTP 201, `confirmation_required:false`, worker UUID and role `user`. Keep the atomic Auth profile-provisioning trigger. Older email-delivery responses produce a deliberate client error rather than another account creation.
4. Supply active profiles/stores and real selling-unit rows. Zambia store timezone is `Africa/Lusaka`. An inactive Auth account/profile/store cannot enter the app merely because it has a persisted session.
5. The confirmed `supplier_phones` columns are `supplier_phone_id` (uuid primary key), `supplier_id` (uuid) and `phone` (text). Contact reads/writes use RLS through the parent supplier; edits/removals filter by both contact key and supplier key.
6. Expense cancellation stays disabled by default. Only set `VITE_ENABLE_EXPENSE_CANCELLATION=true` after verifying `cancel_expense(p_expense_id uuid,p_reason text)`. Its complete deployed definition was not supplied. Disabled cancellation is visibly explained in the UI.
7. No administrator/service key belongs in `.env`. Normal clients can never call private staging/core functions directly.

## Transaction behavior

- All stock-changing workflows use backend RPCs. Client whole-number validation and decimal money arithmetic improve validation but do not replace transactional checks.
- Transaction dialogs create and display one UUID. After an uncertain error, the payload/ID remain frozen for that dialog. Known validation/business-rule failures unlock inputs because the rejected call made no changes. Use full UUID history/audit search to reconcile; a duplicate response alone is not assumed to mean success.
- Closing an unresolved dialog discards its in-memory draft. Copy its request ID before closing and reconcile before opening a new action. Do not refresh/close a mutation dialog while investigating an uncertain outcome. No offline queue or automatic compensation is implemented.
- Worker creation has no request-ID contract. The form allows one submission attempt, then requires administrative reconciliation before starting another attempt. Credentials are never persisted in business storage or logs.
- Direct inserts use stable client-generated row IDs; patches require a returned row, so zero-row edits cannot display false success. Server errors are shown in the form/status region.
- Reads fetch stable ordered pages of 250 until complete. Client filters then search the retrieved scoped dataset; this is appropriate for the current small system. Larger stores should move list filtering and report date ranges to indexed server-side pagination.
- Catalog availability is not a reservation. A concurrent sale can change stock before submission; the backend decides whether the sale commits.

## Returns and reporting

Return forms reference original sales item IDs and original sold batches. Server prices and rounded entitlements are authoritative. Pharmacy returns have no release option; the backend also enforces that policy and its snapshot. Void buttons are shown only for apparently untouched quarantine records, with server-side rounding/permission checks still authoritative. A void requires explicit acknowledgment that the record is erroneous.

Pending queues filter BOTH active return status and pending refund status. A voided return can retain `refund_status='pending'` for audit without appearing as payable. Refunding means recording a payment already performed elsewhere; the UI explicitly asks for that acknowledgment. It does not initiate a payment.

No profit is computed using current catalog buying prices. The operating summary is net sales minus recorded expenses, before historical cost of goods and tax. Report business dates come from server views and the configured store timezone. Currency formatting comes from the organization; absent currency settings display numeric amounts instead of inventing a currency.

## Validation scope

Run `npm test`, `npm run build`, and the mocked browser integration tests. The mocks exercise page loading, role gating, payload shape, stable retry identity, active-versus-voided queues, worker provisioning responses, and mobile navigation. They do not validate the hosted database's migrations, RLS, deployed function source or real SMTP/payment behavior. Use `docs/frontend-smoke-tests.md` for live-project acceptance with dedicated test records.

The output can be statically hosted from `dist/`. HTTPS and trusted deployment access remain the host's responsibility. If deploying under a URL subdirectory, configure Vite's `base` for that path before building. Do not deploy the original reference directory as an alternative app.

Since 19 October 2026, all quantity forms accept whole numbers only. New products use `each`; existing units and attributes are preserved when editing. Apply [the whole-quantity database patch](../database/patches/20261019_whole_quantities.sql) as described in [the transition notes](simple-products.md).

All dropdowns use the shared searchable-select enhancement. Native select controls remain the source of truth for required validation, FormData, selected values and existing change handlers. Menus support label filtering, keyboard selection/cancellation, dynamic form rows, mobile positioning and empty results. Search text has no form name and is never included in backend payloads.
