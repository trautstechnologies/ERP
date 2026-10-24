# Frontend integration handoff

## Status and source of truth

Prepared 16 October 2026. The backend uses Supabase Auth, PostgreSQL/RLS, database RPCs, and the `create-worker` Edge Function. A separate Python server is not required for this integration.

Database contracts below were checked against the SQL available in this workspace. The user reported passing SQL/API tests for sales, purchases, batching, returns, concurrency, and return voiding. These reports are not a fresh execution against the hosted project.

The revised `create-worker` source was provided in chat; its deployment and immediate-login test have not been confirmed. Migration-history reconciliation was also discussed but its completion has not been confirmed. This checkout contains neither the complete migrations nor the deployed Edge Function source. Run [verify-backend-contract.sql](verify-backend-contract.sql) in the hosted SQL Editor and resolve discrepancies before integrating affected features. In particular, the exact deployed expense-cancellation signature and any additional staff-management endpoints need inspection; they are not invented here.

## Connection and authentication

Configure the frontend with the project's Supabase URL and public anon key. Never include the service-role/secret key, database password, or Resend key in a browser bundle. Prefer the Supabase client library for session refresh and API calls.

```typescript
import { createClient } from '@supabase/supabase-js';

// Read these two public values from your frontend's configuration.
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
if (error) throw error;

const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('user_id,user_name,store_id,role,status')
  .eq('user_id', data.user.id)
  .single();
if (profileError) throw profileError;
if (profile.status !== 'active') throw new Error('Account is inactive');
```

Use `supabase.auth.signOut()` for logout. Subscribe to `onAuthStateChange` to update app session state; do not put passwords in application state or logs. On an expired JWT, let the client refresh the session. If refresh fails, return to login. Reauthenticate/reconcile before retrying a mutation whose outcome is unknown.

The login email is an Auth field. `profiles` does not have an email column. Do not query `auth.users` from the frontend. The existing profile does not establish email ownership: newly provisioned workers are intentionally confirmed administratively.

| HTTP endpoint | Purpose |
| --- | --- |
| `POST /auth/v1/token?grant_type=password` | Password login; JSON `email,password`; returns session and user |
| `/rest/v1/<table-or-view>` | RLS-protected reads and permitted table writes |
| `POST /rest/v1/rpc/<function>` | Atomic database workflow |
| `POST /functions/v1/create-worker` | Manager creates a worker |

REST/RPC requests use `apikey: <anon-key>` and `Authorization: Bearer <user-access-token>`. JSON writes also use `Content-Type: application/json`. Do not use the anon key as the user's bearer token. Expose the `public` API schema; `private` contains internal functions and staging tables, not frontend endpoints.

Raw PostgREST reads return arrays. A scalar UUID RPC normally returns a JSON string, a numeric RPC a JSON number, and a table-returning RPC an array. The SDK wraps successful values in `data` and failures in `error`. Table writes return representations only when requested, for example `.insert(body).select()` or `Prefer: return=representation`.

## Identity and permissions

Each profile has one store and one role: `user` or `manager`. Managers do not gain access to other stores in their organization. Read the role/status/store from `profiles`, not user-editable Auth metadata. UI visibility is a convenience; RLS, grants, and RPC authorization enforce access.

| Area | Ordinary worker | Manager |
| --- | --- | --- |
| Profile/store | Own profile and assigned store | Own-store profiles and store |
| Organization | Own organization where permitted; no extra store access | Same organization boundary |
| Active products and prices | Read, including buying prices | Read/manage own-store catalog, including inactive products |
| Inventory and product batches | Read own-store permitted stock data | Read; change through RPCs |
| Sales | Record sales; read own sales/items | Record sales; read own-store sales; reverse sales |
| Sale batch trace | Own sale | Any sale in own store |
| Suppliers, purchases, expenses | No management access | Own-store management |
| Returns, quarantine, refunds, voids | No access | Own-store RPCs and audit reads |
| Stock movement/batch allocation audit | No management audit access | Own-store read |
| Operational reports | No manager report access | Own-store read |
| Worker creation | Rejected | Create worker in own store only |
| Additional managers/store reassignment | No frontend workflow | Administrative provisioning, not `create-worker`; new businesses use owner signup |

An inactive profile may still have a valid Auth session. Protected data and RPCs must remain unavailable. A filtered read may return `[]`, and a prohibited filtered update may affect zero rows rather than raise an error. Check returned rows/counts; HTTP success alone does not prove a mutation occurred.

