-- Apply in the Supabase SQL Editor before using Mobile Money in the frontend.
-- Changes are atomic and rerunnable. Existing rows and amounts are preserved.
BEGIN;

DO $$
DECLARE
  v_table TEXT;
  v_column TEXT;
  v_relation REGCLASS;
  v_attribute SMALLINT;
  c RECORD;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['sales','expenses','customer_returns']
  LOOP
    v_column := CASE WHEN v_table='customer_returns'
      THEN 'refund_method' ELSE 'payment_method' END;
    v_relation := to_regclass('public.' || v_table);
    IF v_relation IS NULL THEN
      RAISE EXCEPTION 'Required table public.% is missing',v_table;
    END IF;

    SELECT attnum INTO v_attribute
    FROM pg_attribute
    WHERE attrelid=v_relation AND attname=v_column AND NOT attisdropped;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Required column %.% is missing',v_table,v_column;
    END IF;

    -- Replace only the method allowlist, including custom-named equivalents.
    -- Multi-column refund-state checks and non-cash reference rules remain.
    FOR c IN
      SELECT conname FROM pg_constraint
      WHERE conrelid=v_relation AND contype='c'
        AND conkey=ARRAY[v_attribute]::SMALLINT[]
        AND pg_get_constraintdef(oid) LIKE '%''cash''%'
        AND pg_get_constraintdef(oid) LIKE '%''bank_transfer''%'
    LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',v_relation,c.conname);
    END LOOP;

    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I CHECK (%I IN (''cash'',''card'',''bank_transfer'',''mobile_money'',''other''))',
      v_relation,v_table || '_supported_payment_methods',v_column
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  v_signature TEXT;
  v_target REGPROCEDURE;
  v_definition TEXT;
  v_updated TEXT;
  v_refund_signature TEXT;
BEGIN
  -- With the return-void migration, the public refund RPC is a guarded
  -- wrapper. Update its private implementation without bypassing that guard.
  v_refund_signature := CASE WHEN to_regprocedure(
    'private.mark_return_refunded_core(uuid,text,text)') IS NOT NULL
    THEN 'private.mark_return_refunded_core(uuid,text,text)'
    ELSE 'public.mark_return_refunded(uuid,text,text)' END;

  FOREACH v_signature IN ARRAY ARRAY[
    'public.record_sale(uuid,text,jsonb)',v_refund_signature
  ]
  LOOP
    v_target := to_regprocedure(v_signature);
    IF v_target IS NULL THEN
      RAISE EXCEPTION 'Required function % is missing',v_signature;
    END IF;
    v_definition := pg_get_functiondef(v_target);
    v_updated := regexp_replace(
      v_definition,
      $pattern$'cash'\s*,\s*'card'\s*,\s*'bank_transfer'\s*,\s*'other'$pattern$,
      $replacement$'cash','card','bank_transfer','mobile_money','other'$replacement$,
      'g'
    );
    IF v_updated=v_definition
       AND position('''mobile_money''' IN v_definition)=0 THEN
      RAISE EXCEPTION
        'Payment validation in % differs from the expected implementation; no changes committed',v_signature;
    END IF;
    IF v_updated<>v_definition THEN
      EXECUTE v_updated;
    END IF;
  END LOOP;
END;
$$;

NOTIFY pgrst,'reload schema';
COMMIT;
