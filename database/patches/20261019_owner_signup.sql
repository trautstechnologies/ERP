-- Run the complete script in Supabase SQL Editor as postgres before deploying the frontend.
-- Adds owner signup without changing the existing trusted worker provisioning trigger.
BEGIN;
SET LOCAL lock_timeout = '10s';
DO $prerequisites$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.store_types WHERE store_type_code = 'general_retail') THEN
    RAISE EXCEPTION 'Seed the general_retail store type before enabling owner signup';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.store_time_zones WHERE time_zone = 'Africa/Lusaka') THEN
    RAISE EXCEPTION 'Seed Africa/Lusaka in store_time_zones before enabling owner signup';
  END IF;
END
$prerequisites$;

CREATE OR REPLACE FUNCTION private.provision_owner_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $owner_signup$
DECLARE
  v_data jsonb;
  v_name text;
  v_business text;
  v_store_name text;
  v_phone text;
  v_organization_id uuid;
  v_store_id uuid;
BEGIN
  -- Worker creation uses server-controlled app metadata and its existing trigger.
  IF NEW.raw_app_meta_data ? 'erp_worker_provisioning' THEN
    RETURN NEW;
  END IF;
  IF NOT COALESCE(NEW.raw_user_meta_data ? 'erp_owner_signup', false) THEN
    RETURN NEW;
  END IF;
  v_data := NEW.raw_user_meta_data -> 'erp_owner_signup';
  IF jsonb_typeof(v_data) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid business signup details';
  END IF;
  -- Public metadata supplies names only. It cannot choose roles, existing stores or IDs.
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(v_data) AS k(key)
             WHERE k.key NOT IN ('user_name','organization_name','store_name','phone')) THEN
    RAISE EXCEPTION 'Unexpected business signup field';
  END IF;
  IF jsonb_typeof(v_data -> 'user_name') IS DISTINCT FROM 'string'
     OR jsonb_typeof(v_data -> 'organization_name') IS DISTINCT FROM 'string'
     OR jsonb_typeof(v_data -> 'store_name') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'Owner, business and store names are required';
  END IF;
  v_name := btrim(v_data ->> 'user_name');
  v_business := btrim(v_data ->> 'organization_name');
  v_store_name := btrim(v_data ->> 'store_name');
  IF length(v_name) NOT BETWEEN 1 AND 150
     OR length(v_business) NOT BETWEEN 1 AND 150
     OR length(v_store_name) NOT BETWEEN 1 AND 150 THEN
    RAISE EXCEPTION 'Owner, business and store names must contain 1 to 150 characters';
  END IF;
  IF v_data ? 'phone' AND jsonb_typeof(v_data -> 'phone') NOT IN ('string','null') THEN
    RAISE EXCEPTION 'Invalid owner phone number';
  END IF;
  v_phone := NULLIF(btrim(v_data ->> 'phone'), '');
  IF length(v_phone) > 30 THEN
    RAISE EXCEPTION 'Owner phone number must contain at most 30 characters';
  END IF;
  IF NEW.email IS NULL OR btrim(NEW.email) = '' THEN
    RAISE EXCEPTION 'An email address is required for business signup';
  END IF;

  v_organization_id := pg_catalog.gen_random_uuid();
  v_store_id := pg_catalog.gen_random_uuid();
  INSERT INTO public.organizations(organization_id, organization_name, currency_code)
    VALUES (v_organization_id, v_business, 'ZMW');
  INSERT INTO public.stores(store_id, organization_id, store_name, store_type_code, time_zone, active)
    VALUES (v_store_id, v_organization_id, v_store_name, 'general_retail', 'Africa/Lusaka', true);
  INSERT INTO public.profiles(user_id, store_id, user_name, phone, role, status)
    VALUES (NEW.id, v_store_id, v_name, v_phone, 'manager', 'active');
  RETURN NEW;
END
$owner_signup$;

REVOKE ALL ON FUNCTION private.provision_owner_profile() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS provision_erp_owner_profile ON auth.users;
CREATE TRIGGER provision_erp_owner_profile
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.provision_owner_profile();
-- The login page exposes signup only after this transaction is installed.
CREATE OR REPLACE FUNCTION public.owner_signup_available()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $availability$
  SELECT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
    WHERE t.tgrelid = 'auth.users'::regclass
      AND t.tgname = 'provision_erp_owner_profile'
      AND t.tgfoid = 'private.provision_owner_profile()'::regprocedure
      AND t.tgenabled IN ('O','A')
      AND NOT t.tgisinternal
  );
$availability$;
REVOKE ALL ON FUNCTION public.owner_signup_available() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_signup_available() TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
