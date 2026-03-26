
-- Drop the overly broad "Users see org goals" policy
DROP POLICY IF EXISTS "Users see org goals" ON public.goals;

-- Managers see only their own store's goals
CREATE POLICY "Managers see store goals"
ON public.goals FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND organization_id = get_user_org_id(auth.uid())
  AND (store_id = get_user_store_id(auth.uid()) OR user_id = auth.uid())
);

-- Sellers see their own goals and their store's goals
CREATE POLICY "Sellers see store goals"
ON public.goals FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'seller'::app_role)
  AND organization_id = get_user_org_id(auth.uid())
  AND (store_id = get_user_store_id(auth.uid()) OR user_id = auth.uid())
);

-- Supervisors see all org goals
CREATE POLICY "Supervisors see org goals"
ON public.goals FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'supervisor'::app_role)
  AND organization_id = get_user_org_id(auth.uid())
);

-- Admins see all org goals (covers admin SELECT since existing policies are for INSERT/UPDATE/DELETE)
CREATE POLICY "Admins see org goals"
ON public.goals FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND organization_id = get_user_org_id(auth.uid())
);
