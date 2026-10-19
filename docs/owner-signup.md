# Business owner signup

The initial login page offers **Create a business account** after the database signup patch has been installed. This creates a new business, one store and an active manager profile. It cannot join an existing store or choose an existing organization. Managers still create workers through Manage Accounts.

## Deploy

1. Run the complete [owner signup patch](../database/patches/20261019_owner_signup.sql) in Supabase SQL Editor as postgres. It is safe to re-run. It requires the existing `general_retail` store type and `Africa/Lusaka` timezone rows.
2. In Supabase Authentication settings, allow new user signups and enable the Email provider. The frontend recommends passwords of at least 12 characters; use the matching minimum in the Auth password settings.
3. Deploy the frontend branch on Netlify. No new environment variables, Edge Functions or browser service-role keys are required.
4. If Confirm email is enabled, configure working email delivery, set the Supabase Site URL to the deployed frontend URL, and add that URL to the redirect allowlist. If confirmation is disabled, signup signs the owner straight into the manager workspace. The code respects the configured setting.
5. Reload the login page. The button remains hidden until `owner_signup_available()` reports that the owner provisioning trigger is installed and enabled. Existing login remains available while the patch is absent.

The new store defaults to general retail, Africa/Lusaka (CAT), ZMW currency and active status. A manager can change the timezone in Settings. Other business details/store types and additional stores require administration.

## Implementation

The browser calls `supabase.auth.signUp` with email/password and `options.data.erp_owner_signup = {user_name, organization_name, store_name, phone}`. The password goes only to Supabase Auth. This uses Auth's signup controls rather than a public admin-account-creation endpoint. User metadata supplies display names and an optional phone; it never supplies a role, status or existing tenant identifier.

The new `private.provision_owner_profile()` AFTER INSERT trigger creates the business, store and profile inside the same transaction as the Auth account. It generates all tenant identifiers, fixes the role to `manager`, and rejects unexpected owner fields. A validation/profile failure rolls back all four inserts. Editing user metadata later cannot create another store or change a role.

`private.provision_worker_profile()` and its trigger are not modified. Server-provisioned workers take their existing path even if their user metadata contains an owner signup marker. No RLS policy or application-table write grant is broadened. The private trigger function has no direct execution grant to anonymous or authenticated users. The public availability RPC returns only a boolean.

Supabase may return a generic confirmation response for an existing email. The UI does not claim that such a response proves a new account exists. On uncertain signup failures it prevents another submission from the same form and keeps login available. Reconcile the account before creating another one. Signup has no client request-ID retry contract.

## Hosted acceptance

- With two different new email addresses, create two businesses. Each owner should see only their own new store. Check manager access and ZMW/CAT defaults.
- Create a worker from one owner account and verify the worker remains `user` in that owner's store.
- With confirmation enabled, confirm the email and sign in. With confirmation disabled, verify immediate entry after signup.
- Attempt a duplicate email; no second business/store should be created for that Auth account.
- Keep existing manager/worker sign-in working. No profile is added for a generic Auth insert without the owner marker or trusted worker metadata.

Do not run disposable fixture tests against the hosted database.

## Local database verification

Use a new PostgreSQL 17 container. From the repository root, after `pg_isready` reports ready:

```bash
docker run --detach --rm --name erp-owner-check \
  -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17
# Retry this readiness check until it says "accepting connections".
docker exec erp-owner-check pg_isready -U postgres

docker exec -i erp-owner-check psql -X -U postgres -v ON_ERROR_STOP=1 \
  < tests/database/owner-signup-fixture.sql
docker exec -i erp-owner-check psql -X -U postgres -v ON_ERROR_STOP=1 \
  < database/patches/20261019_owner_signup.sql
# Repeat installation to verify it is repeatable.
docker exec -i erp-owner-check psql -X -U postgres -v ON_ERROR_STOP=1 \
  < database/patches/20261019_owner_signup.sql
docker exec -i erp-owner-check psql -X -U postgres -v ON_ERROR_STOP=1 \
  < tests/database/owner-signup.sql
docker stop erp-owner-check
```

The fixture has the supplied columns, constraints and worker-trigger behaviour. It verifies separate stores/businesses, defaults, malformed/injected metadata rejection, late failure rollback, unchanged worker provisioning, no metadata-update escalation, private execution grants, and provisioning by an Auth writer without application-table write permission. It does not reproduce the entire hosted Auth service or RLS policy set; run hosted acceptance after deployment.