## Reading data

Use explicit fields, filtering, pagination, and stable ordering. Add an ID as a tie-breaker when ordering by timestamps. Fetch headers and items separately initially; foreign-key embedding syntax should be generated from the deployed schema rather than guessed.

```typescript
const products = await supabase.from('products')
  .select('product_id,sku,product_name,selling_price,buying_price,selling_unit_code,batch_tracking,requires_expiry')
  .eq('active', true)
  .order('product_name')
  .order('product_id')
  .range(0, 49);

const availability = await supabase.from('sellable_inventory')
  .select('product_id,physical_quantity,sellable_quantity,reorder_level');

const history = await supabase.from('sales')
  .select('sale_id,sale_date,user_id,status,payment_method,total_amount')
  .order('sale_date', { ascending: false })
  .order('sale_id')
  .range(0, 49);

const items = await supabase.from('sales_items')
  .select('sales_item_id,product_id,quantity,unit_price,line_total')
  .eq('sale_id', selectedSaleId);
```

Always handle each query's `error`; the snippets above illustrate request shape. Page size is an application choice and PostgREST applies a configured maximum; do not assume one request retrieves every row. Availability is a snapshot, not a reservation. The sale RPC is authoritative when competing clients sell the same stock.

| Resource | Frontend use |
| --- | --- |
| `profiles`, `stores`, `organizations`, `store_types` | Session context and business/store details |
| `selling_units`, `product_groups`, `products` | Units, grouped variants, sellable catalog |
| `store_inventory` | Main inventory quantity and reorder level |
| `sellable_inventory` | Active products: main physical quantity versus eligible sellable quantity |
| `inventory_position` | Manager view: main quantity, return quarantine, total physical, sellable quantity |
| `product_batches` | Batch numbers, expiry, status, quantity |
| `suppliers`, `supplier_phones` | Manager supplier management |
| `purchases`, `purchase_items` | Received/cancelled purchase history |
| `sales`, `sales_items` | Completed/cancelled sale history and original sale item IDs |
| `expenses` | Manager expense history |
| `stock_movements`, `stock_movement_batches`, `batch_status_events` | Manager stock and batch audit |
| `batch_stock_migrations`, `batch_stock_migration_items` | Manager audit of existing-stock conversion |
| `customer_returns`, `customer_return_items`, `return_stock_actions` | Manager return/refund/quarantine audit |

Do not expose a delete-history action. Deactivate catalog products instead. Main inventory excludes customer-return quarantine. `sellable_inventory.physical_quantity` means main inventory, not all goods held across return quarantine. Use `inventory_position.total_physical_quantity` for the latter.

## Direct table writes

Use direct writes only where grants and RLS permit them. Supply the manager's `store_id` and `created_by` on scoped inserts where required; these values are validated by the database and are not a route to other stores.

| Table | Intended manager operation |
| --- | --- |
| `products` | Insert; edit permitted catalog fields such as name, SKU, category, prices, supplier, active, product group, variant attributes |
| `product_groups` | Own-store group management under deployed grants; inspect exact columns/permissions |
| `suppliers`, `supplier_phones` | Own-store supplier/contact management under deployed grants |
| `profiles` | Edit ordinary workers' permitted `user_name`, `phone`, `status`; no role or store reassignment |
| `expenses` | Insert own-store expense; use the deployed cancellation workflow for corrections |

Use `enable_batch_tracking`, not a direct product patch, for batch flags. The current API does not grant direct updates to `selling_unit_code`; choose the correct unit when creating a product. Do not directly write inventory, sale/purchase headers/items, movements, batches, return records, or quarantine actions. Do not directly insert profiles.

Minimal product insert example:

```json
{
  "store_id": "<manager-store-uuid>",
  "created_by": "<manager-user-uuid>",
  "sku": "SKU-001",
  "product_name": "Example product",
  "selling_price": 20,
  "buying_price": 10,
  "selling_unit_code": "each",
  "active": true
}
```

Product groups represent variants; every sellable variant is a product with its own ID/SKU and inventory. Variant attributes must be a JSON object, require a group when populated, and cannot duplicate another variant in the same store/group. No automatic conversion between pack, tablet, kg, or other units is implemented.

## RPC reference

