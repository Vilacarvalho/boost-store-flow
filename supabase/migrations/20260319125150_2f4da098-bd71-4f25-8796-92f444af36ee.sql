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
    JOIN public.profiles target ON target.id = _target_user_id
    WHERE actor.id = auth.uid()
      AND actor.organization_id IS NOT NULL
      AND actor.organization_id = target.organization_id
      AND public.has_role(actor.id, 'admin'::public.app_role)
  );
$$;

DROP POLICY IF EXISTS "Admin sees org user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin inserts user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin updates user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin deletes user_roles" ON public.user_roles;

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