-- Admin can insert stores
CREATE POLICY "Admin inserts stores" ON public.stores
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND organization_id = get_user_org_id(auth.uid()));

-- Admin can update stores
CREATE POLICY "Admin updates stores" ON public.stores
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND organization_id = get_user_org_id(auth.uid()));

-- Admin sees all org user_roles
CREATE POLICY "Admin sees org user_roles" ON public.user_roles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.organization_id = get_user_org_id(auth.uid()))
);

-- Manager sees store user_roles
CREATE POLICY "Manager sees store user_roles" ON public.user_roles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role) AND
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.store_id = get_user_store_id(auth.uid()))
);

-- Admin inserts user_roles
CREATE POLICY "Admin inserts user_roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin updates user_roles
CREATE POLICY "Admin updates user_roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin deletes user_roles
CREATE POLICY "Admin deletes user_roles" ON public.user_roles
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin updates any profile in org
CREATE POLICY "Admin updates org profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND organization_id = get_user_org_id(auth.uid()));

-- Admin deletes goals
CREATE POLICY "Admin deletes goals" ON public.goals
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND organization_id = get_user_org_id(auth.uid()));

-- Manager can insert goals for their store
CREATE POLICY "Manager inserts goals" ON public.goals
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) AND organization_id = get_user_org_id(auth.uid()) AND store_id = get_user_store_id(auth.uid()));

-- Manager can update goals for their store
CREATE POLICY "Manager updates goals" ON public.goals
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) AND organization_id = get_user_org_id(auth.uid()) AND store_id = get_user_store_id(auth.uid()));