Every function below uses `POST /rest/v1/rpc/<name>`, JSON with the exact parameter names, and the authenticated user's access token. Successful scalar calls normally return HTTP 200. Complete example bodies are in [api-payloads.json](api-payloads.json); angle-bracket values are placeholders, not executable UUIDs. Request IDs in different examples are independent.

| Function | Parameters | Return | Permission |
| --- | --- | --- | --- |
| `record_sale` | `p_request_id`, `p_payment_method`, `p_items` | Sale UUID | Active worker/manager |
| `receive_purchase` | `p_request_id`, `p_supplier_id`, `p_items` | Purchase UUID | Manager |
| `reverse_sale` | `p_sale_id`, `p_reason` | Sale UUID | Manager |
| `reverse_purchase` | `p_purchase_id`, `p_reason` | Purchase UUID | Manager |
| `adjust_stock` | `p_request_id`, `p_product_id`, `p_quantity_change`, `p_reason` | New aggregate quantity | Manager; untracked product |
| `set_reorder_level` | `p_product_id`, `p_reorder_level` | Reorder level | Manager |
| `set_store_time_zone` | `p_time_zone` | Timezone text | Manager |
| `enable_batch_tracking` | `p_product_id`, `p_requires_expiry` (default false) | Product UUID | Manager; zero existing stock |
| `migrate_existing_stock_to_batches` | `p_request_id`, `p_product_id`, `p_requires_expiry`, `p_batches`, `p_reason` | Migration UUID | Manager; positive existing untracked stock |
| `adjust_batch_stock` | `p_request_id`, `p_batch_id`, `p_quantity_change`, `p_reason` | New aggregate product quantity | Manager |
| `set_batch_status` | `p_batch_id`, `p_status`, `p_reason` | Batch UUID | Manager |
| `get_sale_batches` | `p_sale_id` | Trace rows | Seller or own-store manager |
| `record_customer_return` | `p_request_id`, `p_sale_id`, `p_items`, `p_reason` | Return UUID | Manager |
| `process_return_quarantine` | `p_request_id`, `p_return_item_id`, `p_action`, `p_quantity`, `p_reason`, `p_inspected` (default false) | Action UUID | Manager |
| `mark_return_refunded` | `p_return_id`, `p_method`, `p_reference` (default null) | Return UUID | Manager |
| `void_customer_return` | `p_return_id`, `p_reason` | Return UUID | Manager |

Expense cancellation exists in the previously developed workflow, but its definition is absent from the workspace sources. Inspect the deployed catalog for `cancel_expense` before implementing its client. Staff editing beyond the table grants above and administrator-led account recovery need their deployed implementation confirmed. Self-service password recovery uses the standard Auth endpoints described in password-recovery.md.

### Sales, purchases, and quantities

```typescript
// Create this ID once per intended sale, before sending it.
const requestId = crypto.randomUUID();
const result = await supabase.rpc('record_sale', {
  p_request_id: requestId,
  p_payment_method: 'cash',
  p_items: [{ product_id: selectedProductId, quantity: 1 }],
});
```

Sale items contain `product_id,quantity`; purchase items additionally contain `unit_cost`. Do not send client-calculated sale prices, totals, user IDs, or store IDs to these RPCs. The database uses current product prices, validates scope, locks stock, and commits items, totals, balances, and audit movements together. A failed item rolls back the entire call. The sale/purchase UUID equals `p_request_id`.

Payment methods are `cash`, `card`, `bank_transfer`, `mobile_money`, `other` after applying `database/patches/20261017_mobile_money.sql`. Mobile Money records an externally performed payment; it does not initiate a transfer. Mobile Money refunds require a reference, like other non-cash refunds. These labels do not charge a payment provider. Whole units such as `each` require whole quantities. Weight/volume units configured for decimals allow up to three decimal places. All quantities must be finite; positive except reorder levels may be zero and adjustments may be signed/nonzero. Money is rounded to two decimal places at line level. Use a decimal library for client previews; do not treat JavaScript floating-point arithmetic or a client cart total as the ledger. Display the returned/persisted database totals, and configure currency from business settings rather than hardcoding a symbol.

Full sale cancellation restores its original stock allocation. Purchase cancellation removes received stock only if its required stock/batches remain available. Cancellation is not a customer return. Active customer returns block sale cancellation; a sale whose only returns are voided may be cancelled. Do not automatically cancel historical transactions merely because a product is inactive.

