-- Read-only metadata inspection. Run in the Supabase SQL Editor.
-- Multiple result sets: inspect each in the editor.
-- This lists schema metadata, not credentials, emails, or application rows.

-- Public function signatures and role execution grants.
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_function_arguments(p.oid) AS arguments_with_defaults,
  pg_get_function_result(p.oid) AS result_type,
  p.prosecdef AS security_definer,
  p.proconfig AS function_settings,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE')
    AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN (
    'owner_signup_available','record_sale','receive_purchase','reverse_sale','reverse_purchase',
    'adjust_stock','set_reorder_level','set_store_time_zone',
    'enable_batch_tracking','migrate_existing_stock_to_batches',
    'adjust_batch_stock','set_batch_status','get_sale_batches',
    'record_customer_return','process_return_quarantine',
    'mark_return_refunded','void_customer_return','cancel_expense'
  )
ORDER BY p.proname,identity_arguments;

-- Tables/views and precise columns, defaults, precision, and nullability.
SELECT table_name,column_name,data_type,is_nullable,column_default,
       numeric_precision,numeric_scale,is_generated,generation_expression
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN (
    'profiles','stores','organizations','store_types','selling_units',
    'product_groups','products','store_inventory','suppliers',
    'supplier_phones','sales','sales_items','purchases','purchase_items',
    'expenses','product_batches','stock_movements','stock_movement_batches',
    'batch_status_events','batch_stock_migrations',
    'batch_stock_migration_items','customer_returns','customer_return_items',
    'return_stock_actions','sellable_inventory','inventory_position',
    'low_stock_report','daily_sales_report','daily_expense_report',
    'daily_return_report','daily_refund_report','daily_net_sales_report'
  )
ORDER BY table_name,ordinal_position;

-- Table grants, including column-specific editing restrictions.
SELECT table_name,grantee,privilege_type
FROM information_schema.table_privileges
WHERE table_schema='public' AND grantee IN ('anon','authenticated','PUBLIC')
ORDER BY table_name,grantee,privilege_type;

SELECT table_name,column_name,grantee,privilege_type
FROM information_schema.column_privileges
WHERE table_schema='public' AND grantee IN ('anon','authenticated','PUBLIC')
ORDER BY table_name,column_name,grantee,privilege_type;

-- RLS rules and whether RLS is enabled on public base tables.
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check
FROM pg_policies
WHERE schemaname='public'
ORDER BY tablename,policyname;

SELECT c.relname AS table_name,c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p')
ORDER BY c.relname;

-- View options: security_invoker should be present on documented views.
SELECT c.relname AS view_name,c.reloptions,pg_get_viewdef(c.oid,TRUE) AS definition
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='v'
ORDER BY c.relname;

-- Confirm the atomic Auth provisioning trigger exists and is enabled.
SELECT t.tgname AS trigger_name,t.tgenabled AS enabled,
       pg_get_triggerdef(t.oid,TRUE) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='auth' AND c.relname='users' AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Internal helpers should not be exposed as callable client APIs.
-- Only deliberately granted authorization helpers may be client-executable.
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE')
         AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='private'
ORDER BY p.proname,arguments;

-- Verify exposed schemas separately in Supabase API settings.
-- Verify Edge Function deployment/version separately: PostgreSQL metadata
-- cannot establish which create-worker source is currently deployed.
