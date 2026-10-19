-- Disposable database ONLY. Minimal fixture matching the supplied signup schema.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE SCHEMA private;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE,
  raw_user_meta_data jsonb DEFAULT '{}', raw_app_meta_data jsonb DEFAULT '{}'
);
CREATE TABLE public.organizations (
  organization_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL CHECK (btrim(organization_name) <> ''),
  currency_code text CHECK(currency_code IS NULL OR currency_code ~ '^[A-Z]{3}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.store_types(store_type_code text PRIMARY KEY, display_name text NOT NULL, description text NOT NULL);
INSERT INTO public.store_types VALUES('general_retail','General retail','Retail');
CREATE TABLE public.store_time_zones(time_zone text PRIMARY KEY);
INSERT INTO public.store_time_zones VALUES('UTC'),('Africa/Lusaka');
CREATE TABLE public.stores (
  store_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL CHECK(btrim(store_name) <> ''), address text,
  active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE RESTRICT,
  store_type_code text NOT NULL DEFAULT 'general_retail' REFERENCES public.store_types ON DELETE RESTRICT,
  time_zone text NOT NULL DEFAULT 'UTC' REFERENCES public.store_time_zones ON DELETE RESTRICT
);
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE RESTRICT,
  store_id uuid NOT NULL REFERENCES public.stores ON DELETE RESTRICT,
  user_name text NOT NULL CHECK(btrim(user_name) <> ''), phone text,
  role text NOT NULL DEFAULT 'user' CHECK(role IN ('user','manager')),
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  start_date date NOT NULL DEFAULT CURRENT_DATE, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id,user_id)
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Worker trigger supplied with the schema (kept separate and unchanged by the patch).
CREATE FUNCTION private.provision_worker_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $worker$
DECLARE v_data jsonb; v_manager_id uuid; v_store_id uuid; v_name text; v_phone text;
BEGIN
  v_data := NEW.raw_app_meta_data -> 'erp_worker_provisioning';
  IF v_data IS NULL THEN RETURN NEW; END IF;
  IF jsonb_typeof(v_data) <> 'object' THEN RAISE EXCEPTION 'Invalid worker provisioning metadata'; END IF;
  IF jsonb_typeof(v_data -> 'manager_id') IS DISTINCT FROM 'string'
     OR jsonb_typeof(v_data -> 'user_name') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'Manager ID and worker name are required';
  END IF;
  v_manager_id := (v_data ->> 'manager_id')::uuid;
  v_name := btrim(v_data ->> 'user_name');
  IF v_name = '' OR length(v_name)>200 THEN RAISE EXCEPTION 'Invalid worker name'; END IF;
  IF v_data ? 'phone' AND jsonb_typeof(v_data -> 'phone') NOT IN ('string','null') THEN RAISE EXCEPTION 'Invalid worker phone'; END IF;
  v_phone := NULLIF(btrim(v_data ->> 'phone'),'');
  IF length(v_phone)>50 THEN RAISE EXCEPTION 'Worker phone is too long'; END IF;
  SELECT p.store_id INTO v_store_id FROM public.profiles p
    WHERE p.user_id=v_manager_id AND p.role='manager' AND p.status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'An active manager account is required'; END IF;
  INSERT INTO public.profiles(user_id,store_id,user_name,phone,role,status)
    VALUES(NEW.id,v_store_id,v_name,v_phone,'user','active');
  RETURN NEW;
END
$worker$;
CREATE TRIGGER provision_erp_worker_profile AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.provision_worker_profile();
CREATE TABLE worker_trigger_snapshot AS SELECT pg_get_functiondef('private.provision_worker_profile()'::regprocedure) AS definition;
