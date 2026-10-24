# Organization owner: add a store

## Enable the feature

1. Open Supabase SQL Editor as the project administrator.
2. Paste and run the **complete** `database/patches/20261024_owner_create_store.sql` file. It requires the organization-ownership setup already used by the Organization page. It adds one authenticated RPC; it does not broaden direct table permissions or change existing records. Running it again safely replaces the same function.
3. Deploy the updated frontend branch. Sign in as an owner, open **Organization → Add store**, and enter the store name, optional address, type and timezone. For Zambia choose **Africa/Lusaka**.
4. After creation the store appears in the organization's Stores table with an empty team. The owner stays assigned to their existing store. Manager provisioning/assignment to this new store remains a separate administrative task; this action does not create an Auth account or grant operational store switching.

The same action is available in the mobile interface. Store creation requires internet and is not placed in the offline sales queue. The repository implementation does not install the function in your hosted Supabase project automatically.

## API contract

`POST /rest/v1/rpc/create_organization_store` with the normal public project key and signed-in owner's bearer token:

```json
{
  "p_request_id": "a-new-uuid-generated-once-per-submission",
  "p_store_name": "East Park Branch",
  "p_address": "Great East Road",
  "p_store_type_code": "general_retail",
  "p_time_zone": "Africa/Lusaka"
}
```

Returns the created store UUID. Address can be null. The function defaults type to `general_retail` and timezone to `Africa/Lusaka` when omitted. The frontend instead preselects the owner's assigned store's type and timezone from the existing lookup tables.

The server derives the organization using `auth.uid()`, organization ownership, the active manager profile and its active assigned store. The client cannot specify an organization, owner, role or active flag. New stores are active, belong to that organization and contain no products, stock or staff.

Names must contain 1–150 characters after trimming; addresses allow at most 500. Types/timezones must exist in their lookup tables. Names must be distinct within the same organization after trimming and ignoring case, including inactive stores. Different organizations can use the same names.

Retain the original request UUID and fields after any uncertain response. The UUID is the new store's identifier. Repeating that exact request returns the same UUID without duplicating the store. Reusing it for different fields or a different organization fails. An organization-row lock serializes creation/name checks within the organization; ownership/profile/store locks protect the authorization check through the transaction. Backend authorization is rechecked even on retries.

Errors:

| SQL code | Meaning |
| --- | --- |
| `42501` | Not an active owner of an organization through an active assigned store |
| `22023` | Invalid/missing field, unavailable lookup value, or duplicate store name |
| `23505` | Request reference already used with different details |
| `PGRST202` | RPC has not been installed or the schema cache has not refreshed |

## Verification

Browser tests use mocked Supabase responses and cover the desktop/mobile form, parameter scope, unchanged assignment, uncertain retries, and revocation after opening a form.

Database fixture tests use disposable data. **Do not run fixtures on your live project.** In an empty local PostgreSQL database, run these in order with `psql -X -v ON_ERROR_STOP=1 -f PATH`:

1. `tests/database/owner-signup-fixture.sql`
2. `tests/database/create-store-fixture.sql`
3. `database/patches/20261024_owner_create_store.sql`
4. The same patch again, to check repeatable installation
5. `tests/database/create-store.sql`

The tests verify scope/defaults, matching and conflicting retries, duplicate names, cross-organization isolation, nonowner/anonymous/inactive/revoked rejection, invalid fields, unchanged assignments, execution grants and execution as the authenticated database role. They were also executed successfully using the PostgreSQL engine in PGlite. This does not reproduce Supabase's Auth gateway or your complete hosted RLS configuration. After installing the patch, verify creation with a real owner and confirm a normal manager cannot create stores.
