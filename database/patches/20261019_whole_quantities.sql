-- Run the complete script in the Supabase SQL Editor as postgres.
-- Keeps existing numeric storage, RPC signatures, money precision and audit data.
-- Any existing fractional/nonfinite quantity aborts the entire transaction.
BEGIN;
SET LOCAL lock_timeout = '10s';
DO $whole_quantities$
DECLARE
  c record;
  invalid_count bigint;
  constraint_name text;
  checked_columns integer := 0;
BEGIN
  IF to_regclass('public.store_inventory') IS NULL
     OR to_regclass('public.sales_items') IS NULL
     OR to_regclass('public.purchase_items') IS NULL THEN
    RAISE EXCEPTION 'Expected ERP inventory, sales_items and purchase_items tables are missing';
  END IF;

  FOR c IN
    SELECT cols.table_name, cols.column_name
    FROM information_schema.columns cols
    JOIN information_schema.tables tbl
      ON tbl.table_schema = cols.table_schema AND tbl.table_name = cols.table_name
    WHERE cols.table_schema = 'public' AND tbl.table_type = 'BASE TABLE'
      AND cols.table_name IN (
        'products', 'store_inventory', 'sales_items', 'purchase_items',
        'stock_movements', 'product_batches', 'stock_movement_batches',
        'batch_stock_migrations', 'batch_stock_migration_items',
        'customer_return_items', 'return_stock_actions'
      )
      AND (cols.column_name LIKE '%quantity%' OR cols.column_name IN ('reorder_level', 'order_level'))
      AND cols.data_type IN ('numeric', 'smallint', 'integer', 'bigint', 'real', 'double precision')
    ORDER BY cols.table_name, cols.ordinal_position
  LOOP
    -- Hold the lock through validation and constraint installation.
    EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE', c.table_name);
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE %I::text IN (''NaN'',''Infinity'',''-Infinity'') OR %I::numeric <> trunc(%I::numeric)',
      c.table_name, c.column_name, c.column_name, c.column_name
    ) INTO invalid_count;
    IF invalid_count > 0 THEN
      RAISE EXCEPTION 'Cannot switch to whole quantities: public.%.% has % fractional or nonfinite records. Nothing changed. Reconcile existing data first; do not round audit history.', c.table_name, c.column_name, invalid_count;
    END IF;
    constraint_name := 'erp_whole_' || c.column_name || '_check';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('public.%I', c.table_name)::regclass
        AND conname = constraint_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I::text NOT IN (''NaN'',''Infinity'',''-Infinity'') AND %I::numeric = trunc(%I::numeric))',
        c.table_name, constraint_name, c.column_name, c.column_name, c.column_name
      );
    END IF;
    checked_columns := checked_columns + 1;
  END LOOP;
  IF checked_columns < 3 THEN
    RAISE EXCEPTION 'Expected ERP quantity columns not found; no changes applied';
  END IF;
  RAISE NOTICE 'Whole-number quantity constraints verified on % columns', checked_columns;
END
$whole_quantities$;
COMMIT;