### Batch inventory

For a tracked purchase item, supply `batches` with `batch_number,quantity,expires_on`. The batch sum must equal that item's quantity. Expiry is required when the product requires it. Sales choose eligible batches in FEFO order; the client does not choose sale batches. Expired, recalled, and quarantined batch stock is excluded from sellable stock. Expiry remains valid through its date in the store timezone.

Batch statuses are `available`, `quarantined`, `recalled`. A recalled batch cannot be released to available; an expired batch cannot be released for sale. `get_sale_batches` returns `sales_item_id,product_id,batch_id,batch_number,expires_on,quantity` for the original sale allocation, including after a sale reversal. It is provenance, not a remaining-returnable balance.

Existing-stock migration must allocate exactly the current main stock into batches, preserving aggregate quantity and monetary history. It is not a purchase and must not be implemented by zeroing live stock. Old sales without original batch provenance cannot be given invented allocations; relevant reversal/restocking operations may be rejected.

### Customer returns and corrections

Use original `sales_items.sales_item_id`, not just `product_id`, in a return. For a batched sale, identify the original `batch_id` from `get_sale_batches`. Limits apply both to the sale item and original batch allocation. Original sold prices determine refunds even if catalog prices have changed. Cumulative rounding ensures a full return refunds exactly the original rounded line total.

| Disposition/action | Effect |
| --- | --- |
| Return `restock` with `inspected: true` | Adds goods to main stock; eligibility checks apply |
| Return `quarantine` | Holds goods separately; does not increase main/sellable stock |
| Return `discard` | Records direct disposal for eligible ordinary retail; does not increase main stock |
| Quarantine `release` with `p_inspected: true` | Moves held goods into eligible main stock |
| Quarantine `dispose` | Reduces return quarantine; records the action, no main-stock movement |

Pharmacy returns must initially enter quarantine, even if they will later be disposed of. They cannot be released to sellable stock, and the pharmacy-policy snapshot persists if the store type changes. Expired/recalled batches and unknown original batch provenance also prevent restocking. Do not conflate a batch's `quarantined` status with the separate customer-return quarantine location.

`mark_return_refunded` records a refund already performed outside this function. It does not transfer money. Positive returns begin `pending`; zero-amount returns are `not_required`; recorded payments become `refunded`. Non-cash methods require a reference. Do not automatically mark paid when the return is created.

`void_customer_return` corrects an erroneous untouched quarantine entry. Manager/store authorization, no refund, no stock action, no immediate restock/discard, and rounding consistency are required. It clears erroneous held quantity and sets `return_status='voided'`, actor, time, and reason; original quantities and financial amounts remain. Verify that no actual goods should remain in holding before voiding. It is not a physical goods movement or a refund reversal.

After voiding, use a new request ID for a corrected return. A voided record keeps its original `refund_status`; therefore every pending-refund/work queue must filter BOTH `return_status='active'` and `refund_status='pending'`. Audit screens may show both active and voided entries. Do not sum raw return items without joining the header's active status. For remaining quantity, subtract only active return quantities from the original sold quantity. The RPC rechecks this under a lock.

## Worker creation Edge Function

`POST /functions/v1/create-worker`, with manager bearer token and anon `apikey`.

Accepted fields: `email`, `password`, `user_name`, optional `phone`. Email is normalized; name must contain 1–100 characters; password at least 12 characters and must meet Supabase's project policy; phone is string/null, up to 30 characters. Other fields, including `role`, `store_id`, and metadata, are rejected.

The latest supplied function uses server-side `auth.admin.createUser` with `email_confirm: true` and `app_metadata.erp_worker_provisioning={manager_id,user_name,phone}`. The existing Auth insert trigger validates the manager again, derives the store, and creates an active `user` profile atomically. Do not replace this with separate client Auth/profile inserts. The service-role key is available only inside the Edge Function.

Successful HTTP 201 response:

```json
{
  "user_id": "<worker-uuid>",
  "user_name": "Test Worker",
  "role": "user",
  "confirmation_required": false,
  "message": "Worker created successfully. Email verification is disabled."
}
```

```typescript
const { data, error } = await supabase.functions.invoke('create-worker', {
  body: { email, password, user_name: userName, phone: null },
});
// Handle non-2xx function errors; do not assume they have the RPC error shape.
if (error) throw error;
```

