# Simple products and whole quantities

The frontend counts whole items for sales, purchases, stock adjustments, reorder levels, batch allocations, returns and quarantine processing. Prices and money retain two decimal places. Decimal.js remains for accurate money calculations and reading historical records.

The product form has name, SKU, category, selling price, buying price and supplier. New products use `selling_unit_code = 'each'`. Create separate products for separate sizes or packs. Group and variant attribute controls are removed. Editing an existing product preserves its old unit, group and attributes; the app does not erase or reinterpret historical data.

## Hosted database step

After taking a database backup, run the complete [whole-quantity patch](../database/patches/20261019_whole_quantities.sql) in the Supabase SQL Editor as postgres, at a quiet time. It briefly locks the inventory/transaction tables while checking and adding constraints. Run it before enabling writes from the updated frontend. Stop other clients from submitting fractional operations during the transition.

The patch applies whole-number constraints to numeric quantity and reorder-level columns in the known ERP base tables. This also protects direct API writes and RPC results. Existing positivity, role, store, stock and money constraints remain. Numeric storage and existing RPC signatures remain compatible; no amounts, stock, units, attributes or audit records are rounded or deleted. Selling-unit metadata remains for historical compatibility; its old precision cannot override the new quantity constraints.

If any existing record is fractional or nonfinite, the entire patch rolls back and identifies its table/column. Do not round or delete accounting/audit records to make it pass. Reconcile a migration plan for those records before switching the live store. Keep the old frontend until that is resolved; old fractional sales may require fractional returns or reversals. Existing variant uniqueness constraints remain relevant to administratively created grouped products.

Re-running the patch is supported. A lock timeout also rolls back the transaction; retry at a quieter time. No hosted database was changed by committing this file.

SKU entry is optional. New products with a blank SKU receive an `AUTO-` code derived from their full stable product UUID. Retrying the same creation uses the same code. Clearing SKU during an edit preserves the existing code; explicitly entered codes are trimmed and still subject to the database unique constraint. The database continues receiving a nonempty SKU, so no schema change is needed.
