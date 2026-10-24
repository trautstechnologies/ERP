-- Disposable database only. Run owner-signup-fixture.sql first.
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid $$;
CREATE TABLE public.organization_owners (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations,
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organization_owners ENABLE ROW LEVEL SECURITY;
INSERT INTO public.organizations(organization_id,organization_name) VALUES
('20000000-0000-4000-8000-000000000001','Business A'),
('20000000-0000-4000-8000-000000000002','Business B');
INSERT INTO public.stores(store_id,organization_id,store_name) VALUES
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Store A'),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Store B');
INSERT INTO auth.users(id,email) VALUES
('10000000-0000-4000-8000-000000000001','owner-a@example.com'),
('10000000-0000-4000-8000-000000000002','manager-a@example.com'),
('10000000-0000-4000-8000-000000000003','worker-a@example.com'),
('10000000-0000-4000-8000-000000000004','owner-b@example.com');
INSERT INTO public.profiles(user_id,store_id,user_name,role) VALUES
('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Owner A','manager'),
('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Manager A','manager'),
('10000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','Worker A','user'),
('10000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000002','Owner B','manager');
INSERT INTO public.organization_owners(organization_id,user_id) VALUES
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004');
