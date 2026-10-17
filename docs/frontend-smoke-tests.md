# Frontend integration acceptance checks

Run against a development/test project or dedicated test store. API actions commit separately; a later failure does not roll back earlier requests. Use uniquely named products and retain request IDs. Never perform real payments for these tests. Existing backend script PASS reports do not establish that a new frontend implements these behaviors correctly.

## Preconditions

- Inspect the deployed schema with `verify-backend-contract.sql` and reconcile migrations.
- Confirm the revised no-email `create-worker` is deployed and its provisioning trigger is enabled.
- Have an active ordinary retail manager, an active worker in that store, an active other-store manager, and a dedicated pharmacy test manager/store if testing pharmacy flows.
- Use known seeded selling units and suppliers. Set Zambia store timezone to `Africa/Lusaka`.
- Keep service-role keys/passwords out of frontend build artifacts, logs, screenshots, and source control.

## Login and scope

1. Log in as worker; fetch own profile and store. Confirm ordinary-worker UI, active status, and store context.
2. Refresh the page and exercise session refresh; verify logout removes access to protected screens.
3. Verify inactive accounts do not gain protected access merely because Auth login/session succeeds. Use an authorized administrator to restore test account status afterward.
4. Confirm a worker cannot invoke manager RPCs, even by constructing the HTTP request manually.
5. Confirm a manager cannot read or mutate another store's records. Expect empty reads or operation-specific errors, not a universal HTTP 403.

## Worker creation

1. As manager, create a unique worker email with valid password/name; expect HTTP 201, `confirmation_required:false`, and no resend warning.
2. Verify immediate login and correct active `user` profile in the manager's store. No confirmation email should be required.
3. Reject worker callers, inactive managers, and payloads containing `role` or `store_id`.
4. Verify invalid name/email/password and duplicate email produce useful errors without exposing credentials.
5. Confirm pre-existing unconfirmed accounts are not assumed fixed by the new creation code.

## Sales and retry handling

1. Manager creates an `each` product at selling price 20 and receives/adjusts dedicated test stock.
2. Worker sells one unit through `record_sale`; verify persisted total 20, own sale/items, stock deduction, and refreshed availability.
3. Double-submit with the same UUID: verify one sale and one deduction. Handle duplicate response by reconciling the stored payload.
4. Sell with insufficient stock and with an invalid second item: verify no partial sale or stock deduction.
5. Submit competing sales against the last unit: only one may consume it.
6. Simulate a lost response after submission: reconcile the existing request ID before deciding whether another request is necessary.
7. Verify whole-unit products reject fractions; decimal units accept permitted precision and reject excess precision, zero, negative, and nonfinite quantities.

## Manager inventory and batch flows

1. Receive a purchase, inspect items and aggregate inventory, and verify cancellation only when its stock is available.
2. Exercise reorder-level and stock-adjustment RPCs with reasons; prohibit direct inventory edits.
3. Enable tracking only on empty stock, or migrate positive existing stock using allocations that sum exactly to the current quantity.
4. Receive early/late future-expiry batches. Sell across them and display trace returned by `get_sale_batches` in FEFO order as supplied by the API, without assuming a client-selectable batch.
5. Verify expired, recalled, and quarantined batch quantities cannot be sold and do not inflate sellable availability.
6. Verify the UI distinguishes main stock, sellable stock, and customer-return quarantine.

## Customer returns, refunds, and voids

1. Return against the original sales item. Change catalog price first and confirm the original sale price still determines the refund.
2. Test ordinary retail inspected restock, quarantine, inspected release, and disposal. Confirm corresponding stock locations and audit records.
3. Require the original batch for tracked-sale returns and enforce original batch quantity caps.
4. In a pharmacy store, require quarantine, block release even after inspection, and allow audited disposal.
5. Reject over-return, simultaneous returns of the same last sold unit, and sale cancellation with an active return.
6. Record test refund metadata without transferring money. Require references for non-cash refunds and reject duplicate refund recording.
7. Fractional case: sell 0.5 kg at 0.03, then return five portions of 0.1. Expect refunds 0,0.01,0,0.01,0; total 0.02.
8. Void a deliberately erroneous untouched quarantine return. Verify actor/time/reason, preserved original amounts, cleared erroneous holding, and eligibility for a corrected return with a new UUID.
9. Reject voids by workers/other-store managers and after refund, restock, direct discard, or any quarantine action. Reject unsafe fractional void order.
10. Verify voided returns cannot be processed/refunded and never appear in pending-refund queues, despite retaining their original `refund_status`.

## Reports and completion

1. Compare displayed totals with database reports, including return entitlements versus actual recorded refunds. Do not double-subtract refunds from net sales.
2. Verify business-date filters use the store timezone around UTC midnight; show expiry as a date-only value.
3. Confirm voided returns are excluded from return/net-sales totals and retained in audit history.
4. Check pagination and empty-result states. Detect zero-row edits instead of displaying a false success.
5. Deactivate dedicated test products and clear test stock/quarantine through approved workflows. Retain cancelled/voided/audit records, and clearly identify any remaining test refund entries in reports.
6. Record the tested frontend commit, migration versions, Edge Function revision, outcomes, and any skipped cases before calling the frontend integration verified.