The supplied source sends no email and does not alter existing unconfirmed accounts. Turn off Confirm email in the Auth Email provider if disabling verification for the overall sign-in flow. New workers can sign in immediately once the revised function is deployed and the provisioning trigger is installed. Frontend staff creation is manager-only; new business owners can use the owner-signup flow; additional manager provisioning for an existing store remains administrative.

The Edge success contract replaces the earlier `confirmation_email_sent` field and HTTP-200 assumption. Update scripts/UI accordingly. If an account-creation request times out, do not blindly create it again: this endpoint has no request-ID idempotency contract. Reconcile the account through an authorized administrative lookup; the profiles table does not provide an email lookup.

## Errors and retries

Database/PostgREST errors generally have this shape:

```json
{
  "code": "P0001",
  "details": null,
  "hint": null,
  "message": "Return quantity exceeds the remaining sold quantity"
}
```

| Result | Meaning / frontend action |
| --- | --- |
| HTTP 400, `P0001` | Business-rule rejection, including many RPC permission/scope failures. Show a useful message; refresh affected data. A permission rejection is not always HTTP 403. |
| HTTP 400, `22P02` | Invalid UUID/numeric/input syntax; fix request construction. |
| HTTP 409, `23505` | Duplicate key/request or other uniqueness conflict. Reconcile the specific record; not every conflict is an already-successful retry. |
| HTTP 409, `23503` | Foreign-key conflict; resource missing or invalid relationship. |
| HTTP 400, `23514` | Check constraint violation; show field validation where known. |
| HTTP 401 | Missing/expired token or invalid project key. Refresh/relogin or fix configuration. |
| HTTP 403, `42501` (or 401 when unauthenticated) | Database grants/RLS forbid the operation. |
| HTTP 404, function not found / `PGRST202` | Check RPC name, parameter names, deployed migrations, and schema cache. |
| HTTP 429 | Rate limit; respect retry guidance, and reconcile mutations before retry. |
| Network error / HTTP 5xx | Outcome may be unknown; do not generate a new business request automatically. |
| HTTP 200 with `[]` / zero updated rows | No visible matching records; may be filtering, RLS, or inactive scope. |

Exact SQL error messages are not stable machine enums. Use SQLSTATE plus operation context, with a safe fallback; do not parse constraint names as the only application contract. Keep raw diagnostics out of user-facing messages and never log bearer tokens/passwords.

The supplied Edge Function returns `{error, code?}`, not the database shape: 400 invalid body/fields/password, 401 invalid caller session, 403 inactive/non-manager or inactive store, 405 wrong method, 409 creation conflict, 500 internal/provisioning failure. Its current implementation maps any Auth status 422 to a generic creation conflict, so 409 alone does not prove an existing email. Supabase gateway failures can have a different body; inspect HTTP status and use a fallback.

### Request identity and uncertain outcomes

Generate a UUID once per intended action and retain the ID AND original payload until resolved. A second deliberate action gets a new UUID. Double-click protection is useful but does not replace database constraints. Request-ID uniqueness prevents duplicate writes; it does not make every repeated call return the earlier successful response, nor does the server generally compare payload hashes.

| Operation | Reconciliation read |
| --- | --- |
| `record_sale` | `sales.sale_id = p_request_id`, then `sales_items` |
| `receive_purchase` | `purchases.purchase_id = p_request_id`, then `purchase_items` |
| `adjust_stock`, `adjust_batch_stock` | `stock_movements.stock_movement_id = p_request_id`; batch allocations if relevant |
| `migrate_existing_stock_to_batches` | `batch_stock_migrations.migration_id = p_request_id` |
| `record_customer_return` | `customer_returns.return_id = p_request_id`, then its items |
| `process_return_quarantine` | `return_stock_actions.action_id = p_request_id` |
| `reverse_sale`, `reverse_purchase` | Header status plus original/reversal movements |
| `mark_return_refunded` | Return status and refund actor/method/reference/time |
| `void_customer_return` | Return status and void actor/reason/time |

Compare the stored record with the intended payload and current user/store before treating it as success. Repeating an action may return HTTP 400 due to changed state before reaching a uniqueness check, particularly quarantine actions. If a row is not visible, that is not proof the call failed; session/scope may have changed. A worker cannot read the manager-only stock audit. Never compensate with direct inventory writes.

