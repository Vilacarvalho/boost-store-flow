
CREATE TABLE public.store_action_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  issue text NOT NULL,
  action text NOT NULL,
  responsible text,
  due_date date,
  status text NOT NULL DEFAULT 'open',
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_action_plans ENABLE ROW LEVEL SECURITY;

-- Supervisor manages own action plans
CREATE POLICY "Supervisor manages own action plans"
  ON public.store_action_plans FOR ALL
  TO authenticated
  USING (created_by = auth.uid() AND organization_id = get_user_org_id(auth.uid()))
  WITH CHECK (created_by = auth.uid() AND organization_id = get_user_org_id(auth.uid()));

-- Manager sees action plans for own store
CREATE POLICY "Manager sees store action plans"
  ON public.store_action_plans FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND store_id = get_user_store_id(auth.uid())
    AND organization_id = get_user_org_id(auth.uid())
  );

-- Admin sees all org action plans
CREATE POLICY "Admin sees org action plans"
  ON public.store_action_plans FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND organization_id = get_user_org_id(auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND organization_id = get_user_org_id(auth.uid())
  );

-- Super admin full access
CREATE POLICY "Super admin full access"
  ON public.store_action_plans FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_store_action_plans_updated_at
  BEFORE UPDATE ON public.store_action_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
