-- Run AFTER the fixture and patch, in a disposable database only.
DO $checks$
DECLARE
  owner_a uuid := gen_random_uuid(); owner_b uuid := gen_random_uuid(); worker uuid := gen_random_uuid();
  store_a uuid; store_b uuid; organization_a uuid; bad_id uuid;
  details jsonb; bad jsonb; rejected boolean; before_counts bigint[]; after_counts bigint[];
BEGIN
  IF (SELECT definition FROM worker_trigger_snapshot) IS DISTINCT FROM pg_get_functiondef('private.provision_worker_profile()'::regprocedure) THEN
    RAISE EXCEPTION 'Worker trigger function changed';
  END IF;
  details := jsonb_build_object('user_name','Owner A','organization_name','Business A','store_name','Store A','phone','0971234567');
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(owner_a,'a@example.com',jsonb_build_object('erp_owner_signup',details));
  INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(owner_b,'b@example.com',jsonb_build_object('erp_owner_signup',details || jsonb_build_object('user_name','Owner B')));
  SELECT store_id INTO store_a FROM public.profiles WHERE user_id=owner_a AND role='manager' AND status='active';
  SELECT store_id INTO store_b FROM public.profiles WHERE user_id=owner_b;
  SELECT organization_id INTO organization_a FROM public.stores WHERE store_id=store_a;
  IF store_a IS NULL OR store_b IS NULL OR store_a=store_b
     OR organization_a=(SELECT organization_id FROM public.stores WHERE store_id=store_b) THEN
    RAISE EXCEPTION 'Owners did not receive separate new stores and businesses';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.stores s JOIN public.organizations o USING(organization_id)
    WHERE s.store_id=store_a AND s.active AND s.time_zone='Africa/Lusaka'
      AND s.store_type_code='general_retail' AND o.currency_code='ZMW') THEN
    RAISE EXCEPTION 'Incorrect store defaults';
  END IF;
  IF (SELECT phone FROM public.profiles WHERE user_id=owner_a) <> '0971234567' THEN RAISE EXCEPTION 'Phone not preserved'; END IF;

  -- Invalid data/attempts to choose an existing tenant or role must leave no rows.
  FOREACH bad IN ARRAY ARRAY[
    'null'::jsonb, '[]'::jsonb, '{}'::jsonb,
    details || '{"user_name":" "}'::jsonb,
    details || jsonb_build_object('phone',repeat('1',31)),
    details || '{"phone":12}'::jsonb,
    details || jsonb_build_object('store_id',store_a),
    details || jsonb_build_object('organization_id',organization_a),
    details || '{"role":"manager"}'::jsonb,
    details || jsonb_build_object('user_id',owner_a)
  ] LOOP
    bad_id := gen_random_uuid(); rejected := false;
    SELECT ARRAY[(SELECT count(*) FROM auth.users),(SELECT count(*) FROM public.profiles),(SELECT count(*) FROM public.stores),(SELECT count(*) FROM public.organizations)] INTO before_counts;
    BEGIN
      INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(bad_id,bad_id::text||'@example.com',jsonb_build_object('erp_owner_signup',bad));
    EXCEPTION WHEN raise_exception THEN rejected := true;
    END;
    SELECT ARRAY[(SELECT count(*) FROM auth.users),(SELECT count(*) FROM public.profiles),(SELECT count(*) FROM public.stores),(SELECT count(*) FROM public.organizations)] INTO after_counts;
    IF NOT rejected OR before_counts IS DISTINCT FROM after_counts THEN RAISE EXCEPTION 'Invalid signup persisted rows: %',bad; END IF;
  END LOOP;

  -- A late profile error must undo the Auth user, new store and new organization too.
  ALTER TABLE public.profiles ADD CONSTRAINT fixture_late_failure CHECK(user_name <> 'FAIL PROFILE');
  bad_id := gen_random_uuid(); rejected := false;
  SELECT ARRAY[(SELECT count(*) FROM auth.users),(SELECT count(*) FROM public.profiles),(SELECT count(*) FROM public.stores),(SELECT count(*) FROM public.organizations)] INTO before_counts;
  BEGIN
    INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(bad_id,'late@example.com',jsonb_build_object('erp_owner_signup',details || '{"user_name":"FAIL PROFILE"}'::jsonb));
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  SELECT ARRAY[(SELECT count(*) FROM auth.users),(SELECT count(*) FROM public.profiles),(SELECT count(*) FROM public.stores),(SELECT count(*) FROM public.organizations)] INTO after_counts;
  IF NOT rejected OR before_counts IS DISTINCT FROM after_counts THEN RAISE EXCEPTION 'Profile failure did not roll back signup'; END IF;
  ALTER TABLE public.profiles DROP CONSTRAINT fixture_late_failure;

  -- Trusted worker provisioning wins even if user metadata claims owner signup.
  INSERT INTO auth.users(id,email,raw_user_meta_data,raw_app_meta_data)
    VALUES(worker,'worker@example.com',jsonb_build_object('erp_owner_signup',details),
      jsonb_build_object('erp_worker_provisioning',jsonb_build_object('manager_id',owner_a,'user_name','Worker A')));
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=worker AND store_id=store_a AND role='user') THEN RAISE EXCEPTION 'Worker provisioning changed'; END IF;
  IF (SELECT count(*) FROM public.stores) <> 2 THEN RAISE EXCEPTION 'Worker created another store'; END IF;
  UPDATE auth.users SET raw_user_meta_data=jsonb_build_object('erp_owner_signup',details) WHERE id=worker;
  IF (SELECT count(*) FROM public.stores) <> 2 OR (SELECT role FROM public.profiles WHERE user_id=worker) <> 'user' THEN RAISE EXCEPTION 'Metadata update changed role or store'; END IF;
  INSERT INTO auth.users(email) VALUES('ordinary-auth@example.com');
  IF (SELECT count(*) FROM public.profiles) <> 3 THEN RAISE EXCEPTION 'Ordinary Auth insert unexpectedly provisioned a profile'; END IF;
  IF has_function_privilege('anon','private.provision_owner_profile()','EXECUTE')
     OR has_function_privilege('authenticated','private.provision_owner_profile()','EXECUTE') THEN
    RAISE EXCEPTION 'Trigger function exposed for direct execution';
  END IF;
  RAISE NOTICE 'PASS: separate stores, defaults, validation, atomic rollback, worker compatibility and no metadata escalation';
