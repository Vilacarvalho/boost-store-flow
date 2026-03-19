
-- Drop existing INSERT/UPDATE/DELETE policies on user_roles and recreate with org scoping
DROP POLICY IF EXISTS "Admin inserts user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin updates user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin deletes user_roles" ON public.user_roles;

-- INSERT: admin can insert roles for users in same org
CREATE POLICY "Admin inserts user_roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_roles.user_id
    AND p.organization_id = get_user_org_id(auth.uid())
  )
);

-- UPDATE: admin can update roles for users in same org
CREATE POLICY "Admin updates user_roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_roles.user_id
    AND p.organization_id = get_user_org_id(auth.uid())
  )
);

-- DELETE: admin can delete roles for users in same org
CREATE POLICY "Admin deletes user_roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_roles.user_id
    AND p.organization_id = get_user_org_id(auth.uid())
  )
);
