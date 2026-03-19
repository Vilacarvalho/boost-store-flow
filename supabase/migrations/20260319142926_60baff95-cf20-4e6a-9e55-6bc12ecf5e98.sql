CREATE OR REPLACE FUNCTION public.can_admin_manage_user(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles actor
    WHERE actor.id = auth.uid()
      AND public.has_role(actor.id, 'super_admin'::public.app_role)
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles actor
    JOIN public.profiles target ON target.id = _target_user_id
    WHERE actor.id = auth.uid()
      AND actor.organization_id IS NOT NULL
      AND actor.organization_id = target.organization_id
      AND public.has_role(actor.id, 'admin'::public.app_role)
  );
$$;

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  target_user_id uuid,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin sees audit logs" ON public.admin_audit_logs;
CREATE POLICY "Super admin sees audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Admin sees org user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin inserts user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin updates user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin deletes user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admin full access" ON public.user_roles;
CREATE POLICY "Super admin full access"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Admin sees org user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.can_admin_manage_user(user_id));

CREATE POLICY "Admin inserts user_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.can_admin_manage_user(user_id));

CREATE POLICY "Admin updates user_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.can_admin_manage_user(user_id))
WITH CHECK (public.can_admin_manage_user(user_id));

CREATE POLICY "Admin deletes user_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.can_admin_manage_user(user_id));

DROP POLICY IF EXISTS "Super admin full access" ON public.profiles;
CREATE POLICY "Super admin full access"
ON public.profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.organizations;
CREATE POLICY "Super admin full access"
ON public.organizations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.stores;
CREATE POLICY "Super admin full access"
ON public.stores
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.goals;
CREATE POLICY "Super admin full access"
ON public.goals
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.goal_plans;
CREATE POLICY "Super admin full access"
ON public.goal_plans
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.content_categories;
CREATE POLICY "Super admin full access"
ON public.content_categories
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.culture;
CREATE POLICY "Super admin full access"
ON public.culture
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.followups;
CREATE POLICY "Super admin full access"
ON public.followups
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.sales;
CREATE POLICY "Super admin full access"
ON public.sales
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.customers;
CREATE POLICY "Super admin full access"
ON public.customers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.contents;
CREATE POLICY "Super admin full access"
ON public.contents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.content_access;
CREATE POLICY "Super admin full access"
ON public.content_access
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.content_views;
CREATE POLICY "Super admin full access"
ON public.content_views
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.manual_sections;
CREATE POLICY "Super admin full access"
ON public.manual_sections
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.store_visits;
CREATE POLICY "Super admin full access"
ON public.store_visits
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.visit_actions;
CREATE POLICY "Super admin full access"
ON public.visit_actions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.visit_checklists;
CREATE POLICY "Super admin full access"
ON public.visit_checklists
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin full access" ON public.sale_steps;
CREATE POLICY "Super admin full access"
ON public.sale_steps
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));