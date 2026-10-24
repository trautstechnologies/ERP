-- Run this complete transaction in Supabase SQL Editor as postgres.
-- Requires the organization-ownership SQL already used by the Organization page.
BEGIN;
SET LOCAL lock_timeout = '10s';
DO $prerequisites$
BEGIN
  IF pg_catalog.to_regclass('public.organization_owners') IS NULL THEN
    RAISE EXCEPTION 'Install organization ownership before enabling store creation';
  END IF;
END
$prerequisites$;

CREATE OR REPLACE FUNCTION public.create_organization_store(
  p_request_id uuid,
  p_store_name text,
  p_address text DEFAULT NULL,
  p_store_type_code text DEFAULT 'general_retail',
  p_time_zone text DEFAULT 'Africa/Lusaka'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $create_store$
DECLARE
  v_organization_id uuid;
  v_name text := pg_catalog.btrim(p_store_name);
  v_address text := NULLIF(pg_catalog.btrim(p_address), '');
  v_type text := pg_catalog.btrim(p_store_type_code);
  v_zone text := pg_catalog.btrim(p_time_zone);
  v_existing public.stores%ROWTYPE;
BEGIN
  -- Never accept an organization, owner, role or active flag from the client.
  -- Lock ownership/assignment during creation. The organization lock serializes
  -- retries and duplicate-name checks across all owners of the same business.
  SELECT oo.organization_id INTO v_organization_id
  FROM public.organization_owners AS oo
  JOIN public.profiles AS p ON p.user_id = oo.user_id
  JOIN public.stores AS s ON s.store_id = p.store_id
    AND s.organization_id = oo.organization_id
  JOIN public.organizations AS o ON o.organization_id = oo.organization_id
  WHERE oo.user_id = auth.uid() AND p.role = 'manager'
    AND p.status = 'active' AND s.active
  FOR UPDATE OF o FOR SHARE OF oo, p, s;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'An active organization owner account is required';
  END IF;
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A request reference is required';
  END IF;
  IF v_name IS NULL OR pg_catalog.length(v_name) NOT BETWEEN 1 AND 150 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Store name must contain 1 to 150 characters';
  END IF;
  IF pg_catalog.length(v_address) > 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Address must contain at most 500 characters';
  END IF;
  IF v_type IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.store_types WHERE store_type_code = v_type
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Choose an available store type';
  END IF;
  IF v_zone IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.store_time_zones WHERE time_zone = v_zone
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Choose an available timezone';
  END IF;

  SELECT * INTO v_existing FROM public.stores WHERE store_id = p_request_id;
  IF FOUND THEN
    IF v_existing.organization_id = v_organization_id
      AND v_existing.store_name = v_name
      AND v_existing.address IS NOT DISTINCT FROM v_address
      AND v_existing.store_type_code = v_type
      AND v_existing.time_zone = v_zone THEN
      RETURN v_existing.store_id;
    END IF;
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'This request reference is already in use; review the saved store';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.stores
    WHERE organization_id = v_organization_id
      AND pg_catalog.lower(pg_catalog.btrim(store_name)) = pg_catalog.lower(v_name)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A store with this name already exists in your organization';
  END IF;

  INSERT INTO public.stores(store_id, organization_id, store_name, address, store_type_code, time_zone, active)
  VALUES(p_request_id, v_organization_id, v_name, v_address, v_type, v_zone, true);
  RETURN p_request_id;
END
$create_store$;

REVOKE ALL ON FUNCTION public.create_organization_store(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_store(uuid,text,text,text,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