After confirmed success, refetch affected inventory, transaction details, and reports. Realtime updates or optimistic UI are optional; they do not reserve stock or guarantee a transaction has committed. Do not implement offline stock writes without a separate synchronization design.

## Reports and time

Use the store's configured timezone, `Africa/Lusaka` for the Zambia stores (CAT, UTC+2). Store/transport timestamps as timezone-aware instants; show business dates from the database reports rather than browser-local date slicing. Expiry fields are date-only values.

| View | Columns and meaning |
| --- | --- |
| `daily_sales_report` | `store_id,report_date,sale_count,sales_total`; completed gross sales |
| `daily_expense_report` | `store_id,report_date,category,expense_count,expense_total`; recorded expenses |
| `daily_return_report` | `store_id,report_date,return_count,return_total`; active return entitlement by creation date |
| `daily_refund_report` | `store_id,report_date,refund_count,refund_total`; recorded payments by refunded date |
| `daily_net_sales_report` | `store_id,report_date,gross_sales,returns_total,net_sales`; gross less active return entitlement |
| `low_stock_report` | `store_id,product_id,sku,product_name,quantity,reorder_level,inventory_not_initialized`; quantity means SELLABLE stock |

Filter daily reports with `.gte('report_date', startDate).lte('report_date', endDate)` and paginate as needed. A day with no activity may have no row: the frontend can fill chart gaps. Net sales can be negative when a later day contains returns against earlier sales. Net sales is neither profit nor cash flow; do not subtract refund payments from net sales again. Current operational views exclude voids from the original return day, so historical totals can change after a correction; a closed-period accounting ledger is not implemented.

## Integration order and open items

1. Confirm migration history, apply/verify the return-void migration, and inspect the hosted contract.
2. Deploy/test the no-email `create-worker` revision; preserve its Auth provisioning trigger.
3. Generate current public-schema TypeScript types from the linked project with `npx supabase@latest gen types typescript --linked --schema public` and save the output in the frontend's generated-types location. Review CLI errors before replacing an existing generated file.
4. Integrate login/profile gate, catalog/availability, and one sale end to end.
5. Add manager catalog, purchases, adjustments, batching, returns/refunds/voids, and reports using the payload reference.
6. Run [frontend-smoke-tests.md](frontend-smoke-tests.md) using dedicated test accounts/data.

Before relying on features outside this contract, settle their requirements: hosted email delivery and recovery redirect configuration, additional manager provisioning for existing stores, confirmed expense-cancellation interface, refund-provider integration, and corrections after real restocking/disposal/refunds. Tax, discounts, multi-currency conversion, cross-store transfers, and pharmacy-specific regulatory workflows are not established by this handoff. Organizations and store types do not automatically implement those features.

When adding a Python backend later, preserve the same user/store authorization and transaction boundaries. Do not replace authenticated database calls with unrestricted service-role table writes.

Supplier contacts use `public.supplier_phones(supplier_phone_id uuid, supplier_id uuid, phone text)`. Use `supplier_phone_id` for ordering and record identity; filter edits/deletions by both `supplier_phone_id` and `supplier_id`. There is no `id` or `store_id` column on this table. RLS must authorize contact access through the parent supplier. The supplier directory displays numbers and supports searching them; adding/editing/removing remains in the Phone numbers dialog.

Owner signup uses Supabase Auth signUp and the additive owner provisioning trigger described in [owner-signup.md](owner-signup.md). The anonymous `owner_signup_available()` RPC reports whether the trigger is installed/enabled. Public owner metadata can name a new business and store but cannot choose existing tenant IDs or roles. Workers continue using the trusted create-worker endpoint.

Self-service password recovery: `resetPasswordForEmail` calls `POST /auth/v1/recover` with email and the deployed `?auth=recovery` redirect. A verified recovery session can update its own password through `PUT /auth/v1/user` via `updateUser({password})`. Profile/store/role records are not modified. See [password-recovery.md](password-recovery.md) for redirect and email setup and acceptance checks.

The owner frontend uses authenticated `is_organization_owner()` and `get_organization_overview()` RPCs from the separately supplied ownership SQL. The overview has no caller-selected tenant arguments and returns `{organization, stores: [{..., staff: [...]}]}`. Ownership is a separate permission; the profile remains manager and ordinary operational APIs remain scoped to its assigned store. The Organization page is read-only.