END
$checks$;

-- Auth's database writer has no application-table write grants; the trigger supplies them.
CREATE ROLE fixture_auth_writer;
GRANT USAGE ON SCHEMA auth TO fixture_auth_writer;
GRANT INSERT ON auth.users TO fixture_auth_writer;
SET ROLE fixture_auth_writer;
INSERT INTO auth.users(email,raw_user_meta_data) VALUES('writer@example.com',
  '{"erp_owner_signup":{"user_name":"Writer Owner","organization_name":"Writer Business","store_name":"Writer Store"}}');
RESET ROLE;
DO $writer_check$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.user_id
    WHERE u.email='writer@example.com' AND p.role='manager' AND p.status='active') THEN
    RAISE EXCEPTION 'Auth writer could not provision through the trigger';
  END IF;
  RAISE NOTICE 'PASS: provisioning works for an Auth writer without application write grants';
END
$writer_check$;


DO $availability_check$
BEGIN
  IF public.owner_signup_available() IS DISTINCT FROM true THEN RAISE EXCEPTION 'Installed signup unavailable'; END IF;
  ALTER TABLE auth.users DISABLE TRIGGER provision_erp_owner_profile;
  IF public.owner_signup_available() IS DISTINCT FROM false THEN RAISE EXCEPTION 'Disabled signup still available'; END IF;
  ALTER TABLE auth.users ENABLE TRIGGER provision_erp_owner_profile;
  IF NOT has_function_privilege('anon','public.owner_signup_available()','EXECUTE') THEN RAISE EXCEPTION 'Anonymous availability check missing'; END IF;
  RAISE NOTICE 'PASS: readiness reports the enabled trigger state';
END
$availability_check$;
