
-- Create store_visits table
CREATE TABLE public.store_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  supervisor_id uuid NOT NULL,
  visit_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisor sees own org visits" ON public.store_visits
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()) AND supervisor_id = auth.uid());

CREATE POLICY "Admin sees org visits" ON public.store_visits
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Supervisor inserts visits" ON public.store_visits
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'supervisor'::app_role)
    AND organization_id = get_user_org_id(auth.uid())
    AND supervisor_id = auth.uid()
  );

CREATE POLICY "Supervisor updates own visits" ON public.store_visits
  FOR UPDATE TO authenticated
  USING (supervisor_id = auth.uid() AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Supervisor deletes own visits" ON public.store_visits
  FOR DELETE TO authenticated
  USING (supervisor_id = auth.uid() AND organization_id = get_user_org_id(auth.uid()));

-- Create visit_checklists table
CREATE TABLE public.visit_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.store_visits(id) ON DELETE CASCADE,
  follows_process boolean DEFAULT false,
  attempted_closing boolean DEFAULT false,
  system_usage boolean DEFAULT false,
  campaign_active boolean DEFAULT false,
  notes text
);

ALTER TABLE public.visit_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisor manages own checklists" ON public.visit_checklists
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_visits sv WHERE sv.id = visit_id AND sv.supervisor_id = auth.uid()));

CREATE POLICY "Admin sees org checklists" ON public.visit_checklists
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_visits sv WHERE sv.id = visit_id AND sv.organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)));

-- Create visit_actions table
CREATE TABLE public.visit_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.store_visits(id) ON DELETE CASCADE,
  issue text NOT NULL,
  action text NOT NULL,
  responsible text,
  due_date date,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visit_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisor manages own actions" ON public.visit_actions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_visits sv WHERE sv.id = visit_id AND sv.supervisor_id = auth.uid()));

CREATE POLICY "Admin sees org actions" ON public.visit_actions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_visits sv WHERE sv.id = visit_id AND sv.organization_id = get_user_org_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)));
