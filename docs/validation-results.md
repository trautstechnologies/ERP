# Frontend validation results

Validated in the cloud workspace on 16 October 2026, with startup regression checks added on 17 October 2026 and usability checks on 18 October 2026, using Node 24, npm, and the installed Chromium.

| Check | Result |
| --- | --- |
| Frozen-lockfile install (`npm ci`, writable npm cache) | Passed |
| Vite production build | Passed |
| Domain tests | 6 passed |
| Mocked browser integration tests | 16 passed |
| Built-production startup with external fonts blocked | 1 passed |
| JavaScript syntax checks | Passed |
| Documentation relative links and payload JSON | Passed |
| Startup without Supabase configuration | Setup instructions rendered; no runtime errors |
| Desktop/mobile screenshot inspection | Navy/blue shell and responsive tables reviewed |
| Hosted Supabase authentication/RLS/RPC acceptance | Not run in this task; no project credentials supplied |
| Revised create-worker deployment | Not verified in this task |

Browser cases cover every manager route, worker route restrictions, stable sale request payloads after a failed response, active-only pending refunds, worker creation payload/response handling, original-sale-item return creation, mobile navigation, scoped product creation without direct inventory writes, and tracked purchase batch payloads.

Additional startup cases verify that raw/unbundled source imports produce Vite guidance and that missing startup execution replaces the loading message after a timeout. Direct file-URL navigation is blocked by the workspace browser's administrator policy, so the file-protocol-specific hint was not verified by a file navigation here. Development uses the HTTP Vite server.

Production regression: the earlier active CSS imported Google Fonts, and a blocked font request caused the production CSS preload to reject before login rendered. Removing the external import fixed the reproduced failure. `npm run test:production` builds with fake public project configuration, serves `dist`, blocks external font hosts, and verifies successful styled login startup. This checks the built files, not the user's live Netlify deployment.

The mocked API does not substitute for a deployed backend. Run the hosted acceptance checklist after configuring the real project. Expense cancellation remains disabled pending signature verification; the text-corrupted source logo is represented by a brand text mark. No remote database, deployment, or Git remote was modified by this frontend task.

The browser download host returned a network denial; the already-installed Chromium was used successfully instead. Package installation uses `/tmp/erp-npm-cache` in this cloud environment because the default home cache is not writable. Standard local development may use npm's default cache.

Usability checks on 18 October verify readable transaction and audit tables, hidden support references, product-based return selection with correct UUID payloads, readable report CSV exports, removal of Refresh controls, direct dashboard sale forms for both roles, and chart dates in the store timezone. Domain tests (6), browser tests (16), and built-production startup (1) passed. These checks use mocked APIs; live Supabase was not tested.

19 October simplification: 6 domain tests and 18 browser cases passed (the existing 16 plus targeted legacy fractional-unit and quarantine-processing regressions). A disposable PostgreSQL 17 fixture verified atomic refusal of existing fractional stock, repeat execution, acceptance of whole/signed quantities and decimal costs, and rejection of fractional/nonfinite writes across inventory, sales, purchases, movements and returns. Hosted database rollout remains manual; see `simple-products.md`.

Searchable dropdown update: 6 domain tests, the existing 18 browser workflows, 3 targeted dropdown cases and built-production startup passed. Targeted cases exercise case-insensitive label search, empty results, keyboard cancellation and selection, dynamic form rows, correct product/payment payloads, and mobile viewport bounds. Search filtering preserves the real select values and does not submit a form on Enter.

Purchase navigation regression: reproduced the reported undefined `sale_id` error by opening Sales before Purchases and clicking Details. Page modules had attached delegated handlers to the same persistent content element. Each mount now returns a fresh page root, disposing old handlers with the removed page. All 22 browser cases passed, including repeated Sales → Purchases visits, purchase details and purchase-form isolation. Restored the supplier-phone list API import removed during quantity simplification.

Supplier contacts schema correction: the deployed schema was confirmed as `supplier_phone_id uuid, supplier_id uuid, phone text`. Listing, inserts, updates and deletions now use the correct key. All 24 browser cases passed against mocked APIs, including the full contact add/edit/remove flow, supplier-scoped mutation filters, directory display/search, preservation of phone formatting and rejection of blank entries. The mock rejects the nonexistent `supplier_phones.id` to prevent recurrence. No hosted database schema change is required; live Supabase acceptance was not run in this task.

Optional SKU update: targeted browser checks passed for explicit custom SKU creation, two separate whitespace/blank SKU creations, automatic code identity, and preservation of an existing code when its edit field is cleared. New codes derive from the full stable product UUID; the existing nonempty/unique database contract remains unchanged.

Owner signup implementation: the supplied columns, constraints and existing worker trigger were used to build an additive Auth-insert trigger. Browser checks cover the existing 25 workflows plus session signup, confirmation-required signup/password validation, uncertain failure handling, and readiness-gated signup (29 cases in total). The existing 25 cases and the four new signup cases passed across full-suite and targeted runs. All 6 domain tests and the built-production startup check passed. A fresh PostgreSQL 17 fixture passed repeat migration installation, separate store/business allocation, defaults, invalid/foreign-tenant metadata rejection, late profile-error rollback of all inserts, unchanged trusted worker provisioning, metadata-update non-escalation, restricted private-function execution, Auth-writer provisioning without application-table write grants, and trigger-readiness checks. Hosted Auth, email delivery and hosted RLS acceptance remain to be run after applying the patch; the live project was not changed.

Password recovery: all 37 mocked browser cases passed, including generic reset-email requests with the deployed recovery redirect, manager/worker fresh-link startup before dashboard/profile loading, password confirmation, successful password update/local logout, expired-link cleanup, rejection of a marker-only URL with an unrelated saved session, email rate limits, failed update messaging, Cancel and changed-account protection. Live email delivery, hosted allowlisting and real password persistence require the hosted acceptance in `password-recovery.md`. No database/Edge deployment is required.

24 October owner frontend: 6 domain tests passed; the full 44-case mocked browser suite and an additional desktop/mobile organization directory case passed (45 browser cases). Coverage includes owner labels and existing manager actions, all returned stores/team members, phone/name search, branch details, non-owner manager/worker route rejection, revoked ownership, missing ownership RPC fallback, backend overview denial, and the established signup Auth payload without client owner/profile writes. Desktop/mobile screenshots were reviewed and the built-production startup check passed. The frontend uses the ownership SQL supplied in chat; no SQL file or live database was changed in this task. Hosted ownership/RLS acceptance remains dependent on the deployed functions and assignments.
