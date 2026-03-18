
-- Manual sections table
CREATE TABLE public.manual_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see org manual_sections" ON public.manual_sections
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin inserts manual_sections" ON public.manual_sections
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin updates manual_sections" ON public.manual_sections
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin deletes manual_sections" ON public.manual_sections
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND organization_id = get_user_org_id(auth.uid()));

-- Culture table
CREATE TABLE public.culture (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) UNIQUE,
  mission text NOT NULL DEFAULT '',
  vision text NOT NULL DEFAULT '',
  values text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.culture ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see org culture" ON public.culture
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin inserts culture" ON public.culture
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin updates culture" ON public.culture
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND organization_id = get_user_org_id(auth.uid()));
