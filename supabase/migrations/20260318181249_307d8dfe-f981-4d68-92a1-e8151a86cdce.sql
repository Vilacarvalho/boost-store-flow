
-- Create goal_plans table for planning history
CREATE TABLE public.goal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  store_id uuid REFERENCES public.stores(id),
  period_type text NOT NULL DEFAULT 'monthly',
  reference_period_start date NOT NULL,
  reference_period_end date NOT NULL,
  target_period_start date NOT NULL,
  target_period_end date NOT NULL,
  break_even_value numeric NOT NULL DEFAULT 0,
  previous_revenue numeric NOT NULL DEFAULT 0,
  inflation_rate numeric NOT NULL DEFAULT 0,
  market_growth_rate numeric NOT NULL DEFAULT 0,
  desired_growth_rate numeric NOT NULL DEFAULT 0,
  suggested_goal_value numeric NOT NULL DEFAULT 0,
  applied_goal_value numeric,
  calculation_notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.goal_plans ENABLE ROW LEVEL SECURITY;

-- Only admin can CRUD goal_plans in their org
CREATE POLICY "Admin sees org goal_plans" ON public.goal_plans
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin inserts goal_plans" ON public.goal_plans
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin updates goal_plans" ON public.goal_plans
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin deletes goal_plans" ON public.goal_plans
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') AND organization_id = get_user_org_id(auth.uid()));

-- Add new columns to goals table
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS goal_plan_id uuid REFERENCES public.goal_plans(id);
