-- Disposable fixture only. Never run this file against your hosted business data.
BEGIN;
DO $test$
DECLARE
  v_id uuid := '40000000-0000-4000-8000-000000000001';
  v_other uuid := '40000000-0000-4000-8000-000000000002';
  v_actor text;
  v_rejected boolean;
BEGIN
  PERFORM set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  IF public.create_organization_store(v_id,'  New branch  ','  Lusaka  ') <> v_id THEN
    RAISE EXCEPTION 'FAIL: Expected store UUID';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.stores WHERE store_id=v_id
    AND organization_id='20000000-0000-4000-8000-000000000001'
    AND store_name='New branch' AND address='Lusaka' AND active
    AND time_zone='Africa/Lusaka' AND store_type_code='general_retail') THEN
    RAISE EXCEPTION 'FAIL: Incorrect store scope/defaults';
  END IF;
  PERFORM public.create_organization_store(v_id,'New branch','Lusaka');
  IF (SELECT count(*) FROM public.stores WHERE store_id=v_id) <> 1 THEN
    RAISE EXCEPTION 'FAIL: Retry duplicated store';
  END IF;
  IF (SELECT count(*) FROM public.profiles) <> 4 OR
    (SELECT store_id FROM public.profiles WHERE user_id='10000000-0000-4000-8000-000000000001') <> '30000000-0000-4000-8000-000000000001'::uuid THEN
    RAISE EXCEPTION 'FAIL: Store creation changed accounts/assignment';
  END IF;
  v_rejected:=false;
  BEGIN PERFORM public.create_organization_store(v_id,'Different branch');
  EXCEPTION WHEN unique_violation THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL: Conflicting retry accepted'; END IF;
  v_rejected:=false;
  BEGIN PERFORM public.create_organization_store(gen_random_uuid(),' NEW BRANCH ');
  EXCEPTION WHEN invalid_parameter_value THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL: Duplicate normalized name accepted'; END IF;

  -- Reject nonowners and anonymous requests even if they know another store's UUID.
  FOREACH v_actor IN ARRAY ARRAY['10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003',''] LOOP
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',v_actor)::text,true);
    v_rejected:=false;
    BEGIN PERFORM public.create_organization_store(gen_random_uuid(),'Unauthorized branch');
    EXCEPTION WHEN insufficient_privilege THEN v_rejected:=true; END;
    IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL: Nonowner accepted'; END IF;
  END LOOP;

  PERFORM set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004"}',true);
  PERFORM public.create_organization_store(v_other,'New branch');
  IF NOT EXISTS(SELECT 1 FROM public.stores WHERE store_id=v_other AND organization_id='20000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'FAIL: Other owner escaped own organization';
  END IF;
  v_rejected:=false;
  BEGIN PERFORM public.create_organization_store(v_id,'New branch','Lusaka');
  EXCEPTION WHEN unique_violation THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL: Cross-organization request reused'; END IF;

  PERFORM set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001"}',true);
  UPDATE public.profiles SET status='inactive' WHERE user_id='10000000-0000-4000-8000-000000000001';
  v_rejected:=false;
  BEGIN PERFORM public.create_organization_store(gen_random_uuid(),'Inactive owner branch');
  EXCEPTION WHEN insufficient_privilege THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL: Inactive owner accepted'; END IF;
  UPDATE public.profiles SET status='active' WHERE user_id='10000000-0000-4000-8000-000000000001';
  UPDATE public.stores SET active=false WHERE store_id='30000000-0000-4000-8000-000000000001';
  v_rejected:=false;
  BEGIN PERFORM public.create_organization_store(gen_random_uuid(),'Inactive store branch');
  EXCEPTION WHEN insufficient_privilege THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL: Inactive assigned store accepted'; END IF;
  UPDATE public.stores SET active=true WHERE store_id='30000000-0000-4000-8000-000000000001';

  v_rejected:=false;
  BEGIN PERFORM public.create_organization_store(gen_random_uuid(),' ');
  EXCEPTION WHEN invalid_parameter_value THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL: Blank name accepted'; END IF;
  v_rejected:=false;
  BEGIN PERFORM public.create_organization_store(NULL,'No reference');
  EXCEPTION WHEN invalid_parameter_value THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL: Null reference accepted'; END IF;
  v_rejected:=false;
  BEGIN PERFORM public.create_organization_store(gen_random_uuid(),'Bad type',NULL,'unknown');
  EXCEPTION WHEN invalid_parameter_value THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL: Invalid type accepted'; END IF;
  v_rejected:=false;
  BEGIN PERFORM public.create_organization_store(gen_random_uuid(),'Bad zone',NULL,'general_retail','unknown');
  EXCEPTION WHEN invalid_parameter_value THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL: Invalid timezone accepted'; END IF;
  v_rejected:=false;
  BEGIN PERFORM public.create_organization_store(gen_random_uuid(),repeat('a',151));
  EXCEPTION WHEN invalid_parameter_value THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL: Long name accepted'; END IF;
  v_rejected:=false;
  BEGIN PERFORM public.create_organization_store(gen_random_uuid(),'Long address',repeat('a',501));
  EXCEPTION WHEN invalid_parameter_value THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL: Long address accepted'; END IF;

  DELETE FROM public.organization_owners WHERE user_id='10000000-0000-4000-8000-000000000001';
  v_rejected:=false;
  BEGIN PERFORM public.create_organization_store(gen_random_uuid(),'Revoked owner branch');
  EXCEPTION WHEN insufficient_privilege THEN v_rejected:=true; END;
  IF NOT v_rejected THEN RAISE EXCEPTION 'FAIL: Revoked owner accepted'; END IF;
  IF has_function_privilege('anon','public.create_organization_store(uuid,text,text,text,text)','EXECUTE')
    OR NOT has_function_privilege('authenticated','public.create_organization_store(uuid,text,text,text,text)','EXECUTE')
    OR has_table_privilege('authenticated','public.stores','INSERT') THEN
    RAISE EXCEPTION 'FAIL: Unsafe execution/table grants';
  END IF;
  RAISE NOTICE 'PASS: Store creation scope, validation, permissions and retry checks';
END
$test$;
ROLLBACK;
-- Verify security-definer execution works for a real authenticated database role.
BEGIN;
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001"}',true);
SET LOCAL ROLE authenticated;
SELECT public.create_organization_store('40000000-0000-4000-8000-000000000003','Authenticated branch');
ROLLBACK;
